import { prisma } from "../../config/prisma";
import { simularPartida, TimeEntrada, JogadorAtributos } from "./engine/simulateMatch";
import { aplicarRendaDePartida } from "../financas/financas.service";
import { getVarios } from "../financas/config.service";
import { P } from "../financas/parametros";
import { createRng } from "../../utils/rng";
import {
  sortearGravidade,
  sortearDiasRecuperacao,
  FaixasRecuperacao,
} from "../jogador/lesao.regras";
import { montarSeedPartida } from "./partida.seed";
import { avancarAposPartida } from "../competicao/copa.service";
import { AtributosBasicos } from "../jogador/overall";
import { parseTracos, aplicarBonusTracos, multLesaoDe } from "../jogador/tracos";
import { posturaParaMotor } from "../clube/perfilIA";
import { randomUUID } from "crypto";

export interface JogadorElenco {
  id: string;
  posicao: string;
  idade: number;
  tracos: string;
}

async function montarTimeEntrada(clubeId: string): Promise<TimeEntrada> {
  const [clube, jogadores] = await Promise.all([
    prisma.clube.findUniqueOrThrow({
      where: { id: clubeId },
      select: { tipo: true, perfilPosturaTatica: true },
    }),
    prisma.jogador.findMany({ where: { clubeId } }),
  ]);

  const atributos: JogadorAtributos[] = jogadores.map((j) => {
    // Aplica os bônus de traços (04 §10) sobre os atributos completos e então
    // extrai os campos que o motor da Fase 1 usa.
    const completos: AtributosBasicos = {
      finalizacao: j.finalizacao, passe: j.passe, drible: j.drible, cabeceio: j.cabeceio,
      cruzamento: j.cruzamento, marcacao: j.marcacao, desarme: j.desarme, velocidade: j.velocidade,
      resistencia: j.resistencia, forca: j.forca, visaoDeJogo: j.visaoDeJogo,
      posicionamento: j.posicionamento, reflexos: j.reflexos, saidaDeGol: j.saidaDeGol,
    };
    const a = aplicarBonusTracos(completos, parseTracos(j.tracos));
    return {
      finalizacao: a.finalizacao, passe: a.passe, drible: a.drible, marcacao: a.marcacao,
      desarme: a.desarme, velocidade: a.velocidade, posicionamento: a.posicionamento,
      reflexos: a.reflexos, saidaDeGol: a.saidaDeGol,
      ehGoleiro: j.posicao === "GOLEIRO",
    };
  });

  // Clube de IA joga na postura do seu perfil (12 §1); clube humano ainda
  // usa EQUILIBRADA por padrão (tática pré-jogo do humano é outra feature).
  const postura =
    clube.tipo === "HUMANO" ? "EQUILIBRADA" : posturaParaMotor(clube.perfilPosturaTatica);

  return { clubeId, jogadores: atributos, postura };
}

// Peso de cada posição para "quem marcou o gol" (03 §6.1). Cartões e lesões
// usam peso ~uniforme entre jogadores de linha (lesão inclui o goleiro).
const PESO_GOL: Record<string, number> = {
  ATACANTE: 4, PONTA: 4, MEIA: 3, LATERAL: 2, VOLANTE: 1, ZAGUEIRO: 1, GOLEIRO: 0,
};

function escolhePonderado(
  rng: () => number,
  elenco: JogadorElenco[],
  peso: (j: JogadorElenco) => number
): JogadorElenco | null {
  const total = elenco.reduce((s, j) => s + peso(j), 0);
  if (total <= 0) return elenco[0] ?? null;
  let r = rng() * total;
  for (const j of elenco) {
    r -= peso(j);
    if (r < 0) return j;
  }
  return elenco[elenco.length - 1];
}

