// Copa Nacional — 00 R34/R36/R38, 06 §2. Cria os confrontos de todas as
// fases no início da temporada (datas reservadas) e vai preenchendo/avançando
// conforme as partidas de mata-mata são encerradas.

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { montarSeedPartida } from "../partida/partida.seed";
import { getVarios } from "../financas/config.service";
import { P } from "../financas/parametros";
import { registrarMovimentacao } from "../financas/financas.service";
import { SelecaoParticipantes } from "./copa.participantes";
import { parseTracos, bonusPenaltiDe } from "../jogador/tracos";

/** Bônus de pênalti agregado do elenco de um clube (cap em +0,08). */
async function bonusPenaltiDoElenco(tx: Tx, clubeId: string): Promise<number> {
  const js = await tx.jogador.findMany({
    where: { clubeId, tracos: { contains: "FRIO_NOS_PENALTIS" } },
    select: { tracos: true },
  });
  const total = js.reduce((s, j) => s + bonusPenaltiDe(parseTracos(j.tracos)), 0);
  return Math.min(0.08, total);
}
import {
  gerarBracketInicial,
  proximaFase,
  sortearMandoVolta,
  resolverConfronto,
  FaseCopa,
} from "./copa.bracket";

type Tx = Prisma.TransactionClient;

const FASES_PADRAO_16: { fase: FaseCopa; ordens: number }[] = [
  { fase: "OITAVAS", ordens: 8 },
  { fase: "QUARTAS", ordens: 4 },
  { fase: "SEMIS", ordens: 2 },
  { fase: "FINAL", ordens: 1 },
];
const FASES_EXPANDIDO_32: { fase: FaseCopa; ordens: number }[] = [
  { fase: "PRELIMINAR", ordens: 16 },
  ...FASES_PADRAO_16,
];

function rodadaBase(fase: FaseCopa): number {
  switch (fase) {
    case "PRELIMINAR": return 1;
    case "OITAVAS": return 2;
    case "QUARTAS": return 4;
    case "SEMIS": return 6;
    case "FINAL": return 8;
  }
}

function chavePremioFase(fase: FaseCopa): string {
  switch (fase) {
    case "PRELIMINAR": return P.PREMIACAO_COPA_PRELIMINAR;
    case "OITAVAS": return P.PREMIACAO_COPA_OITAVAS;
    case "QUARTAS": return P.PREMIACAO_COPA_QUARTAS;
    case "SEMIS": return P.PREMIACAO_COPA_SEMIFINAL;
    case "FINAL": return P.PREMIACAO_COPA_VICE; // quem perde a final é vice
  }
}

// --- criação ---------------------------------------------------------------

export interface CriarConfrontosCopaParams {
  temporadaId: string;
  selecao: SelecaoParticipantes;
  seed: string;
  datasCopa: Map<string, Date>; // "FASE:1" | "FASE:2" | "FASE:U" -> data
}

export async function criarConfrontosCopa(
  tx: Tx,
  params: CriarConfrontosCopaParams
): Promise<number> {
  const bracket = gerarBracketInicial(params.selecao.clubesPorSeed, params.seed);
  const fases =
    params.selecao.formato === "EXPANDIDO_32" ? FASES_EXPANDIDO_32 : FASES_PADRAO_16;
  const primeiraFase = fases[0].fase;

  let total = 0;
  for (const { fase, ordens } of fases) {
    const jogoUnico = fase === "PRELIMINAR";
    const dataIda = params.datasCopa.get(`${fase}:${jogoUnico ? "U" : "1"}`) ?? null;
    const dataVolta = jogoUnico ? null : params.datasCopa.get(`${fase}:2`) ?? null;

    for (let ordem = 0; ordem < ordens; ordem++) {
      const inicial = fase === primeiraFase ? bracket[ordem] : null;
      // Para jogo único, `mandoVoltaClubeId` é reaproveitado como "mandante".
      const mando =
        inicial && jogoUnico
          ? sortearMandoVolta(params.seed, fase, ordem, inicial.clubeAId, inicial.clubeBId)
          : inicial?.mandoVoltaClubeId ?? null;

      const confronto = await tx.confrontoCopa.create({
        data: {
          temporadaId: params.temporadaId,
          fase,
          ordem,
          jogoUnico,
          clubeAId: inicial?.clubeAId ?? null,
          clubeBId: inicial?.clubeBId ?? null,
          mandoVoltaClubeId: mando,
          dataIdaPrevista: dataIda,
          dataVoltaPrevista: dataVolta,
          status: "AGUARDANDO",
        },
      });
      total++;

      if (inicial) {
        await criarPartidasDoConfronto(tx, params.temporadaId, {
          id: confronto.id,
          fase,
          ordem,
          jogoUnico,
          clubeAId: inicial.clubeAId,
          clubeBId: inicial.clubeBId,
          mandoVoltaClubeId: mando as string,
          dataIdaPrevista: dataIda,
          dataVoltaPrevista: dataVolta,
        });
      }
    }
  }
  return total;
}

