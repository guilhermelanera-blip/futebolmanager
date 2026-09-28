// Virada de temporada — 08_RELOGIO_E_SIMULACAO, seção 6.
//
// Disparo AUTOMÁTICO: quando todas as partidas da Liga Nacional da temporada
// corrente estão encerradas. (Copa Nacional e Copa Continental são Fase 2+ —
// 20_ROADMAP — então na Fase 1 só a Liga conta.)
//
// Processo (subconjunto da Fase 1 — sem Copa, sem base/juniores):
//   - Premiação da Liga por colocação final (11 §1).
//   - Avanço de idade (+1) e evolução/declínio anual de atributos (04 §3).
//   - Vencimento/renovação de contratos.
//   - Encerramento da temporada + criação da próxima após 4 semanas de
//     entressafra (08 §7), o que já reabre a janela principal de
//     transferências (janela = 4 semanas antes do início — 09 §6).
//
// Reset de cartões acumulados (04 §8) e geração de base (14) ficam para
// quando esses sistemas existirem.

import { prisma } from "../../config/prisma";
import { createRng } from "../../utils/rng";
import { evoluirAtributosAnuais } from "../jogador/evolucao.regras";
import { CAMPOS_ATRIBUTO, AtributosBasicos } from "../jogador/overall";
import { distribuirPremiacaoLiga, registrarMovimentacao } from "../financas/financas.service";
import { criarTemporadaComCalendario } from "./calendario.service";
import { calcularClassificacao } from "./classificacao.service";
import { selecionarParticipantesCopa } from "./copa.participantes";
import { bonusAtingido, TipoBonus } from "../mercado/mercado.regras";
import { idadeCorteDispensa } from "../clube/perfilIA";
import { TEMPLATE_ELENCO } from "../liga/universo.generator";

// 08 §7 — duração fixa da entressafra. Regra de calendário, não parâmetro.
export const ENTRESSAFRA_SEMANAS = 4;
const DIA_MS = 24 * 60 * 60 * 1000;
const ANO_MS = 365 * DIA_MS;

export interface ResultadoVirada {
  virou: boolean;
  temporadaEncerradaId?: string;
  novaTemporadaId?: string;
  jogadoresEvoluidos?: number;
  contratosRenovados?: number;
  contratosEncerrados?: number;
  bonusPagos?: number;
  motivo?: string;
}

export async function processarViradaDeTemporada(
  ligaId: string,
  referencia: Date = new Date()
): Promise<ResultadoVirada> {
  const ativa = await prisma.temporada.findFirst({
    where: { ligaId, status: "EM_ANDAMENTO" },
    orderBy: { numero: "desc" },
  });

  let jogadoresEvoluidos = 0;
  let contratosRenovados = 0;
  let contratosEncerrados = 0;
  let bonusPagos = 0;

  if (ativa) {
    // 08 §6: a virada só ocorre quando TODAS as competições da temporada
    // terminaram — Liga Nacional e, quando existe, a Copa Nacional.
    const [total, encerradas, copaPendente] = await Promise.all([
      prisma.partida.count({ where: { temporadaId: ativa.id, competicao: "LIGA_NACIONAL" } }),
      prisma.partida.count({
        where: { temporadaId: ativa.id, competicao: "LIGA_NACIONAL", status: "ENCERRADA" },
      }),
      prisma.confrontoCopa.count({
        where: { temporadaId: ativa.id, fase: "FINAL", status: { not: "ENCERRADO" } },
      }),
    ]);
    if (total === 0 || encerradas < total) {
      return { virou: false, motivo: `Liga Nacional ainda em disputa (${encerradas}/${total}).` };
    }
    if (copaPendente > 0) {
      return { virou: false, motivo: "Copa Nacional ainda em disputa." };
    }

    const proximoInicio = new Date(
      (ativa.fimPrevisto ?? ativa.inicio).getTime() + ENTRESSAFRA_SEMANAS * 7 * DIA_MS
    );

    // 1) Premiação da Liga (idempotente).
    await prisma.$transaction((tx) => distribuirPremiacaoLiga(tx, ativa.id), { timeout: 30_000 });

    // 2) Idade + evolução anual de atributos (idempotente por jogador).
    jogadoresEvoluidos = await evoluirJogadores(ligaId, ativa.id);

    // 3) Bônus por desempenho da temporada que terminou (09 §4).
    bonusPagos = await pagarBonusDeDesempenho(ligaId, ativa.id, referencia);

    // 4) Vencimento/renovação de contratos.
    const r = await processarContratos(ligaId, proximoInicio);
    contratosRenovados = r.renovados;
    contratosEncerrados = r.encerrados;

    // 5) Encerra a temporada.
    await prisma.temporada.update({ where: { id: ativa.id }, data: { status: "ENCERRADA" } });
  }

  // 6) Cria a próxima temporada, se ainda não existir.
  const novaTemporadaId = await garantirProximaTemporada(ligaId);

  return {
    virou: true,
    temporadaEncerradaId: ativa?.id,
    novaTemporadaId: novaTemporadaId ?? undefined,
    jogadoresEvoluidos,
    contratosRenovados,
    contratosEncerrados,
    bonusPagos,
  };
}

