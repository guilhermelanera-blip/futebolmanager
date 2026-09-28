import { Router } from "express";
import { prisma } from "../../config/prisma";
import { calcularClassificacao } from "./classificacao.service";

// 17_API, seção 2: domínio /competicao — calendário, classificação, histórico.
// Leitura pública (espectador, 07 seção 5) — não exige autenticação.
export const competicaoRouter = Router();

// GET /v1/competicao/temporada/:temporadaId/classificacao
// Classificação da Liga Nacional, recalculada a partir das partidas
// ENCERRADAS (nunca é um valor persistido — 16, seção 3).
competicaoRouter.get("/temporada/:temporadaId/classificacao", async (req, res) => {
  const temporada = await prisma.temporada.findUnique({
    where: { id: req.params.temporadaId },
    include: { liga: { include: { clubes: { select: { id: true, nome: true } } } } },
  });
  if (!temporada) return res.status(404).json({ erro: "Temporada não encontrada" });

  const partidas = await prisma.partida.findMany({
    where: { temporadaId: temporada.id, competicao: "LIGA_NACIONAL" },
    select: {
      mandanteId: true,
      visitanteId: true,
      golsMandante: true,
      golsVisitante: true,
      status: true,
    },
  });

  const classificacao = calcularClassificacao(temporada.liga.clubes, partidas);
  const rodadasEncerradas = partidas.filter((p) => p.status === "ENCERRADA").length;
  res.json({
    temporadaId: temporada.id,
    numero: temporada.numero,
    partidasEncerradas: rodadasEncerradas,
    partidasTotais: partidas.length,
    classificacao,
  });
});

// GET /v1/competicao/temporada/:temporadaId/rodada/:rodada
competicaoRouter.get("/temporada/:temporadaId/rodada/:rodada", async (req, res) => {
  const rodada = Number(req.params.rodada);
  if (!Number.isInteger(rodada) || rodada < 1) {
    return res.status(400).json({ erro: "Rodada inválida" });
  }
  const partidas = await prisma.partida.findMany({
    where: { temporadaId: req.params.temporadaId, rodada },
    orderBy: { dataHora: "asc" },
    include: {
      mandante: { select: { id: true, nome: true } },
      visitante: { select: { id: true, nome: true } },
    },
  });
  res.json(partidas);
});

// GET /v1/competicao/temporada/:temporadaId/artilharia — gols por jogador
// (agora possível: os eventos de GOL são atribuídos a jogadores).
competicaoRouter.get("/temporada/:temporadaId/artilharia", async (req, res) => {
  const competicao = typeof req.query.competicao === "string" ? req.query.competicao : undefined;
  const porJogador = await prisma.eventoPartida.groupBy({
    by: ["jogadorId"],
    where: {
      tipo: "GOL",
      jogadorId: { not: null },
      partida: { temporadaId: req.params.temporadaId, ...(competicao ? { competicao } : {}) },
    },
    _count: { jogadorId: true },
  });
  porJogador.sort((a, b) => b._count.jogadorId - a._count.jogadorId);
  const top = porJogador.slice(0, 30);

  const jogadores = await prisma.jogador.findMany({
    where: { id: { in: top.map((x) => x.jogadorId as string) } },
    select: { id: true, nome: true, posicao: true, clube: { select: { id: true, nome: true } } },
  });
  const mapa = new Map(jogadores.map((j) => [j.id, j]));

  res.json(
    top.map((x, i) => {
      const j = mapa.get(x.jogadorId as string);
      return {
        posicaoRanking: i + 1,
        jogadorId: x.jogadorId,
        nome: j?.nome ?? "(desconhecido)",
        posicao: j?.posicao ?? null,
        clube: j?.clube ?? null,
        gols: x._count.jogadorId,
      };
    })
  );
});

// GET /v1/competicao/temporada/:temporadaId/copa — chaveamento da Copa Nacional
competicaoRouter.get("/temporada/:temporadaId/copa", async (req, res) => {
  const confrontos = await prisma.confrontoCopa.findMany({
    where: { temporadaId: req.params.temporadaId },
    orderBy: [{ fase: "asc" }, { ordem: "asc" }],
  });
  if (confrontos.length === 0) {
    return res.json({ temporadaId: req.params.temporadaId, temCopa: false, fases: [] });
  }
  const idsClubes = new Set<string>();
  for (const c of confrontos) {
    if (c.clubeAId) idsClubes.add(c.clubeAId);
    if (c.clubeBId) idsClubes.add(c.clubeBId);
  }
  const clubes = await prisma.clube.findMany({
    where: { id: { in: [...idsClubes] } },
    select: { id: true, nome: true },
  });
  const nome = new Map(clubes.map((c) => [c.id, c.nome]));

  const ordemFase = ["PRELIMINAR", "OITAVAS", "QUARTAS", "SEMIS", "FINAL"];
  const porFase = ordemFase
    .map((fase) => ({
      fase,
      confrontos: confrontos
        .filter((c) => c.fase === fase)
        .map((c) => ({
          ordem: c.ordem,
          status: c.status,
          jogoUnico: c.jogoUnico,
          clubeA: c.clubeAId ? { id: c.clubeAId, nome: nome.get(c.clubeAId) } : null,
          clubeB: c.clubeBId ? { id: c.clubeBId, nome: nome.get(c.clubeBId) } : null,
          mandoVoltaClubeId: c.mandoVoltaClubeId,
          agregado: c.golsAgregadoA != null ? `${c.golsAgregadoA}-${c.golsAgregadoB}` : null,
          penaltis: c.penaltisA != null ? `${c.penaltisA}-${c.penaltisB}` : null,
          vencedorId: c.vencedorId,
          dataIdaPrevista: c.dataIdaPrevista,
          dataVoltaPrevista: c.dataVoltaPrevista,
        })),
    }))
    .filter((f) => f.confrontos.length > 0);

  res.json({ temporadaId: req.params.temporadaId, temCopa: true, fases: porFase });
});

// GET /v1/competicao/liga/:ligaId/temporadas
competicaoRouter.get("/liga/:ligaId/temporadas", async (req, res) => {
  const temporadas = await prisma.temporada.findMany({
    where: { ligaId: req.params.ligaId },
    orderBy: { numero: "asc" },
  });
  res.json(temporadas);
});
