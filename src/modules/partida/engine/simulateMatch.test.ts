import { describe, it, expect } from "vitest";
import { simularPartida, TimeEntrada, JogadorAtributos } from "./simulateMatch";

function jogadorFake(overrides: Partial<JogadorAtributos> = {}): JogadorAtributos {
  return {
    finalizacao: 12,
    passe: 12,
    drible: 12,
    marcacao: 12,
    desarme: 12,
    velocidade: 12,
    posicionamento: 12,
    reflexos: 12,
    saidaDeGol: 12,
    ehGoleiro: false,
    ...overrides,
  };
}

function timeFake(clubeId: string, overrides: Partial<JogadorAtributos> = {}): TimeEntrada {
  const goleiro = jogadorFake({ ehGoleiro: true, ...overrides });
  const linha = Array.from({ length: 10 }, () => jogadorFake(overrides));
  return { clubeId, jogadores: [goleiro, ...linha], postura: "EQUILIBRADA" };
}

describe("simularPartida", () => {
  it("é determinística: mesmo seed produz sempre o mesmo resultado (R21)", () => {
    const mandante = timeFake("clube-a");
    const visitante = timeFake("clube-b");

    const r1 = simularPartida(mandante, visitante, "seed-fixo-123");
    const r2 = simularPartida(mandante, visitante, "seed-fixo-123");

    expect(r1.golsMandante).toBe(r2.golsMandante);
    expect(r1.golsVisitante).toBe(r2.golsVisitante);
    expect(r1.eventos).toEqual(r2.eventos);
  });

  it("seeds diferentes tendem a produzir resultados diferentes", () => {
    const mandante = timeFake("clube-a");
    const visitante = timeFake("clube-b");

    const r1 = simularPartida(mandante, visitante, "seed-um");
    const r2 = simularPartida(mandante, visitante, "seed-dois");

    // não é garantido matematicamente, mas com times iguais e seeds
    // diferentes é extremamente improvável que todos os eventos batam.
    expect(r1.eventos).not.toEqual(r2.eventos);
  });

  it("time muito superior tecnicamente vence com mais frequência estatística", () => {
    const forte = timeFake("forte", { finalizacao: 19, passe: 18, drible: 18 });
    const fraco = timeFake("fraco", { finalizacao: 6, passe: 6, drible: 6, marcacao: 6, desarme: 6 });

    let vitoriasForte = 0;
    const RODADAS = 30;
    for (let i = 0; i < RODADAS; i++) {
      const r = simularPartida(forte, fraco, `seed-${i}`);
      if (r.golsMandante > r.golsVisitante) vitoriasForte++;
    }

    // não deve ser 100% (variância controlada permite zebra, 03 seção 5),
    // mas deve vencer claramente na maioria das vezes.
    expect(vitoriasForte).toBeGreaterThan(RODADAS * 0.6);
  });

  it("calibração: entre times equilibrados, estatísticas ficam na faixa do Brasileirão", () => {
    // Amostra pequena (rápida) só para pegar regressão grosseira de
    // calibração. O ajuste fino é feito por `npm run backtest` (02 §6).
    const N = 400;
    let gols = 0;
    let vMandante = 0;
    let vVisitante = 0;
    let empates = 0;
    let amarelos = 0;
    for (let i = 0; i < N; i++) {
      const r = simularPartida(timeFake("a"), timeFake("b"), `cal-${i}`);
      gols += r.golsMandante + r.golsVisitante;
      if (r.golsMandante > r.golsVisitante) vMandante++;
      else if (r.golsMandante < r.golsVisitante) vVisitante++;
      else empates++;
      amarelos += r.eventos.filter((e) => e.tipo === "CARTAO_AMARELO").length;
    }
    const golsPorJogo = gols / N;
    expect(golsPorJogo).toBeGreaterThan(2.0);
    expect(golsPorJogo).toBeLessThan(3.0);
    expect(amarelos / N).toBeGreaterThan(4);
    expect(amarelos / N).toBeLessThan(6.5);
    // mando de campo: mandante vence mais que visitante
    expect(vMandante).toBeGreaterThan(vVisitante);
    // empates e vitórias visitantes existem em proporção razoável
    expect(empates / N).toBeGreaterThan(0.18);
    expect(vVisitante / N).toBeGreaterThan(0.18);
  });
});