// Atribui cada evento simulado a um jogador do clube, de forma DETERMINÍSTICA
// a partir do seed da partida — sem tocar no RNG do motor (auditável, 03 §10).
export function atribuirEventosAJogadores(
  seed: string,
  eventos: { minuto: number; tipo: string; clubeId: string }[],
  elencoPorClube: Map<string, JogadorElenco[]>
): { minuto: number; tipo: string; clubeId: string; jogadorId: string | null }[] {
  const rng = createRng(`${seed}:atribuicao`);
  return eventos.map((e) => {
    const elenco = elencoPorClube.get(e.clubeId) ?? [];
    if (elenco.length === 0) return { ...e, jogadorId: null };
    let escolhido: JogadorElenco | null;
    if (e.tipo === "GOL") {
      escolhido = escolhePonderado(rng, elenco, (j) => PESO_GOL[j.posicao] ?? 1);
    } else if (e.tipo === "LESAO") {
      // jogador "propenso a lesão" (04 §10) tem mais chance de ser o lesionado.
      escolhido = escolhePonderado(rng, elenco, (j) => multLesaoDe(parseTracos(j.tracos)));
    } else {
      // cartões: jogadores de linha
      const linha = elenco.filter((j) => j.posicao !== "GOLEIRO");
      const pool = linha.length > 0 ? linha : elenco;
      escolhido = pool[Math.floor(rng() * pool.length)];
    }
    return { ...e, jogadorId: escolhido?.id ?? null };
  });
}

// Executa a simulação de uma partida já agendada e persiste o resultado.
// Ponto central de garantia de R2/R21: TUDO acontece aqui, no servidor.
export async function simularEPersistirPartida(partidaId: string): Promise<void> {
  const partida = await prisma.partida.findUniqueOrThrow({ where: { id: partidaId } });

  if (partida.status !== "AGENDADA") {
    throw new Error(`Partida ${partidaId} não está no status AGENDADA (atual: ${partida.status})`);
  }

  await prisma.partida.update({
    where: { id: partidaId },
    data: { status: "EM_ANDAMENTO" },
  });

  const timeMandante = await montarTimeEntrada(partida.mandanteId);
  const timeVisitante = await montarTimeEntrada(partida.visitanteId);

  // Seed já foi gravado na criação da partida (agendamento) — nunca é
  // gerado "na hora" de forma não rastreável, para manter auditabilidade.
  const resultado = simularPartida(timeMandante, timeVisitante, partida.seed);

  // Elencos com id/posição/idade, para atribuir eventos a jogadores e
  // resolver lesões (o motor da Fase 1 não escala um XI nem modela minutos).
  const [elencoMandante, elencoVisitante] = await Promise.all([
    prisma.jogador.findMany({
      where: { clubeId: partida.mandanteId },
      select: { id: true, posicao: true, idade: true, tracos: true },
    }),
    prisma.jogador.findMany({
      where: { clubeId: partida.visitanteId },
      select: { id: true, posicao: true, idade: true, tracos: true },
    }),
  ]);
  const elencoPorClube = new Map<string, JogadorElenco[]>([
    [partida.mandanteId, elencoMandante],
    [partida.visitanteId, elencoVisitante],
  ]);
  const eventos = atribuirEventosAJogadores(partida.seed, resultado.eventos, elencoPorClube);

  await prisma.$transaction([
    prisma.partida.update({
      where: { id: partidaId },
      data: {
        status: "ENCERRADA",
        golsMandante: resultado.golsMandante,
        golsVisitante: resultado.golsVisitante,
      },
    }),
    prisma.eventoPartida.createMany({
      data: eventos.map((e) => ({
        id: randomUUID(),
        partidaId,
        minuto: e.minuto,
        tipo: e.tipo,
        clubeId: e.clubeId,
        jogadorId: e.jogadorId,
      })),
    }),
  ]);

  // Pós-jogo (08, seção 3, passo 5):
  //  - lesões ocorridas viram registros com janela de recuperação (04 §7);
  //  - fadiga acumulada pelos dois elencos (04 §6);
  //  - receita de bilheteria do mandante (11 §1).
  await registrarLesoesDaPartida(partida.seed, partidaId, eventos, elencoPorClube);
  await acumularFadigaDaPartida(partida.mandanteId, partida.visitanteId);
  await aplicarRendaDePartida(partidaId);

  // Copa Nacional: se esta partida fecha um confronto de mata-mata, apura o
  // agregado, avança o vencedor e agenda a próxima fase (06 §2).
  if (partida.competicao === "COPA_NACIONAL") {
    await avancarAposPartida(partidaId);
  }
}

