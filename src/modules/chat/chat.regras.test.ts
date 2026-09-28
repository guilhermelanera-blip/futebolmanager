import { describe, it, expect } from "vitest";
import {
  validarTexto,
  idConversaParticular,
  filtrarConteudo,
  TEXTO_MAX,
} from "./chat.regras";

describe("validarTexto", () => {
  it("aceita texto normal", () => {
    expect(validarTexto("bora fechar essa troca?")).toEqual({ ok: true });
  });
  it("rejeita vazio / só espaços", () => {
    expect(validarTexto("   ").ok).toBe(false);
    expect(validarTexto("").ok).toBe(false);
    expect(validarTexto(undefined).ok).toBe(false);
  });
  it("rejeita acima do limite", () => {
    expect(validarTexto("a".repeat(TEXTO_MAX + 1)).ok).toBe(false);
  });
});

describe("idConversaParticular", () => {
  it("é o mesmo id independente da ordem", () => {
    expect(idConversaParticular("u2", "u1")).toBe(idConversaParticular("u1", "u2"));
  });
  it("junta os dois ids ordenados", () => {
    expect(idConversaParticular("u1", "u2")).toBe("u1:u2");
  });
});

describe("filtrarConteudo (18 §3)", () => {
  const termos = ["macaco", "filho da puta", "viado"];

  it("libera mensagem limpa", () => {
    expect(filtrarConteudo("qual valor você aceita no meia?", termos).bloqueado).toBe(false);
  });

  it("bloqueia termo isolado, sem depender de acento/caixa", () => {
    expect(filtrarConteudo("seu time é uma piada, MACACO", termos).bloqueado).toBe(true);
    expect(filtrarConteudo("vai tomar, viádo", termos)).toMatchObject({ bloqueado: true });
  });

  it("bloqueia expressão de várias palavras", () => {
    expect(filtrarConteudo("cala a boca filho da puta", termos).bloqueado).toBe(true);
  });

  it("não dá falso-positivo em substring", () => {
    // "camacaco" não contém a palavra "macaco" isolada
    expect(filtrarConteudo("camacaco não é nada", termos).bloqueado).toBe(false);
  });

  it("lista vazia nunca bloqueia", () => {
    expect(filtrarConteudo("qualquer coisa aqui", []).bloqueado).toBe(false);
  });
});
