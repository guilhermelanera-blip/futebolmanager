// Regras puras da manutenção diária de jogadores — 08_RELOGIO_E_SIMULACAO
// seção 1 / 04_SISTEMA_DE_JOGADORES seções 5 e 6.

/** Move `atual` em direção a `alvo` por até `passo`, sem ultrapassar. */
export function passoEmDirecaoA(atual: number, alvo: number, passo: number): number {
  if (atual === alvo) return atual;
  const dir = atual < alvo ? 1 : -1;
  const proximo = atual + dir * Math.abs(passo);
  // não passar do alvo
  return dir > 0 ? Math.min(proximo, alvo) : Math.max(proximo, alvo);
}

/** Recuperação de fadiga num dia sem jogo (04 §6): nunca abaixo de 0. */
export function recuperarFadiga(fadigaAtual: number, recuperacaoPorDia: number): number {
  return Math.max(0, Math.round(fadigaAtual - Math.abs(recuperacaoPorDia)));
}

/** Acúmulo de fadiga ao disputar uma partida (04 §6): teto em 100. */
export function acumularFadigaPartida(fadigaAtual: number, ganho: number): number {
  return Math.min(100, Math.round(fadigaAtual + Math.abs(ganho)));
}
