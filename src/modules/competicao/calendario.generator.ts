// Gerador de calendário da Liga Nacional — 06_COMPETICOES_E_CALENDARIO,
// seção 1: 20 clubes, pontos corridos, todos contra todos, ida e volta =
// 38 rodadas. "Calendário gerado por método padrão de round-robin (método
// do círculo), com sorteio inicial de confrontos."
//
// Funções PURAS (sem DB e sem datas — só o chaveamento). A atribuição de
// data/hora aos slots fixos de R30 e a persistência ficam em
// calendario.service.ts.
//
// Pendência PT10 (06, seção 6 — "algoritmo exato de geração do calendário"):
// resolvida aqui com o método do círculo clássico + embaralhamento inicial
// com seed. É determinístico e auditável. Sinalizado ao responsável para
// validação (21_PROMPT_MESTRE_CLAUDE, seção 4).

import { createRng } from "../../utils/rng";

export interface ConfrontoGerado {
  rodada: number; // 1..(2n-2)
  mandanteIndex: number; // índice no array de clubes recebido
  visitanteIndex: number;
}

/** Embaralhamento Fisher-Yates determinístico (o "sorteio inicial"). */
export function embaralharDeterministico<T>(itens: readonly T[], seed: string): T[] {
  const rng = createRng(seed);
  const arr = itens.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Método do círculo para um número PAR de participantes.
 * Retorna o turno único: n-1 rodadas, n/2 jogos por rodada, cada dupla se
 * enfrenta exatamente uma vez. O mando de campo alterna para equilibrar
 * jogos em casa/fora ao longo do turno.
 */
function turnoUnico(indices: number[]): ConfrontoGerado[] {
  const n = indices.length;
  if (n % 2 !== 0) {
    throw new Error(`Método do círculo exige número par de clubes (recebido ${n}).`);
  }

  const arr = indices.slice();
  const confrontos: ConfrontoGerado[] = [];

  for (let rodada = 1; rodada <= n - 1; rodada++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      // Alterna mando: em rodadas ímpares o "topo" joga em casa; em pares,
      // inverte. O par que envolve o clube fixo (i === 0) segue a paridade
      // da rodada — os demais espelham, distribuindo melhor casa/fora.
      const topoEmCasa = i === 0 ? rodada % 2 === 1 : rodada % 2 === 0;
      confrontos.push(
        topoEmCasa
          ? { rodada, mandanteIndex: a, visitanteIndex: b }
          : { rodada, mandanteIndex: b, visitanteIndex: a }
      );
    }
    // Rotaciona todos menos o primeiro (índice 0 fica fixo).
    const ultimo = arr.pop() as number;
    arr.splice(1, 0, ultimo);
  }

  return confrontos;
}

/**
 * Calendário completo de ida e volta.
 * @param qtdeClubes número par de clubes (20 na Liga Nacional).
 * @param seed usado no sorteio inicial de confrontos.
 * @returns confrontos de todas as 2·(n-1) rodadas (38 para n=20). No returno,
 *          cada confronto do turno é repetido com o mando invertido.
 */
export function gerarCalendarioIdaEVolta(
  qtdeClubes: number,
  seed: string
): ConfrontoGerado[] {
  const indices = embaralharDeterministico(
    Array.from({ length: qtdeClubes }, (_, i) => i),
    seed
  );

  const ida = turnoUnico(indices);
  const rodadasNoTurno = qtdeClubes - 1;

  const volta: ConfrontoGerado[] = ida.map((c) => ({
    rodada: c.rodada + rodadasNoTurno,
    mandanteIndex: c.visitanteIndex,
    visitanteIndex: c.mandanteIndex,
  }));

  return [...ida, ...volta];
}
