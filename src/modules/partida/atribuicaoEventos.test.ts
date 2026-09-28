import { describe, it, expect } from "vitest";
import { atribuirEventosAJogadores, JogadorElenco } from "./partida.service";

function elenco(prefixo: string): JogadorElenco[] {
  const posicoes = [
    "GOLEIRO", "ZAGUEIRO", "ZAGUEIRO", "LATERAL", "LATERAL", "VOLANTE",
    "VOLANTE", "MEIA", "MEIA", "PONTA", "ATACANTE",
  ];
  return posicoes.map((posicao, i) => ({ id: `${prefixo}-${i}`, posicao, idade: 20 + i, tracos: "" }));
}

const mapa = new Map<string, JogadorElenco[]>([
  ["casa", elenco("casa")],
  ["fora", elenco("fora")],
]);

const eventos = [
  { minuto: 10, tipo: "GOL", clubeId: "casa" },
  { minuto: 22, tipo: "CARTAO_AMARELO", clubeId: "fora" },
  { minuto: 44, tipo: "LESAO", clubeId: "casa" },
  { minuto: 70, tipo: "GOL", clubeId: "fora" },
  { minuto: 80, tipo: "CARTAO_VERMELHO", clubeId: "casa" },
];

describe("atribuirEventosAJogadores", () => {
  it("é determinística para o mesmo seed", () => {
    const a = atribuirEventosAJogadores("seed-x", eventos, mapa);
    const b = atribuirEventosAJogadores("seed-x", eventos, mapa);
    expect(a).toEqual(b);
  });

  it("cada evento recebe um jogador do clube correto", () => {
    const r = atribuirEventosAJogadores("seed-y", eventos, mapa);
    for (const e of r) {
      expect(e.jogadorId).toBeTruthy();
      expect(e.jogadorId!.startsWith(e.clubeId)).toBe(true);
    }
  });

  it("gols nunca são atribuídos ao goleiro; cartões também não", () => {
    // varre vários seeds para exercitar o sorteio
    for (let s = 0; s < 50; s++) {
      const r = atribuirEventosAJogadores(`s${s}`, eventos, mapa);
      for (const e of r) {
        if (e.tipo === "GOL" || e.tipo.startsWith("CARTAO")) {
          const jog = mapa.get(e.clubeId)!.find((j) => j.id === e.jogadorId)!;
          expect(jog.posicao).not.toBe("GOLEIRO");
        }
      }
    }
  });

  it("clube sem elenco cadastrado devolve jogadorId nulo", () => {
    const r = atribuirEventosAJogadores("seed-z", [{ minuto: 5, tipo: "GOL", clubeId: "desconhecido" }], mapa);
    expect(r[0].jogadorId).toBeNull();
  });
});
