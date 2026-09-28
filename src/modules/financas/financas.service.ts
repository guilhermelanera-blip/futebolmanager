// Serviço de finanças (11_FINANCAS): receita/despesa, alertas multi-nível
// (§5), falência pelos critérios de caixa e de dívida (§6) e voto do
// Conselho contra gastos exagerados (§4, sem poder de veto).
//
// A lógica numérica está em financas.calc.ts / alertas.calc.ts (puras); os
// parâmetros vêm de config.service.ts (tabela ParametroConfiguravel). Aqui é
// a orquestração com o banco.

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { getVarios } from "./config.service";
import { P } from "./parametros";
import {
  calcularBilheteria,
  calcularPatrocinioSemanal,
  calcularFolhaSemanal,
  calcularManutencaoSemanal,
  calcularPremiacaoLiga,
  atualizarContadorCaixaNegativo,
  deveDeclararFalenciaPorCaixa,
} from "./financas.calc";
import {
  avaliarAlertas,
  deveDeclararFalenciaPorDivida,
  dividaDe,
  receitaAnualEstimada,
} from "./alertas.calc";
import { calcularClassificacao } from "../competicao/classificacao.service";

type Tx = Prisma.TransactionClient;
type ClientePrisma = Pick<Tx, "clube" | "movimentacaoFinanceira" | "alertaFinanceiro" | "votoConselho">;

const DIA_MS = 24 * 60 * 60 * 1000;

export type TipoMovimentacao =
  | "RECEITA_BILHETERIA"
  | "RECEITA_PATROCINIO"
  | "RECEITA_PREMIACAO"
  | "RECEITA_TRANSFERENCIA"
  | "RECEITA_MAIS_VALIA"
  | "DESPESA_SALARIO"
  | "DESPESA_MANUTENCAO"
  | "DESPESA_SCOUTING"
  | "DESPESA_TRANSFERENCIA"
  | "DESPESA_MAIS_VALIA"
  | "DESPESA_BONUS_DESEMPENHO";

function ehReceita(tipo: TipoMovimentacao): boolean {
  return tipo.startsWith("RECEITA_");
}

/**
 * Aplica um lançamento financeiro: grava a linha imutável no razão e
 * atualiza `Clube.saldoCaixa` na MESMA transação. `valor` é sempre >= 0.
 */
export async function registrarMovimentacao(
  tx: Tx,
  m: {
    clubeId: string;
    tipo: TipoMovimentacao;
    valor: number;
    descricao: string;
    temporadaId?: string;
    partidaId?: string;
  }
): Promise<{ saldoApos: number }> {
  if (m.valor < 0) throw new Error("valor de movimentação deve ser >= 0");
  const clube = await tx.clube.findUniqueOrThrow({
    where: { id: m.clubeId },
    select: { saldoCaixa: true },
  });
  const delta = ehReceita(m.tipo) ? m.valor : -m.valor;
  const saldoApos = Math.round((clube.saldoCaixa + delta) * 100) / 100;

  await tx.movimentacaoFinanceira.create({
    data: {
      clubeId: m.clubeId,
      tipo: m.tipo,
      valor: Math.round(m.valor * 100) / 100,
      saldoApos,
      descricao: m.descricao,
      temporadaId: m.temporadaId ?? null,
      partidaId: m.partidaId ?? null,
    },
  });
  await tx.clube.update({ where: { id: m.clubeId }, data: { saldoCaixa: saldoApos } });
  return { saldoApos };
}

// --- Renda de partida (bilheteria do mandante) --------------------------------

