// Traços de personalidade de jogador — 04_SISTEMA_DE_JOGADORES §10.
// Catálogo com efeitos numéricos + regras de atribuição. Funções PURAS.
//
// "Cada jogador pode ter um ou mais traços que modulam comportamento e
//  desenvolvimento." A lista, os efeitos exatos e a atribuição (aleatória no
//  nascimento vs. desenvolvida na carreira) são detalhe de implementação —
//  aqui está a v1: atribuição aleatória na geração, efeitos abaixo.

import { AtributosBasicos } from "./overall";

export type Traco =
  | "GOLEADOR"             // faro de gol: +finalização efetiva em campo
  | "MURALHA"              // goleiro difícil de vazar: +reflexos/saída
  | "MOTOR"                // corre o jogo todo: +resistência/velocidade
  | "MAESTRO"              // cadência e passe: +passe/visão
  | "XERIFE"               // zaga aguerrida: +marcação/desarme
  | "REFERENCIA_VESTIARIO" // eleva a moral do elenco
  | "LIDER"               // capitão nato (efeito de moral menor que a referência)
  | "PROPENSO_LESAO"      // corpo frágil: ↑ risco e tempo de lesão
  | "FRIO_NOS_PENALTIS"   // sangue-frio: bônus em disputas de pênalti
  | "INCONSISTENTE";      // oscila: ↑ variância da forma recente

export const TODOS_OS_TRACOS: Traco[] = [
  "GOLEADOR", "MURALHA", "MOTOR", "MAESTRO", "XERIFE",
  "REFERENCIA_VESTIARIO", "LIDER", "PROPENSO_LESAO", "FRIO_NOS_PENALTIS", "INCONSISTENTE",
];

interface EfeitoTraco {
  /** somado ao atributo (antes de o motor calcular as médias do time). */
  bonusAtributo?: Partial<Record<keyof AtributosBasicos, number>>;
  /** pontos de moral/dia que o traço adiciona ao elenco do clube. */
  moralElenco?: number;
  /** multiplicador de risco/tempo de lesão do próprio jogador. */
  multLesao?: number;
  /** bônus (p.p.) em disputa de pênalti quando o jogador participa. */
  bonusPenalti?: number;
  /** multiplicador da variância da forma recente. */
  multVarianciaForma?: number;
}

export const EFEITO: Record<Traco, EfeitoTraco> = {
  GOLEADOR: { bonusAtributo: { finalizacao: 2 } },
  MURALHA: { bonusAtributo: { reflexos: 2, saidaDeGol: 2 } },
  MOTOR: { bonusAtributo: { velocidade: 1, resistencia: 2 } },
  MAESTRO: { bonusAtributo: { passe: 2, visaoDeJogo: 2 } },
  XERIFE: { bonusAtributo: { marcacao: 2, desarme: 1 } },
  REFERENCIA_VESTIARIO: { moralElenco: 2 },
  LIDER: { moralElenco: 1 },
  PROPENSO_LESAO: { multLesao: 1.6 },
  FRIO_NOS_PENALTIS: { bonusPenalti: 0.06 },
  INCONSISTENTE: { multVarianciaForma: 1.5 },
};

// --- parsing ------------------------------------------------------------

export function parseTracos(csv: string | null | undefined): Traco[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is Traco => (TODOS_OS_TRACOS as string[]).includes(s));
}

export function serializarTracos(tracos: Traco[]): string {
  return [...new Set(tracos)].join(",");
}

// --- atribuição na geração -------------------------------------------

type PosicaoJogador =
  | "GOLEIRO" | "ZAGUEIRO" | "LATERAL" | "VOLANTE" | "MEIA" | "PONTA" | "ATACANTE";

