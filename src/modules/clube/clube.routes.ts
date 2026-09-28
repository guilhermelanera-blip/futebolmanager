import { Router } from "express";
import { prisma } from "../../config/prisma";
import { autenticar, comAuth } from "../../middleware/autenticar";
import { getLista } from "../financas/config.service";
import { P } from "../financas/parametros";
import {
  moderarNomeClube,
  validarCores,
  validarEscudoUrl,
} from "./identidade.regras";

export const clubeRouter = Router();

// GET /v1/clube/:id - leitura pública básica (espectador, 07 seção 5)
clubeRouter.get("/:id", async (req, res) => {
  const clube = await prisma.clube.findUnique({
    where: { id: req.params.id },
    include: { jogadores: true },
  });
  if (!clube) return res.status(404).json({ erro: "Clube não encontrado" });
  res.json(clube);
});

// PATCH /v1/clube/:id - só o próprio presidente pode alterar.
// 17_API seção 4 / R2: o clube afetado é validado no servidor contra o
// usuário do token — nunca contra um id enviado pelo cliente.
clubeRouter.patch(
  "/:id",
  autenticar,
  comAuth(async (req, res) => {
    const clube = await prisma.clube.findUnique({ where: { id: req.params.id } });
    if (!clube) return res.status(404).json({ erro: "Clube não encontrado" });
    if (clube.presidenteId !== req.usuario.id) {
      return res
        .status(403)
        .json({ erro: "Apenas o presidente do clube pode alterar seus dados." });
    }

    // Personalização permitida na v1: nome, cores, escudo (05 §1), sujeita à
    // moderação de conteúdo e à regra de identidade fictícia (18 §3, R6/R7).
    const { nome, cores, escudoUrl } = req.body ?? {};
    const data: Record<string, string> = {};

    if (nome !== undefined) {
      const termos = await getLista(P.CHAT_TERMOS_BLOQUEADOS);
      const m = moderarNomeClube(nome, termos);
      if (!m.ok) return res.status(422).json({ erro: m.erro });
      data.nome = (nome as string).trim();
    }
    if (cores !== undefined) {
      const m = validarCores(cores);
      if (!m.ok) return res.status(422).json({ erro: m.erro });
      if (cores) data.cores = cores as string;
    }
    if (escudoUrl !== undefined) {
      const m = validarEscudoUrl(escudoUrl);
      if (!m.ok) return res.status(422).json({ erro: m.erro });
      if (escudoUrl) data.escudoUrl = escudoUrl as string;
    }

    const atualizado = await prisma.clube.update({
      where: { id: req.params.id },
      data: { ...data, ultimaAcaoEm: new Date() },
    });
    res.json(atualizado);
  })
);