export async function aplicarRendaDePartida(partidaId: string): Promise<void> {
  const partida = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: {
      mandante: true,
      visitante: { select: { reputacao: true, nome: true } },
    },
  });
  if (!partida) return;
  // Evita lançamento duplicado se a função rodar duas vezes para a mesma partida.
  const jaLancado = await prisma.movimentacaoFinanceira.findFirst({
    where: { partidaId, tipo: "RECEITA_BILHETERIA" },
    select: { id: true },
  });
  if (jaLancado) return;

  const cfg = await getVarios([P.BILHETERIA_OCUPACAO_BASE, P.INGRESSO_PRECO_REFERENCIA]);
  const b = calcularBilheteria({
    capacidadeEstadio: partida.mandante.capacidadeEstadio,
    precoIngresso: partida.mandante.precoIngresso,
    moralTorcida: partida.mandante.moralTorcida,
    reputacaoMandante: partida.mandante.reputacao,
    reputacaoVisitante: partida.visitante.reputacao,
    ocupacaoBase: cfg[P.BILHETERIA_OCUPACAO_BASE],
    precoReferencia: cfg[P.INGRESSO_PRECO_REFERENCIA],
  });

  await prisma.$transaction((tx) =>
    registrarMovimentacao(tx, {
      clubeId: partida.mandanteId,
      tipo: "RECEITA_BILHETERIA",
      valor: b.renda,
      descricao: `Bilheteria vs ${partida.visitante.nome} (rodada ${partida.rodada}): ${b.publico} pagantes`,
      temporadaId: partida.temporadaId,
      partidaId: partida.id,
    })
  );
}

// --- Premiação da Liga por colocação final (11 §1) ------------------------
// Chamada na virada de temporada (08 §6). Idempotente: não paga duas vezes
// a mesma temporada. Aceita um `tx` para participar da transação de virada.

export async function distribuirPremiacaoLiga(tx: Tx, temporadaId: string): Promise<number> {
  // Idempotência específica da Liga: a Copa também grava RECEITA_PREMIACAO na
  // mesma temporada, então o filtro precisa olhar a descrição.
  const jaPago = await tx.movimentacaoFinanceira.findFirst({
    where: { temporadaId, tipo: "RECEITA_PREMIACAO", descricao: { startsWith: "Premiação da Liga" } },
    select: { id: true },
  });
  if (jaPago) return 0;

  const temporada = await tx.temporada.findUniqueOrThrow({
    where: { id: temporadaId },
    include: { liga: { include: { clubes: { select: { id: true, nome: true } } } } },
  });
  const partidas = await tx.partida.findMany({
    where: { temporadaId, competicao: "LIGA_NACIONAL" },
    select: {
      mandanteId: true,
      visitanteId: true,
      golsMandante: true,
      golsVisitante: true,
      status: true,
    },
  });
  const classificacao = calcularClassificacao(temporada.liga.clubes, partidas);
  const cfg = await getVarios([P.PREMIACAO_LIGA_CAMPEAO, P.PREMIACAO_LIGA_ULTIMO]);

  for (const linha of classificacao) {
    const premio = calcularPremiacaoLiga({
      posicao: linha.posicao,
      qtdeClubes: classificacao.length,
      premioCampeao: cfg[P.PREMIACAO_LIGA_CAMPEAO],
      premioUltimo: cfg[P.PREMIACAO_LIGA_ULTIMO],
    });
    await registrarMovimentacao(tx, {
      clubeId: linha.clubeId,
      tipo: "RECEITA_PREMIACAO",
      valor: premio,
      descricao: `Premiação da Liga — ${linha.posicao}º lugar (Temporada ${temporada.numero})`,
      temporadaId,
    });
  }
  return classificacao.length;
}

// --- Ciclo semanal: patrocínio (+), folha (−), manutenção (−) ---------------

export interface ResumoSemanaClube {
  clubeId: string;
  patrocinio: number;
  folha: number;
  manutencao: number;
  saldoFinal: number;
  folhaEmAtraso: boolean;
}

