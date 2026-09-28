// Serviço de conta: registro, login, logout, perfil e exclusão (LGPD).
// A lógica pura de validação/sessão está em conta.regras.ts; aqui é só a
// orquestração com o banco.

import { prisma } from "../../config/prisma";
import { hashSenha, verificarSenha } from "./senha";
import {
  DadosRegistro,
  validarRegistro,
  normalizarEmail,
  gerarTokenSessao,
  calcularExpiracao,
  sessaoEstaValida,
} from "./conta.regras";

export class ErroConta extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

async function registrarLog(tipo: string, dados: {
  usuarioId?: string;
  email?: string;
  ip?: string;
  detalhe?: string;
}) {
  // 18, seção 6: log de segurança separado dos logs de jogo.
  await prisma.logSeguranca.create({ data: { tipo, ...dados } });
}

export interface UsuarioPublico {
  id: string;
  email: string;
  nome: string;
  criadoEm: Date;
}

function paraPublico(u: {
  id: string;
  email: string;
  nome: string;
  criadoEm: Date;
}): UsuarioPublico {
  return { id: u.id, email: u.email, nome: u.nome, criadoEm: u.criadoEm };
}

// --- registro --------------------------------------------------------------

export async function registrar(
  dados: Partial<DadosRegistro>,
  ip?: string
): Promise<{ usuario: UsuarioPublico; token: string }> {
  const erros = validarRegistro(dados);
  if (erros.length > 0) throw new ErroConta(400, erros.join(" "));

  const email = normalizarEmail(dados.email as string);
  const nome = (dados.nome as string).trim();

  const jaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (jaExiste) throw new ErroConta(409, "Já existe uma conta com esse e-mail.");

  const senhaHash = await hashSenha(dados.senha as string);

  const { usuario, token } = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: { email, nome, senhaHash, consentimentoEm: new Date() },
    });
    const token = gerarTokenSessao();
    await tx.sessao.create({
      data: { token, usuarioId: usuario.id, expiraEm: calcularExpiracao(new Date()) },
    });
    return { usuario, token };
  });

  await registrarLog("REGISTRO", { usuarioId: usuario.id, email, ip });
  return { usuario: paraPublico(usuario), token };
}

// --- login ---------------------------------------------------------------

export async function login(
  emailBruto: string,
  senha: string,
  ip?: string
): Promise<{ usuario: UsuarioPublico; token: string }> {
  const email = normalizarEmail(emailBruto ?? "");
  const usuario = email ? await prisma.usuario.findUnique({ where: { email } }) : null;

  // Mesmo quando o e-mail não existe, gastamos ~o mesmo tempo de CPU fazendo
  // um hash descartável, para não vazar por tempo de resposta se a conta
  // está cadastrada.
  let ok: boolean;
  if (usuario) {
    ok = await verificarSenha(senha ?? "", usuario.senhaHash);
  } else {
    await hashSenha(senha ?? "");
    ok = false;
  }

  if (!usuario || !ok) {
    await registrarLog("LOGIN_FALHA", { email, ip });
    throw new ErroConta(401, "E-mail ou senha incorretos.");
  }

  const token = gerarTokenSessao();
  await prisma.sessao.create({
    data: { token, usuarioId: usuario.id, expiraEm: calcularExpiracao(new Date()) },
  });
  await registrarLog("LOGIN_OK", { usuarioId: usuario.id, email, ip });
  return { usuario: paraPublico(usuario), token };
}

// --- sessão ------------------------------------------------------------------

export interface ContextoAutenticado {
  usuario: UsuarioPublico;
  sessaoId: string;
}

/** Resolve um token para o usuário dono, ou null se inválido/expirado. */
export async function resolverSessao(token: string): Promise<ContextoAutenticado | null> {
  if (!token) return null;
  const sessao = await prisma.sessao.findUnique({
    where: { token },
    include: { usuario: true },
  });
  if (!sessao || !sessaoEstaValida(sessao)) return null;
  return { usuario: paraPublico(sessao.usuario), sessaoId: sessao.id };
}

export async function logout(sessaoId: string): Promise<void> {
  await prisma.sessao.updateMany({
    where: { id: sessaoId, revogadaEm: null },
    data: { revogadaEm: new Date() },
  });
}

// --- perfil ----------------------------------------------------------------

export async function perfil(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      clube: { select: { id: true, nome: true, ligaId: true, tipo: true } },
    },
  });
  if (!usuario) throw new ErroConta(404, "Conta não encontrada.");
  return {
    ...paraPublico(usuario),
    clube: usuario.clube ?? null,
  };
}

// --- exclusão de conta (LGPD art. 18) -------------------------------------

// 18, seção 4: direito ao esquecimento. Se o usuário controla um clube, o
// clube volta a ser gerido por IA (R9) — não fica sem gestão. Isso NÃO
// conflita com "não existe demissão de presidente" (02, seção 5): aqui o
// jogador está deixando o produto por inteiro, não sendo destituído.
// Ponto resolvido com critério; sinalizado ao responsável.
export async function excluirConta(usuarioId: string, ip?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const clube = await tx.clube.findUnique({ where: { presidenteId: usuarioId } });
    if (clube) {
      await tx.clube.update({
        where: { id: clube.id },
        data: { presidenteId: null, tipo: "IA", ultimaAcaoEm: new Date() },
      });
    }
    // As sessões caem por onDelete: Cascade; o log de segurança é preservado
    // (usuarioId vira uma referência solta, aceitável para auditoria).
    await tx.usuario.delete({ where: { id: usuarioId } });
  });
  await registrarLog("EXCLUSAO_CONTA", { usuarioId, ip });
}