// --- bônus por desempenho (09 §4) ---------------------------------------

async function pagarBonusDeDesempenho(
  ligaId: string,
  temporadaId: string,
  referencia: Date
): Promise<number> {
  // Campeão da Liga e da Copa desta temporada.
  const [clubesLiga, partidasLiga, finalCopa] = await Promise.all([
    prisma.clube.findMany({ where: { ligaId }, select: { id: true, nome: true } }),
    prisma.partida.findMany({
      where: { temporadaId, competicao: "LIGA_NACIONAL" },
      select: {
        mandanteId: true, visitanteId: true,
        golsMandante: true, golsVisitante: true, status: true,
      },
    }),
    prisma.confrontoCopa.findFirst({
      where: { temporadaId, fase: "FINAL", status: "ENCERRADO" },
      select: { vencedorId: true },
    }),
  ]);
  const campeaoLigaId = calcularClassificacao(clubesLiga, partidasLiga)[0]?.clubeId ?? null;
  const campeaoCopaId = finalCopa?.vencedorId ?? null;

  // Gols por jogador na temporada.
  const golsGrp = await prisma.eventoPartida.groupBy({
    by: ["jogadorId"],
    where: { tipo: "GOL", jogadorId: { not: null }, partida: { temporadaId } },
    _count: { jogadorId: true },
  });
  const golsPorJogador = new Map(golsGrp.map((g) => [g.jogadorId as string, g._count.jogadorId]));

  // Bônus ainda não pagos NESTA temporada (inclui os nunca pagos — coluna NULL).
  const bonusPendentes = await prisma.bonusContrato.findMany({
    where: {
      AND: [
        { contrato: { jogador: { clube: { ligaId } } } },
        { OR: [{ temporadaPagaId: null }, { temporadaPagaId: { not: temporadaId } }] },
      ],
    },
    select: {
      id: true,
      tipo: true,
      meta: true,
      valor: true,
      contrato: { select: { jogador: { select: { id: true, nome: true, clubeId: true } } } },
    },
  });

  let pagos = 0;
  for (const b of bonusPendentes) {
    const jog = b.contrato.jogador;
    if (!jog.clubeId) continue; // jogador sem clube não recebe bônus de clube
    const atingido = bonusAtingido({
      tipo: b.tipo as TipoBonus,
      meta: b.meta,
      golsNaTemporada: golsPorJogador.get(jog.id) ?? 0,
      clubeCampeaoLiga: jog.clubeId === campeaoLigaId,
      clubeCampeaoCopa: jog.clubeId === campeaoCopaId,
    });
    if (!atingido) continue;

    await prisma.$transaction(async (tx) => {
      await registrarMovimentacao(tx, {
        clubeId: jog.clubeId as string,
        tipo: "DESPESA_BONUS_DESEMPENHO",
        valor: b.valor,
        descricao: `Bônus por desempenho (${b.tipo}) — ${jog.nome}`,
        temporadaId,
      });
      await tx.bonusContrato.update({
        where: { id: b.id },
        data: { pagoEm: referencia, temporadaPagaId: temporadaId },
      });
    });
    pagos++;
  }
  return pagos;
}

// --- evolução de jogadores ------------------------------------------------

async function evoluirJogadores(ligaId: string, temporadaId: string): Promise<number> {
  const jogadores = await prisma.jogador.findMany({
    where: {
      AND: [
        { OR: [{ clube: { ligaId } }, { clubeId: null }] }, // Fase 1 roda 1 liga (R32)
        // ainda não evoluído nesta virada (inclui quem nunca evoluiu — coluna NULL)
        { OR: [{ ultimaEvolucaoTemporadaId: null }, { ultimaEvolucaoTemporadaId: { not: temporadaId } }] },
      ],
    },
    select: {
      id: true, idade: true, potencialOculto: true, moral: true,
      finalizacao: true, passe: true, drible: true, cabeceio: true, cruzamento: true,
      marcacao: true, desarme: true, velocidade: true, resistencia: true, forca: true,
      visaoDeJogo: true, posicionamento: true, reflexos: true, saidaDeGol: true,
    },
  });

  let processados = 0;
  for (let i = 0; i < jogadores.length; i += 50) {
    const lote = jogadores.slice(i, i + 50);
    await Promise.all(
      lote.map((j) => {
        const idadeNova = j.idade + 1;
        const atributos: AtributosBasicos = {
          finalizacao: j.finalizacao, passe: j.passe, drible: j.drible, cabeceio: j.cabeceio,
          cruzamento: j.cruzamento, marcacao: j.marcacao, desarme: j.desarme, velocidade: j.velocidade,
          resistencia: j.resistencia, forca: j.forca, visaoDeJogo: j.visaoDeJogo,
          posicionamento: j.posicionamento, reflexos: j.reflexos, saidaDeGol: j.saidaDeGol,
        };
        const novos = evoluirAtributosAnuais({
          atributos,
          idadeNova,
          potencial: j.potencialOculto,
          moral: j.moral,
          rng: createRng(`${temporadaId}:evol:${j.id}`),
        });
        const data: Record<string, number | string> = { idade: idadeNova, ultimaEvolucaoTemporadaId: temporadaId };
        for (const campo of CAMPOS_ATRIBUTO) data[campo] = novos[campo];
        return prisma.jogador.update({ where: { id: j.id }, data });
      })
    );
    processados += lote.length;
  }
  return processados;
}