export async function processarSemanaFinanceira(
  ligaId: string,
  referencia: Date = new Date()
): Promise<ResumoSemanaClube[]> {
  const cfg = await getVarios([
    P.PATROCINIO_BASE_SEMANAL,
    P.MANUTENCAO_ESTADIO_POR_NIVEL_SEMANAL,
    P.MANUTENCAO_CT_POR_NIVEL_SEMANAL,
  ]);

  const clubes = await prisma.clube.findMany({
    where: { ligaId },
    select: {
      id: true,
      reputacao: true,
      nivelEstadio: true,
      nivelCT: true,
      saldoCaixa: true,
    },
  });

  // Todos os jogadores da liga com contrato, para dividir a folha nos
  // empréstimos (09, seção 1): o tomador paga `emprestimoPercSalario`, o
  // clube dono paga o restante.
  const jogadores = await prisma.jogador.findMany({
    where: { clube: { ligaId }, contrato: { isNot: null } },
    select: {
      clubeId: true,
      emprestadoDeClubeId: true,
      emprestimoPercSalario: true,
      contrato: { select: { salarioSemanal: true } },
    },
  });

  function folhaDoClube(clubeId: string): number {
    let total = 0;
    for (const j of jogadores) {
      const sal = j.contrato?.salarioSemanal ?? 0;
      const perc = j.emprestadoDeClubeId ? j.emprestimoPercSalario ?? 1 : 1;
      if (j.clubeId === clubeId) {
        total += j.emprestadoDeClubeId ? sal * perc : sal;
      } else if (j.emprestadoDeClubeId === clubeId) {
        total += sal * (1 - perc); // dono paga a parte não coberta pelo tomador
      }
    }
    return Math.round(total);
  }

  const resumo: ResumoSemanaClube[] = [];

  for (const c of clubes) {
    const patrocinio = calcularPatrocinioSemanal(c.reputacao, cfg[P.PATROCINIO_BASE_SEMANAL]);
    const folha = folhaDoClube(c.id);
    const manutencao = calcularManutencaoSemanal({
      nivelEstadio: c.nivelEstadio,
      nivelCT: c.nivelCT,
      custoEstadioPorNivel: cfg[P.MANUTENCAO_ESTADIO_POR_NIVEL_SEMANAL],
      custoCTPorNivel: cfg[P.MANUTENCAO_CT_POR_NIVEL_SEMANAL],
    });

    const r = await prisma.$transaction(async (tx) => {
      await registrarMovimentacao(tx, {
        clubeId: c.id,
        tipo: "RECEITA_PATROCINIO",
        valor: patrocinio,
        descricao: "Patrocínio semanal",
      });

      // Folha do "mês corrente" (11 §6): consideramos em atraso quando o
      // caixa disponível antes do pagamento não cobre a folha da semana.
      const antesDaFolha = await tx.clube.findUniqueOrThrow({
        where: { id: c.id },
        select: { saldoCaixa: true },
      });
      const folhaEmAtraso = antesDaFolha.saldoCaixa < folha;

      await registrarMovimentacao(tx, {
        clubeId: c.id,
        tipo: "DESPESA_SALARIO",
        valor: folha,
        descricao: folhaEmAtraso
          ? "Folha salarial semanal (paga parcialmente — caixa insuficiente)"
          : "Folha salarial semanal",
      });
      const posManutencao = await registrarMovimentacao(tx, {
        clubeId: c.id,
        tipo: "DESPESA_MANUTENCAO",
        valor: manutencao,
        descricao: "Manutenção de estádio e centro de treinamento",
      });

      await tx.clube.update({ where: { id: c.id }, data: { folhaEmAtraso } });

      return { saldoFinal: posManutencao.saldoApos, folhaEmAtraso };
    });

    resumo.push({
      clubeId: c.id,
      patrocinio,
      folha,
      manutencao,
      saldoFinal: r.saldoFinal,
      folhaEmAtraso: r.folhaEmAtraso,
    });
  }

  return resumo;
}

// --- Receita anual estimada e fluxo de caixa recente ----------------------

/** Receita anualizada a partir do que o clube arrecadou (janela ≤ 365 dias). */
export async function receitaAnualEstimadaDoClube(
  db: ClientePrisma,
  clubeId: string,
  agora: Date = new Date()
): Promise<number> {
  const clube = await db.clube.findUniqueOrThrow({
    where: { id: clubeId },
    select: { criadoEm: true },
  });
  const janelaInicio = new Date(
    Math.max(clube.criadoEm.getTime(), agora.getTime() - 365 * DIA_MS)
  );
  const rec = await db.movimentacaoFinanceira.aggregate({
    where: { clubeId, tipo: { startsWith: "RECEITA_" }, criadoEm: { gte: janelaInicio } },
    _sum: { valor: true },
  });
  const dias = (agora.getTime() - janelaInicio.getTime()) / DIA_MS;
  return receitaAnualEstimada(rec._sum.valor ?? 0, dias);
}

/** Fluxo líquido (receita − despesa) por semana, média das últimas 4 semanas. */
async function fluxoLiquidoSemanal(clubeId: string, agora: Date): Promise<number> {
  const desde = new Date(agora.getTime() - 28 * DIA_MS);
  const [rec, desp] = await Promise.all([
    prisma.movimentacaoFinanceira.aggregate({
      where: { clubeId, tipo: { startsWith: "RECEITA_" }, criadoEm: { gte: desde } },
      _sum: { valor: true },
    }),
    prisma.movimentacaoFinanceira.aggregate({
      where: { clubeId, tipo: { startsWith: "DESPESA_" }, criadoEm: { gte: desde } },
      _sum: { valor: true },
    }),
  ]);
  return Math.round(((rec._sum.valor ?? 0) - (desp._sum.valor ?? 0)) / 4);
}

