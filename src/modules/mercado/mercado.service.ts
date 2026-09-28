// Mercado de transferências — 09_TRANSFERENCIAS_E_MERCADO, seções 1-3.
// Fase 1: compra definitiva, jogador livre e empréstimo simples. Sem bônus
// de desempenho nem sell-on fee (Fase 2 — 20_ROADMAP).
//
// Fluxo (09, seção 2):
//   1. Clube proponente faz a proposta pelo jogador.
//   2. Clube detentor aceita / recusa / contrapropõe.
//      (detentor de IA responde automaticamente via 12_IA_DOS_CLUBES.)
//   3. Havendo acordo entre clubes, negocia-se com o JOGADOR (decisão da IA).
//   4. Propostas expiram no prazo (config `mercado.prazoPropostaDias`).
//
// A parte pura (valor de mercado, janelas, decisões de IA) está em
// mercado.regras.ts; aqui é a orquestração com o banco + finanças.

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { getVarios } from "../financas/config.service";
import { P } from "../financas/parametros";
import {
  registrarMovimentacao,
  registrarVotoConselhoSePreciso,
} from "../financas/financas.service";
import { calcularOverall, PosicaoJogador } from "../jogador/overall";
import { TEMPLATE_ELENCO, TAMANHO_ELENCO } from "../liga/universo.generator";
import {
  calcularValorDeMercado,
  janelasAbertas,
  tipoPermitidoAgora,
  decidirComoDetentorIA,
  decidirComoJogadorIA,
  TipoTransferencia,
  validarSellOn,
  validarBonus,
  calcularPayoutSellOn,
  BonusClausula,
} from "./mercado.regras";

type Tx = Prisma.TransactionClient;

export class ErroMercado extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

const ANO_MS = 365 * 24 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

const STATUS_PENDENTES = [
  "AGUARDANDO_DETENTOR",
  "AGUARDANDO_PROPONENTE",
  "AGUARDANDO_JOGADOR",
];

// --- valor de mercado de um jogador do banco -------------------------------

async function fatorEscassezPosicao(ligaId: string, posicao: string): Promise<number> {
  const [atual, clubes] = await Promise.all([
    prisma.jogador.count({ where: { posicao: posicao as any, clube: { ligaId } } }),
    prisma.clube.count({ where: { ligaId } }),
  ]);
  const esperado = Math.max(1, clubes * (TEMPLATE_ELENCO[posicao as PosicaoJogador] ?? 3));
  const ratio = atual / esperado;
  return Math.max(0.85, Math.min(1.25, 2 - ratio)); // ratio 1 -> 1.0 ; escasso -> >1
}

export async function valorDeMercado(jogadorId: string): Promise<number> {
  const j = await prisma.jogador.findUnique({
    where: { id: jogadorId },
    include: { contrato: true, clube: { select: { ligaId: true } } },
  });
  if (!j) throw new ErroMercado(404, "Jogador não encontrado.");

  const overall = calcularOverall(j, j.posicao as PosicaoJogador);
  const anosRestantes = j.contrato
    ? Math.max(0, (j.contrato.fim.getTime() - Date.now()) / ANO_MS)
    : 0;
  const fatorEscassez = j.clube
    ? await fatorEscassezPosicao(j.clube.ligaId, j.posicao)
    : 1;

  return calcularValorDeMercado({
    overall,
    potencial: j.potencialOculto,
    idade: j.idade,
    formaRecente: j.formaRecente,
    anosRestantesContrato: anosRestantes,
    fatorEscassez,
  });
}

// --- criação de proposta --------------------------------------------------

export interface CriarPropostaParams {
  usuarioId: string;
  clubeProponenteId: string;
  jogadorId: string;
  tipo: TipoTransferencia;
  valor?: number; // taxa de transferência (COMPRA) / de empréstimo (EMPRESTIMO)
  salarioSemanal: number;
  duracaoAnos: number;
  luvas?: number;
  clausulaRescisao?: number;
  emprestimoFim?: string; // ISO — obrigatório p/ EMPRESTIMO
  emprestimoPercSalarioTomador?: number; // 0..1 — padrão 1 (tomador paga tudo)
  // 09 §4 — só COMPRA
  sellOnPercentual?: number; // 0..limite — clube detentor retém % numa revenda futura
  bonus?: unknown; // lista de cláusulas de bônus por desempenho
}

