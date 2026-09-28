import { describe, it, expect } from "vitest";
import { validarInicioTemporada, EstadoInicio } from "./inicioTemporada.service";

const base: EstadoInicio = {
  ligaExiste: true,
  calendarioIniciado: false,
  temTemporadaAtiva: false,
  qtdeClubes: 20,
};

describe("validarInicioTemporada", () => {
  it("permite iniciar quando a liga existe, sem calendário e sem temporada ativa", () => {
    expect(validarInicioTemporada(base)).toMatchObject({ ok: true });
  });

  it("404 se a liga não existe", () => {
    expect(validarInicioTemporada({ ...base, ligaExiste: false })).toMatchObject({ ok: false, status: 404 });
  });

  it("409 se o calendário já foi iniciado (07 §2)", () => {
    expect(validarInicioTemporada({ ...base, calendarioIniciado: true })).toMatchObject({ ok: false, status: 409 });
  });

  it("409 se já há temporada em andamento", () => {
    expect(validarInicioTemporada({ ...base, temTemporadaAtiva: true })).toMatchObject({ ok: false, status: 409 });
  });

  it("409 se o número de clubes é ímpar ou menor que 16", () => {
    expect(validarInicioTemporada({ ...base, qtdeClubes: 19 })).toMatchObject({ ok: false, status: 409 });
    expect(validarInicioTemporada({ ...base, qtdeClubes: 14 })).toMatchObject({ ok: false, status: 409 });
  });
});
