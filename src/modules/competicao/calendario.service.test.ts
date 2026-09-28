import { describe, it, expect } from "vitest";
import { dataHoraDaRodada } from "./calendario.service";

// America/Sao_Paulo = UTC-3 fixo. Um horário de parede HH:00 BRT vira
// (HH+3):00 UTC. Helpers para checar isso a partir do instante UTC.
function horaBRT(d: Date): number {
  return (d.getUTCHours() - 3 + 24) % 24;
}
function diaSemanaBRT(d: Date): number {
  // Se a hora UTC < 3, ainda é o dia anterior em BRT.
  const ajuste = d.getUTCHours() < 3 ? -1 : 0;
  const base = new Date(d);
  base.setUTCDate(base.getUTCDate() + ajuste);
  return base.getUTCDay();
}

describe("dataHoraDaRodada", () => {
  // Semana 0 começando numa quarta-feira: 2026-01-07 é quarta.
  const quartaSemana0 = { ano: 2026, mes0: 0, dia: 7 };

  it("rodadas ímpares caem na quarta às 21:00 BRT", () => {
    for (const r of [1, 3, 5, 37]) {
      const d = dataHoraDaRodada(quartaSemana0, r);
      expect(diaSemanaBRT(d)).toBe(3); // quarta
      expect(horaBRT(d)).toBe(21);
    }
  });

  it("rodadas pares caem no domingo às 15:00 BRT", () => {
    for (const r of [2, 4, 6, 38]) {
      const d = dataHoraDaRodada(quartaSemana0, r);
      expect(diaSemanaBRT(d)).toBe(0); // domingo
      expect(horaBRT(d)).toBe(15);
    }
  });

  it("as 38 rodadas são estritamente crescentes no tempo", () => {
    let anterior = 0;
    for (let r = 1; r <= 38; r++) {
      const t = dataHoraDaRodada(quartaSemana0, r).getTime();
      expect(t).toBeGreaterThan(anterior);
      anterior = t;
    }
  });

  it("rodada 1 e rodada 2 estão na mesma semana (quarta e domingo seguinte)", () => {
    const r1 = dataHoraDaRodada(quartaSemana0, 1);
    const r2 = dataHoraDaRodada(quartaSemana0, 2);
    const difDias = (r2.getTime() - r1.getTime()) / 86_400_000;
    expect(difDias).toBeGreaterThan(3);
    expect(difDias).toBeLessThan(5);
  });

  it("38 rodadas cobrem ~19 semanas", () => {
    const r1 = dataHoraDaRodada(quartaSemana0, 1);
    const r38 = dataHoraDaRodada(quartaSemana0, 38);
    const difSemanas = (r38.getTime() - r1.getTime()) / (7 * 86_400_000);
    expect(difSemanas).toBeGreaterThan(18);
    expect(difSemanas).toBeLessThan(19);
  });
});
