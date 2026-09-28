import { Router } from "express";
import { prisma } from "../../config/prisma";

export const jogadorRouter = Router();

// GET /v1/jogador/clube/:clubeId - elenco de um clube (04, 05 seção 2)
jogadorRouter.get("/clube/:clubeId", async (req, res) => {
  const jogadores = await prisma.jogador.findMany({
    where: { clubeId: req.params.clubeId },
    orderBy: { posicao: "asc" },
  });
  res.json(jogadores);
});

jogadorRouter.get("/:id", async (req, res) => {
  const jogador = await prisma.jogador.findUnique({
    where: { id: req.params.id },
    include: { contrato: { include: { bonus: true } } },
  });
  if (!jogador) return res.status(404).json({ erro: "Jogador não encontrado" });

  // Cláusulas de sell-on ativas sobre o jogador (09 §4).
  const sellOns = await prisma.sellOn.findMany({
    where: { jogadorId: jogador.id },
    select: { clubeBeneficiarioId: true, percentual: true },
  });

  // 07, secao 3: potencial oculto nunca é exposto diretamente na API pública.
  const { potencialOculto, ...publico } = jogador;
  res.json({ ...publico, sellOns });
});
