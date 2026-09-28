import { describe, it, expect } from "vitest";
import {
  calcularValorDeMercado,
  salarioJustoSemanal,
  janelasAbertas,
  tipoPermitidoAgora,
  decidirComoDetentorIA,
  decidirComoJogadorIA,
} from "./mercado.regras";

const DIA = 24 * 60 * 60 * 1000;

describe("calcularValorDeMercado", () => {
  const base = {
    overall: 14,
    potencial: 15,
    idade: 25,
    formaRecente: 0,
    anosRestantesContrato: 3,
  };

  it("cresce com o overall", () => {
    expect(calcularValorDeMercado({ ...base, overall: 18 })).toBeGreaterThan(
      calcularValorDeMercado({ ...base, overall: 12 })
    );
  });

  it("jovem com potencial vale mais que veterano de mesmo overall", () => {
    const jovem = calcularValorDeMercado({ ...base, idade: 20, potencial: 19 });
    const veterano = calcularValorDeMercado({ ...base, idade: 33, potencial: 14 });
    expect(jovem).toBeGreaterThan(veterano);
  });

  it("contrato acabando derruba o valor", () => {
    const longo = calcularValorDeMercado({ ...base, anosRestantesContrato: 3 });
    const acabando = calcularValorDeMercado({ ...base, anosRestantesContrato: 0.2 });
    expect(acabando).toBeLessThan(longo);
  });

  it("nunca é negativo", () => {
    expect(
      calcularValorDeMercado({ overall: 3, potencial: 3, idade: 38, formaRecente: -1, anosRestantesContrato: 0 })
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("salarioJustoSemanal", () => {
  it("cresce com o valor de mercado", () => {
    expect(salarioJustoSemanal(10_000_000)).toBeGreaterThan(salarioJustoSemanal(1_000_000));
  });
});

describe("janelasAbertas / tipoPermitidoAgora", () => {
  const inicio = new Date("2026-03-01T00:00:00Z");
  const fimPrevisto = new Date("2026-11-01T00:00:00Z");
  const temporada = { inicio, fimPrevisto };

  it("janela principal: nas 4 semanas antes do início", () => {
    const dentro = janelasAbertas(new Date(inicio.getTime() - 10 * DIA), temporada);
    expect(dentro.principal).toBe(true);
    expect(dentro.algumaAberta).toBe(true);

    const fora = janelasAbertas(new Date(inicio.getTime() - 40 * DIA), temporada);
    expect(fora.principal).toBe(false);
  });

  it("janela intermediária: ~meio da temporada, some depois de 3 semanas", () => {
    const meio = new Date(inicio.getTime() + (fimPrevisto.getTime() - inicio.getTime()) / 2);
    expect(janelasAbertas(new Date(meio.getTime() + 5 * DIA), temporada).intermediaria).toBe(true);
    expect(janelasAbertas(new Date(meio.getTime() + 30 * DIA), temporada).intermediaria).toBe(false);
  });

  it("fora das janelas só permite jogador livre", () => {
    const j = janelasAbertas(new Date(inicio.getTime() + 5 * DIA), temporada);
    expect(j.algumaAberta).toBe(false);
    expect(tipoPermitidoAgora("LIVRE", j)).toBe(true);
    expect(tipoPermitidoAgora("COMPRA", j)).toBe(false);
    expect(tipoPermitidoAgora("EMPRESTIMO", j)).toBe(false);
  });
});

describe("decidirComoDetentorIA", () => {
  const base = {
    tipo: "COMPRA" as const,
    valorMercado: 10_000_000,
    idadeJogador: 25,
    jogadorExcedente: false,
    perfilToleranciaRisco: 0.5,
  };

  it("aceita oferta acima do preço-alvo", () => {
    expect(decidirComoDetentorIA({ ...base, valorOferta: 20_000_000 }).acao).toBe("ACEITAR");
  });

  it("contrapropõe quando a oferta está perto do alvo", () => {
    const d = decidirComoDetentorIA({ ...base, valorOferta: 10_000_000 });
    expect(d.acao).toBe("CONTRAPROPOR");
    expect(d.valorContraproposta).toBeGreaterThan(10_000_000);
  });

  it("recusa oferta muito baixa", () => {
    expect(decidirComoDetentorIA({ ...base, valorOferta: 1_000_000 }).acao).toBe("RECUSAR");
  });

  it("veterano em excesso na posição é liberado mais barato", () => {
    const dizNao = decidirComoDetentorIA({ ...base, valorOferta: 9_000_000 });
    const dizSim = decidirComoDetentorIA({
      ...base,
      valorOferta: 9_000_000,
      idadeJogador: 32,
      jogadorExcedente: true,
    });
    expect(dizNao.acao).not.toBe("ACEITAR");
    expect(dizSim.acao).toBe("ACEITAR");
  });
});

describe("decidirComoJogadorIA", () => {
  const base = {
    salarioOfertaSemanal: 60_000,
    luvas: 0,
    duracaoAnos: 3,
    valorMercado: 8_000_000, // salário justo ~ 8M*0.006+2000 = 50000
    reputacaoClubeDestino: 60,
    reputacaoClubeAtual: 60,
    poucoUtilizado: false,
  };

  it("aceita salário à altura e clube de reputação semelhante", () => {
    expect(decidirComoJogadorIA(base).aceita).toBe(true);
  });

  it("recusa salário abaixo do justo", () => {
    expect(decidirComoJogadorIA({ ...base, salarioOfertaSemanal: 20_000 }).aceita).toBe(false);
  });

  it("recusa cair para clube bem menor, salvo se joga pouco", () => {
    expect(
      decidirComoJogadorIA({ ...base, reputacaoClubeDestino: 40 }).aceita
    ).toBe(false);
    expect(
      decidirComoJogadorIA({ ...base, reputacaoClubeDestino: 40, poucoUtilizado: true }).aceita
    ).toBe(true);
  });

  it("jogador livre (sem clube atual) não tem trava de ambição", () => {
    expect(
      decidirComoJogadorIA({ ...base, reputacaoClubeAtual: null, reputacaoClubeDestino: 30 }).aceita
    ).toBe(true);
  });

  it("recusa contrato de menos de 1 ano", () => {
    expect(decidirComoJogadorIA({ ...base, duracaoAnos: 0 }).aceita).toBe(false);
  });
});
