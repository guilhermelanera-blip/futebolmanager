// RNG com seed determinístico. Essencial para a garantia de R21
// (00_REGRAS_IMUTAVEIS): dado o mesmo seed, a mesma partida deve
// produzir sempre o mesmo resultado — auditável e reproduzível.

function hashSeedToInt(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// Mulberry32 - PRNG simples, rápido e determinístico o suficiente para
// simulação de jogo (não precisa de segurança criptográfica aqui).
export function createRng(seed: string): () => number {
  let a = hashSeedToInt(seed);
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distribuição limitada (variância controlada, 03_MOTOR_DE_PARTIDAS seção 5):
// gera um valor entre 0 e 1 com leve tendência central, evitando
// resultados 100% caóticos ou 100% determinísticos.
export function variancaControlada(rng: () => number): number {
  const a = rng();
  const b = rng();
  return (a + b) / 2; // soma de duas uniformes ~ aproxima distribuição triangular
}
