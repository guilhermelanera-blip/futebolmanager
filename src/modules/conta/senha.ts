// Hash de senha — 18_SEGURANCA, seção 1 ("hash seguro, ex.: bcrypt/argon2").
// Usamos bcrypt (via bcryptjs, implementação pura em JS — sem addon nativo,
// portável). Cost factor 12: equilíbrio padrão entre segurança e latência
// de login. Ajustável se o hardware de produção pedir.
//
// Atenção: bcrypt considera apenas os primeiros 72 bytes da senha. O limite
// SENHA_MAX em conta.regras.ts é só uma barreira defensiva de payload; não
// há perda de segurança prática nessa faixa.

import bcrypt from "bcryptjs";

const COST_FACTOR = 12;

export async function hashSenha(senhaPura: string): Promise<string> {
  return bcrypt.hash(senhaPura, COST_FACTOR);
}

export async function verificarSenha(senhaPura: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senhaPura, hash);
}
