// Regras puras de lesão — 04_SISTEMA_DE_JOGADORES, seção 7.
//
// Tiers de gravidade e faixas de recuperação (dias). "Faixas exatas dentro
// de cada tier calculadas por sorteio ponderado (não fixo), influenciado por
// idade e histórico de lesões do jogador."
//
// Os limites vêm da configuração central (parametros.ts); estas funções só
// aplicam a fórmula, de forma determinística dado o RNG recebido.

export type GravidadeLesao = "LEVE" | "MODERADA" | "GRAVE";

export interface PesosGravidade {
  leve: number;
  moderada: number;
  grave: number;
}

export interface FaixasRecuperacao {
  LEVE: { min: number; max: number };
  MODERADA: { min: number; max: number };
  GRAVE: { min: number; max: number };
}

/** Sorteia a gravidade por peso relativo (não precisa somar 1). */
export function sortearGravidade(rng: () => number, pesos: PesosGravidade): GravidadeLesao {
  const total = pesos.leve + pesos.moderada + pesos.grave;
  const r = rng() * total;
  if (r < pesos.leve) return "LEVE";
  if (r < pesos.leve + pesos.moderada) return "MODERADA";
  return "GRAVE";
}

/**
 * Dias de recuperação: sorteio dentro da faixa do tier, alongado por idade
 * avançada e por histórico de lesões (04 §7).
 */
export function sortearDiasRecuperacao(params: {
  rng: () => number;
  gravidade: GravidadeLesao;
  faixas: FaixasRecuperacao;
  idade: number;
  lesoesAnteriores: number;
}): number {
  const faixa = params.faixas[params.gravidade];
  const bruto = faixa.min + params.rng() * (faixa.max - faixa.min);

  const fatorIdade = params.idade >= 32 ? 1.2 : params.idade >= 29 ? 1.08 : 1;
  const fatorHistorico = 1 + Math.min(params.lesoesAnteriores, 5) * 0.05;

  const dias = Math.round(bruto * fatorIdade * fatorHistorico);
  return Math.max(faixa.min, Math.min(Math.round(faixa.max * 1.5), dias));
}
