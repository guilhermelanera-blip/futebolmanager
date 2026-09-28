// Evolução/declínio anual de atributos — 04_SISTEMA_DE_JOGADORES, seção 3.
// Aplicada uma vez por temporada, na virada (08 §6).
//
// Fases (pela idade JÁ avançada da nova temporada):
//   Formação  15-20: crescimento rápido rumo ao potencial.
//   Ascensão  21-24: crescimento moderado.
//   Pico      25-29: estável (ruído leve).
//   Declínio  30+:   queda gradual, mais acentuada nos atributos físicos.
//
// "Velocidade de evolução depende de: distância até o potencial, minutos
//  jogados, foco de treino, moral." A Fase 1 ainda não tem minutos nem foco
//  de treino — a evolução aqui usa distância ao potencial + fase de idade +
//  moral. Determinística dado o RNG recebido (auditável).

import {
  AtributosBasicos,
  CAMPOS_ATRIBUTO,
} from "./overall";

const FISICOS: (keyof AtributosBasicos)[] = ["velocidade", "resistencia", "forca"];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function clampAtributo(v: number): number {
  return Math.max(1, Math.min(20, Math.round(v)));
}

export interface EntradaEvolucao {
  atributos: AtributosBasicos;
  idadeNova: number; // idade já com +1 da virada
  potencial: number; // teto de desenvolvimento (04 §4)
  moral: number; // 0..100
  rng: () => number;
}

export function evoluirAtributosAnuais(e: EntradaEvolucao): AtributosBasicos {
  const fatorMoral = 0.85 + (clamp(e.moral, 0, 100) / 100) * 0.3; // 0.85 .. 1.15
  const out: AtributosBasicos = { ...e.atributos };

  for (const campo of CAMPOS_ATRIBUTO) {
    const atual = out[campo];
    const ehFisico = FISICOS.includes(campo);
    let delta = 0;

    if (e.idadeNova <= 20) {
      const headroom = Math.max(0, e.potencial - atual);
      delta = headroom > 0 ? e.rng() * Math.min(2.2, headroom) * fatorMoral : 0;
    } else if (e.idadeNova <= 24) {
      const headroom = Math.max(0, e.potencial - atual);
      delta = headroom > 0 ? e.rng() * Math.min(1.2, headroom) * fatorMoral : 0;
    } else if (e.idadeNova <= 29) {
      delta = (e.rng() - 0.5) * 1.0; // ~estável
    } else {
      const base = ehFisico ? -(0.8 + e.rng() * 1.4) : -(0.2 + e.rng() * 0.8);
      const idadePenal = e.idadeNova >= 33 ? 1.4 : 1;
      delta = base * idadePenal * (2 - fatorMoral); // moral alta amortece a queda
    }

    let novo = clampAtributo(atual + delta);
    // O potencial é teto de crescimento — nunca puxa para baixo quem já está acima.
    if (delta > 0) novo = Math.min(novo, Math.max(atual, e.potencial));
    out[campo] = novo;
  }

  return out;
}
