import { Router, Response } from "express";
import { autenticar, comAuth } from "../../middleware/autenticar";
import {
  enviarMensagemLiga,
  lerCanalLiga,
  enviarMensagemParticular,
  lerConversaParticular,
  listarConversas,
  denunciarMensagem,
  removerMinhaMensagem,
  ErroChat,
} from "./chat.service";

// 17_API §2: domínio /chat — canal da liga e chats particulares (07 §4).
export const chatRouter = Router();

function tratar(res: Response, err: unknown) {
  if (err instanceof ErroChat) return res.status(err.status).json({ erro: err.message });
  console.error("[chat] erro inesperado:", err);
  return res.status(500).json({ erro: "Erro interno." });
}

function antesDe(q: unknown): Date | undefined {
  if (typeof q !== "string" || !q) return undefined;
  const d = new Date(q);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// --- canal da liga ---
chatRouter.post(
  "/liga/:ligaId",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const m = await enviarMensagemLiga({
        usuarioId: req.usuario.id,
        ligaId: req.params.ligaId,
        texto: req.body?.texto,
      });
      res.status(201).json(m);
    } catch (err) {
      tratar(res, err);
    }
  })
);

chatRouter.get(
  "/liga/:ligaId",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const msgs = await lerCanalLiga({
        usuarioId: req.usuario.id,
        ligaId: req.params.ligaId,
        antesDe: antesDe(req.query.antesDe),
        limite: req.query.limite,
      });
      res.json(msgs);
    } catch (err) {
      tratar(res, err);
    }
  })
);

// --- conversas particulares ---
chatRouter.get(
  "/conversas",
  autenticar,
  comAuth(async (req, res) => {
    try {
      res.json(await listarConversas(req.usuario.id));
    } catch (err) {
      tratar(res, err);
    }
  })
);

chatRouter.post(
  "/particular/:ligaId/:destinatarioId",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const m = await enviarMensagemParticular({
        usuarioId: req.usuario.id,
        ligaId: req.params.ligaId,
        destinatarioId: req.params.destinatarioId,
        texto: req.body?.texto,
      });
      res.status(201).json(m);
    } catch (err) {
      tratar(res, err);
    }
  })
);

chatRouter.get(
  "/particular/:outroId",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const r = await lerConversaParticular({
        usuarioId: req.usuario.id,
        outroId: req.params.outroId,
        antesDe: antesDe(req.query.antesDe),
        limite: req.query.limite,
      });
      res.json(r);
    } catch (err) {
      tratar(res, err);
    }
  })
);

// --- moderação ---
chatRouter.post(
  "/mensagens/:mensagemId/denuncia",
  autenticar,
  comAuth(async (req, res) => {
    try {
      res.status(201).json(
        await denunciarMensagem({
          usuarioId: req.usuario.id,
          mensagemId: req.params.mensagemId,
          motivo: req.body?.motivo,
        })
      );
    } catch (err) {
      tratar(res, err);
    }
  })
);

chatRouter.delete(
  "/mensagens/:mensagemId",
  autenticar,
  comAuth(async (req, res) => {
    try {
      res.json(await removerMinhaMensagem(req.usuario.id, req.params.mensagemId));
    } catch (err) {
      tratar(res, err);
    }
  })
);