async function faixasRecuperacao(): Promise<FaixasRecuperacao> {
  const c = await getVarios([
    P.LESAO_LEVE_DIAS_MIN, P.LESAO_LEVE_DIAS_MAX,
    P.LESAO_MODERADA_DIAS_MIN, P.LESAO_MODERADA_DIAS_MAX,
    P.LESAO_GRAVE_DIAS_MIN, P.LESAO_GRAVE_DIAS_MAX,
  ]);
  return {
    LEVE: { min: c[P.LESAO_LEVE_DIAS_MIN], max: c[P.LESAO_LEVE_DIAS_MAX] },
    MODERADA: { min: c[P.LESAO_MODERADA_DIAS_MIN], max: c[P.LESAO_MODERADA_DIAS_MAX] },
    GRAVE: { min: c[P.LESAO_GRAVE_DIAS_MIN], max: c[P.LESAO_GRAVE_DIAS_MAX] },
  };
}

async function registrarLesoesDaPartida(
  seed: string,
  partidaId: string,
  eventos: { minuto: number; tipo: string; jogadorId: string | null }[],
  elencoPorClube: Map<string, JogadorElenco[]>
): Promise<void> {
  const lesoes = eventos.filter((e) => e.tipo === "LESAO" && e.jogadorId);
  if (lesoes.length === 0) return;

  const [pesos, faixas] = await Promise.all([
    getVarios([P.LESAO_PESO_LEVE, P.LESAO_PESO_MODERADA, P.LESAO_PESO_GRAVE]),
    faixasRecuperacao(),
  ]);
  const idadePorJogador = new Map<string, number>();
  const tracosPorJogador = new Map<string, string>();
  for (const elenco of elencoPorClube.values()) {
    for (const j of elenco) {
      idadePorJogador.set(j.id, j.idade);
      tracosPorJogador.set(j.id, j.tracos);
    }
  }

  for (const e of lesoes) {
    const jogadorId = e.jogadorId as string;
    // Seed próprio da lesão: reproduzível a partir do que fica gravado,
    // sem perturbar o RNG do motor de partida.
    const rng = createRng(`${seed}:lesao:${jogadorId}:${e.minuto}`);
    const gravidade = sortearGravidade(rng, {
      leve: pesos[P.LESAO_PESO_LEVE],
      moderada: pesos[P.LESAO_PESO_MODERADA],
      grave: pesos[P.LESAO_PESO_GRAVE],
    });
    const lesoesAnteriores = await prisma.lesao.count({ where: { jogadorId } });
    const multTraco = multLesaoDe(parseTracos(tracosPorJogador.get(jogadorId)));
    const dias = Math.round(
      sortearDiasRecuperacao({
        rng,
        gravidade,
        faixas,
        idade: idadePorJogador.get(jogadorId) ?? 25,
        lesoesAnteriores,
      }) * multTraco
    );
    await prisma.lesao.create({
      data: {
        jogadorId,
        gravidade,
        diasTotais: dias,
        diasRestantes: dias,
        origem: "PARTIDA",
        partidaId,
      },
    });
  }
}

async function acumularFadigaDaPartida(mandanteId: string, visitanteId: string): Promise<void> {
  const ganho = Math.round((await getVarios([P.TICK_FADIGA_POR_PARTIDA]))[P.TICK_FADIGA_POR_PARTIDA]);
  await prisma.$executeRaw`
    UPDATE "Jogador" SET fadiga = LEAST(100, fadiga + ${ganho})
    WHERE "clubeId" IN (${mandanteId}, ${visitanteId})
  `;
}

export { montarSeedPartida };

// Cria uma partida agendada com seed determinístico já fixado
// (08_RELOGIO_E_SIMULACAO, seção 2 — disparo em horário fixo).
export async function agendarPartida(params: {
  temporadaId: string;
  competicao: string;
  rodada: number;
  mandanteId: string;
  visitanteId: string;
  dataHora: Date;
}) {
  const seed = montarSeedPartida(params);
  return prisma.partida.create({
    data: { ...params, seed },
  });
}
