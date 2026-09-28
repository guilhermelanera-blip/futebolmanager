import { describe, it, expect } from "vitest";
import {
  calcularClassificacao,
  PartidaResultado,
} from "./classificacao.service";

const clubes = [
  { id: "a", nome: "Clube A" },
  { id: "b", nome: "Clube B" },
  { id: "c", nome: "Clube C" },
];

function jogo(
  mandanteId: string,
  visitanteId: string,
  golsMandante: number | null,
  golsVisitante: number | null,
  status = "ENCERRADA"
): PartidaResultado {
  return { mandanteId, visitanteId, golsMandante, golsVisitante, status };
}

describe("calcularClassificacao", () => {
  it("aplica 3 pontos por vitória, 1 por empate, 0 por derrota", () => {
    const tabela = calcularClassificacao(clubes, [
      jogo("a", "b", 2, 0), // A vence
      jogo("b", "c", 1, 1), // empate
      jogo("c", "a", 0, 3), // A vence
    ]);
    const a = tabela.find((l) => l.clubeId === "a")!;
    const b = tabela.find((l) => l.clubeId === "b")!;
    const c = tabela.find((l) => l.clubeId === "c")!;

    expect(a.pontos).toBe(6);
    expect(a.vitorias).toBe(2);
    expect(b.pontos).toBe(1);
    expect(c.pontos).toBe(1);
    expect(a.posicao).toBe(1);
  });

  it("ignora partidas não encerradas ou sem placar", () => {
    const tabela = calcularClassificacao(clubes, [
      jogo("a", "b", 5, 0, "AGENDADA"),
      jogo("a", "c", null, null, "ENCERRADA"),
    ]);
    for (const l of tabela) {
      expect(l.jogos).toBe(0);
      expect(l.pontos).toBe(0);
    }
  });

  it("desempata por vitórias, depois saldo, depois gols pró", () => {
    // A e B terminam com 3 pontos cada; A tem saldo melhor.
    const tabela = calcularClassificacao(
      [
        { id: "a", nome: "Z-Clube" }, // nome pior de propósito
        { id: "b", nome: "A-Clube" },
      ],
      [
        jogo("a", "b", 4, 0), // A vence por 4
        jogo("b", "a", 1, 0), // B vence por 1
      ]
    );
    // 1 vitória cada, mas saldo A = +3, saldo B = -3
    expect(tabela[0].clubeId).toBe("a");
    expect(tabela[0].saldo).toBe(3);
    expect(tabela[1].clubeId).toBe("b");
  });

  it("soma gols pró/contra e saldo corretamente", () => {
    const tabela = calcularClassificacao(clubes, [
      jogo("a", "b", 3, 1),
      jogo("a", "c", 2, 2),
    ]);
    const a = tabela.find((l) => l.clubeId === "a")!;
    expect(a.golsPro).toBe(5);
    expect(a.golsContra).toBe(3);
    expect(a.saldo).toBe(2);
    expect(a.jogos).toBe(2);
  });
});
