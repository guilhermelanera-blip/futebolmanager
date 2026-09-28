import { Router, Response } from "express";
import { prisma } from "../../config/prisma";
import { autenticar, comAuth } from "../../middleware/autenticar";
import {
  criarProposta,
  responderComoDetentor,
  responderComoProponente,
  cancelarProposta,
  listarPropostasDoClube,
  valorDeMercado,
  ErroMercado,
} from "./mercado.service";

// 17_API, seção 2: domínio /mercado — propostas, buscas, scouting (09).
export const mercadoRouter = Router();

function tratar(res: Response, err: unknown) {
  if (err instanceof ErroMercado) return res.status(err.status).json({ erro: err.message });
  console.error("[mercado] erro inesperado:", err);
  return res.status(500).json({ erro: "Erro interno." });
}

// GET /v1/mercado/jogador/:jogadorId/valor — valor de mercado de referência (09 §7)
mercadoRouter.get(
  "/jogador/:jogadorId/valor",
  autenticar,
  comAuth(async (req, res) => {
    try {
      res.json({ jogadorId: req.params.jogadorId, valorDeMercado: await valorDeMercado(req.params.jogadorId) });
    } catch (err) {
      tratar(res, err);
    }
  })
);

// POST /v1/mercado/propostas — cria uma proposta
// body: { clubeProponenteId, jogadorId, tipo, valor?, salarioSemanal, duracaoAnos,
//         luvas?, clausulaRescisao?, emprestimoFim?, emprestimoPercSalarioTomador? }
mercadoRouter.post(
  "/propostas",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const b = req.body ?? {};
      const proposta = await criarProposta({
        usuarioId: req.usuario.id,
        clubeProponenteId: b.clubeProponenteId,
        jogadorId: b.jogadorId,
        tipo: b.tipo,
        valor: b.valor,
        salarioSemanal: b.salarioSemanal,
        duracaoAnos: b.duracaoAnos,
        luvas: b.luvas,
        clausulaRescisao: b.clausulaRescisao,
        emprestimoFim: b.emprestimoFim,
        emprestimoPercSalarioTomador: b.emprestimoPercSalarioTomador,
      });
      res.status(201).json(proposta);
    } catch (err) {
      tratar(res, err);
    }
  })
);

// POST /v1/mercado/propostas/:id/detentor   body: { acao: ACEITAR|RECUSAR|CONTRAPROPOR, valorContraproposta? }
mercadoRouter.post(
  "/propostas/:id/detentor",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const { acao, valorContraproposta } = req.body ?? {};
      const r = await responderComoDetentor(req.params.id, req.usuario.id, acao, valorContraproposta);
      res.json(r);
    } catch (err) {
      tratar(res, err);
    }
  })
);

// POST /v1/mercado/propostas/:id/proponente   body: { acao: ACEITAR|DESISTIR }
mercadoRouter.post(
  "/propostas/:id/proponente",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const r = await responderComoProponente(req.params.id, req.usuario.id, (req.body ?? {}).acao);
      res.json(r);
    } catch (err) {
      tratar(res, err);
    }
  })
);

// POST /v1/mercado/propostas/:id/cancelar
mercadoRouter.post(
  "/propostas/:id/cancelar",
  autenticar,
  comAuth(async (req, res) => {
    try {
      res.json(await cancelarProposta(req.params.id, req.usuario.id));
    } catch (err) {
      tratar(res, err);
    }
  })
);

// GET /v1/mercado/clube/:clubeId/propostas — propostas enviadas e recebidas
mercadoRouter.get(
  "/clube/:clubeId/propostas",
  autenticar,
  comAuth(async (req, res) => {
    const clube = await prisma.clube.findUnique({
      where: { id: req.params.clubeId },
      select: { presidenteId: true },
    });
    if (!clube) return res.status(404).json({ erro: "Clube não encontrado." });
    if (clube.presidenteId !== req.usuario.id) {
      return res.status(403).json({ erro: "Apenas o presidente do clube vê suas propostas." });
    }
    res.json(await listarPropostasDoClube(req.params.clubeId));
  })
);
