import { describe, it, expect } from "vitest";
import { planejarTemporada } from "./calendario.plano";

function contar(slots: { competicao: string }[], comp: string): number {
  return slots.filter((s) => s.competicao === comp).length;
}

describe("planejarTemporada — só liga (Fase 1)", () => {
  const p = planejarTemporada({ copa: "NENHUMA" });
  it("38 rodadas de liga em 19 semanas, sem vazios", () => {
    expect(p.rodadasCopa).toBe(0);
    expect(p.semanas).toBe(19);
    expect(contar(p.slots, "LIGA_NACIONAL")).toBe(38);
    expect(contar(p.slots, "COPA_NACIONAL")).toBe(0);
    expect(contar(p.slots, "VAZIO")).toBe(0);
  });
  it("todo domingo é liga", () => {
    for (const s of p.slots.filter((x) => x.dia === "DOM")) {
      expect(s.competicao).toBe("LIGA_NACIONAL");
    }
  });
});

describe("planejarTemporada — liga + Copa padrão (T2+)", () => {
  const p = planejarTemporada({ copa: "PADRAO" });

  it("38 rodadas de liga + 8 de copa em 23 semanas", () => {
    expect(p.rodadasCopa).toBe(8);
    expect(p.semanas).toBe(23);
    expect(contar(p.slots, "LIGA_NACIONAL")).toBe(38);
    expect(contar(p.slots, "COPA_NACIONAL")).toBe(8);
  });

  it("copa só cai em quarta-feira e nunca no domingo (R31 / §4)", () => {
    for (const s of p.slots.filter((x) => x.competicao === "COPA_NACIONAL")) {
      expect(s.dia).toBe("QUA");
    }
    for (const s of p.slots.filter((x) => x.dia === "DOM")) {
      expect(s.competicao).not.toBe("COPA_NACIONAL");
    }
  });

  it("as 8 rodadas de copa cobrem oitavas→final, ida e volta, em ordem", () => {
    const copa = p.slots
      .filter((s) => s.competicao === "COPA_NACIONAL")
      .sort((a, b) => (a.copaRodadaNum ?? 0) - (b.copaRodadaNum ?? 0));
    expect(copa.map((c) => `${c.copaFase}-${c.copaLeg}`)).toEqual([
      "OITAVAS-1", "OITAVAS-2",
      "QUARTAS-1", "QUARTAS-2",
      "SEMIS-1", "SEMIS-2",
      "FINAL-1", "FINAL-2",
    ]);
  });

  it("há rodadas de liga entre as fases de copa", () => {
    const semanasCopa = new Set(
      p.slots.filter((s) => s.competicao === "COPA_NACIONAL").map((s) => s.semana)
    );
    // oitavas nas semanas 2-3, quartas 7-8: as semanas 4,5,6 têm liga no meio de semana
    for (const w of [4, 5, 6]) {
      const qua = p.slots.find((s) => s.semana === w && s.dia === "QUA");
      expect(qua?.competicao).toBe("LIGA_NACIONAL");
      expect(semanasCopa.has(w)).toBe(false);
    }
  });
});

describe("planejarTemporada — Copa com preliminar (T1 com >16 humanos)", () => {
  const p = planejarTemporada({ copa: "COM_PRELIMINAR" });

  it("9 rodadas de copa (preliminar + 8), 38 de liga", () => {
    expect(p.rodadasCopa).toBe(9);
    expect(contar(p.slots, "LIGA_NACIONAL")).toBe(38);
    expect(contar(p.slots, "COPA_NACIONAL")).toBe(9);
  });

  it("a preliminar é jogo único", () => {
    const prelim = p.slots.filter((s) => s.copaFase === "PRELIMINAR");
    expect(prelim).toHaveLength(1);
    expect(prelim[0].copaJogoUnico).toBe(true);
    expect(prelim[0].copaLeg).toBeUndefined();
  });

  it("total de slots é semanas × 2", () => {
    expect(p.slots).toHaveLength(p.semanas * 2);
  });
});
