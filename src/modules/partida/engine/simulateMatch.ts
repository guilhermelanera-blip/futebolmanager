// Motor de partida - versao Fase 1 (20_ROADMAP): resolucao estatistica
// pura, SEM camada de posicionamento 2D e SEM interacao ao vivo.
// A camada 2D + interacao ao vivo entra na Fase 3, seguindo o motor
// hibrido completo descrito em 03_MOTOR_DE_PARTIDAS.
//
// Ainda assim, esta versao ja cumpre a garantia central de R21
// (00_REGRAS_IMUTAVEIS): resultado 100% decidido pelo servidor,
// de forma deterministica dado o seed, e totalmente auditavel.
//
// CALIBRACAO (02 secao 6): os parametros abaixo foram ajustados por
// backtesting (npm run backtest) para reproduzir estatisticas recentes do
// Campeonato Brasileiro Serie A (20 clubes, 38 rodadas):
//   - ~2,5 gols por jogo
//   - mandante vence ~48% / empate ~27% / visitante vence ~25%
//   - campeao ~72-80 pts, lanterna ~28-34 pts
//   - ~5 cartoes amarelos e ~0,3 vermelho por jogo (liga historicamente "cartuda")

import { createRng, variancaControlada } from "../../../utils/rng";

export interface JogadorAtributos {
  finalizacao: number;
  passe: number;
  drible: number;
  marcacao: number;
  desarme: number;
  velocidade: number;
  posicionamento: number;
  reflexos: number; // relevante so para o goleiro
  saidaDeGol: number; // relevante so para o goleiro
  ehGoleiro: boolean;
}

export interface TimeEntrada {
  clubeId: string;
  jogadores: JogadorAtributos[];
  // 10_TATICA_E_TREINAMENTO, secao 2 - versao simplificada nesta fase:
  // apenas postura geral, sem funcoes individuais nem ajustes ao vivo.
  postura: "DEFENSIVA" | "EQUILIBRADA" | "OFENSIVA";
}

export interface EventoSimulado {
  minuto: number;
  tipo: "GOL" | "CARTAO_AMARELO" | "CARTAO_VERMELHO" | "LESAO";
  clubeId: string;
}

export interface ResultadoSimulacao {
  golsMandante: number;
  golsVisitante: number;
  eventos: EventoSimulado[];
  seed: string;
}

// Parametros de calibracao - centralizados e nomeados para ajuste facil
// (mesmo principio do 11_FINANCAS secao 0). Ver bloco de comentario no topo
// para as metas de estatistica.
export const PARAMS = {
  MINUTOS_REGULAMENTARES: 90,

  // Modelo de gol: por minuto, cada time tem uma chance de criar uma jogada
  // de perigo; cada jogada de perigo tem uma probabilidade de virar gol.
  CHANCE_PERIGO_POR_MINUTO: 0.12,      // ~9-11 jogadas de perigo por time/jogo
  CONVERSAO_BASE: 0.10,               // P(gol|perigo) entre times equilibrados
  CONVERSAO_POR_PONTO_DIFERENCA: 0.011, // efeito de (ataque - defesa), escala 1-20
  CONVERSAO_MIN: 0.02,
  CONVERSAO_MAX: 0.40,

  // Mando de campo (vantagem do mandante).
  MANDO_MULT_CHANCE: 1.16,            // mandante cria ~16% mais jogadas de perigo
  MANDO_BONUS_CONVERSAO: 0.026,       // +2,6 p.p. de conversao para o mandante

  // Postura tatica (10 secao 2) - modula ataque/defesa.
  POSTURA_OFENSIVA: 1.2,
  POSTURA_DEFENSIVA: 0.82,

  // "Dia bom / dia ruim" do time: variancia controlada (03 secao 5) somada a
  // forca efetiva do time inteiro na partida (mesmo desvio para ataque e
  // defesa). Amplitude em pontos de atributo. Valor mais alto => mais zebras
  // e disputa de titulo mais aberta (02 secao 6, "campeoes variados").
  WOBBLE_AMPLITUDE: 2.2,

  // Eventos disciplinares e lesoes, por time por minuto.
  CARTAO_AMARELO_POR_MINUTO: 0.028,   // ~5 amarelos/jogo (somando os dois times)
  CARTAO_VERMELHO_POR_MINUTO: 0.00165, // ~0,30 vermelho/jogo
  LESAO_POR_MINUTO: 0.0018,           // ~0,32 lesao/jogo oriunda de partida
};

function mediaAtributo(jogadores: JogadorAtributos[], campo: keyof JogadorAtributos): number {
  const linhaDeCampo = jogadores.filter((j) => !j.ehGoleiro);
  if (linhaDeCampo.length === 0) return 10;
  const soma = linhaDeCampo.reduce((acc, j) => acc + (j[campo] as number), 0);
  return soma / linhaDeCampo.length;
}

