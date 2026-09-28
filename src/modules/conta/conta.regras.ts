// Regras puras de conta — validação de cadastro/login e cálculo de sessão.
// Sem dependência de banco: fácil de testar isoladamente (mesma disciplina
// dos geradores de universo/calendário).
//
// 18_SEGURANCA: senha com hash seguro (feito em senha.ts), token de sessão
// com expiração (seção 1), e-mail único por conta (seção 5), consentimento
// LGPD no cadastro (seção 4).

import { randomBytes } from "crypto";

// Coleta mínima de dados pessoais (18, seção 4): só e-mail e nome de usuário.
export interface DadosRegistro {
  email: string;
  nome: string;
  senha: string;
  consentimentoLGPD: boolean;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SENHA_MIN = 8;
export const SENHA_MAX = 200; // limite defensivo (bcrypt trunca em 72 bytes; ver senha.ts)
export const NOME_MIN = 2;
export const NOME_MAX = 40;

/** Normaliza e-mail para armazenamento/comparação (unicidade, 18 §5). */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Valida os dados de cadastro. Retorna a lista de erros (vazia = ok).
 * Não checa unicidade de e-mail — isso depende do banco.
 */
export function validarRegistro(dados: Partial<DadosRegistro>): string[] {
  const erros: string[] = [];

  const email = typeof dados.email === "string" ? normalizarEmail(dados.email) : "";
  if (!email || !RE_EMAIL.test(email)) {
    erros.push("E-mail inválido.");
  }

  const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
  if (nome.length < NOME_MIN || nome.length > NOME_MAX) {
    erros.push(`Nome deve ter entre ${NOME_MIN} e ${NOME_MAX} caracteres.`);
  }

  const senha = typeof dados.senha === "string" ? dados.senha : "";
  if (senha.length < SENHA_MIN || senha.length > SENHA_MAX) {
    erros.push(`Senha deve ter entre ${SENHA_MIN} e ${SENHA_MAX} caracteres.`);
  }

  // 18, seção 4: consentimento claro no momento do cadastro.
  if (dados.consentimentoLGPD !== true) {
    erros.push("É necessário aceitar a política de privacidade (LGPD) para criar a conta.");
  }

  return erros;
}

/** Gera um token de sessão opaco, seguro e URL-safe. */
export function gerarTokenSessao(): string {
  return randomBytes(32).toString("base64url");
}

// TTL da sessão. 18 §1 exige "expiração definida" mas não fixa o valor —
// 30 dias é um padrão razoável para web app persistente; configurável por
// env (SESSAO_TTL_DIAS). Sinalizado ao responsável para validação.
export const SESSAO_TTL_DIAS_PADRAO = 30;

export function ttlSessaoDias(): number {
  const raw = Number(process.env.SESSAO_TTL_DIAS);
  return Number.isFinite(raw) && raw > 0 ? raw : SESSAO_TTL_DIAS_PADRAO;
}

export function calcularExpiracao(agora: Date, ttlDias = ttlSessaoDias()): Date {
  return new Date(agora.getTime() + ttlDias * 24 * 60 * 60 * 1000);
}

/** Sessão válida = não revogada e ainda dentro do prazo. */
export function sessaoEstaValida(
  sessao: { expiraEm: Date; revogadaEm: Date | null },
  agora: Date = new Date()
): boolean {
  if (sessao.revogadaEm) return false;
  return sessao.expiraEm.getTime() > agora.getTime();
}
