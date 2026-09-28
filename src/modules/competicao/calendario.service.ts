// Persistência do calendário da Liga Nacional: cria a Temporada e todas as
// Partidas (38 rodadas para 20 clubes), já agendadas nos slots fixos de R30.
//
// Slots (00_REGRAS_IMUTAVEIS R17/R30, 06_COMPETICOES_E_CALENDARIO seção 4):
//   - Rodada de meio de semana: QUARTA às 21:00
//   - Rodada de fim de semana:  DOMINGO às 15:00
// Fuso oficial: America/Sao_Paulo (08_RELOGIO_E_SIMULACAO, seção 5).
//
// Nota sobre fuso: o Brasil não adota horário de verão desde 2019, então
// BRT = UTC-3 fixo. As datas são construídas somando 3h ao horário de
// parede desejado para obter o instante UTC. Se algum dia o horário de
// verão voltar, isto precisa passar a usar uma lib de timezone (ex.: Luxon).
//
// Fase 1 só tem Liga Nacional (sem Copa substituindo o meio de semana,
// R31), então os dois slots de cada semana são usados: rodada ímpar na
// quarta, rodada par no domingo seguinte.

import { prisma } from "../../config/prisma";
import { gerarCalendarioIdaEVolta } from "./calendario.generator";
import { montarSeedPartida } from "../partida/partida.seed";
import { planejarTemporada } from "./calendario.plano";
import { SelecaoParticipantes } from "./copa.participantes";
import { criarConfrontosCopa } from "./copa.service";

const OFFSET_BRT_HORAS = 3; // UTC-3 fixo (ver nota acima)

// Toda a aritmética de calendário é feita em "data civil BRT" (ano/mês/dia
// no horário de Brasília), e só no final convertemos para um instante UTC.
// Isso evita que o rollover de dia (21:00 BRT = 00:00 UTC do dia seguinte)
// desloque o dia da semana.
type DataCivil = { ano: number; mes0: number; dia: number };

/** Instante UTC de um horário de parede em America/Sao_Paulo. */
function instanteBRT(d: DataCivil, hora: number): Date {
  return new Date(Date.UTC(d.ano, d.mes0, d.dia, hora + OFFSET_BRT_HORAS, 0, 0));
}

function civilMaisDias({ ano, mes0, dia }: DataCivil, dias: number): DataCivil {
  const base = new Date(Date.UTC(ano, mes0, dia));
  base.setUTCDate(base.getUTCDate() + dias);
  return { ano: base.getUTCFullYear(), mes0: base.getUTCMonth(), dia: base.getUTCDate() };
}

/** Dia da semana (0=domingo..6=sábado) de uma data civil. */
function diaDaSemana({ ano, mes0, dia }: DataCivil): number {
  return new Date(Date.UTC(ano, mes0, dia)).getUTCDay();
}

/** Data civil BRT da primeira quarta-feira em `aPartirDe` (BRT) ou depois. */
function primeiraQuartaCivil(aPartirDe: Date): DataCivil {
  const civil: DataCivil = {
    ano: aPartirDe.getUTCFullYear(),
    mes0: aPartirDe.getUTCMonth(),
    dia: aPartirDe.getUTCDate(),
  };
  const ajuste = (3 - diaDaSemana(civil) + 7) % 7; // 3 = quarta
  return civilMaisDias(civil, ajuste);
}

/**
 * Data/hora de um slot do plano de calendário.
 * @param quartaCivilSemana0 data civil BRT da quarta-feira da semana 0.
 */
export function dataDoSlot(
  quartaCivilSemana0: DataCivil,
  semana: number,
  dia: "QUA" | "DOM"
): Date {
  const quartaDaSemana = civilMaisDias(quartaCivilSemana0, semana * 7);
  if (dia === "QUA") return instanteBRT(quartaDaSemana, 21);
  return instanteBRT(civilMaisDias(quartaDaSemana, 4), 15); // domingo 15:00
}

/** Compat: data de uma rodada de liga num calendário SÓ de liga (Fase 1). */
export function dataHoraDaRodada(quartaCivilSemana0: DataCivil, rodada: number): Date {
  const semana = Math.floor((rodada - 1) / 2);
  return dataDoSlot(quartaCivilSemana0, semana, rodada % 2 === 1 ? "QUA" : "DOM");
}

