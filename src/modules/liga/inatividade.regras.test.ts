import { describe, it, expect } from "vitest";
import {
  estaInativo,
  diasSemAcao,
  DIAS_INATIVIDADE_GESTAO_VIRTUAL,
} from "./inatividade.regras";

const DIA = 24 * 60 * 60 * 1000;
const agora = new Date("2026-06-15T12:00:00Z");

describe("regra de inatividade (R40)", () => {
  it("o prazo imutável é 14 dias", () => {
    expect(DIAS_INATIVIDADE_GESTAO_VIRTUAL).toBe(14);
  });

  it("diasSemAcao conta dias corridos desde a última ação", () => {
    expect(diasSemAcao(new Date(agora.getTime() - 3 * DIA), agora)).toBeCloseTo(3, 5);
  });

  it("não está inativo com menos de 14 dias sem ação", () => {
    expect(estaInativo(new Date(agora.getTime() - 13.9 * DIA), agora)).toBe(false);
  });

  it("está inativo com exatamente 14 dias ou mais sem ação", () => {
    expect(estaInativo(new Date(agora.getTime() - 14 * DIA), agora)).toBe(true);
    expect(estaInativo(new Date(agora.getTime() - 30 * DIA), agora)).toBe(true);
  });

  it("ação recente zera a contagem", () => {
    expect(estaInativo(new Date(agora.getTime() - 1 * DIA), agora)).toBe(false);
  });
});