// --- contratos -----------------------------------------------------------

async function processarContratos(
  ligaId: string,
  proximoInicio: Date
): Promise<{ renovados: number; encerrados: number }> {
  // Só contratos que vencem antes do início da próxima temporada.
  const vencendo = await prisma.contrato.findMany({
    where: {
      fim: { lte: proximoInicio },
      jogador: { clube: { ligaId } },
    },
    select: {
      id: true,
      fim: true,
      jogador: {
        select: {
          id: true, idade: true, posicao: true, clubeId: true,
          clube: { select: { tipo: true, perfilValorizaJovens: true } },
        },
      },
    },
  });

  let renovados = 0;
  let encerrados = 0;

  for (const c of vencendo) {
    const j = c.jogador;
    const ehIA = j.clube?.tipo !== "HUMANO"; // IA ou SAF decidem como IA (12 §6)

    if (ehIA) {
      const naPosicao = await prisma.jogador.count({
        where: { clubeId: j.clubeId as string, posicao: j.posicao },
      });
      const excedente = naPosicao > (TEMPLATE_ELENCO[j.posicao as keyof typeof TEMPLATE_ELENCO] ?? 3);
      // Idade de corte varia com o perfil do clube (12 §1): quem valoriza
      // jovens dispensa veteranos mais cedo.
      const emDeclinio = j.idade >= idadeCorteDispensa(j.clube?.perfilValorizaJovens);
      if (excedente && emDeclinio) {
        // Libera: vira agente livre (09 §1). As cláusulas de sell-on morrem
        // quando o jogador sai de graça (09 §4).
        await prisma.$transaction([
          prisma.contrato.delete({ where: { id: c.id } }),
          prisma.jogador.update({ where: { id: j.id }, data: { clubeId: null } }),
          prisma.sellOn.deleteMany({ where: { jogadorId: j.id } }),
        ]);
        encerrados++;
        continue;
      }
      // Renova por 2 anos, mesmo salário.
      await prisma.contrato.update({
        where: { id: c.id },
        data: { fim: new Date(c.fim.getTime() + 2 * ANO_MS) },
      });
      renovados++;
    } else {
      // Clube humano: renova 1 ano no automático (o presidente ainda pode
      // negociar/vender na pré-temporada). Renovação real via mercado é Fase 2.
      await prisma.contrato.update({
        where: { id: c.id },
        data: { fim: new Date(c.fim.getTime() + 1 * ANO_MS) },
      });
      renovados++;
    }
  }
  return { renovados, encerrados };
}

// --- próxima temporada -------------------------------------------------------

async function garantirProximaTemporada(ligaId: string): Promise<string | null> {
  const ultima = await prisma.temporada.findFirst({
    where: { ligaId },
    orderBy: { numero: "desc" },
  });
  if (!ultima || ultima.status !== "ENCERRADA") return null;

  const jaExiste = await prisma.temporada.findFirst({
    where: { ligaId, numero: ultima.numero + 1 },
    select: { id: true },
  });
  if (jaExiste) return jaExiste.id;

  const proximoInicio = new Date(
    (ultima.fimPrevisto ?? ultima.inicio).getTime() + ENTRESSAFRA_SEMANAS * 7 * DIA_MS
  );

  // Copa Nacional da nova temporada (R35): 16 melhores da Liga que acabou
  // (os 4 últimos ficam de fora). Seeding = classificação final.
  const [clubesLiga, partidasLiga] = await Promise.all([
    prisma.clube.findMany({ where: { ligaId }, select: { id: true, nome: true } }),
    prisma.partida.findMany({
      where: { temporadaId: ultima.id, competicao: "LIGA_NACIONAL" },
      select: {
        mandanteId: true, visitanteId: true,
        golsMandante: true, golsVisitante: true, status: true,
      },
    }),
  ]);
  const classificacaoFinal = calcularClassificacao(clubesLiga, partidasLiga);
  const copa = selecionarParticipantesCopa({
    todosClubesIds: clubesLiga.map((c) => c.id),
    clubesHumanosIds: [],
    classificacaoAnteriorIds: classificacaoFinal.map((l) => l.clubeId),
    seed: `${ligaId}:copa:t${ultima.numero + 1}`,
  });

  const r = await criarTemporadaComCalendario({
    ligaId,
    numero: ultima.numero + 1,
    dataInicio: proximoInicio,
    seedSorteio: `${ligaId}:sorteio:t${ultima.numero + 1}`,
    copa,
  });
  return r.temporadaId;
}
