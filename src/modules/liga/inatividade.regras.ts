// Regra pura de inatividade — 00_REGRAS_IMUTAVEIS R40.
//
// "Um jogador humano inativo por 14 dias corridos, sem nenhuma ação de
//  gestão, tem seu clube transferido para gestão virtual de IA."
//
// O prazo de 14 dias é REGRA IMUTÁVEL (R40) — está aqui como constante
// nomeada de propósito, não como parâmetro configurável: mudá-lo seria
// contrariar R40 e exige aprovação explícita do responsável.
//
// Ações de gestão que reiniciam a contagem (atualizam Clube.ultimaAcaoEm):
// alterar dados/identidade do clube, definir preço de ingresso, enviar ou
// responder proposta de mercado, assumir o clube. Só isso — logar na conta,
// visualizar telas ou ter o Auxiliar Técnico cobrindo uma partida (05 §3)
// NÃO contam.

export const DIAS_INATIVIDADE_GESTAO_VIRTUAL = 14; // R40 — imutável

const DIA_MS = 24 * 60 * 60 * 1000;

/** Dias corridos desde a última ação de gestão. */
export function diasSemAcao(ultimaAcaoEm: Date, agora: Date = new Date()): number {
  return (agora.getTime() - ultimaAcaoEm.getTime()) / DIA_MS;
}

/** True se o clube deve ir para gestão virtual de IA (R40). */
export function estaInativo(
  ultimaAcaoEm: Date,
  agora: Date = new Date(),
  limiteDias: number = DIAS_INATIVIDADE_GESTAO_VIRTUAL
): boolean {
  return diasSemAcao(ultimaAcaoEm, agora) >= limiteDias;
}