export interface CriarTemporadaParams {
  ligaId: string;
  numero: number;
  /** A partir de quando agendar; o gerador acha a 1ª quarta ≥ esta data. */
  dataInicio: Date;
  /** Seed do sorteio inicial de confrontos (método do círculo). */
  seedSorteio: string;
  /** Participantes da Copa Nacional (Fase 2). Omitido → temporada só de liga. */
  copa?: SelecaoParticipantes | null;
}

export interface CriarTemporadaResultado {
  temporadaId: string;
  qtdeRodadas: number;
  qtdePartidas: number;
  qtdeConfrontosCopa: number;
  inicio: Date;
  fimPrevisto: Date;
}

export async function criarTemporadaComCalendario(
  params: CriarTemporadaParams
): Promise<CriarTemporadaResultado> {
  const clubes = await prisma.clube.findMany({
    where: { ligaId: params.ligaId },
    orderBy: { criadoEm: "asc" },
    select: { id: true },
  });
  if (clubes.length < 2 || clubes.length % 2 !== 0) {
    throw new Error(
      `Liga ${params.ligaId} tem ${clubes.length} clubes; o round-robin exige um número par ≥ 2 (esperado 20 na Liga Nacional).`
    );
  }

  const copaFormato = params.copa
    ? params.copa.formato === "EXPANDIDO_32"
      ? "COM_PRELIMINAR"
      : "PADRAO"
    : "NENHUMA";
  const plano = planejarTemporada({ copa: copaFormato });
  const quartaCivil0 = primeiraQuartaCivil(params.dataInicio);

  // 1) Datas de cada slot.
  const slotsComData = plano.slots.map((s) => ({
    slot: s,
    data: dataDoSlot(quartaCivil0, s.semana, s.dia),
  }));
  const datasNaoVazias = slotsComData
    .filter((x) => x.slot.competicao !== "VAZIO")
    .map((x) => x.data.getTime());
  const inicio = new Date(Math.min(...datasNaoVazias));
  const fimPrevisto = new Date(Math.max(...datasNaoVazias));

  // 2) Slots de liga em ordem cronológica → rodada 1..38.
  const ligaSlots = slotsComData.filter((x) => x.slot.competicao === "LIGA_NACIONAL");
  const confrontosLiga = gerarCalendarioIdaEVolta(clubes.length, params.seedSorteio);

  // 3) Datas de cada rodada de copa, por fase e leg ("FASE:1" | "FASE:2" | "FASE:U").
  const datasCopa = new Map<string, Date>();
  for (const x of slotsComData) {
    if (x.slot.competicao !== "COPA_NACIONAL") continue;
    const leg = x.slot.copaJogoUnico ? "U" : String(x.slot.copaLeg);
    datasCopa.set(`${x.slot.copaFase}:${leg}`, x.data);
  }

  return prisma.$transaction(
    async (tx) => {
      const temporada = await tx.temporada.create({
        data: {
          ligaId: params.ligaId,
          numero: params.numero,
          inicio,
          fimPrevisto,
          status: "EM_ANDAMENTO",
        },
      });

      const partidasLiga = confrontosLiga.map((c) => {
        const mandanteId = clubes[c.mandanteIndex].id;
        const visitanteId = clubes[c.visitanteIndex].id;
        const slot = ligaSlots[c.rodada - 1];
        return {
          temporadaId: temporada.id,
          competicao: "LIGA_NACIONAL",
          rodada: c.rodada,
          mandanteId,
          visitanteId,
          dataHora: slot.data,
          seed: montarSeedPartida({
            temporadaId: temporada.id,
            competicao: "LIGA_NACIONAL",
            rodada: c.rodada,
            mandanteId,
            visitanteId,
          }),
          status: "AGENDADA",
        };
      });
      await tx.partida.createMany({ data: partidasLiga });

      let qtdeConfrontosCopa = 0;
      if (params.copa) {
        qtdeConfrontosCopa = await criarConfrontosCopa(tx, {
          temporadaId: temporada.id,
          selecao: params.copa,
          seed: `${params.seedSorteio}:copa`,
          datasCopa,
        });
      }

      return {
        temporadaId: temporada.id,
        qtdeRodadas: plano.rodadasLiga + plano.rodadasCopa,
        qtdePartidas: partidasLiga.length,
        qtdeConfrontosCopa,
        inicio,
        fimPrevisto,
      };
    },
    { timeout: 30_000 }
  );
}
