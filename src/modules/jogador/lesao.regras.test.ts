import { describe, it, expect } from "vitest";
import { createRng } from "../../utils/rng";
import {
  sortearGravidade,
  sortearDiasRecuperacao,
  FaixasRecuperacao,
} from "./lesao.regras";

const FAIXAS: FaixasRecuperacao = {
  LEVE: { min: 3, max: 7 },
  MODERADA: { min: 14, max: 42 },
  GRAVE: { min: 60, max: 180 },
};
const PESOS = { leve: 0.66, moderada: 0.27, grave: 0.07 };

describe("sortearGravidade", () => {
  it("é determinística para o mesmo seed", () => {
    expect(sortearGravidade(createRng("s"), PESOS)).toBe(sortearGravidade(createRng("s"), PESOS));
  });

  it("respeita a proporção dos pesos ao longo de muitas amostras", () => {
    const cont = { LEVE: 0, MODERADA: 0, GRAVE: 0 };
    const rng = createRng("distribuicao");
    for (let i = 0; i < 4000; i++) cont[sortearGravidade(rng, PESOS)]++;
    expect(cont.LEVE).toBeGreaterThan(cont.MODERADA);
    expect(cont.MODERADA).toBeGreaterThan(cont.GRAVE);
    expect(cont.LEVE / 4000).toBeGreaterThan(0.55);
    expect(cont.GRAVE / 4000).toBeLessThan(0.15);
  });
});

describe("sortearDiasRecuperacao", () => {
  it("fica dentro (ou perto) da faixa do tier", () => {
    for (let i = 0; i < 200; i++) {
      const dias = sortearDiasRecuperacao({
        rng: createRng(`d${i}`),
        gravidade: "MODERADA",
        faixas: FAIXAS,
        idade: 25,
        lesoesAnteriores: 0,
      });
      expect(dias).toBeGreaterThanOrEqual(14);
      expect(dias).toBeLessThanOrEqual(Math.round(42 * 1.5));
    }
  });

  it("jogador mais velho e com histórico se recupera mais devagar", () => {
    const jovemSaudavel = sortearDiasRecuperacao({
      rng: createRng("mesmo-seed"),
      gravidade: "GRAVE",
      faixas: FAIXAS,
      idade: 22,
      lesoesAnteriores: 0,
    });
    const velhoLesionado = sortearDiasRecuperacao({
      rng: createRng("mesmo-seed"),
      gravidade: "GRAVE",
      faixas: FAIXAS,
      idade: 34,
      lesoesAnteriores: 5,
    });
    expect(velhoLesionado).toBeGreaterThan(jovemSaudavel);
  });
});