interface ConfrontoParaPartidas {
  id: string;
  fase: FaseCopa;
  ordem: number;
  jogoUnico: boolean;
  clubeAId: string;
  clubeBId: string;
  mandoVoltaClubeId: string;
  dataIdaPrevista: Date | null;
  dataVoltaPrevista: Date | null;
}

async function criarPartidasDoConfronto(
  tx: Tx,
  temporadaId: string,
  c: ConfrontoParaPartidas
): Promise<void> {
  const outro = (x: string) => (x === c.clubeAId ? c.clubeBId : c.clubeAId);
  const base = rodadaBase(c.fase);

  // IDA (ou jogo único): manda quem NÃO joga a volta em casa.
  const mandanteIda = c.jogoUnico ? c.mandoVoltaClubeId : outro(c.mandoVoltaClubeId);
  const visitanteIda = outro(mandanteIda);
  const pIda = await tx.partida.create({
    data: {
      temporadaId,
      competicao: "COPA_NACIONAL",
      rodada: base,
      confrontoCopaId: c.id,
      mandanteId: mandanteIda,
      visitanteId: visitanteIda,
      dataHora: c.dataIdaPrevista as Date,
      seed: montarSeedPartida({
        temporadaId,
        competicao: "COPA_NACIONAL",
        rodada: base,
        mandanteId: mandanteIda,
        visitanteId: visitanteIda,
      }),
      status: "AGENDADA",
    },
  });

  let partidaVoltaId: string | null = null;
  if (!c.jogoUnico) {
    const mandanteVolta = c.mandoVoltaClubeId;
    const visitanteVolta = outro(mandanteVolta);
    const pVolta = await tx.partida.create({
      data: {
        temporadaId,
        competicao: "COPA_NACIONAL",
        rodada: base + 1,
        confrontoCopaId: c.id,
        mandanteId: mandanteVolta,
        visitanteId: visitanteVolta,
        dataHora: c.dataVoltaPrevista as Date,
        seed: montarSeedPartida({
          temporadaId,
          competicao: "COPA_NACIONAL",
          rodada: base + 1,
          mandanteId: mandanteVolta,
          visitanteId: visitanteVolta,
        }),
        status: "AGENDADA",
      },
    });
    partidaVoltaId = pVolta.id;
  }

  await tx.confrontoCopa.update({
    where: { id: c.id },
    data: { partidaIdaId: pIda.id, partidaVoltaId, status: "EM_ANDAMENTO" },
  });
}

// --- avanço --------------------------------------------------------------

async function premiarCopa(
  tx: Tx,
  temporadaId: string,
  clubeId: string,
  chaveParam: string,
  rotulo: string
): Promise<void> {
  const jaPago = await tx.movimentacaoFinanceira.findFirst({
    where: {
      temporadaId,
      clubeId,
      tipo: "RECEITA_PREMIACAO",
      descricao: { contains: "Copa Nacional" },
    },
    select: { id: true },
  });
  if (jaPago) return;
  const valor = (await getVarios([chaveParam]))[chaveParam];
  await registrarMovimentacao(tx, {
    clubeId,
    tipo: "RECEITA_PREMIACAO",
    valor,
    descricao: `Premiação Copa Nacional — ${rotulo}`,
    temporadaId,
  });
}

/** Chamado após encerrar uma partida de Copa. Resolve o confronto se ambas as
 *  pernas terminaram e, se toda a fase acabou, monta a fase seguinte. */
