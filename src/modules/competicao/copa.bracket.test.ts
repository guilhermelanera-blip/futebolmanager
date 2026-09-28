import { describe, it, expect } from "vitest";
import {
  gerarBracketInicial,
  proximaFase,
  ordemNaProximaFase,
  sortearMandoVolta,
  resolverConfronto,
  disputaPenaltis,
} from "./copa.bracket";

const clubes16 = Array.from({ length: 16 }, (_, i) => `c${i + 1}`); // seed 1..16
const clubes32 = Array.from({ length: 32 }, (_, i) => `c${i + 1}`);

describe("gerarBracketInicial (16 clubes)", () => {
  const b = gerarBracketInicial(clubes16, "seed-copa");

  it("gera 8 confrontos de oitavas, ida e volta", () => {
    expect(b).toHaveLength(8);
    expect(b.every((c) => c.fase === "OITAVAS")).toBe(true);
    expect(b.every((c) => c.jogoUnico === false)).toBe(true);
  });

  it("cada clube aparece exatamente uma vez", () => {
    const vistos = new Set<string>();
    for (const c of b) {
      vistos.add(c.clubeAId);
      vistos.add(c.clubeBId);
    }
    expect(vistos.size).toBe(16);
  });

  it("o cabeça de chave 1 pega o 16 na primeira rodada", () => {
    const c0 = b[0];
    expect(new Set([c0.clubeAId, c0.clubeBId])).toEqual(new Set(["c1", "c16"]));
  });

  it("define mando da volta para todo confronto, entre os dois envolvidos", () => {
    for (const c of b) {
      expect([c.clubeAId, c.clubeBId]).toContain(c.mandoVoltaClubeId);
    }
  });

  it("é determinística para o mesmo seed", () => {
    expect(gerarBracketInicial(clubes16, "seed-copa")).toEqual(b);
  });
});

describe("gerarBracketInicial (32 clubes — preliminar da T1)", () => {
  const b = gerarBracketInicial(clubes32, "seed-t1");
  it("gera 16 confrontos de preliminar, jogo único", () => {
    expect(b).toHaveLength(16);
    expect(b.every((c) => c.fase === "PRELIMINAR")).toBe(true);
    expect(b.every((c) => c.jogoUnico === true)).toBe(true);
    expect(b.every((c) => c.mandoVoltaClubeId === undefined)).toBe(true);
  });
});

describe("progressão de fases", () => {
  it("ordem das fases", () => {
    expect(proximaFase("PRELIMINAR")).toBe("OITAVAS");
    expect(proximaFase("OITAVAS")).toBe("QUARTAS");
    expect(proximaFase("SEMIS")).toBe("FINAL");
    expect(proximaFase("FINAL")).toBeNull();
  });
  it("dois confrontos consecutivos convergem para um só", () => {
    expect(ordemNaProximaFase(0)).toBe(0);
    expect(ordemNaProximaFase(1)).toBe(0);
    expect(ordemNaProximaFase(2)).toBe(1);
    expect(ordemNaProximaFase(7)).toBe(3);
  });
});

describe("sortearMandoVolta", () => {
  it("é determinístico e sempre um dos dois clubes", () => {
    const a = sortearMandoVolta("s", "OITAVAS", 3, "x", "y");
    const b = sortearMandoVolta("s", "OITAVAS", 3, "x", "y");
    expect(a).toBe(b);
    expect(["x", "y"]).toContain(a);
  });
});

describe("resolverConfronto", () => {
  it("decide pelo agregado quando não há empate", () => {
    const r = resolverConfronto({
      ida: { golsA: 2, golsB: 1 },
      volta: { golsA: 0, golsB: 0 },
      seed: "s",
      forcaA: 60,
      forcaB: 55,
    });
    expect(r.vencedor).toBe("A");
    expect(r.agregadoA).toBe(2);
    expect(r.agregadoB).toBe(1);
    expect(r.decididoNosPenaltis).toBe(false);
  });

  it("vai para os pênaltis quando o agregado empata (sem gol fora)", () => {
    const r = resolverConfronto({
      ida: { golsA: 1, golsB: 2 },
      volta: { golsA: 1, golsB: 0 },
      seed: "s",
      forcaA: 60,
      forcaB: 50,
    });
    expect(r.agregadoA).toBe(2);
    expect(r.agregadoB).toBe(2);
    expect(r.decididoNosPenaltis).toBe(true);
    expect(["A", "B"]).toContain(r.vencedor);
    expect(r.penaltisA).not.toBe(r.penaltisB);
  });

  it("jogo único usa só a ida", () => {
    const r = resolverConfronto({ ida: { golsA: 3, golsB: 0 }, seed: "s", forcaA: 50, forcaB: 50 });
    expect(r.vencedor).toBe("A");
    expect(r.agregadoA).toBe(3);
  });
});

describe("disputaPenaltis", () => {
  it("determinística e sempre produz um vencedor", () => {
    const a = disputaPenaltis("s", 60, 55);
    const b = disputaPenaltis("s", 60, 55);
    expect(a).toEqual(b);
    expect(a.a).not.toBe(a.b);
  });
  it("o time muito mais forte tende a ganhar mais no agregado de muitas disputas", () => {
    let forteGanhou = 0;
    for (let i = 0; i < 60; i++) {
      const r = disputaPenaltis(`s${i}`, 80, 40);
      if (r.vencedor === "A") forteGanhou++;
    }
    expect(forteGanhou).toBeGreaterThan(30);
  });
});