// --- Voto do Conselho (11 §4) — não bloqueia, só registra + afeta a relação --

export async function registrarVotoConselhoSePreciso(
  tx: Tx,
  params: { clubeId: string; operacao: string; valor: number },
  agora: Date = new Date()
): Promise<boolean> {
  const cfg = await getVarios([P.CONSELHO_LIMITE_GASTO_PERC_ORCAMENTO, P.CONSELHO_QUEDA_POR_VOTO]);
  const receitaAnual = await receitaAnualEstimadaDoClube(tx, params.clubeId, agora);
  if (receitaAnual <= 0) return false;

  const limite = cfg[P.CONSELHO_LIMITE_GASTO_PERC_ORCAMENTO] * receitaAnual;
  if (params.valor <= limite) return false;

  await tx.votoConselho.create({
    data: {
      clubeId: params.clubeId,
      operacao: params.operacao.slice(0, 200),
      valor: Math.round(params.valor),
      limite: Math.round(limite),
      detalhe:
        `O Conselho votou contra: ${Math.round(params.valor)} excede ` +
        `${Math.round(cfg[P.CONSELHO_LIMITE_GASTO_PERC_ORCAMENTO] * 100)}% da receita anual estimada ` +
        `(${Math.round(receitaAnual)}). A decisão do presidente prevalece (sem veto).`,
    },
  });

  const clube = await tx.clube.findUniqueOrThrow({
    where: { id: params.clubeId },
    select: { relacaoConselho: true },
  });
  const nova = Math.max(0, clube.relacaoConselho - Math.round(cfg[P.CONSELHO_QUEDA_POR_VOTO]));
  await tx.clube.update({ where: { id: params.clubeId }, data: { relacaoConselho: nova } });
  return true;
}

// --- Alertas financeiros (11 §5) — um aberto por (clube, tipo) por vez ------

async function reconciliarAlertasDoClube(
  clubeId: string,
  indicadores: {
    saldoCaixa: number;
    diasCaixaNegativoConsecutivos: number;
    folhaEmAtraso: boolean;
    fluxoLiquidoSemanal: number;
    receitaAnual: number;
  },
  cfg: Record<string, number>,
  agora: Date
): Promise<{ novos: number; resolvidos: number }> {
  const avaliados = avaliarAlertas({
    ...indicadores,
    params: {
      n1DiasAteCaixaNegativo: cfg[P.ALERTA_N1_DIAS_ATE_CAIXA_NEGATIVO],
      n2MultiploDividaReceita: cfg[P.ALERTA_N2_MULTIPLO_DIVIDA_RECEITA],
      n3DiasCaixaNegativo: cfg[P.ALERTA_N3_DIAS_CAIXA_NEGATIVO],
    },
  });
  const abertos = await prisma.alertaFinanceiro.findMany({
    where: { clubeId, resolvidoEm: null },
    select: { id: true, tipo: true },
  });
  const abertoPorTipo = new Map(abertos.map((a) => [a.tipo, a.id]));

  let novos = 0;
  let resolvidos = 0;
  for (const a of avaliados) {
    const abertoId = abertoPorTipo.get(a.tipo);
    if (a.ativo && !abertoId) {
      await prisma.alertaFinanceiro.create({
        data: { clubeId, nivel: a.nivel, tipo: a.tipo, detalhe: a.detalhe },
      });
      novos++;
    } else if (!a.ativo && abertoId) {
      await prisma.alertaFinanceiro.update({
        where: { id: abertoId },
        data: { resolvidoEm: agora },
      });
      resolvidos++;
    }
  }
  return { novos, resolvidos };
}

// --- Ciclo diário: contador de caixa negativo + alertas + falência ---------

export interface ResultadoFalencia {
  clubeFalidoId: string;
  usuarioAfetadoId: string | null;
  novoClubeId: string | null;
  recicladoSafId: string | null; // 05 §8.1
}