async function contarElenco(clubeId: string): Promise<number> {
  return prisma.jogador.count({ where: { clubeId } });
}

/** Reinicia o relógio de inatividade do clube (R40). */
async function marcarAcaoDeGestao(clubeId: string): Promise<void> {
  await prisma.clube.update({ where: { id: clubeId }, data: { ultimaAcaoEm: new Date() } });
}

export async function criarProposta(p: CriarPropostaParams) {
  if (!["COMPRA", "EMPRESTIMO", "LIVRE"].includes(p.tipo)) {
    throw new ErroMercado(400, "Tipo de transferência inválido.");
  }
  // COMPRA/LIVRE assinam um novo contrato; EMPRESTIMO mantém o contrato de
  // origem (a divisão de salário vai em emprestimoPercSalarioTomador).
  if (p.tipo !== "EMPRESTIMO") {
    if (!(p.duracaoAnos >= 1 && p.duracaoAnos <= 6)) {
      throw new ErroMercado(400, "Duração de contrato deve ser de 1 a 6 anos.");
    }
    if (!(p.salarioSemanal > 0)) {
      throw new ErroMercado(400, "Salário semanal deve ser positivo.");
    }
  }
  const salarioSemanal = p.tipo === "EMPRESTIMO" ? Math.max(0, Math.round(p.salarioSemanal || 0)) : Math.round(p.salarioSemanal);
  const duracaoAnos = p.tipo === "EMPRESTIMO" ? Math.max(1, p.duracaoAnos || 1) : p.duracaoAnos;
  const luvas = p.luvas ?? 0;
  if (luvas < 0) throw new ErroMercado(400, "Luvas não podem ser negativas.");

  const proponente = await prisma.clube.findUnique({
    where: { id: p.clubeProponenteId },
    select: { id: true, ligaId: true, presidenteId: true, saldoCaixa: true, tipo: true },
  });
  if (!proponente) throw new ErroMercado(404, "Clube proponente não encontrado.");
  if (proponente.presidenteId !== p.usuarioId) {
    throw new ErroMercado(403, "Apenas o presidente do clube pode propor transferências.");
  }

  const jogador = await prisma.jogador.findUnique({
    where: { id: p.jogadorId },
    select: {
      id: true,
      clubeId: true,
      posicao: true,
      emprestadoDeClubeId: true,
      clube: { select: { id: true, ligaId: true, tipo: true, presidenteId: true, reputacao: true } },
    },
  });
  if (!jogador) throw new ErroMercado(404, "Jogador não encontrado.");
  if (jogador.emprestadoDeClubeId) {
    throw new ErroMercado(409, "Jogador está emprestado no momento; aguarde o fim do empréstimo.");
  }
  if (jogador.clubeId === proponente.id) {
    throw new ErroMercado(400, "O jogador já pertence ao seu clube.");
  }

  const detentor = jogador.clube ?? null;
  const ehLivre = detentor === null;
  if (ehLivre && p.tipo !== "LIVRE") {
    throw new ErroMercado(400, "Jogador sem contrato só pode ser contratado como agente livre (tipo LIVRE).");
  }
  if (!ehLivre && p.tipo === "LIVRE") {
    throw new ErroMercado(400, "Jogador com contrato ativo exige negociação com o clube detentor (COMPRA ou EMPRESTIMO).");
  }
  if (detentor && detentor.ligaId !== proponente.ligaId) {
    throw new ErroMercado(400, "Transferência entre ligas diferentes não é suportada nesta fase.");
  }

  // Janela de transferências (09, seção 6).
  const temporada = await prisma.temporada.findFirst({
    where: { ligaId: proponente.ligaId, status: "EM_ANDAMENTO" },
    orderBy: { numero: "desc" },
    select: { inicio: true, fimPrevisto: true },
  });
  const agora = new Date();
  const janelas = temporada
    ? janelasAbertas(agora, temporada)
    : { principal: false, intermediaria: false, algumaAberta: false };
  if (!tipoPermitidoAgora(p.tipo, janelas)) {
    throw new ErroMercado(
      403,
      "Fora das janelas de transferência: apenas contratação de jogadores livres é permitida agora."
    );
  }

  // Espaço no elenco do proponente (25 vagas fixas — 05 §2 / 14 §1).
  if ((await contarElenco(proponente.id)) >= TAMANHO_ELENCO) {
    throw new ErroMercado(409, `Elenco cheio (${TAMANHO_ELENCO} jogadores). Libere uma vaga antes.`);
  }

  // Valores e custo imediato (à vista — parcelamento é Fase 2).
  let valor = 0;
  let emprestimoFim: Date | null = null;
  let percTomador: number | null = null;
  if (p.tipo === "COMPRA") {
    valor = Math.round(p.valor ?? 0);
    if (valor <= 0) throw new ErroMercado(400, "Informe o valor da transferência (> 0).");
  } else if (p.tipo === "EMPRESTIMO") {
    valor = Math.max(0, Math.round(p.valor ?? 0));
    if (!p.emprestimoFim) throw new ErroMercado(400, "Informe a data de fim do empréstimo.");
    emprestimoFim = new Date(p.emprestimoFim);
    if (Number.isNaN(emprestimoFim.getTime()) || emprestimoFim.getTime() <= agora.getTime()) {
      throw new ErroMercado(400, "Data de fim do empréstimo inválida (precisa ser futura).");
    }
    percTomador = p.emprestimoPercSalarioTomador ?? 1;
    if (percTomador < 0 || percTomador > 1) {
      throw new ErroMercado(400, "Fração de salário do tomador deve estar entre 0 e 1.");
    }
  }
  const custoImediato = valor + luvas;
  if (custoImediato > proponente.saldoCaixa) {
    throw new ErroMercado(400, "Caixa insuficiente para cobrir valor + luvas à vista.");
  }

  // Cláusulas §4: sell-on fee (só faz sentido em COMPRA, com clube vendedor)
  // e bônus por desempenho (COMPRA/LIVRE, que assinam contrato novo).
  const cfgClausulas = await getVarios([P.MERCADO_SELL_ON_MAX_PERC, P.MERCADO_BONUS_MAX_POR_PROPOSTA]);
  const so = validarSellOn(p.sellOnPercentual, cfgClausulas[P.MERCADO_SELL_ON_MAX_PERC]);
  if (!so.ok) throw new ErroMercado(400, so.erro as string);
  if (so.valor > 0 && p.tipo !== "COMPRA") {
    throw new ErroMercado(400, "Sell-on fee só se aplica a compra definitiva.");
  }
  const bo = validarBonus(p.bonus, cfgClausulas[P.MERCADO_BONUS_MAX_POR_PROPOSTA]);
  if (!bo.ok) throw new ErroMercado(400, bo.erro as string);
  if (bo.normalizado.length > 0 && p.tipo === "EMPRESTIMO") {
    throw new ErroMercado(400, "Bônus por desempenho exigem contrato novo (COMPRA ou LIVRE).");
  }

  // Uma proposta pendente por vez, do mesmo proponente pelo mesmo jogador.
  const jaPendente = await prisma.transferenciaMercado.findFirst({
    where: { jogadorId: jogador.id, clubeProponenteId: proponente.id, status: { in: STATUS_PENDENTES } },
    select: { id: true },
  });
  if (jaPendente) {
    throw new ErroMercado(409, "Você já tem uma proposta em andamento por este jogador.");
  }

  const prazoDias = (await getVarios([P.MERCADO_PRAZO_PROPOSTA_DIAS]))[P.MERCADO_PRAZO_PROPOSTA_DIAS];
  const expiraEm = new Date(agora.getTime() + prazoDias * DIA_MS);

  const proposta = await prisma.transferenciaMercado.create({
    data: {
      jogadorId: jogador.id,
      tipo: p.tipo,
      clubeProponenteId: proponente.id,
      clubeDetentorId: detentor?.id ?? null,
      valor,
      emprestimoFim,
      emprestimoPercSalarioTomador: percTomador,
      salarioSemanal,
      duracaoAnos,
      luvas: Math.round(luvas),
      clausulaRescisao: p.clausulaRescisao != null ? Math.round(p.clausulaRescisao) : null,
      sellOnPercentual: so.valor > 0 ? so.valor : null,
      bonusJson: bo.normalizado.length > 0 ? JSON.stringify(bo.normalizado) : null,
      status: ehLivre ? "AGUARDANDO_JOGADOR" : "AGUARDANDO_DETENTOR",
      expiraEm,
    },
  });

  await marcarAcaoDeGestao(proponente.id); // enviar proposta é ação de gestão (R40)

  // Resolução automática quando não há humano do outro lado.
  if (ehLivre) {
    return negociarComJogador(proposta.id);
  }
  if (detentor && detentor.tipo !== "HUMANO") {
    return avaliarComoDetentorIA(proposta.id);
  }
  return proposta;
}

