import { describe, it, expect } from "vitest";
import { createRng } from "./rng";
import {
  gerarNomeClube,
  gerarNomePessoa,
  contemMarcaReal,
  normalizar,
} from "./nomesFicticios";

describe("nomesFicticios", () => {
  it("normalizar remove acentos e pontuação", () => {
    expect(normalizar("Sérgio Válber-Peçanha")).toBe("sergio valber pecanha");
  });

  it("contemMarcaReal detecta clubes reais conhecidos", () => {
    expect(contemMarcaReal("Esporte Clube Flamengo do Norte")).toBe(true);
    expect(contemMarcaReal("Boca Juniors da Serra")).toBe(true);
    expect(contemMarcaReal("Associação Atlética Sorocaba Fênix")).toBe(false);
  });

  it("gerarNomeClube é determinístico para o mesmo seed", () => {
    const a = gerarNomeClube(createRng("s1"));
    const b = gerarNomeClube(createRng("s1"));
    expect(a).toEqual(b);
  });

  it("gera 20 nomes de clube únicos e sem colisão com marcas reais", () => {
    const rng = createRng("liga-teste");
    const usados = new Set<string>();
    const nomes: string[] = [];
    for (let i = 0; i < 20; i++) {
      const { nome } = gerarNomeClube(rng, usados);
      nomes.push(nome);
      expect(contemMarcaReal(nome)).toBe(false);
    }
    expect(new Set(nomes.map(normalizar)).size).toBe(20);
  });

  it("gera muitos nomes de pessoa sem colisão com nomes reais famosos", () => {
    const rng = createRng("pessoas-teste");
    const usados = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const nome = gerarNomePessoa(rng, usados);
      expect(nome.split(" ").length).toBeGreaterThanOrEqual(2); // nunca mononome
      expect(contemMarcaReal(nome)).toBe(false);
    }
  });
});
