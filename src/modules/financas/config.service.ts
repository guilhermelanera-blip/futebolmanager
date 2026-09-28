// Leitura/escrita da configuração central (ParametroConfiguravel, 16 / 11 §0).
// Cache em memória por processo, com TTL curto — os parâmetros mudam raramente
// e não precisamos bater no banco a cada cálculo.

import { prisma } from "../../config/prisma";
import { PARAMETROS_PADRAO } from "./parametros";

const TTL_CACHE_MS = 60_000;
let cache: Map<string, string> | null = null;
let cacheEm = 0;

const PADROES = new Map(PARAMETROS_PADRAO.map((p) => [p.chave, p.valor]));

async function carregar(): Promise<Map<string, string>> {
  const agora = Date.now();
  if (cache && agora - cacheEm < TTL_CACHE_MS) return cache;
  const linhas = await prisma.parametroConfiguravel.findMany();
  cache = new Map(linhas.map((l) => [l.chave, l.valor]));
  cacheEm = agora;
  return cache;
}

export function invalidarCacheParametros(): void {
  cache = null;
}

/** Semeia os parâmetros padrão que ainda não existem (idempotente). */
export async function semearParametros(): Promise<number> {
  let criados = 0;
  for (const p of PARAMETROS_PADRAO) {
    const r = await prisma.parametroConfiguravel.upsert({
      where: { chave: p.chave },
      update: {}, // nunca sobrescreve um valor já ajustado
      create: { chave: p.chave, valor: p.valor, descricao: p.descricao },
    });
    if (r.valor === p.valor) criados++;
  }
  invalidarCacheParametros();
  return criados;
}

function resolver(chave: string, mapa: Map<string, string>): string {
  const v = mapa.get(chave) ?? PADROES.get(chave);
  if (v === undefined) throw new Error(`Parâmetro de configuração desconhecido: ${chave}`);
  return v;
}

export async function getNumero(chave: string): Promise<number> {
  const n = Number(resolver(chave, await carregar()));
  if (!Number.isFinite(n)) throw new Error(`Parâmetro ${chave} não é numérico.`);
  return n;
}

export async function getInteiro(chave: string): Promise<number> {
  return Math.trunc(await getNumero(chave));
}

/** Lê várias chaves de uma vez (um único carregamento de cache). */
export async function getVarios(chaves: string[]): Promise<Record<string, number>> {
  const mapa = await carregar();
  const out: Record<string, number> = {};
  for (const c of chaves) {
    const n = Number(resolver(c, mapa));
    if (!Number.isFinite(n)) throw new Error(`Parâmetro ${c} não é numérico.`);
    out[c] = n;
  }
  return out;
}

/** Lê um parâmetro como texto puro. */
export async function getTexto(chave: string): Promise<string> {
  return resolver(chave, await carregar());
}

/** Lê um parâmetro que guarda um array JSON de strings. */
export async function getLista(chave: string): Promise<string[]> {
  const bruto = resolver(chave, await carregar());
  try {
    const v = JSON.parse(bruto);
    if (Array.isArray(v)) return v.map((x) => String(x));
  } catch {
    /* cai no fallback abaixo */
  }
  throw new Error(`Parâmetro ${chave} não é um array JSON válido.`);
}

export async function setNumero(chave: string, valor: number, descricao?: string): Promise<void> {
  await prisma.parametroConfiguravel.upsert({
    where: { chave },
    update: { valor: String(valor), ...(descricao ? { descricao } : {}) },
    create: { chave, valor: String(valor), descricao: descricao ?? null },
  });
  invalidarCacheParametros();
}