// --- decisão automática do clube detentor (IA) ---------------------------

async function avaliarComoDetentorIA(propostaId: string) {
  const prop = await prisma.transferenciaMercado.findUniqueOrThrow({ where: { id: propostaId } });
  const detentor = await prisma.clube.findUniqueOrThrow({
    where: { id: prop.clubeDetentorId as string },
    select: { id: true, perfilToleranciaRisco: true, perfilValorizaJovens: true },
  });
  const jogador = await prisma.jogador.findUniqueOrThrow({
    where: { id: prop.jogadorId },
    select: { idade: true, posicao: true },
  });
  const vm = await valorDeMercado(prop.jogadorId);
  const naPosicao = await prisma.jogador.count({
    where: { clubeId: detentor.id, posicao: jogador.posicao },
  });
  const excedente = naPosicao > (TEMPLATE_ELENCO[jogador.posicao as PosicaoJogador] ?? 3);

  const decisao = decidirComoDetentorIA({
    tipo: prop.tipo as TipoTransferencia,
    valorOferta: prop.valor,
    valorMercado: vm,
    idadeJogador: jogador.idade,
    jogadorExcedente: excedente,
    perfilToleranciaRisco: detentor.perfilToleranciaRisco ?? 0.5,
    perfilValorizaJovens: detentor.perfilValorizaJovens ?? 0.5,
  });

  if (decisao.acao === "ACEITAR") {
    return negociarComJogador(propostaId);
  }
  if (decisao.acao === "CONTRAPROPOR") {
    return prisma.transferenciaMercado.update({
      where: { id: propostaId },
      data: {
        status: "AGUARDANDO_PROPONENTE",
        valor: decisao.valorContraproposta ?? prop.valor,
        motivo: decisao.motivo,
      },
    });
  }
  return prisma.transferenciaMercado.update({
    where: { id: propostaId },
    data: { status: "RECUSADA_DETENTOR", motivo: decisao.motivo },
  });
}