export async function processarDiaFinanceiro(
  ligaId: string,
  referencia: Date = new Date(),
  diasDecorridos = 1
): Promise<ResultadoFalencia[]> {
  const cfg = await getVarios([
    P.FALENCIA_DIAS_CAIXA_NEGATIVO,
    P.FALENCIA_MULTIPLO_DIVIDA_RECEITA,
    P.ALERTA_N1_DIAS_ATE_CAIXA_NEGATIVO,
    P.ALERTA_N2_MULTIPLO_DIVIDA_RECEITA,
    P.ALERTA_N3_DIAS_CAIXA_NEGATIVO,
    P.CONSELHO_RECUPERACAO_POR_DIA,
    P.CONSELHO_RELACAO_NEUTRA,
  ]);

  const clubes = await prisma.clube.findMany({
    where: { ligaId, tipo: { not: "SAF" } },
    select: {
      id: true,
      saldoCaixa: true,
      diasCaixaNegativoConsecutivos: true,
      folhaEmAtraso: true,
      relacaoConselho: true,
    },
  });

  const falencias: ResultadoFalencia[] = [];

  for (const c of clubes) {
    const novoContador = atualizarContadorCaixaNegativo({
      contadorAtual: c.diasCaixaNegativoConsecutivos,
      saldoCaixa: c.saldoCaixa,
      diasDecorridos,
    });

    // Recuperação lenta da relação com o Conselho em direção ao neutro.
    const neutra = cfg[P.CONSELHO_RELACAO_NEUTRA];
    const passo = cfg[P.CONSELHO_RECUPERACAO_POR_DIA] * diasDecorridos;
    let relacao = c.relacaoConselho;
    if (relacao < neutra) relacao = Math.min(neutra, relacao + passo);
    else if (relacao > neutra) relacao = Math.max(neutra, relacao - passo);

    await prisma.clube.update({
      where: { id: c.id },
      data: {
        diasCaixaNegativoConsecutivos: novoContador,
        relacaoConselho: Math.round(relacao),
      },
    });

    const receitaAnual = await receitaAnualEstimadaDoClube(prisma, c.id, referencia);
    const fluxo = await fluxoLiquidoSemanal(c.id, referencia);

    await reconciliarAlertasDoClube(
      c.id,
      {
        saldoCaixa: c.saldoCaixa,
        diasCaixaNegativoConsecutivos: novoContador,
        folhaEmAtraso: c.folhaEmAtraso,
        fluxoLiquidoSemanal: fluxo,
        receitaAnual,
      },
      cfg,
      referencia
    );

    const porCaixa = deveDeclararFalenciaPorCaixa({
      diasCaixaNegativoConsecutivos: novoContador,
      folhaEmAtraso: c.folhaEmAtraso,
      limiteDias: cfg[P.FALENCIA_DIAS_CAIXA_NEGATIVO],
    });
    const porDivida = deveDeclararFalenciaPorDivida({
      divida: dividaDe(c.saldoCaixa),
      receitaAnual,
      multiplo: cfg[P.FALENCIA_MULTIPLO_DIVIDA_RECEITA],
    });
    if (porCaixa || porDivida) {
      falencias.push(await executarFalencia(c.id, referencia));
    }
  }

  return falencias;
}

// --- Falência: aquisição por SAF + reatribuição (05 §7 e §8.1, 12 §4) ------

async function piorSafPorClassificacao(
  ligaId: string,
  excetoClubeId: string
): Promise<string | null> {
  const temporada = await prisma.temporada.findFirst({
    where: { ligaId, status: "EM_ANDAMENTO" },
    orderBy: { numero: "desc" },
  });
  const clubesSaf = await prisma.clube.findMany({
    where: { ligaId, tipo: "SAF", id: { not: excetoClubeId } },
    select: { id: true, nome: true },
  });
  if (clubesSaf.length === 0) return null;
  if (!temporada) return clubesSaf[0].id;

  const clubesLiga = await prisma.clube.findMany({
    where: { ligaId },
    select: { id: true, nome: true },
  });
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
  const classificacao = calcularClassificacao(clubesLiga, partidas);
  const idsSaf = new Set(clubesSaf.map((c) => c.id));
  // A classificação já vem ordenada da melhor para a pior posição.
  const pior = [...classificacao].reverse().find((l) => idsSaf.has(l.clubeId));
  return pior?.clubeId ?? clubesSaf[0].id;
}