function multPostura(postura: TimeEntrada["postura"], ehAtaque: boolean): number {
  if (postura === "OFENSIVA") return ehAtaque ? PARAMS.POSTURA_OFENSIVA : PARAMS.POSTURA_DEFENSIVA;
  if (postura === "DEFENSIVA") return ehAtaque ? PARAMS.POSTURA_DEFENSIVA : PARAMS.POSTURA_OFENSIVA;
  return 1;
}

function forcaOfensiva(time: TimeEntrada): number {
  const base =
    mediaAtributo(time.jogadores, "finalizacao") * 0.4 +
    mediaAtributo(time.jogadores, "passe") * 0.25 +
    mediaAtributo(time.jogadores, "drible") * 0.2 +
    mediaAtributo(time.jogadores, "velocidade") * 0.15;
  return base * multPostura(time.postura, true);
}

function forcaDefensiva(time: TimeEntrada): number {
  const goleiro = time.jogadores.find((j) => j.ehGoleiro);
  const golPeso = goleiro ? (goleiro.reflexos + goleiro.saidaDeGol) / 2 : 10;
  const linha =
    mediaAtributo(time.jogadores, "marcacao") * 0.4 +
    mediaAtributo(time.jogadores, "desarme") * 0.35 +
    mediaAtributo(time.jogadores, "posicionamento") * 0.25;
  const base = linha * 0.7 + golPeso * 0.3;
  return base * multPostura(time.postura, false);
}

// Formula conceitual de 03_MOTOR_DE_PARTIDAS, secao 4:
// P(sucesso) = f(atributo do agente, atributo do oponente, contexto).
function conversao(ataque: number, defesa: number, ehMandante: boolean): number {
  const bonusMando = ehMandante ? PARAMS.MANDO_BONUS_CONVERSAO : 0;
  const p =
    PARAMS.CONVERSAO_BASE +
    bonusMando +
    (ataque - defesa) * PARAMS.CONVERSAO_POR_PONTO_DIFERENCA;
  return Math.min(PARAMS.CONVERSAO_MAX, Math.max(PARAMS.CONVERSAO_MIN, p));
}

export function simularPartida(
  mandante: TimeEntrada,
  visitante: TimeEntrada,
  seed: string
): ResultadoSimulacao {
  const rng = createRng(seed);
  const eventos: EventoSimulado[] = [];

  // "Dia" de cada time: desvio unico aplicado ao ataque e a defesa.
  const wobble = () => (variancaControlada(rng) - 0.5) * 2 * PARAMS.WOBBLE_AMPLITUDE;
  const diaMandante = wobble();
  const diaVisitante = wobble();

  const ataqueMandante = forcaOfensiva(mandante) + diaMandante;
  const defesaMandante = forcaDefensiva(mandante) + diaMandante;
  const ataqueVisitante = forcaOfensiva(visitante) + diaVisitante;
  const defesaVisitante = forcaDefensiva(visitante) + diaVisitante;

  let golsMandante = 0;
  let golsVisitante = 0;

  for (let minuto = 1; minuto <= PARAMS.MINUTOS_REGULAMENTARES; minuto++) {
    // Jogada de perigo do mandante (com vantagem de mando na frequencia).
    if (rng() < PARAMS.CHANCE_PERIGO_POR_MINUTO * PARAMS.MANDO_MULT_CHANCE) {
      if (rng() < conversao(ataqueMandante, defesaVisitante, true)) {
        golsMandante++;
        eventos.push({ minuto, tipo: "GOL", clubeId: mandante.clubeId });
      }
    }
    // Jogada de perigo do visitante.
    if (rng() < PARAMS.CHANCE_PERIGO_POR_MINUTO) {
      if (rng() < conversao(ataqueVisitante, defesaMandante, false)) {
        golsVisitante++;
        eventos.push({ minuto, tipo: "GOL", clubeId: visitante.clubeId });
      }
    }

    // Eventos disciplinares e lesoes (04/03) - versao inicial, sem tiers de
    // gravidade no motor (isso e resolvido ao persistir a partida).
    for (const time of [mandante, visitante] as const) {
      if (rng() < PARAMS.CARTAO_AMARELO_POR_MINUTO) {
        eventos.push({ minuto, tipo: "CARTAO_AMARELO", clubeId: time.clubeId });
      }
      if (rng() < PARAMS.CARTAO_VERMELHO_POR_MINUTO) {
        eventos.push({ minuto, tipo: "CARTAO_VERMELHO", clubeId: time.clubeId });
      }
      if (rng() < PARAMS.LESAO_POR_MINUTO) {
        eventos.push({ minuto, tipo: "LESAO", clubeId: time.clubeId });
      }
    }
  }

  return { golsMandante, golsVisitante, eventos, seed };
}
