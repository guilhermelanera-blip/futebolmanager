import { describe, it, expect } from "vitest";
import {
  gerarPerfilIA,
  posturaParaMotor,
  idadeCorteDispensa,
} from "./perfilIA";

describe("gerarPerfilIA", () => {
  it("é determinístico por seed e todos os eixos ficam em 0..1", () => {
    const a = gerarPerfilIA("clube-7");
    const b = gerarPerfilIA("clube-7");
    expect(a).toEqual(b);
    for (const v of [a.agressividadeMercado, a.toleranciaRisco, a.posturaTatica, a.valorizaJovens]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("produz variedade de arquétipos ao longo de muitos clubes", () => {
    const contagem = new Map<string, number>();
    for (let i = 0; i < 400; i++) {
      const p = gerarPerfilIA(`c${i}`);
      contagem.set(p.arquetipo, (contagem.get(p.arquetipo) ?? 0) + 1);
    }
    expect(contagem.size).toBe(5); // todos os arquétipos aparecem
    // FORMADOR tem peso maior que GASTADOR
    expect((contagem.get("FORMADOR") ?? 0)).toBeGreaterThan(contagem.get("GASTADOR") ?? 0);
  });

  it("FORMADOR valoriza jovens; CONSERVADOR é cauteloso no mercado", () => {
    // procura um seed de cada arquétipo
    let formador, conservador;
    for (let i = 0; i < 500 && (!formador || !conservador); i++) {
      const p = gerarPerfilIA(`k${i}`);
      if (p.arquetipo === "FORMADOR") formador = p;
      if (p.arquetipo === "CONSERVADOR") conservador = p;
    }
    expect(formador!.valorizaJovens).toBeGreaterThan(0.6);
    expect(conservador!.agressividadeMercado).toBeLessThan(0.5);
  });
});

describe("posturaParaMotor", () => {
  it("mapeia o eixo tático para a postura do motor", () => {
    expect(posturaParaMotor(0.2)).toBe("DEFENSIVA");
    expect(posturaParaMotor(0.5)).toBe("EQUILIBRADA");
    expect(posturaParaMotor(0.8)).toBe("OFENSIVA");
    expect(posturaParaMotor(null)).toBe("EQUILIBRADA");
  });
});

describe("idadeCorteDispensa", () => {
  it("quem valoriza jovens dispensa veterano mais cedo", () => {
    expect(idadeCorteDispensa(0.9)).toBeLessThan(idadeCorteDispensa(0.5));
    expect(idadeCorteDispensa(0.1)).toBeGreaterThan(idadeCorteDispensa(0.5));
  });
});
