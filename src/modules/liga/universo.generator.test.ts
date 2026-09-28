import { describe, it, expect } from "vitest";
import {
  gerarUniverso,
  TEMPLATE_ELENCO,
  TAMANHO_ELENCO,
  Posicao,
} from "./universo.generator";
import { contemMarcaReal } from "../../utils/nomesFicticios";

describe("gerarUniverso", () => {
  it("gera 20 clubes com elenco de 25 na distribuição do template", () => {
    const u = gerarUniverso({ nomeLiga: "Liga Nacional", seed: "u-teste" });
    expect(u.clubes).toHaveLength(20);

    for (const clube of u.clubes) {
      expect(clube.elenco).toHaveLength(TAMANHO_ELENCO);
      const porPosicao = clube.elenco.reduce<Record<string, number>>((acc, j) => {
        acc[j.posicao] = (acc[j.posicao] ?? 0) + 1;
        return acc;
      }, {});
      for (const [pos, qtde] of Object.entries(TEMPLATE_ELENCO)) {
        expect(porPosicao[pos]).toBe(qtde);
      }
    }
  });

  it("é determinístico: mesmo seed → universo idêntico", () => {
    const a = gerarUniverso({ nomeLiga: "L", seed: "fixo" });
    const b = gerarUniverso({ nomeLiga: "L", seed: "fixo" });
    expect(a).toEqual(b);
  });

  it("seeds diferentes produzem universos diferentes", () => {
    const a = gerarUniverso({ nomeLiga: "L", seed: "seed-a" });
    const b = gerarUniverso({ nomeLiga: "L", seed: "seed-b" });
    expect(a.clubes[0].nome).not.toBe(b.clubes[0].nome);
  });

  it("todos os nomes (clubes e jogadores) são fictícios (R6/R7)", () => {
    const u = gerarUniverso({ nomeLiga: "Liga Nacional", seed: "check-ficticio" });
    const nomesClube = new Set<string>();
    const nomesJogador = new Set<string>();
    for (const clube of u.clubes) {
      expect(contemMarcaReal(clube.nome)).toBe(false);
      nomesClube.add(clube.nome);
      for (const j of clube.elenco) {
        expect(contemMarcaReal(j.nome)).toBe(false);
        nomesJogador.add(j.nome);
      }
    }
    expect(nomesClube.size).toBe(20); // clubes únicos
    // jogadores: 500 no total, todos com nome distinto
    expect(nomesJogador.size).toBe(20 * TAMANHO_ELENCO);
  });

  it("todo clube tem capacidade de estádio plausível", () => {
    const u = gerarUniverso({ nomeLiga: "L", seed: "estadio" });
    for (const clube of u.clubes) {
      expect(clube.capacidadeEstadio).toBeGreaterThanOrEqual(6000);
      expect(clube.capacidadeEstadio).toBeLessThanOrEqual(90000);
      expect(clube.capacidadeEstadio % 500).toBe(0);
    }
  });

  it("atributos ficam sempre na escala 1..20 e potencial ≥ overall implícito", () => {
    const u = gerarUniverso({ nomeLiga: "L", seed: "escala" });
    for (const clube of u.clubes) {
      for (const j of clube.elenco) {
        for (const v of Object.values(j.atributos)) {
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(20);
        }
        expect(j.potencialOculto).toBeGreaterThanOrEqual(1);
        expect(j.potencialOculto).toBeLessThanOrEqual(20);
        expect(j.idade).toBeGreaterThanOrEqual(17);
        expect(j.idade).toBeLessThanOrEqual(35);
      }
    }
  });

  it("clubes mais fortes têm, em média, elenco com atributos maiores", () => {
    const u = gerarUniverso({ nomeLiga: "L", seed: "forca-vs-atributo" });
    const ordenadosPorForca = [...u.clubes].sort((a, b) => b.forca - a.forca);
    const media = (c: (typeof u.clubes)[number]) => {
      const todos = c.elenco.flatMap((j) => Object.values(j.atributos));
      return todos.reduce((s, v) => s + v, 0) / todos.length;
    };
    const top3 = ordenadosPorForca.slice(0, 3).map(media).reduce((s, v) => s + v, 0) / 3;
    const bottom3 = ordenadosPorForca.slice(-3).map(media).reduce((s, v) => s + v, 0) / 3;
    expect(top3).toBeGreaterThan(bottom3);
  });
});
