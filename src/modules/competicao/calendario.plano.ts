// Plano de calendário da temporada — 06_COMPETICOES_E_CALENDARIO seção 4,
// 00_REGRAS_IMUTAVEIS R30/R31.
//
// Cada semana tem dois slots: QUARTA 21:00 e DOMINGO 15:00.
//   - DOMINGO é sempre Liga Nacional.
//   - QUARTA é Liga Nacional por padrão, mas uma rodada de Copa Nacional
//     SUBSTITUI a rodada de meio de semana da liga naquela semana (R31);
//     as rodadas de liga deslocadas empurram o fim da temporada.
//
// Função PURA: só decide "que competição joga em cada slot"; datas e
// pareamentos ficam no serviço.

import { FaseCopa } from "./copa.bracket";

export type CompeticaoSlot = "LIGA_NACIONAL" | "COPA_NACIONAL" | "VAZIO";
export type DiaSlot = "QUA" | "DOM";

export interface Slot {
  semana: number; // 0-based
  dia: DiaSlot;
  competicao: CompeticaoSlot;
  copaFase?: FaseCopa;
  copaLeg?: 1 | 2; // 1 = ida, 2 = volta (ausente em jogo único)
  copaJogoUnico?: boolean;
  copaRodadaNum?: number; // 1..N — ordem cronológica das rodadas de copa
}

export interface PlanoTemporada {
  semanas: number;
  slots: Slot[]; // ordem cronológica (por semana: QUA depois DOM)
  rodadasLiga: number;
  rodadasCopa: number;
}

export interface OpcoesPlano {
  rodadasLiga?: number; // padrão 38
  copa?: "NENHUMA" | "PADRAO" | "COM_PRELIMINAR";
  // semana da 1ª rodada de copa e intervalo entre o início de fases consecutivas
  semanaBaseCopa?: number;
  intervaloEntreFases?: number;
}

interface FasePlano {
  fase: FaseCopa;
  legs: number; // 1 ou 2
}

function fasesDaCopa(copa: NonNullable<OpcoesPlano["copa"]>): FasePlano[] {
  if (copa === "NENHUMA") return [];
  const base: FasePlano[] = [
    { fase: "OITAVAS", legs: 2 },
    { fase: "QUARTAS", legs: 2 },
    { fase: "SEMIS", legs: 2 },
    { fase: "FINAL", legs: 2 },
  ];
  if (copa === "COM_PRELIMINAR") return [{ fase: "PRELIMINAR", legs: 1 }, ...base];
  return base;
}

export function planejarTemporada(opts: OpcoesPlano = {}): PlanoTemporada {
  const rodadasLiga = opts.rodadasLiga ?? 38;
  const copa = opts.copa ?? "NENHUMA";
  const fases = fasesDaCopa(copa);
  const rodadasCopa = fases.reduce((s, f) => s + f.legs, 0);

  const totalRodadas = rodadasLiga + rodadasCopa;
  const semanas = Math.ceil(totalRodadas / 2);

  // Semanas de QUARTA que serão de Copa: cada fase ocupa `legs` semanas
  // consecutivas; entre o início de fases consecutivas há um intervalo.
  const base = opts.semanaBaseCopa ?? (copa === "COM_PRELIMINAR" ? 1 : 2);
  const intervalo = opts.intervaloEntreFases ?? 5;

  const copaPorSemana = new Map<number, { fase: FaseCopa; leg: 1 | 2; jogoUnico: boolean }>();
  let inicioFase = base;
  let copaRodadaNum = 0;
  for (const f of fases) {
    for (let leg = 0; leg < f.legs; leg++) {
      const semana = inicioFase + leg;
      if (semana >= semanas) {
        throw new Error(
          `Plano de calendário inválido: rodada de copa cairia na semana ${semana} de ${semanas}. ` +
            `Ajuste semanaBaseCopa/intervaloEntreFases.`
        );
      }
      copaPorSemana.set(semana, {
        fase: f.fase,
        leg: (leg + 1) as 1 | 2,
        jogoUnico: f.legs === 1,
      });
    }
    inicioFase += Math.max(f.legs, intervalo);
  }

  const slots: Slot[] = [];
  let ligaAlocadas = 0;
  for (let w = 0; w < semanas; w++) {
    // QUARTA
    const copaAqui = copaPorSemana.get(w);
    if (copaAqui) {
      copaRodadaNum++;
      slots.push({
        semana: w,
        dia: "QUA",
        competicao: "COPA_NACIONAL",
        copaFase: copaAqui.fase,
        copaLeg: copaAqui.jogoUnico ? undefined : copaAqui.leg,
        copaJogoUnico: copaAqui.jogoUnico,
        copaRodadaNum,
      });
    } else if (ligaAlocadas < rodadasLiga) {
      slots.push({ semana: w, dia: "QUA", competicao: "LIGA_NACIONAL" });
      ligaAlocadas++;
    } else {
      slots.push({ semana: w, dia: "QUA", competicao: "VAZIO" });
    }
    // DOMINGO (sempre liga, enquanto houver rodada)
    if (ligaAlocadas < rodadasLiga) {
      slots.push({ semana: w, dia: "DOM", competicao: "LIGA_NACIONAL" });
      ligaAlocadas++;
    } else {
      slots.push({ semana: w, dia: "DOM", competicao: "VAZIO" });
    }
  }

  if (ligaAlocadas !== rodadasLiga) {
    throw new Error(
      `Plano de calendário inconsistente: ${ligaAlocadas} rodadas de liga alocadas, esperado ${rodadasLiga}.`
    );
  }

  return { semanas, slots, rodadasLiga, rodadasCopa };
}
