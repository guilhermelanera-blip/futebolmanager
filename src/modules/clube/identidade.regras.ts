// Moderação da personalização de identidade do clube — 05_SISTEMA_DE_CLUBES
// §1 e 18_SEGURANCA §3. Funções puras.
//
// Dois filtros combinados:
//   - linguagem ofensiva/discriminatória (mesma lista do chat, 18 §3);
//   - reprodução de marca/identidade real (R6/R7).

import { contemMarcaReal } from "../../utils/nomesFicticios";
import { filtrarConteudo } from "../chat/chat.regras";

export interface ResultadoModeracao {
  ok: boolean;
  erro?: string;
}

export const NOME_CLUBE_MIN = 3;
export const NOME_CLUBE_MAX = 60;

export function moderarNomeClube(
  nome: unknown,
  termosBloqueados: string[]
): ResultadoModeracao {
  if (typeof nome !== "string") return { ok: false, erro: "Nome inválido." };
  const t = nome.trim();
  if (t.length < NOME_CLUBE_MIN || t.length > NOME_CLUBE_MAX) {
    return { ok: false, erro: `Nome do clube deve ter de ${NOME_CLUBE_MIN} a ${NOME_CLUBE_MAX} caracteres.` };
  }
  if (filtrarConteudo(t, termosBloqueados).bloqueado) {
    return { ok: false, erro: "Nome contém linguagem imprópria (18 §3)." };
  }
  if (contemMarcaReal(t)) {
    return { ok: false, erro: "Nome remete a uma marca ou identidade real (R6/R7)." };
  }
  return { ok: true };
}

/** Cor única "#rrggbb" ou par "#rrggbb/#rrggbb". */
export function validarCores(cores: unknown): ResultadoModeracao {
  if (cores == null || cores === "") return { ok: true };
  if (typeof cores !== "string" || !/^#[0-9a-fA-F]{6}(\/#[0-9a-fA-F]{6})?$/.test(cores)) {
    return { ok: false, erro: "Cores devem estar no formato #rrggbb ou #rrggbb/#rrggbb." };
  }
  return { ok: true };
}

export function validarEscudoUrl(url: unknown): ResultadoModeracao {
  if (url == null || url === "") return { ok: true };
  if (typeof url !== "string" || url.length > 500 || !/^https:\/\/\S+$/.test(url)) {
    return { ok: false, erro: "URL de escudo inválida (precisa ser https e ter até 500 caracteres)." };
  }
  return { ok: true };
}
