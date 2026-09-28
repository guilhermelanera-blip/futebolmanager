// Perfil de personalidade dos clubes de IA — 12_IA_DOS_CLUBES §1. Puro.
//
// Cada clube não-humano tem um ARQUÉTIPO que define o centro dos quatro
// eixos de decisão. A distribuição exata entre os clubes do universo é
// "detalhe de implementação" (12 §1): aqui, um sorteio ponderado de
// arquétipos, com ruído por eixo para nenhum clube ser idêntico a outro.

import { createRng } from "../../utils/rng";

export type ArquetipoIA =
  | "GASTADOR"     // agressivo no mercado, tolera risco, joga pra frente
  | "FORMADOR"     // aposta em jovens, mercado moderado
  | "CONSERVADOR"  // cauteloso no dinheiro e na tática
  | "AMBICIOSO"    // busca títulos: gasta e ataca, mas com algum equilíbrio
  | "EQUILIBRADO"; // sem tendência forte

export interface PerfilIA {
  arquetipo: ArquetipoIA;
  agressividadeMercado: number; // 0..1
  toleranciaRisco: number; // 0..1
  posturaTatica: number; // 0 (defensivo) .. 1 (ofensivo)
  valorizaJovens: number; // 0 (experientes) .. 1 (jovens em formação)
}

interface CentroArquetipo {
  peso: number;
  agressividadeMercado: number;
  toleranciaRisco: number;
  posturaTatica: number;
  valorizaJovens: number;
}

const CENTROS: Record<ArquetipoIA, CentroArquetipo> = {
  GASTADOR: { peso: 2, agressividadeMercado: 0.85, toleranciaRisco: 0.8, posturaTatica: 0.65, valorizaJovens: 0.3 },
  FORMADOR: { peso: 3, agressividadeMercado: 0.45, toleranciaRisco: 0.4, posturaTatica: 0.5, valorizaJovens: 0.85 },
  CONSERVADOR: { peso: 3, agressividadeMercado: 0.25, toleranciaRisco: 0.2, posturaTatica: 0.35, valorizaJovens: 0.5 },
  AMBICIOSO: { peso: 2, agressividadeMercado: 0.7, toleranciaRisco: 0.6, posturaTatica: 0.7, valorizaJovens: 0.55 },
  EQUILIBRADO: { peso: 4, agressividadeMercado: 0.5, toleranciaRisco: 0.5, posturaTatica: 0.5, valorizaJovens: 0.5 },
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function sortearArquetipo(rng: () => number): ArquetipoIA {
  const entradas = Object.entries(CENTROS) as [ArquetipoIA, CentroArquetipo][];
  const total = entradas.reduce((s, [, c]) => s + c.peso, 0);
  let r = rng() * total;
  for (const [nome, c] of entradas) {
    r -= c.peso;
    if (r < 0) return nome;
  }
  return "EQUILIBRADO";
}

/** ~normal via soma de 3 uniformes, centrada em 0, amplitude ~±0.12. */
function ruido(rng: () => number): number {
  return ((rng() + rng() + rng()) / 3 - 0.5) * 0.24;
}

export function gerarPerfilIA(seed: string): PerfilIA {
  const rng = createRng(seed);
  const arquetipo = sortearArquetipo(rng);
  const c = CENTROS[arquetipo];
  return {
    arquetipo,
    agressividadeMercado: Number(clamp01(c.agressividadeMercado + ruido(rng)).toFixed(3)),
    toleranciaRisco: Number(clamp01(c.toleranciaRisco + ruido(rng)).toFixed(3)),
    posturaTatica: Number(clamp01(c.posturaTatica + ruido(rng)).toFixed(3)),
    valorizaJovens: Number(clamp01(c.valorizaJovens + ruido(rng)).toFixed(3)),
  };
}

/** Traduz o eixo de postura tática (0..1) para a postura do motor de partida. */
export function posturaParaMotor(
  perfilPosturaTatica: number | null | undefined
): "DEFENSIVA" | "EQUILIBRADA" | "OFENSIVA" {
  const p = perfilPosturaTatica ?? 0.5;
  if (p < 0.38) return "DEFENSIVA";
  if (p > 0.62) return "OFENSIVA";
  return "EQUILIBRADA";
}

/**
 * Idade a partir da qual um clube de IA libera um jogador excedente na virada
 * (12 §1 — "valorização de jovens vs. experientes"). Quem valoriza jovens
 * segura os garotos e dispensa os veteranos mais cedo.
 */
export function idadeCorteDispensa(perfilValorizaJovens: number | null | undefined): number {
  const v = perfilValorizaJovens ?? 0.5;
  if (v > 0.65) return 31;
  if (v < 0.35) return 35;
  return 33;
}
