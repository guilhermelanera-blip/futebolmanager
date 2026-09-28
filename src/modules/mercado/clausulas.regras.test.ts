import { describe, it, expect } from "vitest";
import {
  validarBonus,
  validarSellOn,
  calcularPayoutSellOn,
  bonusAtingido,
} from "./mercado.regras";

describe("validarBonus (09 §4)", () => {
  it("aceita lista vazia / ausente", () => {
    expect(validarBonus(undefined, 4)).toEqual({ ok: true, normalizado: [] });
    expect(validarBonus([], 4)).toEqual({ ok: true, normalizado: [] });
  });

  it("normaliza gols e força meta=1 para títulos", () => {
    const r = validarBonus(
      [
        { tipo: "GOLS_NA_TEMPORADA", meta: 15, valor: 500000 },
        { tipo: "TITULO_LIGA", meta: 99, valor: 1_000_000 },
      ],
      4
    );
    expect(r.ok).toBe(true);
    expect(r.normalizado).toEqual([
      { tipo: "GOLS_NA_TEMPORADA", meta: 15, valor: 500000 },
      { tipo: "TITULO_LIGA", meta: 1, valor: 1_000_000 },
    ]);
  });

  it("rejeita tipo inválido, valor não-positivo, meta de gols fora de 1..60 e excesso de cláusulas", () => {
    expect(validarBonus([{ tipo: "X", valor: 1 }], 4).ok).toBe(false);
    expect(validarBonus([{ tipo: "TITULO_COPA", valor: 0 }], 4).ok).toBe(false);
    expect(validarBonus([{ tipo: "GOLS_NA_TEMPORADA", meta: 0, valor: 10 }], 4).ok).toBe(false);
    expect(validarBonus([{ tipo: "GOLS_NA_TEMPORADA", meta: 61, valor: 10 }], 4).ok).toBe(false);
    expect(validarBonus(Array(5).fill({ tipo: "TITULO_LIGA", valor: 1 }), 4).ok).toBe(false);
  });
});

describe("validarSellOn (09 §4)", () => {
  it("0 ou ausente = sem sell-on", () => {
    expect(validarSellOn(undefined, 0.4)).toEqual({ ok: true, valor: 0 });
    expect(validarSellOn(0, 0.4)).toEqual({ ok: true, valor: 0 });
  });
  it("aceita dentro do teto e arredonda", () => {
    expect(validarSellOn(0.25, 0.4)).toEqual({ ok: true, valor: 0.25 });
  });
  it("rejeita acima do teto ou negativo", () => {
    expect(validarSellOn(0.5, 0.4).ok).toBe(false);
    expect(validarSellOn(-0.1, 0.4).ok).toBe(false);
  });
});

describe("calcularPayoutSellOn", () => {
  it("cada beneficiário recebe percentual × valor da revenda", () => {
    const r = calcularPayoutSellOn(10_000_000, [
      { clubeBeneficiarioId: "a", percentual: 0.1 },
      { clubeBeneficiarioId: "b", percentual: 0.2 },
    ]);
    expect(r).toEqual([
      { clubeBeneficiarioId: "a", valor: 1_000_000 },
      { clubeBeneficiarioId: "b", valor: 2_000_000 },
    ]);
  });
  it("ignora payout zero", () => {
    expect(calcularPayoutSellOn(0, [{ clubeBeneficiarioId: "a", percentual: 0.3 }])).toEqual([]);
  });
});

describe("bonusAtingido", () => {
  const base = { meta: 15, golsNaTemporada: 0, clubeCampeaoLiga: false, clubeCampeaoCopa: false };
  it("GOLS_NA_TEMPORADA compara com a meta", () => {
    expect(bonusAtingido({ ...base, tipo: "GOLS_NA_TEMPORADA", golsNaTemporada: 14 })).toBe(false);
    expect(bonusAtingido({ ...base, tipo: "GOLS_NA_TEMPORADA", golsNaTemporada: 15 })).toBe(true);
  });
  it("TITULO_LIGA / TITULO_COPA olham o campeão", () => {
    expect(bonusAtingido({ ...base, tipo: "TITULO_LIGA", clubeCampeaoLiga: true })).toBe(true);
    expect(bonusAtingido({ ...base, tipo: "TITULO_COPA", clubeCampeaoCopa: false })).toBe(false);
  });
});
