// Chat — 07_MULTIPLAYER_ONLINE §4. Canal da liga (grupo, todos os
// presidentes) + conversas particulares 1:1. Moderação: filtro automático
// (18 §3) + denúncia. Transporte REST com paginação por cursor de tempo; a
// entrega instantânea via WebSocket (17 §3) é uma camada posterior sobre
// esta mesma persistência.

import { prisma } from "../../config/prisma";
import { getLista } from "../financas/config.service";
import { P } from "../financas/parametros";
import { validarTexto, filtrarConteudo, idConversaParticular } from "./chat.regras";

export class ErroChat extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

const LIMITE_PADRAO = 50;
const LIMITE_MAX = 100;

async function ehPresidenteNaLiga(usuarioId: string, ligaId: string): Promise<boolean> {
  const c = await prisma.clube.findFirst({
    where: { ligaId, presidenteId: usuarioId },
    select: { id: true },
  });
  return !!c;
}

async function nomesDe(ids: string[]): Promise<Map<string, string>> {
  const us = await prisma.usuario.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, nome: true },
  });
  return new Map(us.map((u) => [u.id, u.nome]));
}

function paraSaida(
  msgs: { id: string; autorId: string; texto: string; criadoEm: Date }[],
  nomes: Map<string, string>
) {
  return msgs.map((m) => ({
    id: m.id,
    autorId: m.autorId,
    autorNome: nomes.get(m.autorId) ?? "(desconhecido)",
    texto: m.texto,
    criadoEm: m.criadoEm,
  }));
}

async function garantirTextoLimpo(texto: unknown): Promise<string> {
  const v = validarTexto(texto);
  if (!v.ok) throw new ErroChat(400, v.erro as string);
  const limpo = (texto as string).trim();
  const termos = await getLista(P.CHAT_TERMOS_BLOQUEADOS);
  const f = filtrarConteudo(limpo, termos);
  if (f.bloqueado) {
    throw new ErroChat(422, "Mensagem bloqueada pelo filtro de conteúdo (18 §3).");
  }
  return limpo;
}

function limitar(limite: unknown): number {
  const n = Number(limite);
  if (!Number.isFinite(n) || n <= 0) return LIMITE_PADRAO;
  return Math.min(LIMITE_MAX, Math.trunc(n));
}

// --- canal da liga -------------------------------------------------------

export async function enviarMensagemLiga(params: {
  usuarioId: string;
  ligaId: string;
  texto: unknown;
}) {
  if (!(await ehPresidenteNaLiga(params.usuarioId, params.ligaId))) {
    throw new ErroChat(403, "Só presidentes de clube desta liga podem usar o chat.");
  }
  const texto = await garantirTextoLimpo(params.texto);
  const msg = await prisma.mensagemChat.create({
    data: { ligaId: params.ligaId, canal: "LIGA", autorId: params.usuarioId, texto },
  });
  const nomes = await nomesDe([msg.autorId]);
  return paraSaida([msg], nomes)[0];
}

export async function lerCanalLiga(params: {
  usuarioId: string;
  ligaId: string;
  antesDe?: Date;
  limite?: unknown;
}) {
  if (!(await ehPresidenteNaLiga(params.usuarioId, params.ligaId))) {
    throw new ErroChat(403, "Só presidentes de clube desta liga podem ler o chat.");
  }
  const msgs = await prisma.mensagemChat.findMany({
    where: {
      ligaId: params.ligaId,
      canal: "LIGA",
      removidaEm: null,
      ...(params.antesDe ? { criadoEm: { lt: params.antesDe } } : {}),
    },
    orderBy: { criadoEm: "desc" },
    take: limitar(params.limite),
  });
  msgs.reverse(); // devolve em ordem cronológica
  const nomes = await nomesDe(msgs.map((m) => m.autorId));
  return paraSaida(msgs, nomes);
}

// --- conversa particular -----------------------------------------------

