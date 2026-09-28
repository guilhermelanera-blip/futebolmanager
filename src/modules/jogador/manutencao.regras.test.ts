import { describe, it, expect } from "vitest";
import {
  passoEmDirecaoA,
  recuperarFadiga,
  acumularFadigaPartida,
} from "./manutencao.regras";

describe("passoEmDirecaoA", () => {
  it("aproxima do alvo por baixo sem ultrapassar", () => {
    expect(passoEmDirecaoA(40, 50, 3)).toBe(43);
    expect(passoEmDirecaoA(49, 50, 3)).toBe(50);
  });
  it("aproxima do alvo por cima sem ultrapassar", () => {
    expect(passoEmDirecaoA(80, 60, 5)).toBe(75);
    expect(passoEmDirecaoA(62, 60, 5)).toBe(60);
  });
  it("no alvo, não muda", () => {
    expect(passoEmDirecaoA(60, 60, 5)).toBe(60);
  });
});

describe("recuperarFadiga", () => {
  it("recupera o valor do dia, nunca abaixo de 0", () => {
    expect(recuperarFadiga(30, 10)).toBe(20);
    expect(recuperarFadiga(6, 10)).toBe(0);
  });
});

describe("acumularFadigaPartida", () => {
  it("soma o ganho, com teto em 100", () => {
    expect(acumularFadigaPartida(50, 18)).toBe(68);
    expect(acumularFadigaPartida(90, 18)).toBe(100);
  });
});
