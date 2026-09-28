// Bracket da Copa Nacional — 00_REGRAS_IMUTAVEIS R34/R36/R38,
// 06_COMPETICOES_E_CALENDARIO seção 2.
//
// - Padrão (T2+): 16 clubes, mata-mata a partir das oitavas, ida e volta,
//   sorteio define quem joga a VOLTA em casa (R34).
// - T1 com 17-20 clubes humanos: 32 clubes, com PRELIMINAR de jogo único
//   reduzindo a 16, e daí segue o padrão (R38).
//
// Tudo determinístico dado o seed (auditável). Funções PURAS.

import { createRng } from "../../utils/rng";

export type FaseCopa = "PRELIMINAR" | "OITAVAS" | "QUARTAS" | "SEMIS" | "FINAL";

export const ORDEM_FASES: FaseCopa[] = ["PRELIMINAR", "OITAVAS", "QUARTAS", "SEMIS", "FINAL"];

export function proximaFase(fase: FaseCopa): FaseCopa | null {
  const i = ORDEM_FASES.indexOf(fase);
  return i >= 0 && i < ORDEM_FASES.length - 1 ? ORDEM_FASES[i + 1] : null;
}

/** Ordem do confronto na fase seguinte: dois confrontos consecutivos convergem. */
export function ordemNaProximaFase(ordem: number): number {
  return Math.floor(ordem / 2);
}

// Ordem de "chaveamento" (seeding) padrão para que os cabeças de chave só se
// encontrem o mais tarde possível.
const SEED_ORDER_16 = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15];
const SEED_ORDER_32 = [
  1, 32, 16, 17, 8, 25, 9, 24, 5, 28, 12, 21, 13, 20, 4, 29,
  3, 30, 14, 19, 6, 27, 11, 22, 10, 23, 7, 26, 2, 31, 15, 18,
];

export interface ConfrontoBracket {
  fase: FaseCopa;
  ordem: number;
  clubeAId: string;
  clubeBId: string;
  jogoUnico: boolean;
  /** Clube que joga a VOLTA em casa (R34). Indefinido em jogo único. */
  mandoVoltaClubeId?: string;
}

/** Sorteia quem joga a volta em casa, de forma determinística. */
export function sortearMandoVolta(
  seed: string,
  fase: FaseCopa,
  ordem: number,
  clubeAId: string,
  clubeBId: string
): string {
  const rng = createRng(`${seed}:mando:${fase}:${ordem}`);
  return rng() < 0.5 ? clubeAId : clubeBId;
}

/**
 * Confrontos da PRIMEIRA fase eliminatória.
 * @param clubesPorSeed clubes ordenados por força/classificação (seed 1 = índice 0).
 *   Deve ter 16 (começa nas OITAVAS) ou 32 (começa na PRELIMINAR).
 */
export function gerarBracketInicial(clubesPorSeed: string[], seed: string): ConfrontoBracket[] {
  const n = clubesPorSeed.length;
  if (n !== 16 && n !== 32) {
    throw new Error(`Copa Nacional exige 16 ou 32 clubes no bracket inicial (recebido ${n}).`);
  }
  const seedOrder = n === 16 ? SEED_ORDER_16 : SEED_ORDER_32;
  const fase: FaseCopa = n === 16 ? "OITAVAS" : "PRELIMINAR";
  const jogoUnico = n === 32; // a preliminar da T1 é jogo único (R38)

  const confrontos: ConfrontoBracket[] = [];
  for (let ordem = 0; ordem < n / 2; ordem++) {
    const seedA = seedOrder[ordem * 2];
    const seedB = seedOrder[ordem * 2 + 1];
    const clubeAId = clubesPorSeed[seedA - 1];
    const clubeBId = clubesPorSeed[seedB - 1];
    const c: ConfrontoBracket = { fase, ordem, clubeAId, clubeBId, jogoUnico };
    if (!jogoUnico) {
      c.mandoVoltaClubeId = sortearMandoVolta(seed, fase, ordem, clubeAId, clubeBId);
    }
    confrontos.push(c);
  }
  return confrontos;
}

// --- resolução de confronto -------------------------------------------------

export interface PlacarLeg {
  golsA: number;
  golsB: number;
}

export interface ResultadoConfronto {
  vencedor: "A" | "B";
  agregadoA: number;
  agregadoB: number;
  decididoNosPenaltis: boolean;
  penaltisA?: number;
  penaltisB?: number;
}

/** Disputa de pênaltis determinística (melhor de 5 + morte súbita).
 *  `bonusA`/`bonusB` (p.p.) somam à taxa de conversão — ex.: jogadores com o
 *  traço "frio nos pênaltis" (04 §10). */
export function disputaPenaltis(
  seed: string,
  forcaA: number,
  forcaB: number,
  bonusA = 0,
  bonusB = 0
): { a: number; b: number; vencedor: "A" | "B" } {
  const rng = createRng(`${seed}:penaltis`);
  const probA = Math.min(0.9, Math.max(0.15, 0.75 + (forcaA - forcaB) / 250 + bonusA));
  const probB = Math.min(0.9, Math.max(0.15, 0.75 + (forcaB - forcaA) / 250 + bonusB));

  let a = 0;
  let b = 0;
  for (let i = 0; i < 5; i++) {
    if (rng() < probA) a++;
    if (rng() < probB) b++;
  }
  // morte súbita
  let guarda = 0;
  while (a === b && guarda++ < 50) {
    const marcouA = rng() < probA;
    const marcouB = rng() < probB;
    if (marcouA) a++;
    if (marcouB) b++;
  }
  if (a === b) a++; // desempate final teórico (guarda de segurança)
  return { a, b, vencedor: a > b ? "A" : "B" };
}

/**
 * Resolve um confronto de dois jogos (ou um, se jogo único).
 * @param mandoVoltaEhA true se o clube A joga a VOLTA em casa (afeta só a
 *   ordenação ida/volta — o placar já vem resolvido).
 */
export function resolverConfronto(params: {
  ida: PlacarLeg;
  volta?: PlacarLeg; // ausente em jogo único
  seed: string;
  forcaA: number;
  forcaB: number;
  bonusPenaltiA?: number; // p.p. de conversão extra (04 §10 — "frio nos pênaltis")
  bonusPenaltiB?: number;
}): ResultadoConfronto {
  const agregadoA = params.ida.golsA + (params.volta?.golsA ?? 0);
  const agregadoB = params.ida.golsB + (params.volta?.golsB ?? 0);

  if (agregadoA !== agregadoB) {
    return {
      vencedor: agregadoA > agregadoB ? "A" : "B",
      agregadoA,
      agregadoB,
      decididoNosPenaltis: false,
    };
  }
  // Empate no agregado → pênaltis (06 não fixa critério; adotado pênaltis,
  // sem regra de gol fora — alinhado ao futebol atual).
  const p = disputaPenaltis(
    params.seed,
    params.forcaA,
    params.forcaB,
    params.bonusPenaltiA ?? 0,
    params.bonusPenaltiB ?? 0
  );
  return {
    vencedor: p.vencedor,
    agregadoA,
    agregadoB,
    decididoNosPenaltis: true,
    penaltisA: p.a,
    penaltisB: p.b,
  };
}