export async function enviarMensagemParticular(params: {
  usuarioId: string;
  ligaId: string;
  destinatarioId: string;
  texto: unknown;
}) {
  if (params.usuarioId === params.destinatarioId) {
    throw new ErroChat(400, "Não é possível abrir conversa consigo mesmo.");
  }
  const [remOk, destOk] = await Promise.all([
    ehPresidenteNaLiga(params.usuarioId, params.ligaId),
    ehPresidenteNaLiga(params.destinatarioId, params.ligaId),
  ]);
  if (!remOk) throw new ErroChat(403, "Você não é presidente de clube nesta liga.");
  if (!destOk) throw new ErroChat(404, "O destinatário não é presidente de clube nesta liga.");

  const texto = await garantirTextoLimpo(params.texto);
  const conversaId = idConversaParticular(params.usuarioId, params.destinatarioId);
  const msg = await prisma.mensagemChat.create({
    data: {
      ligaId: params.ligaId,
      canal: "PARTICULAR",
      conversaId,
      autorId: params.usuarioId,
      texto,
    },
  });
  const nomes = await nomesDe([msg.autorId]);
  return paraSaida([msg], nomes)[0];
}

export async function lerConversaParticular(params: {
  usuarioId: string;
  outroId: string;
  antesDe?: Date;
  limite?: unknown;
}) {
  const conversaId = idConversaParticular(params.usuarioId, params.outroId);
  const msgs = await prisma.mensagemChat.findMany({
    where: {
      conversaId,
      removidaEm: null,
      ...(params.antesDe ? { criadoEm: { lt: params.antesDe } } : {}),
    },
    orderBy: { criadoEm: "desc" },
    take: limitar(params.limite),
  });
  msgs.reverse();
  const nomes = await nomesDe([...msgs.map((m) => m.autorId), params.outroId]);
  return { conversaId, comNome: nomes.get(params.outroId) ?? null, mensagens: paraSaida(msgs, nomes) };
}

export async function listarConversas(usuarioId: string) {
  const recentes = await prisma.mensagemChat.findMany({
    where: {
      canal: "PARTICULAR",
      removidaEm: null,
      OR: [
        { conversaId: { startsWith: `${usuarioId}:` } },
        { conversaId: { endsWith: `:${usuarioId}` } },
      ],
    },
    orderBy: { criadoEm: "desc" },
    take: 300,
  });

  const porConversa = new Map<string, (typeof recentes)[number]>();
  for (const m of recentes) {
    if (m.conversaId && !porConversa.has(m.conversaId)) porConversa.set(m.conversaId, m);
  }
  const outros = [...porConversa.keys()].map((cid) =>
    cid.split(":").find((id) => id !== usuarioId) ?? cid
  );
  const nomes = await nomesDe([...outros, ...recentes.map((m) => m.autorId)]);

  return [...porConversa.entries()].map(([conversaId, ultima]) => {
    const outroId = conversaId.split(":").find((id) => id !== usuarioId) ?? conversaId;
    return {
      conversaId,
      comUsuarioId: outroId,
      comNome: nomes.get(outroId) ?? "(desconhecido)",
      ultimaMensagem: {
        autorId: ultima.autorId,
        autorNome: nomes.get(ultima.autorId) ?? "(desconhecido)",
        texto: ultima.texto,
        criadoEm: ultima.criadoEm,
      },
    };
  });
}

// --- moderação ---------------------------------------------------------

export async function denunciarMensagem(params: {
  usuarioId: string;
  mensagemId: string;
  motivo?: string;
}) {
  const msg = await prisma.mensagemChat.findUnique({
    where: { id: params.mensagemId },
    select: { id: true },
  });
  if (!msg) throw new ErroChat(404, "Mensagem não encontrada.");
  try {
    await prisma.denunciaChat.create({
      data: {
        mensagemId: params.mensagemId,
        denuncianteId: params.usuarioId,
        motivo: params.motivo?.slice(0, 500) ?? null,
      },
    });
  } catch (e: unknown) {
    // já denunciada por este usuário (unique) — idempotente
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
  return { ok: true };
}

export async function removerMinhaMensagem(usuarioId: string, mensagemId: string) {
  const msg = await prisma.mensagemChat.findUnique({
    where: { id: mensagemId },
    select: { autorId: true, removidaEm: true },
  });
  if (!msg) throw new ErroChat(404, "Mensagem não encontrada.");
  if (msg.autorId !== usuarioId) {
    throw new ErroChat(403, "Você só pode remover as próprias mensagens.");
  }
  if (!msg.removidaEm) {
    await prisma.mensagemChat.update({
      where: { id: mensagemId },
      data: { removidaEm: new Date() },
    });
  }
  return { ok: true };
}
