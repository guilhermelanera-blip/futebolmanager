import { describe, it, expect } from "vitest";
import {
  validarRegistro,
  normalizarEmail,
  gerarTokenSessao,
  calcularExpiracao,
  sessaoEstaValida,
  SENHA_MIN,
} from "./conta.regras";

describe("validarRegistro", () => {
  const valido = {
    email: "Ana@Exemplo.com ",
    nome: "Ana",
    senha: "senhaforte1",
    consentimentoLGPD: true,
  };

  it("aceita dados válidos", () => {
    expect(validarRegistro(valido)).toEqual([]);
  });

  it("rejeita e-mail malformado", () => {
    expect(validarRegistro({ ...valido, email: "ana@sem-tld" }).length).toBeGreaterThan(0);
  });

  it(`rejeita senha com menos de ${SENHA_MIN} caracteres`, () => {
    expect(validarRegistro({ ...valido, senha: "curta" }).length).toBeGreaterThan(0);
  });

  it("exige consentimento LGPD explícito", () => {
    expect(validarRegistro({ ...valido, consentimentoLGPD: false })).toContain(
      "É necessário aceitar a política de privacidade (LGPD) para criar a conta."
    );
    // ausência também não vale
    const semFlag = { email: valido.email, nome: valido.nome, senha: valido.senha };
    expect(validarRegistro(semFlag).length).toBeGreaterThan(0);
  });

  it("rejeita nome muito curto", () => {
    expect(validarRegistro({ ...valido, nome: "A" }).length).toBeGreaterThan(0);
  });
});

describe("normalizarEmail", () => {
  it("apara espaços e baixa a caixa", () => {
    expect(normalizarEmail("  Fulano.DE.Tal@Email.COM ")).toBe("fulano.de.tal@email.com");
  });
});

describe("token e sessão", () => {
  it("gera tokens únicos e URL-safe", () => {
    const a = gerarTokenSessao();
    const b = gerarTokenSessao();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it("calcularExpiracao soma o TTL em dias", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const exp = calcularExpiracao(agora, 30);
    expect(exp.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("sessaoEstaValida respeita expiração e revogação", () => {
    const agora = new Date("2026-01-10T00:00:00Z");
    expect(
      sessaoEstaValida({ expiraEm: new Date("2026-02-01T00:00:00Z"), revogadaEm: null }, agora)
    ).toBe(true);
    expect(
      sessaoEstaValida({ expiraEm: new Date("2026-01-01T00:00:00Z"), revogadaEm: null }, agora)
    ).toBe(false);
    expect(
      sessaoEstaValida(
        { expiraEm: new Date("2026-02-01T00:00:00Z"), revogadaEm: new Date("2026-01-05T00:00:00Z") },
        agora
      )
    ).toBe(false);
  });
});
