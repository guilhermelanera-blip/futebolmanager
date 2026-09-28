import { Router } from "express";
import { prisma } from "../../config/prisma";

// Todos os endpoints aqui são de LEITURA PÚBLICA (modo espectador, 07 §5;
// 17 §4 — não exigem autenticação).
export const partidaRouter = Router();

// GET /v1/partida/ao-vivo — central de jogos: em andamento, próximos e
// recém-encerrados (07 §5). Enquanto o motor da Fase 1 resolve a partida
// instantaneamente, "ao vivo" na prática é "a rodada de agora".
partidaRouter.get("/ao-vivo", async (_req, res) => {
  const agora = new Date();
  const em48h = new Date(agora.getTime() + 48 * 3600 * 1000);
  const ha24h = new Date(agora.getTime() - 24 * 3600 * 1000);

  const incluirClubes = {
    mandante: { select: { id: true, nome: true, cores: true, escudoUrl: true } },
    visitante: { select: { id: true, nome: true, cores: true, escudoUrl: true } },
  } as const;

  const [emAndamento, proximas, encerradas] = await Promise.all([
    prisma.partida.findMany({
      where: { status: "EM_ANDAMENTO" },
      orderBy: { dataHora: "asc" },
      include: incluirClubes,
    }),
    prisma.partida.findMany({
      where: { status: "AGENDADA", dataHora: { gte: agora, lte: em48h } },
      orderBy: { dataHora: "asc" },
      include: incluirClubes,
      take: 40,
    }),
    prisma.partida.findMany({
      where: { status: "ENCERRADA", dataHora: { gte: ha24h } },
      orderBy: { dataHora: "desc" },
      include: incluirClubes,
      take: 40,
    }),
  ]);

  res.json({ emAndamento, proximas, encerradas });
});

// GET /v1/partida/temporada/:temporadaId - calendário/resultados (06)
partidaRouter.get("/temporada/:temporadaId", async (req, res) => {
  const partidas = await prisma.partida.findMany({
    where: { temporadaId: req.params.temporadaId },
    orderBy: [{ rodada: "asc" }, { dataHora: "asc" }],
    include: {
      mandante: { select: { id: true, nome: true } },
      visitante: { select: { id: true, nome: true } },
    },
  });
  res.json(partidas);
});

// GET /v1/partida/:id - súmula pública (placar + eventos com nomes).
partidaRouter.get("/:id", async (req, res) => {
  const partida = await prisma.partida.findUnique({
    where: { id: req.params.id },
    include: {
      eventos: { orderBy: [{ minuto: "asc" }, { id: "asc" }] },
      mandante: { select: { id: true, nome: true, cores: true, escudoUrl: true } },
      visitante: { select: { id: true, nome: true, cores: true, escudoUrl: true } },
    },
  });
  if (!partida) return res.status(404).json({ erro: "Partida não encontrada" });

  const idsJogadores = partida.eventos.map((e) => e.jogadorId).filter((x): x is string => !!x);
  const jogadores = idsJogadores.length
    ? await prisma.jogador.findMany({
        where: { id: { in: idsJogadores } },
        select: { id: true, nome: true },
      })
    : [];
  const nomeJogador = new Map(jogadores.map((j) => [j.id, j.nome]));

  let confronto = null;
  if (partida.confrontoCopaId) {
    confronto = await prisma.confrontoCopa.findUnique({
      where: { id: partida.confrontoCopaId },
      select: {
        fase: true,
        jogoUnico: true,
        golsAgregadoA: true,
        golsAgregadoB: true,
        penaltisA: true,
        penaltisB: true,
        vencedorId: true,
        status: true,
      },
    });
  }

  res.json({
    id: partida.id,
    competicao: partida.competicao,
    rodada: partida.rodada,
    dataHora: partida.dataHora,
    status: partida.status,
    mandante: partida.mandante,
    visitante: partida.visitante,
    placar: { mandante: partida.golsMandante, visitante: partida.golsVisitante },
    confrontoCopa: confronto,
    eventos: partida.eventos.map((e) => ({
      minuto: e.minuto,
      tipo: e.tipo,
      clubeId: e.clubeId,
      jogadorId: e.jogadorId,
      jogadorNome: e.jogadorId ? nomeJogador.get(e.jogadorId) ?? null : null,
      detalhe: e.detalhe,
    })),
  });
});