export async function executarFalencia(
  clubeId: string,
  referencia: Date = new Date()
): Promise<ResultadoFalencia> {
  const clube = await prisma.clube.findUniqueOrThrow({
    where: { id: clubeId },
    select: { id: true, ligaId: true, tipo: true, presidenteId: true, nome: true },
  });

  const resultado: ResultadoFalencia = {
    clubeFalidoId: clubeId,
    usuarioAfetadoId: clube.presidenteId,
    novoClubeId: null,
    recicladoSafId: null,
  };

  if (clube.tipo === "SAF") return resultado; // já é corporativo

  // Alvo de reatribuição: só faz sentido se havia um humano no comando.
  let alvoId: string | null = null;
  let recicladoSafId: string | null = null;

  if (clube.presidenteId) {
    const livre = await prisma.clube.findFirst({
      where: { ligaId: clube.ligaId, tipo: "IA", presidenteId: null, id: { not: clubeId } },
      select: { id: true },
      orderBy: { reputacao: "desc" },
    });
    if (livre) {
      alvoId = livre.id;
    } else {
      // 05 §8.1 — válvula de segurança: o pior clube-SAF é "reciclado" ao pool.
      recicladoSafId = await piorSafPorClassificacao(clube.ligaId, clubeId);
      alvoId = recicladoSafId;
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1) clube falido -> SAF, sem presidente, contadores zerados
    await tx.clube.update({
      where: { id: clubeId },
      data: {
        tipo: "SAF",
        presidenteId: null,
        diasCaixaNegativoConsecutivos: 0,
        folhaEmAtraso: false,
        ultimaAcaoEm: referencia,
      },
    });

    // 2) reatribuição do humano, se aplicável
    if (clube.presidenteId && alvoId) {
      if (recicladoSafId) {
        // primeiro devolve o SAF ao pool humano (vira IA sem presidente)
        await tx.clube.update({
          where: { id: recicladoSafId },
          data: { tipo: "IA", presidenteId: null, ultimaAcaoEm: referencia },
        });
      }
      let assumido = await tx.clube.updateMany({
        where: { id: alvoId, presidenteId: null },
        data: { tipo: "HUMANO", presidenteId: clube.presidenteId, ultimaAcaoEm: referencia },
      });
      // Corrida: o alvo foi ocupado entre a leitura e a transação. Tenta
      // qualquer outro clube de IA livre dentro da própria transação.
      if (assumido.count !== 1) {
        const outro = await tx.clube.findFirst({
          where: { ligaId: clube.ligaId, tipo: "IA", presidenteId: null, id: { not: clubeId } },
          select: { id: true },
          orderBy: { reputacao: "desc" },
        });
        if (outro) {
          assumido = await tx.clube.updateMany({
            where: { id: outro.id, presidenteId: null },
            data: { tipo: "HUMANO", presidenteId: clube.presidenteId, ultimaAcaoEm: referencia },
          });
          if (assumido.count === 1) alvoId = outro.id;
        }
      }
      if (assumido.count === 1) resultado.novoClubeId = alvoId;
    }

    await tx.logSeguranca.create({
      data: {
        tipo: "FALENCIA",
        usuarioId: clube.presidenteId,
        detalhe: `clube_falido=${clubeId} novo_clube=${resultado.novoClubeId ?? "-"} reciclado_saf=${recicladoSafId ?? "-"}`,
      },
    });
  });

  resultado.recicladoSafId = recicladoSafId;
  return resultado;
}

// --- Painel / consulta -----------------------------------------------------