// --- negociação com o jogador (IA) -------------------------------------

async function negociarComJogador(propostaId: string) {
  const prop = await prisma.transferenciaMercado.findUniqueOrThrow({ where: { id: propostaId } });
  const jogador = await prisma.jogador.findUniqueOrThrow({
    where: { id: prop.jogadorId },
    select: { moral: true, clube: { select: { reputacao: true } } },
  });
  const proponente = await prisma.clube.findUniqueOrThrow({
    where: { id: prop.clubeProponenteId },
    select: { reputacao: true },
  });
  const vm = await valorDeMercado(prop.jogadorId);

  await prisma.transferenciaMercado.update({
    where: { id: propostaId },
    data: { status: "AGUARDANDO_JOGADOR" },
  });

  const decisao = decidirComoJogadorIA({
    salarioOfertaSemanal: prop.salarioSemanal,
    luvas: prop.luvas,
    duracaoAnos: prop.duracaoAnos,
    valorMercado: vm,
    reputacaoClubeDestino: proponente.reputacao,
    reputacaoClubeAtual: jogador.clube?.reputacao ?? null,
    // Proxy de "jogando pouco / insatisfeito" enquanto não há dados de
    // minutos em campo (Fase 1) — usa a moral como aproximação.
    poucoUtilizado: jogador.moral < 45,
  });

  if (!decisao.aceita) {
    return prisma.transferenciaMercado.update({
      where: { id: propostaId },
      data: { status: "RECUSADA_JOGADOR", motivo: decisao.motivo },
    });
  }
  return efetivarTransferencia(propostaId);
}

