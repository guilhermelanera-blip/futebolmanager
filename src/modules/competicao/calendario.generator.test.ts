import { describe, it, expect } from "vitest";
import {
  gerarCalendarioIdaEVolta,
  embaralharDeterministico,
} from "./calendario.generator";

describe("gerarCalendarioIdaEVolta", () => {
  const N = 20;
  const confrontos = gerarCalendarioIdaEVolta(N, "seed-calendario");

  it("tem 38 rodadas e 380 partidas para 20 clubes", () => {
    expect(confrontos).toHaveLength((N / 2) * (N - 1) * 2); // 380
    const rodadas = new Set(confrontos.map((c) => c.rodada));
    expect(rodadas.size).toBe(2 * (N - 1)); // 38
    expect(Math.min(...rodadas)).toBe(1);
    expect(Math.max(...rodadas)).toBe(38);
  });

  it("cada rodada tem 10 jogos e nenhum clube joga duas vezes na mesma rodada", () => {
    for (let r = 1; r <= 38; r++) {
      const daRodada = confrontos.filter((c) => c.rodada === r);
      expect(daRodada).toHaveLength(N / 2);
      const clubes = new Set<number>();
      for (const c of daRodada) {
        clubes.add(c.mandanteIndex);
        clubes.add(c.visitanteIndex);
      }
      expect(clubes.size).toBe(N); // todos os 20 jogam, cada um uma vez
    }
  });

  it("cada par se enfrenta exatamente 2x, uma na casa de cada (ida e volta)", () => {
    const contagem = new Map<string, number>();
    for (const c of confrontos) {
      const key = `${c.mandanteIndex}>${c.visitanteIndex}`;
      contagem.set(key, (contagem.get(key) ?? 0) + 1);
    }
    // 20*19 pares ordenados, cada um exatamente uma vez
    expect(contagem.size).toBe(N * (N - 1));
    for (const v of contagem.values()) expect(v).toBe(1);
  });

  it("todo clube manda o mesmo número de jogos que visita (19 e 19)", () => {
    const emCasa = new Array(N).fill(0);
    const fora = new Array(N).fill(0);
    for (const c of confrontos) {
      emCasa[c.mandanteIndex]++;
      fora[c.visitanteIndex]++;
    }
    for (let i = 0; i < N; i++) {
      expect(emCasa[i]).toBe(N - 1);
      expect(fora[i]).toBe(N - 1);
    }
  });

  it("returno espelha a ida com o mando invertido", () => {
    const ida = confrontos.filter((c) => c.rodada <= N - 1);
    const volta = confrontos.filter((c) => c.rodada > N - 1);
    for (const c of ida) {
      const espelho = volta.find(
        (v) =>
          v.rodada === c.rodada + (N - 1) &&
          v.mandanteIndex === c.visitanteIndex &&
          v.visitanteIndex === c.mandanteIndex
      );
      expect(espelho).toBeDefined();
    }
  });

  it("é determinístico para o mesmo seed", () => {
    const a = gerarCalendarioIdaEVolta(N, "abc");
    const b = gerarCalendarioIdaEVolta(N, "abc");
    expect(a).toEqual(b);
  });

  it("embaralharDeterministico é estável por seed e permuta os itens", () => {
    const base = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const a = embaralharDeterministico(base, "x");
    const b = embaralharDeterministico(base, "x");
    expect(a).toEqual(b);
    expect([...a].sort((m, n) => m - n)).toEqual(base);
  });

  it("rejeita número ímpar de clubes", () => {
    expect(() => gerarCalendarioIdaEVolta(19, "s")).toThrow();
  });
});
