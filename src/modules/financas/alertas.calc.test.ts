import { describe, it, expect } from "vitest";
import {
  dividaDe,
  receitaAnualEstimada,
  avaliarAlertas,
  deveDeclararFalenciaPorDivida,
  TipoAlerta,
} from "./alertas.calc";

const params = {
  n1DiasAteCaixaNegativo: 30,
  n2MultiploDividaReceita: 1.5,
  n3DiasCaixaNegativo: 15,
};

function ativo(as: ReturnType<typeof avaliarAlertas>, tipo: TipoAlerta) {
  return as.find((a) => a.tipo === tipo)?.ativo;
}

describe("dividaDe / receitaAnualEstimada", () => {
  it("dívida é o quanto o caixa está negativo", () => {
    expect(dividaDe(-500)).toBe(500);
    expect(dividaDe(1000)).toBe(0);
  });
  it("anualiza receita quando o histórico é curto", () => {
    expect(receitaAnualEstimada(1_000_000, 30)).toBeCloseTo((1_000_000 / 30) * 365, -3);
    expect(receitaAnualEstimada(50_000_000, 400)).toBe(50_000_000); // já passou de 1 ano
  });
  it("com menos de 7 dias de histórico, não estima (retorna 0)", () => {
    expect(receitaAnualEstimada(1_000_000, 3)).toBe(0);
    expect(receitaAnualEstimada(1_000_000, 0)).toBe(0);
    expect(receitaAnualEstimada(1_000_000, -50)).toBe(0);
  });
});

describe("avaliarAlertas (11 §5)", () => {
  const base = {
    saldoCaixa: 5_000_000,
    diasCaixaNegativoConsecutivos: 0,
    folhaEmAtraso: false,
    fluxoLiquidoSemanal: 200_000,
    receitaAnual: 40_000_000,
    params,
  };

  it("clube saudável não dispara nenhum alerta", () => {
    expect(avaliarAlertas(base).every((a) => !a.ativo)).toBe(true);
  });

  it("N1 dispara quando está queimando caixa e a projeção fica negativa", () => {
    const r = avaliarAlertas({ ...base, saldoCaixa: 1_000_000, fluxoLiquidoSemanal: -400_000 });
    expect(ativo(r, "PROJECAO_CAIXA_NEGATIVO")).toBe(true);
  });

  it("N1 não dispara se o caixa já está negativo (aí é caso de N3, não projeção)", () => {
    const r = avaliarAlertas({ ...base, saldoCaixa: -100, fluxoLiquidoSemanal: -400_000 });
    expect(ativo(r, "PROJECAO_CAIXA_NEGATIVO")).toBe(false);
  });

  it("N2 dispara quando a dívida passa de 1,5× a receita anual", () => {
    const r = avaliarAlertas({ ...base, saldoCaixa: -70_000_000, receitaAnual: 40_000_000 });
    expect(ativo(r, "DIVIDA_ALTA")).toBe(true);
    const r2 = avaliarAlertas({ ...base, saldoCaixa: -10_000_000, receitaAnual: 40_000_000 });
    expect(ativo(r2, "DIVIDA_ALTA")).toBe(false);
  });

  it("N3 dispara por dias de caixa negativo e/ou folha em atraso", () => {
    expect(ativo(avaliarAlertas({ ...base, diasCaixaNegativoConsecutivos: 20 }), "CAIXA_NEGATIVO_PROLONGADO")).toBe(true);
    expect(ativo(avaliarAlertas({ ...base, folhaEmAtraso: true }), "FOLHA_EM_ATRASO")).toBe(true);
  });
});

describe("deveDeclararFalenciaPorDivida (11 §6)", () => {
  it("verdadeiro quando dívida > múltiplo × receita anual", () => {
    expect(deveDeclararFalenciaPorDivida({ divida: 90_000_000, receitaAnual: 40_000_000, multiplo: 2 })).toBe(true);
    expect(deveDeclararFalenciaPorDivida({ divida: 70_000_000, receitaAnual: 40_000_000, multiplo: 2 })).toBe(false);
  });
  it("nunca falência por dívida se a receita anual estimada é zero", () => {
    expect(deveDeclararFalenciaPorDivida({ divida: 10_000_000, receitaAnual: 0, multiplo: 2 })).toBe(false);
  });
});
