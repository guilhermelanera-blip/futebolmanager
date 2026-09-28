import { describe, it, expect } from "vitest";
import { selecionarParticipantesCopa } from "./copa.participantes";

const vinte = Array.from({ length: 20 }, (_, i) => `c${i + 1}`);

describe("selecionarParticipantesCopa — T2+ (por classificação, R35)", () => {
  it("pega os 16 melhores e exclui os 4 últimos, seeding pela classificação", () => {
    const classificacao = vinte; // já em ordem 1º..20º
    const r = selecionarParticipantesCopa({
      todosClubesIds: vinte,
      clubesHumanosIds: ["c5", "c9"],
      classificacaoAnteriorIds: classificacao,
      seed: "s",
    });
    expect(r.formato).toBe("PADRAO_16");
    expect(r.clubesPorSeed).toHaveLength(16);
    expect(r.clubesPorSeed).toEqual(vinte.slice(0, 16));
    // os 4 últimos ficam de fora
    for (const fora of ["c17", "c18", "c19", "c20"]) {
      expect(r.clubesPorSeed).not.toContain(fora);
    }
  });
});

describe("selecionarParticipantesCopa — T1 (humanos + sorteio de IA, R36/R38)", () => {
  it("com poucos humanos: 16 clubes, humanos incluídos + IA sorteada", () => {
    const humanos = ["c3", "c7", "c11"];
    const r = selecionarParticipantesCopa({
      todosClubesIds: vinte,
      clubesHumanosIds: humanos,
      classificacaoAnteriorIds: null,
      seed: "t1",
    });
    expect(r.formato).toBe("PADRAO_16");
    expect(r.clubesPorSeed).toHaveLength(16);
    for (const h of humanos) expect(r.clubesPorSeed).toContain(h);
    expect(new Set(r.clubesPorSeed).size).toBe(16);
  });

  it("é determinística para o mesmo seed", () => {
    const args = {
      todosClubesIds: vinte,
      clubesHumanosIds: ["c1"],
      classificacaoAnteriorIds: null,
      seed: "fixo",
    };
    expect(selecionarParticipantesCopa(args)).toEqual(selecionarParticipantesCopa(args));
  });

  it("com 17+ humanos: bracket expandido (R38) ainda não suportado → erro", () => {
    const humanos = Array.from({ length: 18 }, (_, i) => `c${i + 1}`);
    expect(() =>
      selecionarParticipantesCopa({
        todosClubesIds: vinte,
        clubesHumanosIds: humanos,
        classificacaoAnteriorIds: null,
        seed: "t1-cheia",
      })
    ).toThrow();
  });

  it("erro quando não há clubes suficientes para 16", () => {
    expect(() =>
      selecionarParticipantesCopa({
        todosClubesIds: vinte.slice(0, 10),
        clubesHumanosIds: [],
        classificacaoAnteriorIds: null,
        seed: "s",
      })
    ).toThrow();
  });
});
