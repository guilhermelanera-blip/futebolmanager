// Regras puras do chat — 07_MULTIPLAYER_ONLINE §4 e 18_SEGURANCA §3.

import { normalizar } from "../../utils/nomesFicticios";

export const TEXTO_MIN = 1;
export const TEXTO_MAX = 2000;

export function validarTexto(texto: unknown): { ok: boolean; erro?: string } {
  if (typeof texto !== "string") return { ok: false, erro: "Texto ausente." };
  const t = texto.trim();
  if (t.length < TEXTO_MIN) return { ok: false, erro: "Mensagem vazia." };
  if (t.length > TEXTO_MAX) return { ok: false, erro: `Mensagem excede ${TEXTO_MAX} caracteres.` };
  return { ok: true };
}

/**
 * Id determinístico de uma conversa particular 1:1: independe da ordem em
 * que os dois usuários são passados.
 */
export function idConversaParticular(usuarioA: string, usuarioB: string): string {
  return [usuarioA, usuarioB].sort().join(":");
}

/**
 * Filtro de linguagem ofensiva/discriminatória (18 §3). Comparação
 * normalizada (sem acento, sem caixa) e por palavra/expressão inteira —
 * evita falso-positivo em substrings ("assapatao" não pega "sapatao").
 */
export function filtrarConteudo(
  texto: string,
  termosBloqueados: string[]
): { bloqueado: boolean; termo?: string } {
  const alvo = ` ${normalizar(texto)} `;
  for (const bruto of termosBloqueados) {
    const termo = normalizar(bruto);
    if (!termo) continue;
    if (alvo.includes(` ${termo} `)) return { bloqueado: true, termo: bruto };
  }
  return { bloqueado: false };
}
