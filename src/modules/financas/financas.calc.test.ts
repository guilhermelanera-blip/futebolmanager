import { describe, it, expect } from "vitest";
import {
  calcularBilheteria,
  calcularPatrocinioSemanal,
  calcularFolhaSemanal,
  calcularManutencaoSemanal,
  calcularPremiacaoLiga,
  deveDeclararFalenciaPorCaixa,
  atualizarContadorCaixaNegativo,
} from "./financas.calc";

const bilheteriaBase = {
  capacidadeEstadio: 40000,
  precoIngresso: 80,
  moralTorcida: 50,
  reputacaoMandante: 60,
  reputacaoVisitante: 60,
  ocupacaoBase: 0.55,
  precoReferencia: 80,
};

describe("calcularBilheteria", () => {
  it("público nunca passa da capacidade e renda = público × preço", () => {
    const r = calcularBilheteria({ ...bilheteriaBase, moralTorcida: 100, reputacaoMandante: 100, reputacaoVisitante: 100 });
    expect(r.publico).toBeLessThanOrEqual(bilheteriaBase.capacidadeEstadio);
    expect(r.ocupacao).toBeLessThanOrEqual(1);
    expect(r.renda).toBe(r.publico * bilheteriaBase.precoIngresso);
  });

  it("moral da torcida mais alta enche mais o estádio", () => {
    const baixa = calcularBilheteria({ ...bilheteriaBase, moralTorcida: 20 });
    const alta = calcularBilheteria({ ...bilheteriaBase, moralTorcida: 90 });
    expect(alta.publico).toBeGreaterThan(baixa.publico);
  });

  it("preço acima da referência reduz a ocupação (elasticidade)", () => {
    const caro = calcularBilheteria({ ...bilheteriaBase, precoIngresso: 200 });
    const normal = calcularBilheteria({ ...bilheteriaBase, precoIngresso: 80 });
    expect(caro.ocupacao).toBeLessThan(normal.ocupacao);
  });
});

describe("calcularPatrocinioSemanal", () => {
  it("cresce com a reputação", () => {
    expect(calcularPatrocinioSemanal(80, 60000)).toBeGreaterThan(
      calcularPatrocinioSemanal(40, 60000)
    );
  });
  it("reputação 50 rende 1.2× a base", () => {
    expect(calcularPatrocinioSemanal(50, 100000)).toBe(120000);
  });
});

describe("calcularFolhaSemanal / calcularManutencaoSemanal", () => {
  it("folha soma os salários", () => {
    expect(calcularFolhaSemanal([10000, 20000, 5000])).toBe(35000);
  });
  it("manutenção escala com o nível de estádio e CT", () => {
    const m = calcularManutencaoSemanal({
      nivelEstadio: 3,
      nivelCT: 2,
      custoEstadioPorNivel: 18000,
      custoCTPorNivel: 14000,
    });
    expect(m).toBe(3 * 18000 + 2 * 14000);
  });
});

describe("calcularPremiacaoLiga", () => {
  it("campeão recebe o prêmio máximo, último o mínimo", () => {
    const p = { qtdeClubes: 20, premioCampeao: 40_000_000, premioUltimo: 4_000_000 };
    expect(calcularPremiacaoLiga({ ...p, posicao: 1 })).toBe(40_000_000);
    expect(calcularPremiacaoLiga({ ...p, posicao: 20 })).toBe(4_000_000);
  });
  it("posições intermediárias ficam entre os extremos e são monotônicas", () => {
    const p = { qtdeClubes: 20, premioCampeao: 40_000_000, premioUltimo: 4_000_000 };
    const p5 = calcularPremiacaoLiga({ ...p, posicao: 5 });
    const p10 = calcularPremiacaoLiga({ ...p, posicao: 10 });
    expect(p5).toBeGreaterThan(p10);
    expect(p10).toBeGreaterThan(4_000_000);
    expect(p5).toBeLessThan(40_000_000);
  });
});

describe("falência pelo critério de caixa (11 §6)", () => {
  it("só declara quando HÁ folha em atraso E o contador atingiu o limite", () => {
    expect(
      deveDeclararFalenciaPorCaixa({ diasCaixaNegativoConsecutivos: 30, folhaEmAtraso: true, limiteDias: 30 })
    ).toBe(true);
    // contador alto mas folha em dia -> não
    expect(
      deveDeclararFalenciaPorCaixa({ diasCaixaNegativoConsecutivos: 60, folhaEmAtraso: false, limiteDias: 30 })
    ).toBe(false);
    // folha em atraso mas contador abaixo do limite -> não
    expect(
      deveDeclararFalenciaPorCaixa({ diasCaixaNegativoConsecutivos: 10, folhaEmAtraso: true, limiteDias: 30 })
    ).toBe(false);
  });
});

describe("atualizarContadorCaixaNegativo", () => {
  it("acumula enquanto o caixa está negativo", () => {
    expect(
      atualizarContadorCaixaNegativo({ contadorAtual: 12, saldoCaixa: -500, diasDecorridos: 1 })
    ).toBe(13);
  });
  it("zera assim que o caixa deixa de ser negativo", () => {
    expect(
      atualizarContadorCaixaNegativo({ contadorAtual: 29, saldoCaixa: 0, diasDecorridos: 1 })
    ).toBe(0);
    expect(
      atualizarContadorCaixaNegativo({ contadorAtual: 29, saldoCaixa: 100, diasDecorridos: 7 })
    ).toBe(0);
  });
});
