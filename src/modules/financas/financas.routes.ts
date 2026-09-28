import { Router } from "express";
import { prisma } from "../../config/prisma";
import { autenticar, comAuth } from "../../middleware/autenticar";
import {
  painelFinanceiro,
  definirPrecoIngresso,
  alertasDoClube,
  conselhoDoClube,
} from "./financas.service";

// 17_API, seção 2: domínio /financas — fluxo de caixa e infraestrutura.
// O painel detalhado é do presidente do clube (17, seção 4).
export const financasRouter = Router();

async function exigirPresidente(
  clubeId: string,
  usuarioId: string
): Promise<{ ok: true } | { ok: false; status: number; erro: string }> {
  const clube = await prisma.clube.findUnique({
    where: { id: clubeId },
    select: { presidenteId: true },
  });
  if (!clube) return { ok: false, status: 404, erro: "Clube não encontrado." };
  if (clube.presidenteId !== usuarioId) {
    return { ok: false, status: 403, erro: "Apenas o presidente do clube pode ver/alterar suas finanças." };
  }
  return { ok: true };
}

// GET /v1/financas/clube/:clubeId
financasRouter.get(
  "/clube/:clubeId",
  autenticar,
  comAuth(async (req, res) => {
    const guard = await exigirPresidente(req.params.clubeId, req.usuario.id);
    if (!guard.ok) return res.status(guard.status).json({ erro: guard.erro });
    const painel = await painelFinanceiro(req.params.clubeId);
    res.json(painel);
  })
);

// GET /v1/financas/clube/:clubeId/alertas — alertas multi-nível (11 §5)
financasRouter.get(
  "/clube/:clubeId/alertas",
  autenticar,
  comAuth(async (req, res) => {
    const guard = await exigirPresidente(req.params.clubeId, req.usuario.id);
    if (!guard.ok) return res.status(guard.status).json({ erro: guard.erro });
    res.json(await alertasDoClube(req.params.clubeId));
  })
);

// GET /v1/financas/clube/:clubeId/conselho — relação + votos do Conselho (11 §4)
financasRouter.get(
  "/clube/:clubeId/conselho",
  autenticar,
  comAuth(async (req, res) => {
    const guard = await exigirPresidente(req.params.clubeId, req.usuario.id);
    if (!guard.ok) return res.status(guard.status).json({ erro: guard.erro });
    const r = await conselhoDoClube(req.params.clubeId);
    if (!r) return res.status(404).json({ erro: "Clube não encontrado." });
    res.json(r);
  })
);

// PATCH /v1/financas/clube/:clubeId/preco-ingresso   body: { preco }
financasRouter.patch(
  "/clube/:clubeId/preco-ingresso",
  autenticar,
  comAuth(async (req, res) => {
    const guard = await exigirPresidente(req.params.clubeId, req.usuario.id);
    if (!guard.ok) return res.status(guard.status).json({ erro: guard.erro });
    try {
      const preco = Number(req.body?.preco);
      const r = await definirPrecoIngresso(req.params.clubeId, preco);
      res.json(r);
    } catch (err) {
      res.status(400).json({ erro: (err as Error).message });
    }
  })
);