export async function painelFinanceiro(clubeId: string, limiteMovimentacoes = 30) {
  const clube = await prisma.clube.findUnique({
    where: { id: clubeId },
    select: {
      id: true,
      nome: true,
      saldoCaixa: true,
      precoIngresso: true,
      capacidadeEstadio: true,
      nivelEstadio: true,
      nivelCT: true,
      diasCaixaNegativoConsecutivos: true,
      folhaEmAtraso: true,
      relacaoConselho: true,
      jogadores: { select: { contrato: { select: { salarioSemanal: true } } } },
    },
  });
  if (!clube) return null;

  const [alertasAbertos, receitaAnual, votosRecentes] = await Promise.all([
    prisma.alertaFinanceiro.findMany({
      where: { clubeId, resolvidoEm: null },
      orderBy: { nivel: "desc" },
    }),
    receitaAnualEstimadaDoClube(prisma, clubeId),
    prisma.votoConselho.findMany({
      where: { clubeId },
      orderBy: { criadoEm: "desc" },
      take: 10,
    }),
  ]);

  const cfg = await getVarios([
    P.PATROCINIO_BASE_SEMANAL,
    P.MANUTENCAO_ESTADIO_POR_NIVEL_SEMANAL,
    P.MANUTENCAO_CT_POR_NIVEL_SEMANAL,
  ]);
  const folhaSemanal = calcularFolhaSemanal(
    clube.jogadores.map((j) => j.contrato?.salarioSemanal ?? 0)
  );
  const manutencaoSemanal = calcularManutencaoSemanal({
    nivelEstadio: clube.nivelEstadio,
    nivelCT: clube.nivelCT,
    custoEstadioPorNivel: cfg[P.MANUTENCAO_ESTADIO_POR_NIVEL_SEMANAL],
    custoCTPorNivel: cfg[P.MANUTENCAO_CT_POR_NIVEL_SEMANAL],
  });
  const patrocinioSemanal = calcularPatrocinioSemanal(
    (await prisma.clube.findUniqueOrThrow({ where: { id: clubeId }, select: { reputacao: true } }))
      .reputacao,
    cfg[P.PATROCINIO_BASE_SEMANAL]
  );

  const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
    where: { clubeId },
    orderBy: { criadoEm: "desc" },
    take: limiteMovimentacoes,
  });

  return {
    clubeId: clube.id,
    nome: clube.nome,
    saldoCaixa: clube.saldoCaixa,
    precoIngresso: clube.precoIngresso,
    capacidadeEstadio: clube.capacidadeEstadio,
    projecaoSemanal: {
      patrocinio: patrocinioSemanal,
      folha: folhaSemanal,
      manutencao: manutencaoSemanal,
      resultadoSemanalSemBilheteria: patrocinioSemanal - folhaSemanal - manutencaoSemanal,
    },
    receitaAnualEstimada: Math.round(receitaAnual),
    risco: {
      diasCaixaNegativoConsecutivos: clube.diasCaixaNegativoConsecutivos,
      folhaEmAtraso: clube.folhaEmAtraso,
      dividaAtual: dividaDe(clube.saldoCaixa),
    },
    alertas: alertasAbertos,
    conselho: {
      relacao: clube.relacaoConselho,
      votosRecentes,
    },
    movimentacoes,
  };
}

/** Alertas do clube (abertos + histórico recente). */
export async function alertasDoClube(clubeId: string) {
  const [abertos, historico] = await Promise.all([
    prisma.alertaFinanceiro.findMany({
      where: { clubeId, resolvidoEm: null },
      orderBy: { nivel: "desc" },
    }),
    prisma.alertaFinanceiro.findMany({
      where: { clubeId, resolvidoEm: { not: null } },
      orderBy: { resolvidoEm: "desc" },
      take: 20,
    }),
  ]);
  return { abertos, historico };
}

/** Situação do clube perante o Conselho (11 §4). */
export async function conselhoDoClube(clubeId: string) {
  const clube = await prisma.clube.findUnique({
    where: { id: clubeId },
    select: { relacaoConselho: true },
  });
  if (!clube) return null;
  const votos = await prisma.votoConselho.findMany({
    where: { clubeId },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });
  return { relacao: clube.relacaoConselho, votos };
}

export async function definirPrecoIngresso(
  clubeId: string,
  preco: number
): Promise<{ precoIngresso: number }> {
  const cfg = await getVarios([P.INGRESSO_PRECO_MIN, P.INGRESSO_PRECO_MAX]);
  if (
    !Number.isFinite(preco) ||
    preco < cfg[P.INGRESSO_PRECO_MIN] ||
    preco > cfg[P.INGRESSO_PRECO_MAX]
  ) {
    throw new Error(
      `Preço de ingresso deve estar entre ${cfg[P.INGRESSO_PRECO_MIN]} e ${cfg[P.INGRESSO_PRECO_MAX]}.`
    );
  }
  const atualizado = await prisma.clube.update({
    where: { id: clubeId },
    data: { precoIngresso: Math.round(preco * 100) / 100, ultimaAcaoEm: new Date() },
    select: { precoIngresso: true },
  });
  return atualizado;
}