// --- efetivação -------------------------------------------------------------

async function efetivarTransferencia(propostaId: string) {
  const prop = await prisma.transferenciaMercado.findUniqueOrThrow({ where: { id: propostaId } });
  const agora = new Date();
  const fimContrato = new Date(agora.getTime() + prop.duracaoAnos * ANO_MS);

  await prisma.$transaction(async (tx) => {
    // Movimentações financeiras (11): taxa + luvas saem do proponente; a
    // taxa entra no detentor. As luvas são do jogador, não do clube.
    if (prop.valor > 0) {
      await registrarMovimentacao(tx, {
        clubeId: prop.clubeProponenteId,
        tipo: "DESPESA_TRANSFERENCIA",
        valor: prop.valor,
        descricao:
          prop.tipo === "EMPRESTIMO"
            ? `Taxa de empréstimo do jogador ${prop.jogadorId}`
            : `Compra do jogador ${prop.jogadorId}`,
      });
      if (prop.clubeDetentorId) {
        await registrarMovimentacao(tx, {
          clubeId: prop.clubeDetentorId,
          tipo: "RECEITA_TRANSFERENCIA",
          valor: prop.valor,
          descricao:
            prop.tipo === "EMPRESTIMO"
              ? `Taxa de empréstimo do jogador ${prop.jogadorId}`
              : `Venda do jogador ${prop.jogadorId}`,
        });
      }
    }
    if (prop.luvas > 0) {
      await registrarMovimentacao(tx, {
        clubeId: prop.clubeProponenteId,
        tipo: "DESPESA_TRANSFERENCIA",
        valor: prop.luvas,
        descricao: `Luvas pagas ao jogador ${prop.jogadorId}`,
      });
    }

    // Voto do Conselho (11 §4): gasto total desta operação acima do limite
    // gera um voto formal contra — que NÃO bloqueia a transferência.
    await registrarVotoConselhoSePreciso(
      tx,
      {
        clubeId: prop.clubeProponenteId,
        operacao: `${prop.tipo} do jogador ${prop.jogadorId}`,
        valor: prop.valor + prop.luvas,
      },
      agora
    );

    // Mais-valia em revenda (09 §4): numa venda definitiva com taxa, o clube
    // que está vendendo agora repassa aos beneficiários de sell-on a fatia
    // combinada. Depois, essas cláusulas se encerram.
    if (prop.tipo === "COMPRA" && prop.valor > 0 && prop.clubeDetentorId) {
      const sellOns = await tx.sellOn.findMany({ where: { jogadorId: prop.jogadorId } });
      const payouts = calcularPayoutSellOn(prop.valor, sellOns);
      for (const pay of payouts) {
        if (pay.clubeBeneficiarioId === prop.clubeDetentorId) continue; // não paga a si mesmo
        await registrarMovimentacao(tx, {
          clubeId: prop.clubeDetentorId,
          tipo: "DESPESA_MAIS_VALIA",
          valor: pay.valor,
          descricao: `Mais-valia repassada pela revenda do jogador ${prop.jogadorId}`,
        });
        await registrarMovimentacao(tx, {
          clubeId: pay.clubeBeneficiarioId,
          tipo: "RECEITA_MAIS_VALIA",
          valor: pay.valor,
          descricao: `Mais-valia recebida na revenda do jogador ${prop.jogadorId}`,
        });
      }
      if (sellOns.length > 0) {
        await tx.sellOn.deleteMany({ where: { jogadorId: prop.jogadorId } });
      }
    }

    if (prop.tipo === "EMPRESTIMO") {
      // Jogador vai para o elenco do tomador; contrato original é mantido
      // (o dono continua pagando a parte não coberta — ver folha em finanças).
      await tx.jogador.update({
        where: { id: prop.jogadorId },
        data: {
          clubeId: prop.clubeProponenteId,
          emprestadoDeClubeId: prop.clubeDetentorId,
          emprestimoFim: prop.emprestimoFim,
          emprestimoPercSalario: prop.emprestimoPercSalarioTomador ?? 1,
        },
      });
    } else {
      // COMPRA ou LIVRE: novo contrato no clube proponente.
      await tx.contrato.deleteMany({ where: { jogadorId: prop.jogadorId } });
      const novoContrato = await tx.contrato.create({
        data: {
          jogadorId: prop.jogadorId,
          salarioSemanal: prop.salarioSemanal,
          inicio: agora,
          fim: fimContrato,
          clausulaRescisao: prop.clausulaRescisao,
          luvas: prop.luvas || null,
        },
      });
      await tx.jogador.update({
        where: { id: prop.jogadorId },
        data: {
          clubeId: prop.clubeProponenteId,
          emprestadoDeClubeId: null,
          emprestimoFim: null,
          emprestimoPercSalario: null,
        },
      });

      // Bônus por desempenho do novo contrato (09 §4).
      if (prop.bonusJson) {
        const bonus = JSON.parse(prop.bonusJson) as BonusClausula[];
        for (const b of bonus) {
          await tx.bonusContrato.create({
            data: { contratoId: novoContrato.id, tipo: b.tipo, meta: b.meta, valor: b.valor },
          });
        }
      }

      // Nova cláusula de sell-on em favor do clube vendedor (09 §4).
      if (prop.tipo === "COMPRA" && prop.clubeDetentorId && (prop.sellOnPercentual ?? 0) > 0) {
        await tx.sellOn.create({
          data: {
            jogadorId: prop.jogadorId,
            clubeBeneficiarioId: prop.clubeDetentorId,
            percentual: prop.sellOnPercentual as number,
            origemTransferenciaId: propostaId,
          },
        });
      }
    }

    await tx.transferenciaMercado.update({
      where: { id: propostaId },
      data: { status: "CONCLUIDA", concluidaEm: agora, motivo: null },
    });

    // As demais propostas pendentes pelo mesmo jogador perdem o objeto.
    await tx.transferenciaMercado.updateMany({
      where: {
        jogadorId: prop.jogadorId,
        id: { not: propostaId },
        status: { in: STATUS_PENDENTES },
      },
      data: { status: "EXPIRADA", motivo: "Jogador transferido para outro clube." },
    });
  });

  return prisma.transferenciaMercado.findUniqueOrThrow({ where: { id: propostaId } });
}

