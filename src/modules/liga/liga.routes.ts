import { Router } from "express";
import { prisma } from "../../config/prisma";
import { autenticar, comAuth } from "../../middleware/autenticar";
import { listarClubesDisponiveis, assumirClube, ErroLiga } from "./liga.service";
import { entrarNaFila, sairDaFila, verFila, ErroFila } from "./inatividade.service";
import { iniciarTemporadaOficial, ErroInicio } from "./inicioTemporada.service";

// 17_API: entrada em liga faz parte de /conta (fila de espera) mas o recurso
// aqui é a própria liga; mantido em /v1/liga por clareza de domínio.
export const ligaRouter = Router();

// GET /v1/liga — lista as ligas (leitura pública)
ligaRouter.get("/", async (_req, res) => {
  const ligas = await prisma.liga.findMany({
    select: {
      id: true,
      nome: true,
      calendarioIniciado: true,
      _count: { select: { clubes: true } },
    },
  });
  res.json(ligas);
});

// GET /v1/liga/:ligaId/clubes-disponiveis — clubes de IA sem presidente
ligaRouter.get("/:ligaId/clubes-disponiveis", async (req, res) => {
  res.json(await listarClubesDisponiveis(req.params.ligaId));
});

// POST /v1/liga/:ligaId/assumir — usuário autenticado assume um clube
// Body opcional: { clubeId }. Sem clubeId, sorteia um disponível.
ligaRouter.post(
  "/:ligaId/assumir",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const clube = await assumirClube({
        usuarioId: req.usuario.id,
        ligaId: req.params.ligaId,
        clubeId: req.body?.clubeId,
      });
      res.status(200).json(clube);
    } catch (err) {
      if (err instanceof ErroLiga) return res.status(err.status).json({ erro: err.message });
      console.error("[liga] erro inesperado:", err);
      res.status(500).json({ erro: "Erro interno." });
    }
  })
);

// POST /v1/liga/:ligaId/iniciar — fecha as inscrições e cria a Temporada 1
// (liga + Copa Nacional com os clubes humanos inscritos). 07 §2.
// Body opcional: { dataInicio: "YYYY-MM-DD" }.
ligaRouter.post(
  "/:ligaId/iniciar",
  autenticar,
  comAuth(async (req, res) => {
    try {
      const dataInicio = req.body?.dataInicio ? new Date(req.body.dataInicio) : undefined;
      if (dataInicio && Number.isNaN(dataInicio.getTime())) {
        return res.status(400).json({ erro: "dataInicio inválida (use YYYY-MM-DD)." });
      }
      const r = await iniciarTemporadaOficial({ ligaId: req.params.ligaId, dataInicio });
      res.status(201).json(r);
    } catch (err) {
      if (err instanceof ErroInicio) return res.status(err.status).json({ erro: err.message });
      console.error("[liga] erro inesperado:", err);
      res.status(500).json({ erro: "Erro interno." });
    }
  })
);

// --- Fila de espera por vagas reabertas por inatividade (07 §2) ----------

// GET /v1/liga/:ligaId/fila — quem está esperando (leitura pública)
ligaRouter.get("/:ligaId/fila", async (req, res) => {
  res.json(await verFila(req.params.ligaId));
});

// POST /v1/liga/:ligaId/fila — entrar na fila de espera
ligaRouter.post(
  "/:ligaId/fila",
  autenticar,
  comAuth(async (req, res) => {
    try {
      res.status(201).json(await entrarNaFila(req.params.ligaId, req.usuario.id));
    } catch (err) {
      if (err instanceof ErroFila) return res.status(err.status).json({ erro: err.message });
      console.error("[liga] erro inesperado:", err);
      res.status(500).json({ erro: "Erro interno." });
    }
  })
);

// DELETE /v1/liga/:ligaId/fila — sair da fila de espera
ligaRouter.delete(
  "/:ligaId/fila",
  autenticar,
  comAuth(async (req, res) => {
    try {
      await sairDaFila(req.params.ligaId, req.usuario.id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof ErroFila) return res.status(err.status).json({ erro: err.message });
      console.error("[liga] erro inesperado:", err);
      res.status(500).json({ erro: "Erro interno." });
    }
  })
);