export async function avancarAposPartida(partidaId: string): Promise<void> {
  const partida = await prisma.partida.findUnique({
    where: { id: partidaId },
    select: { competicao: true, confrontoCopaId: true, temporadaId: true },
  });
  if (!partida || partida.competicao !== "COPA_NACIONAL" || !partida.confrontoCopaId) return;

  await prisma.$transaction(async (tx) => {
    const confronto = await tx.confrontoCopa.findUnique({
      where: { id: partida.confrontoCopaId as string },
    });
    if (!confronto || confronto.status === "ENCERRADO") return;
    if (!confronto.clubeAId || !confronto.clubeBId) return;

    const pIda = confronto.partidaIdaId
      ? await tx.partida.findUnique({ where: { id: confronto.partidaIdaId } })
      : null;
    const pVolta = confronto.partidaVoltaId
      ? await tx.partida.findUnique({ where: { id: confronto.partidaVoltaId } })
      : null;

    const pronto = confronto.jogoUnico
      ? pIda?.status === "ENCERRADA"
      : pIda?.status === "ENCERRADA" && pVolta?.status === "ENCERRADA";
    if (!pronto || !pIda) return;

    const A = confronto.clubeAId;
    const B = confronto.clubeBId;
    const [cA, cB, bonusPenA, bonusPenB] = await Promise.all([
      tx.clube.findUniqueOrThrow({ where: { id: A }, select: { reputacao: true } }),
      tx.clube.findUniqueOrThrow({ where: { id: B }, select: { reputacao: true } }),
      bonusPenaltiDoElenco(tx, A),
      bonusPenaltiDoElenco(tx, B),
    ]);

    const placarLeg = (p: { mandanteId: string; golsMandante: number | null; golsVisitante: number | null }) => {
      const gm = p.golsMandante ?? 0;
      const gv = p.golsVisitante ?? 0;
      return p.mandanteId === A ? { golsA: gm, golsB: gv } : { golsA: gv, golsB: gm };
    };

    const res = resolverConfronto({
      ida: placarLeg(pIda),
      volta: pVolta ? placarLeg(pVolta) : undefined,
      seed: confronto.id,
      forcaA: cA.reputacao,
      forcaB: cB.reputacao,
      bonusPenaltiA: bonusPenA,
      bonusPenaltiB: bonusPenB,
    });
    const vencedorId = res.vencedor === "A" ? A : B;
    const perdedorId = res.vencedor === "A" ? B : A;

    await tx.confrontoCopa.update({
      where: { id: confronto.id },
      data: {
        status: "ENCERRADO",
        golsAgregadoA: res.agregadoA,
        golsAgregadoB: res.agregadoB,
        penaltisA: res.penaltisA ?? null,
        penaltisB: res.penaltisB ?? null,
        vencedorId,
      },
    });

    const fase = confronto.fase as FaseCopa;
    if (fase === "FINAL") {
      await premiarCopa(tx, partida.temporadaId, vencedorId, P.PREMIACAO_COPA_CAMPEAO, "Campeão");
      await premiarCopa(tx, partida.temporadaId, perdedorId, P.PREMIACAO_COPA_VICE, "Vice-campeão");
      return;
    }
    await premiarCopa(tx, partida.temporadaId, perdedorId, chavePremioFase(fase), rotuloFase(fase));

    // Toda a fase encerrou? Monta a próxima.
    const pendentes = await tx.confrontoCopa.count({
      where: { temporadaId: partida.temporadaId, fase, status: { not: "ENCERRADO" } },
    });
    if (pendentes > 0) return;

    const prox = proximaFase(fase);
    if (!prox) return;

    const encerrados = await tx.confrontoCopa.findMany({
      where: { temporadaId: partida.temporadaId, fase },
      orderBy: { ordem: "asc" },
    });
    const proximos = await tx.confrontoCopa.findMany({
      where: { temporadaId: partida.temporadaId, fase: prox },
      orderBy: { ordem: "asc" },
    });

    for (const pc of proximos) {
      const wA = encerrados[pc.ordem * 2]?.vencedorId;
      const wB = encerrados[pc.ordem * 2 + 1]?.vencedorId;
      if (!wA || !wB) continue;
      const mando = sortearMandoVolta(`${partida.temporadaId}:copa`, prox, pc.ordem, wA, wB);
      await tx.confrontoCopa.update({
        where: { id: pc.id },
        data: { clubeAId: wA, clubeBId: wB, mandoVoltaClubeId: mando },
      });
      await criarPartidasDoConfronto(tx, partida.temporadaId, {
        id: pc.id,
        fase: prox,
        ordem: pc.ordem,
        jogoUnico: pc.jogoUnico,
        clubeAId: wA,
        clubeBId: wB,
        mandoVoltaClubeId: mando,
        dataIdaPrevista: pc.dataIdaPrevista,
        dataVoltaPrevista: pc.dataVoltaPrevista,
      });
    }
  });
}

function rotuloFase(fase: FaseCopa): string {
  switch (fase) {
    case "PRELIMINAR": return "Preliminar";
    case "OITAVAS": return "Oitavas de final";
    case "QUARTAS": return "Quartas de final";
    case "SEMIS": return "Semifinal";
    case "FINAL": return "Final";
  }
}