// --- respostas de clubes humanos -----------------------------------------

async function carregarPropostaComClubes(propostaId: string) {
  const prop = await prisma.transferenciaMercado.findUnique({ where: { id: propostaId } });
  if (!prop) throw new ErroMercado(404, "Proposta não encontrada.");
  return prop;
}

export async function responderComoDetentor(
  propostaId: string,
  usuarioId: string,
  acao: "ACEITAR" | "RECUSAR" | "CONTRAPROPOR",
  valorContraproposta?: number
) {
  const prop = await carregarPropostaComClubes(propostaId);
  if (prop.status !== "AGUARDANDO_DETENTOR") {
    throw new ErroMercado(409, `Proposta não está aguardando o detentor (status: ${prop.status}).`);
  }
  const detentor = await prisma.clube.findUniqueOrThrow({
    where: { id: prop.clubeDetentorId as string },
    select: { presidenteId: true },
  });
  if (detentor.presidenteId !== usuarioId) {
    throw new ErroMercado(403, "Apenas o presidente do clube detentor pode responder.");
  }
  await marcarAcaoDeGestao(prop.clubeDetentorId as string);

  if (acao === "RECUSAR") {
    return prisma.transferenciaMercado.update({
      where: { id: propostaId },
      data: { status: "RECUSADA_DETENTOR", motivo: "Recusada pelo clube detentor." },
    });
  }
  if (acao === "CONTRAPROPOR") {
    const v = Math.round(valorContraproposta ?? 0);
    if (v <= 0) throw new ErroMercado(400, "Valor da contraproposta deve ser positivo.");
    return prisma.transferenciaMercado.update({
      where: { id: propostaId },
      data: { status: "AGUARDANDO_PROPONENTE", valor: v, motivo: "Contraproposta do clube detentor." },
    });
  }
  // ACEITAR → negocia com o jogador
  return negociarComJogador(propostaId);
}

