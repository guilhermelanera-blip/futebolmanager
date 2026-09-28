import { describe, it, expect } from "vitest";
import {
  moderarNomeClube,
  validarCores,
  validarEscudoUrl,
} from "./identidade.regras";

const termos = ["macaco", "filho da puta"];

describe("moderarNomeClube (05 §1 / 18 §3 / R6-R7)", () => {
  it("aceita um nome fictício plausível", () => {
    expect(moderarNomeClube("Esporte Clube Aurora do Vale", termos)).toEqual({ ok: true });
  });

  it("rejeita nome curto ou longo demais", () => {
    expect(moderarNomeClube("AB", termos).ok).toBe(false);
    expect(moderarNomeClube("x".repeat(61), termos).ok).toBe(false);
  });

  it("rejeita linguagem imprópria", () => {
    expect(moderarNomeClube("Sociedade Esportiva Macaco", termos).ok).toBe(false);
  });

  it("rejeita nome que remete a marca real (R6/R7)", () => {
    expect(moderarNomeClube("Sport Club Flamengo do Interior", termos).ok).toBe(false);
    expect(moderarNomeClube("Real Madryd Paulista", termos)).toEqual({ ok: true }); // variação não listada passa
  });
});

describe("validarCores", () => {
  it("aceita cor única e par de cores", () => {
    expect(validarCores("#1e3a8a")).toEqual({ ok: true });
    expect(validarCores("#1e3a8a/#ffffff")).toEqual({ ok: true });
    expect(validarCores(undefined)).toEqual({ ok: true });
  });
  it("rejeita formato inválido", () => {
    expect(validarCores("azul").ok).toBe(false);
    expect(validarCores("#123").ok).toBe(false);
  });
});

describe("validarEscudoUrl", () => {
  it("aceita https e vazio", () => {
    expect(validarEscudoUrl("https://cdn.exemplo.com/escudo.png")).toEqual({ ok: true });
    expect(validarEscudoUrl("")).toEqual({ ok: true });
  });
  it("rejeita http e lixo", () => {
    expect(validarEscudoUrl("http://x/y.png").ok).toBe(false);
    expect(validarEscudoUrl("javascript:alert(1)").ok).toBe(false);
  });
});
