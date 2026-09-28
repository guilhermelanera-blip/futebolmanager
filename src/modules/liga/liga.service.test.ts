import { describe, it, expect } from "vitest";
import { validarAssuncao, EstadoAssuncao } from "./liga.service";

const base: EstadoAssuncao = {
  ligaExiste: true,
  calendarioIniciado: false,
  usuarioJaControlaClubeNestaLiga: false,
  clubeAlvo: undefined,
  haClubeDisponivel: true,
};

describe("validarAssuncao", () => {
  it("permite assumir por sorteio quando há clube disponível", () => {
    expect(validarAssuncao(base)).toMatchObject({ ok: true });
  });

  it("404 se a liga não existe", () => {
    expect(validarAssuncao({ ...base, ligaExiste: false })).toMatchObject({ ok: false, status: 404 });
  });

  it("403 se o calendário oficial já começou (07, seção 2)", () => {
    expect(validarAssuncao({ ...base, calendarioIniciado: true })).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("409 se o usuário já controla um clube na liga (R10)", () => {
    expect(
      validarAssuncao({ ...base, usuarioJaControlaClubeNestaLiga: true })
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("409 no sorteio quando não há clube disponível", () => {
    expect(validarAssuncao({ ...base, haClubeDisponivel: false })).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("permite assumir um clube de IA livre escolhido explicitamente", () => {
    expect(
      validarAssuncao({
        ...base,
        clubeAlvo: { pertenceALiga: true, tipo: "IA", temPresidente: false },
      })
    ).toMatchObject({ ok: true });
  });

  it("400 se o clube escolhido não é da liga", () => {
    expect(
      validarAssuncao({
        ...base,
        clubeAlvo: { pertenceALiga: false, tipo: "IA", temPresidente: false },
      })
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("409 se o clube escolhido já tem presidente ou é HUMANO", () => {
    expect(
      validarAssuncao({
        ...base,
        clubeAlvo: { pertenceALiga: true, tipo: "HUMANO", temPresidente: true },
      })
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("409 se o clube escolhido é controlado por SAF (05, seção 8)", () => {
    expect(
      validarAssuncao({
        ...base,
        clubeAlvo: { pertenceALiga: true, tipo: "SAF", temPresidente: false },
      })
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("trata clubeAlvo null (id informado, clube inexistente) como falha", () => {
    expect(validarAssuncao({ ...base, clubeAlvo: null })).toMatchObject({ ok: false });
  });
});
