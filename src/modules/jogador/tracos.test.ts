import { describe, it, expect } from "vitest";
import { createRng } from "../../utils/rng";
import { AtributosBasicos } from "./overall";
import {
  parseTracos,
  serializarTracos,
  sortearTracos,
  aplicarBonusTracos,
  moralDoElenco,
  multLesaoDe,
  bonusPenaltiDe,
} from "./tracos";

function attrs(v: number): AtributosBasicos {
  return {
    finalizacao: v, passe: v, drible: v, cabeceio: v, cruzamento: v, marcacao: v,
    desarme: v, velocidade: v, resistencia: v, forca: v, visaoDeJogo: v,
    posicionamento: v, reflexos: v, saidaDeGol: v,
  };
}

describe("parse / serializar", () => {
  it("ignora slugs desconhecidos e normaliza caixa", () => {
    expect(parseTracos("goleador, xxx , MURALHA")).toEqual(["GOLEADOR", "MURALHA"]);
    expect(parseTracos("")).toEqual([]);
    expect(parseTracos(null)).toEqual([]);
  });
  it("serializar remove duplicados", () => {
    expect(serializarTracos(["GOLEADOR", "GOLEADOR", "LIDER"])).toBe("GOLEADOR,LIDER");
  });
});

describe("sortearTracos", () => {
  it("é determinístico e devolve 0-2 traços da posição", () => {
    for (let i = 0; i < 200; i++) {
      const a = sortearTracos(createRng(`s${i}`), "ATACANTE");
      const b = sortearTracos(createRng(`s${i}`), "ATACANTE");
      expect(a).toEqual(b);
      expect(a.length).toBeLessThanOrEqual(2);
      expect(new Set(a).size).toBe(a.length); // sem repetição
    }
  });
  it("a maioria dos jogadores não tem traço", () => {
    let semTraco = 0;
    for (let i = 0; i < 1000; i++) {
      if (sortearTracos(createRng(`x${i}`), "MEIA").length === 0) semTraco++;
    }
    expect(semTraco / 1000).toBeGreaterThan(0.5);
  });
  it("goleiro nunca recebe GOLEADOR/XERIFE", () => {
    for (let i = 0; i < 300; i++) {
      const ts = sortearTracos(createRng(`g${i}`), "GOLEIRO");
      expect(ts).not.toContain("GOLEADOR");
      expect(ts).not.toContain("XERIFE");
    }
  });
});

describe("aplicarBonusTracos", () => {
  it("soma os bônus e respeita o teto 20", () => {
    const r = aplicarBonusTracos(attrs(19), ["GOLEADOR", "MURALHA"]);
    expect(r.finalizacao).toBe(20); // 19+2 -> clamp 20
    expect(r.reflexos).toBe(20);
    expect(r.passe).toBe(19); // sem bônus
  });
  it("sem traços não altera nada", () => {
    expect(aplicarBonusTracos(attrs(12), [])).toEqual(attrs(12));
  });
});

describe("efeitos agregados", () => {
  it("moralDoElenco soma referência (+2) e líder (+1)", () => {
    expect(moralDoElenco([["REFERENCIA_VESTIARIO"], ["LIDER"], ["GOLEADOR"]])).toBe(3);
  });
  it("multLesaoDe multiplica por 1.6 quem é propenso a lesão", () => {
    expect(multLesaoDe(["PROPENSO_LESAO"])).toBeCloseTo(1.6);
    expect(multLesaoDe(["GOLEADOR"])).toBe(1);
  });
  it("bonusPenaltiDe soma o bônus dos 'frios'", () => {
    expect(bonusPenaltiDe(["FRIO_NOS_PENALTIS"])).toBeCloseTo(0.06);
    expect(bonusPenaltiDe([])).toBe(0);
  });
});
