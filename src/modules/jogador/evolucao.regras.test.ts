import { describe, it, expect } from "vitest";
import { createRng } from "../../utils/rng";
import { evoluirAtributosAnuais } from "./evolucao.regras";
import { AtributosBasicos, CAMPOS_ATRIBUTO } from "./overall";

function attrs(v: number): AtributosBasicos {
  return {
    finalizacao: v, passe: v, drible: v, cabeceio: v, cruzamento: v, marcacao: v,
    desarme: v, velocidade: v, resistencia: v, forca: v, visaoDeJogo: v,
    posicionamento: v, reflexos: v, saidaDeGol: v,
  };
}

const media = (a: AtributosBasicos) =>
  CAMPOS_ATRIBUTO.reduce((s, c) => s + a[c], 0) / CAMPOS_ATRIBUTO.length;

describe("evoluirAtributosAnuais", () => {
  it("é determinística para o mesmo seed", () => {
    const base = { atributos: attrs(12), idadeNova: 19, potencial: 18, moral: 70 };
    const a = evoluirAtributosAnuais({ ...base, rng: createRng("s") });
    const b = evoluirAtributosAnuais({ ...base, rng: createRng("s") });
    expect(a).toEqual(b);
  });

  it("mantém tudo na escala 1..20", () => {
    for (let i = 0; i < 50; i++) {
      for (const idade of [17, 22, 27, 31, 35]) {
        const r = evoluirAtributosAnuais({
          atributos: attrs(10 + (i % 10)),
          idadeNova: idade,
          potencial: 16,
          moral: 50,
          rng: createRng(`x${i}-${idade}`),
        });
        for (const c of CAMPOS_ATRIBUTO) {
          expect(r[c]).toBeGreaterThanOrEqual(1);
          expect(r[c]).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it("jovem com folga de potencial tende a melhorar", () => {
    let subiu = 0;
    for (let i = 0; i < 40; i++) {
      const r = evoluirAtributosAnuais({
        atributos: attrs(10),
        idadeNova: 18,
        potencial: 18,
        moral: 75,
        rng: createRng(`jovem${i}`),
      });
      if (media(r) > 10) subiu++;
    }
    expect(subiu).toBeGreaterThan(35);
  });

  it("veterano perde mais atributo físico que técnico/mental", () => {
    const r = evoluirAtributosAnuais({
      atributos: attrs(15),
      idadeNova: 34,
      potencial: 15,
      moral: 50,
      rng: createRng("veterano"),
    });
    const fisico = (r.velocidade + r.resistencia + r.forca) / 3;
    const tecnico = (r.passe + r.visaoDeJogo + r.posicionamento) / 3;
    expect(fisico).toBeLessThan(15);
    expect(fisico).toBeLessThan(tecnico);
  });

  it("crescimento não ultrapassa o potencial", () => {
    const r = evoluirAtributosAnuais({
      atributos: attrs(14),
      idadeNova: 19,
      potencial: 15,
      moral: 90,
      rng: createRng("teto"),
    });
    for (const c of CAMPOS_ATRIBUTO) expect(r[c]).toBeLessThanOrEqual(15);
  });

  it("moral alta amortece o declínio do veterano", () => {
    const comMoralBaixa = evoluirAtributosAnuais({
      atributos: attrs(15), idadeNova: 34, potencial: 15, moral: 15, rng: createRng("m"),
    });
    const comMoralAlta = evoluirAtributosAnuais({
      atributos: attrs(15), idadeNova: 34, potencial: 15, moral: 95, rng: createRng("m"),
    });
    expect(media(comMoralAlta)).toBeGreaterThan(media(comMoralBaixa));
  });
});
