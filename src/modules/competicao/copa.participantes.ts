// Seleção de participantes da Copa Nacional — 00_REGRAS_IMUTAVEIS R35/R36/R38,
// 06_COMPETICOES_E_CALENDARIO seção 2. Função PURA.
//
// - T2+ : 16 clubes = top 16 da Liga Nacional da temporada anterior (os 4
//         últimos ficam de fora — R35). Seeding = classificação final.
// - T1  : todos os clubes humanos + sorteio de clubes de IA (R36).
//         Se houver 17-20 clubes humanos, expande para 32 com preliminar
//         de jogo único (R38). Seeding = sorteio (não há histórico).

import { createRng } from "../../utils/rng";

export type FormatoCopa = "PADRAO_16" | "EXPANDIDO_32";

export interface SelecaoParticipantesParams {
  todosClubesIds: string[]; // todos os clubes da liga (até 20)
  clubesHumanosIds: string[]; // subconjunto controlado por humanos
  classificacaoAnteriorIds: string[] | null; // 1º..Nº da temporada anterior; null na T1
  seed: string;
}

export interface SelecaoParticipantes {
  formato: FormatoCopa;
  /** 16 ou 32 ids; seed 1 = índice 0. */
  clubesPorSeed: string[];
}

function embaralhar<T>(itens: readonly T[], seed: string): T[] {
  const rng = createRng(seed);
  const a = itens.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function selecionarParticipantesCopa(
  p: SelecaoParticipantesParams
): SelecaoParticipantes {
  // --- T2+ : pela classificação anterior (R35) ---------------------------
  if (p.classificacaoAnteriorIds && p.classificacaoAnteriorIds.length >= 16) {
    const top16 = p.classificacaoAnteriorIds.slice(0, 16);
    return { formato: "PADRAO_16", clubesPorSeed: top16 };
  }

  // --- T1 : humanos + sorteio de IA (R36) ------------------------------
  const humanos = p.clubesHumanosIds.slice();
  const naoHumanos = p.todosClubesIds.filter((id) => !humanos.includes(id));

  // PENDÊNCIA (R38): o bracket expandido para 17-20 clubes humanos, com
  // rodada preliminar sobre o excedente, ainda não está implementado.
  // Requer 17+ pessoas inscritas ao mesmo tempo na T1 — deixado para
  // detalhamento posterior. Ver README.
  if (humanos.length > 16) {
    throw new Error(
      "Copa Nacional com mais de 16 clubes humanos na T1 (bracket expandido, R38) ainda não é suportada."
    );
  }

  const faltam = 16 - humanos.length;
  const iaSorteada = embaralhar(naoHumanos, `${p.seed}:ia`).slice(0, Math.max(0, faltam));
  const participantes = [...humanos, ...iaSorteada];
  if (participantes.length < 16) {
    throw new Error(
      `Clubes insuficientes para a Copa Nacional (tem ${participantes.length}, precisa de 16).`
    );
  }
  return {
    formato: "PADRAO_16",
    clubesPorSeed: embaralhar(participantes.slice(0, 16), `${p.seed}:seed`),
  };
}
