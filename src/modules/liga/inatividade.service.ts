// Gestão virtual por inatividade (R40) + fila de espera por vagas (07 §2).
//
// - Quem controla um clube e fica 14 dias corridos sem nenhuma ação de
//   gestão perde o clube para gestão virtual de IA. O clube volta a ser um
//   clube de IA comum (tipo IA, sem presidente) — NÃO vira SAF (isso é só
//   por falência, 05 §8) e pode ser reassumido por outro humano.
// - Assim que a vaga abre, ela é oferecida ao primeiro da fila de espera.

import { prisma } from "../../config/prisma";
import { estaInativo, DIAS_INATIVIDADE_GESTAO_VIRTUAL } from "./inatividade.regras";

export class ErroFila extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

// --- Fila de espera --------------------------------------------------------

export async function entrarNaFila(ligaId: string, usuarioId: string) {
  const liga = await prisma.liga.findUnique({ where: { id: ligaId }, select: { id: true } });
  if (!liga) throw new ErroFila(404, "Liga não encontrada.");

  const jaControla = await prisma.clube.findFirst({
    where: { ligaId, presidenteId: usuarioId },
    select: { id: true },
  });
  if (jaControla) {
    throw new ErroFila(409, "Você já controla um clube nesta liga.");
  }

  const jaNaFila = await prisma.filaDeEspera.findFirst({
    where: { ligaId, usuarioId, status: "AGUARDANDO" },
    select: { id: true },
  });
  if (jaNaFila) throw new ErroFila(409, "Você já está na fila de espera desta liga.");

  const entrada = await prisma.filaDeEspera.create({
    data: { ligaId, usuarioId, status: "AGUARDANDO" },
  });
  return posicaoNaFila(entrada.id);
}

export async function sairDaFila(ligaId: string, usuarioId: string) {
  const r = await prisma.filaDeEspera.updateMany({
    where: { ligaId, usuarioId, status: "AGUARDANDO" },
    data: { status: "CANCELADA" },
  });
  if (r.count === 0) throw new ErroFila(404, "Você não está na fila desta liga.");
}

export async function posicaoNaFila(entradaId: string) {
  const entrada = await prisma.filaDeEspera.findUniqueOrThrow({ where: { id: entradaId } });
  if (entrada.status !== "AGUARDANDO") {
    return { entradaId, status: entrada.status, posicao: null, clubeAtribuidoId: entrada.clubeAtribuidoId };
  }
  const aFrente = await prisma.filaDeEspera.count({
    where: { ligaId: entrada.ligaId, status: "AGUARDANDO", criadoEm: { lt: entrada.criadoEm } },
  });
  return { entradaId, status: "AGUARDANDO", posicao: aFrente + 1, clubeAtribuidoId: null };
}

export async function verFila(ligaId: string) {
  const fila = await prisma.filaDeEspera.findMany({
    where: { ligaId, status: "AGUARDANDO" },
    orderBy: { criadoEm: "asc" },
    select: { usuarioId: true, criadoEm: true },
  });
  return fila.map((f, i) => ({ posicao: i + 1, usuarioId: f.usuarioId, desde: f.criadoEm }));
}

/**
 * Oferece um clube recém-liberado ao primeiro da fila. Retorna o usuarioId
 * atendido, ou null se a fila estava vazia. Usa updateMany condicional para
 * não haver corrida com o endpoint /assumir.
 */