// Quais traços cada posição pode receber (os "de atributo" são temáticos;
// os de comportamento valem para qualquer posição).
const TRACOS_POR_POSICAO: Record<PosicaoJogador, Traco[]> = {
  GOLEIRO: ["MURALHA", "REFERENCIA_VESTIARIO", "LIDER", "PROPENSO_LESAO", "INCONSISTENTE", "FRIO_NOS_PENALTIS"],
  ZAGUEIRO: ["XERIFE", "MOTOR", "REFERENCIA_VESTIARIO", "LIDER", "PROPENSO_LESAO", "INCONSISTENTE", "FRIO_NOS_PENALTIS"],
  LATERAL: ["MOTOR", "XERIFE", "REFERENCIA_VESTIARIO", "LIDER", "PROPENSO_LESAO", "INCONSISTENTE"],
  VOLANTE: ["XERIFE", "MOTOR", "MAESTRO", "REFERENCIA_VESTIARIO", "LIDER", "PROPENSO_LESAO", "INCONSISTENTE"],
  MEIA: ["MAESTRO", "GOLEADOR", "MOTOR", "REFERENCIA_VESTIARIO", "LIDER", "PROPENSO_LESAO", "INCONSISTENTE", "FRIO_NOS_PENALTIS"],
  PONTA: ["GOLEADOR", "MOTOR", "MAESTRO", "PROPENSO_LESAO", "INCONSISTENTE", "FRIO_NOS_PENALTIS"],
  ATACANTE: ["GOLEADOR", "MOTOR", "REFERENCIA_VESTIARIO", "LIDER", "PROPENSO_LESAO", "INCONSISTENTE", "FRIO_NOS_PENALTIS"],
};

/**
 * Sorteia 0-2 traços para um jogador (a maioria fica sem nenhum).
 * ~62% nenhum, ~31% um, ~7% dois.
 */
export function sortearTracos(rng: () => number, posicao: PosicaoJogador): Traco[] {
  const r = rng();
  const quantos = r < 0.62 ? 0 : r < 0.93 ? 1 : 2;
  if (quantos === 0) return [];

  const pool = [...TRACOS_POR_POSICAO[posicao]];
  const escolhidos: Traco[] = [];
  for (let i = 0; i < quantos && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    escolhidos.push(pool.splice(idx, 1)[0]);
  }
  return escolhidos;
}

// --- aplicação dos efeitos --------------------------------------------

/** Atributos do jogador com os bônus dos traços somados (clamp 1..20). */
export function aplicarBonusTracos(
  atributos: AtributosBasicos,
  tracos: Traco[]
): AtributosBasicos {
  const out: AtributosBasicos = { ...atributos };
  for (const t of tracos) {
    const b = EFEITO[t].bonusAtributo;
    if (!b) continue;
    for (const [campo, delta] of Object.entries(b) as [keyof AtributosBasicos, number][]) {
      out[campo] = Math.max(1, Math.min(20, out[campo] + delta));
    }
  }
  return out;
}

/** Total de moral/dia que o elenco ganha pelos traços dos seus jogadores. */
export function moralDoElenco(tracosPorJogador: Traco[][]): number {
  let total = 0;
  for (const ts of tracosPorJogador) {
    for (const t of ts) total += EFEITO[t].moralElenco ?? 0;
  }
  return total;
}

/** Multiplicador de risco/tempo de lesão de um jogador (1 = neutro). */
export function multLesaoDe(tracos: Traco[]): number {
  return tracos.reduce((m, t) => m * (EFEITO[t].multLesao ?? 1), 1);
}

/** Bônus de pênalti agregado de um conjunto de jogadores. */
export function bonusPenaltiDe(tracos: Traco[]): number {
  return tracos.reduce((s, t) => s + (EFEITO[t].bonusPenalti ?? 0), 0);
}

/** Multiplicador da variância da forma recente de um jogador. */
export function multVarianciaFormaDe(tracos: Traco[]): number {
  return tracos.reduce((m, t) => m * (EFEITO[t].multVarianciaForma ?? 1), 1);
}
