// Entrada em liga — 07_MULTIPLAYER_ONLINE, seção 2.
//
// Regras aplicadas:
//   - 1 humano controla exatamente 1 clube por liga (R10, 07 seção 1).
//   - As vagas humanas ficam abertas até o início do calendário oficial;
//     depois disso, novos ingressos fecham (07 seção 2). A reabertura de
//     vaga por inatividade (R40) + lista de espera é um passo seguinte da
//     Fase 1 (ver README) — o TODO está marcado abaixo.
//   - Clubes sem gestão humana são geridos por IA (R9). Ao assumir, o clube
//     passa de IA para HUMANO.

import { randomInt } from "crypto";
import { prisma } from "../../config/prisma";

export class ErroLiga extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

// --- decisão pura --------------------------------------------------------------

export interface EstadoAssuncao {
  ligaExiste: boolean;
  calendarioIniciado: boolean;
  usuarioJaControlaClubeNestaLiga: boolean;
  // Sobre o clube-alvo, quando o usuário escolheu um:
  clubeAlvo?: {
    pertenceALiga: boolean;
    tipo: "HUMANO" | "IA" | "SAF";
    temPresidente: boolean;
  } | null;
  haClubeDisponivel: boolean;
}

export interface ResultadoValidacao {
  ok: boolean;
  status: number;
  erro?: string;
}

export function validarAssuncao(estado: EstadoAssuncao): ResultadoValidacao {
  if (!estado.ligaExiste) {
    return { ok: false, status: 404, erro: "Liga não encontrada." };
  }
  // 07, seção 2: após o início do calendário, novos ingressos fecham.
  if (estado.calendarioIniciado) {
    return {
      ok: false,
      status: 403,
      erro: "As inscrições desta liga já fecharam (calendário oficial iniciado).",
    };
  }
  // R10: um humano, um clube por liga.
  if (estado.usuarioJaControlaClubeNestaLiga) {
    return {
      ok: false,
      status: 409,
      erro: "Você já controla um clube nesta liga.",
    };
  }

  if (estado.clubeAlvo === undefined) {
    // Sem clube escolhido: precisa haver ao menos um disponível para sorteio.
    if (!estado.haClubeDisponivel) {
      return { ok: false, status: 409, erro: "Não há clubes disponíveis nesta liga." };
    }
    return { ok: true, status: 200 };
  }

  if (estado.clubeAlvo === null) {
    // Um id foi informado, mas o clube não existe.
    return { ok: false, status: 404, erro: "Clube não encontrado." };
  }

  // Clube escolhido explicitamente.
  if (!estado.clubeAlvo.pertenceALiga) {
    return { ok: false, status: 400, erro: "O clube informado não pertence a esta liga." };
  }
  if (estado.clubeAlvo.tipo === "SAF") {
    // 05, seção 8: clube-SAF permanece corporativo, não volta ao pool humano.
    return { ok: false, status: 409, erro: "Este clube é controlado por uma SAF e não está disponível." };
  }
  if (estado.clubeAlvo.tipo === "HUMANO" || estado.clubeAlvo.temPresidente) {
    return { ok: false, status: 409, erro: "Este clube já tem um presidente." };
  }
  return { ok: true, status: 200 };
}

// --- operações no banco ------------------------------------------------------

export async function listarClubesDisponiveis(ligaId: string) {
  return prisma.clube.findMany({
    where: { ligaId, tipo: "IA", presidenteId: null },
    select: { id: true, nome: true, cores: true, reputacao: true },
    orderBy: { reputacao: "desc" },
  });
}

/**
 * O usuário assume um clube da liga. Se `clubeId` for omitido, sorteia um
 * clube disponível (atribuição aleatória, alinhada ao espírito de 05 §7).
 */
export async function assumirClube(params: {
  usuarioId: string;
  ligaId: string;
  clubeId?: string;
}) {
  const liga = await prisma.liga.findUnique({ where: { id: params.ligaId } });

  const clubeDoUsuario = await prisma.clube.findFirst({
    where: { ligaId: params.ligaId, presidenteId: params.usuarioId },
    select: { id: true },
  });

  const clubeAlvo = params.clubeId
    ? await prisma.clube.findUnique({
        where: { id: params.clubeId },
        select: { id: true, ligaId: true, tipo: true, presidenteId: true },
      })
    : null;

  const disponiveis = await prisma.clube.findMany({
    where: { ligaId: params.ligaId, tipo: "IA", presidenteId: null },
    select: { id: true },
  });

  const validacao = validarAssuncao({
    ligaExiste: !!liga,
    calendarioIniciado: liga?.calendarioIniciado ?? false,
    usuarioJaControlaClubeNestaLiga: !!clubeDoUsuario,
    clubeAlvo: params.clubeId
      ? clubeAlvo
        ? {
            pertenceALiga: clubeAlvo.ligaId === params.ligaId,
            tipo: clubeAlvo.tipo,
            temPresidente: clubeAlvo.presidenteId != null,
          }
        : null
      : undefined,
    haClubeDisponivel: disponiveis.length > 0,
  });

  if (!validacao.ok) {
    throw new ErroLiga(validacao.status, validacao.erro as string);
  }

  const alvoId =
    params.clubeId ?? disponiveis[randomInt(disponiveis.length)].id;

  // updateMany com a condição de disponibilidade evita corrida entre dois
  // usuários assumindo o mesmo clube ao mesmo tempo (só um `count: 1`).
  const atualizados = await prisma.clube.updateMany({
    where: { id: alvoId, tipo: "IA", presidenteId: null, ligaId: params.ligaId },
    data: { presidenteId: params.usuarioId, tipo: "HUMANO", ultimaAcaoEm: new Date() },
  });
  if (atualizados.count !== 1) {
    throw new ErroLiga(409, "Este clube acabou de ser assumido por outra pessoa.");
  }

  await prisma.logSeguranca.create({
    data: { tipo: "ASSUMIR_CLUBE", usuarioId: params.usuarioId, detalhe: `clube=${alvoId} liga=${params.ligaId}` },
  });

  return prisma.clube.findUniqueOrThrow({
    where: { id: alvoId },
    select: { id: true, nome: true, cores: true, tipo: true, ligaId: true, reputacao: true },
  });
}

// TODO (Fase 1, item R40): quando um clube entra em gestão virtual por
// inatividade (14 dias), sua vaga reabre imediatamente via lista de espera
// (07, seção 2). Isso exige o modelo FilaDeEspera (16) e o tick que detecta
// inatividade.