async function atenderFilaDeEspera(
  ligaId: string,
  clubeId: string,
  referencia: Date
): Promise<string | null> {
  const proximo = await prisma.filaDeEspera.findFirst({
    where: { ligaId, status: "AGUARDANDO" },
    orderBy: { criadoEm: "asc" },
  });
  if (!proximo) return null;

  const assumido = await prisma.clube.updateMany({
    where: { id: clubeId, ligaId, tipo: "IA", presidenteId: null },
    data: { tipo: "HUMANO", presidenteId: proximo.usuarioId, ultimaAcaoEm: referencia },
  });
  if (assumido.count !== 1) return null;

  await prisma.filaDeEspera.update({
    where: { id: proximo.id },
    data: { status: "ATENDIDA", atendidaEm: referencia, clubeAtribuidoId: clubeId },
  });
  await prisma.logSeguranca.create({
    data: {
      tipo: "FILA_ATENDIDA",
      usuarioId: proximo.usuarioId,
      detalhe: `liga=${ligaId} clube=${clubeId}`,
    },
  });
  return proximo.usuarioId;
}

/**
 * Reconcilia a fila com vagas livres: enquanto houver alguém esperando e
 * algum clube de IA sem presidente, atribui. Cobre o caso de um clube ter
 * sido liberado mas a fila não ter sido atendida (ex.: crash entre passos),
 * o que importa porque após o início do calendário o /assumir fica travado
 * e a fila passa a ser o único caminho (07 §2).
 */
export async function reconciliarFilaComVagasLivres(
  ligaId: string,
  referencia: Date = new Date()
): Promise<number> {
  // Antes do início do calendário, a entrada é livre via /assumir (o jogador
  // escolhe o clube) — a fila não deve "puxar" clubes automaticamente.
  const liga = await prisma.liga.findUnique({
    where: { id: ligaId },
    select: { calendarioIniciado: true },
  });
  if (!liga?.calendarioIniciado) return 0;

  let atendidos = 0;
  // Limite de segurança para não girar infinito em caso de dados estranhos.
  for (let i = 0; i < 25; i++) {
    const temFila = await prisma.filaDeEspera.findFirst({
      where: { ligaId, status: "AGUARDANDO" },
      select: { id: true },
    });
    if (!temFila) break;
    const livre = await prisma.clube.findFirst({
      where: { ligaId, tipo: "IA", presidenteId: null },
      select: { id: true },
      orderBy: { reputacao: "desc" },
    });
    if (!livre) break;
    const usuarioId = await atenderFilaDeEspera(ligaId, livre.id, referencia);
    if (!usuarioId) break;
    atendidos++;
  }
  return atendidos;
}

// --- Processamento de inatividade (R40) ----------------------------------

export interface ResultadoInatividade {
  clubeId: string;
  usuarioAnteriorId: string;
  novoUsuarioId: string | null; // atendido pela fila, se havia alguém
}

/**
 * Varre os clubes humanos da liga e move para gestão virtual de IA os que
 * estão inativos há >= 14 dias (R40). Para cada vaga aberta, tenta atender a
 * fila de espera imediatamente (07 §2).
 */
export async function processarInatividade(
  ligaId: string,
  referencia: Date = new Date()
): Promise<ResultadoInatividade[]> {
  const humanos = await prisma.clube.findMany({
    where: { ligaId, tipo: "HUMANO", presidenteId: { not: null } },
    select: { id: true, presidenteId: true, ultimaAcaoEm: true },
  });

  const resultados: ResultadoInatividade[] = [];

  for (const c of humanos) {
    if (!estaInativo(c.ultimaAcaoEm, referencia)) continue;
    const usuarioAnteriorId = c.presidenteId as string;

    await prisma.$transaction(async (tx) => {
      await tx.clube.update({
        where: { id: c.id },
        data: { tipo: "IA", presidenteId: null, ultimaAcaoEm: referencia },
      });
      await tx.logSeguranca.create({
        data: {
          tipo: "GESTAO_VIRTUAL_INATIVIDADE",
          usuarioId: usuarioAnteriorId,
          detalhe: `liga=${ligaId} clube=${c.id} dias>=${DIAS_INATIVIDADE_GESTAO_VIRTUAL}`,
        },
      });
    });

    const novoUsuarioId = await atenderFilaDeEspera(ligaId, c.id, referencia);
    resultados.push({ clubeId: c.id, usuarioAnteriorId, novoUsuarioId });
  }

  return resultados;
}