export async function responderComoProponente(
  propostaId: string,
  usuarioId: string,
  acao: "ACEITAR" | "DESISTIR"
) {
  const prop = await carregarPropostaComClubes(propostaId);
  if (prop.status !== "AGUARDANDO_PROPONENTE") {
    throw new ErroMercado(409, `Proposta não está aguardando o proponente (status: ${prop.status}).`);
  }
  const proponente = await prisma.clube.findUniqueOrThrow({
    where: { id: prop.clubeProponenteId },
    select: { presidenteId: true, saldoCaixa: true },
  });
  if (proponente.presidenteId !== usuarioId) {
    throw new ErroMercado(403, "Apenas o presidente do clube proponente pode responder.");
  }
  await marcarAcaoDeGestao(prop.clubeProponenteId);

  if (acao === "DESISTIR") {
    return prisma.transferenciaMercado.update({
      where: { id: propostaId },
      data: { status: "CANCELADA", motivo: "Proponente desistiu da negociação." },
    });
  }
  // ACEITAR a contraproposta → revalida caixa e negocia com o jogador
  if (prop.valor + prop.luvas > proponente.saldoCaixa) {
    throw new ErroMercado(400, "Caixa insuficiente para a contraproposta.");
  }
  return negociarComJogador(propostaId);
}

export async function cancelarProposta(propostaId: string, usuarioId: string) {
  const prop = await carregarPropostaComClubes(propostaId);
  if (!["AGUARDANDO_DETENTOR", "AGUARDANDO_PROPONENTE"].includes(prop.status)) {
    throw new ErroMercado(409, "Só é possível cancelar propostas ainda em negociação entre clubes.");
  }
  const proponente = await prisma.clube.findUniqueOrThrow({
    where: { id: prop.clubeProponenteId },
    select: { presidenteId: true },
  });
  if (proponente.presidenteId !== usuarioId) {
    throw new ErroMercado(403, "Apenas o presidente do clube proponente pode cancelar.");
  }
  await marcarAcaoDeGestao(prop.clubeProponenteId);
  return prisma.transferenciaMercado.update({
    where: { id: propostaId },
    data: { status: "CANCELADA", motivo: "Cancelada pelo proponente." },
  });
}

// --- consultas -----------------------------------------------------------

export async function listarPropostasDoClube(clubeId: string) {
  return prisma.transferenciaMercado.findMany({
    where: {
      OR: [{ clubeProponenteId: clubeId }, { clubeDetentorId: clubeId }],
    },
    orderBy: { atualizadoEm: "desc" },
    take: 100,
  });
}

// --- rotinas periódicas (chamadas pelo scheduler / futuro tick diário) ----

/** 08, seção 3 (passo 2): resolve propostas cujo prazo venceu. */
export async function expirarPropostasVencidas(agora: Date = new Date()): Promise<number> {
  const r = await prisma.transferenciaMercado.updateMany({
    where: { status: { in: STATUS_PENDENTES }, expiraEm: { lte: agora } },
    data: { status: "EXPIRADA", motivo: "Prazo da proposta expirou." },
  });
  return r.count;
}

/** Encerra empréstimos vencidos: o jogador volta ao clube de origem. */
export async function encerrarEmprestimosVencidos(agora: Date = new Date()): Promise<number> {
  const vencidos = await prisma.jogador.findMany({
    where: { emprestadoDeClubeId: { not: null }, emprestimoFim: { lte: agora } },
    select: { id: true, emprestadoDeClubeId: true },
  });
  for (const j of vencidos) {
    await prisma.jogador.update({
      where: { id: j.id },
      data: {
        clubeId: j.emprestadoDeClubeId,
        emprestadoDeClubeId: null,
        emprestimoFim: null,
        emprestimoPercSalario: null,
      },
    });
  }
  return vencidos.length;
}
