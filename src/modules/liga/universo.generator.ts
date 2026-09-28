// Geração algorítmica da população inicial do universo — 04_SISTEMA_DE_JOGADORES
// seção 9 e 16_BANCO_DE_DADOS seção 6 (~800 jogadores: 20 clubes × ~40, mas
// nesta fase só o elenco profissional de 25 — a base de 15 vagas é Fase 2,
// ver 20_ROADMAP).
//
// Funções PURAS: recebem um seed e devolvem estruturas em memória, sem tocar
// no banco. A persistência fica em universo.service.ts. Dado o mesmo seed, o
// universo gerado é idêntico — reprodutível e auditável (espírito de R21).
//
// Pendências de detalhe resolvidas aqui com valores razoáveis e sinalizadas
// ao responsável (21_PROMPT_MESTRE_CLAUDE, seção 4):
//   - Distribuição mínima por posição no elenco (05, seção 2 diz "números
//     exatos ajustáveis na implementação") → TEMPLATE_ELENCO abaixo.
//   - Distribuição de perfis de IA entre clubes (12, seção 1 diz "definida na
//     fase de implementação") → perfis sorteados por clube, faixa 0..1.
//   - Traços de personalidade: NÃO gerados aqui — adiados à Fase 2 (20_ROADMAP).

import { createRng } from "../../utils/rng";
import {
  gerarNomeClube,
  gerarNomePessoa,
  ClubeGerado,
} from "../../utils/nomesFicticios";
import { CAMPOS_ATRIBUTO, ENFASE_POSICAO, calcularOverall } from "../jogador/overall";
import { Traco, sortearTracos } from "../jogador/tracos";
import { PerfilIA, gerarPerfilIA } from "../clube/perfilIA";

export type Posicao =
  | "GOLEIRO"
  | "ZAGUEIRO"
  | "LATERAL"
  | "VOLANTE"
  | "MEIA"
  | "PONTA"
  | "ATACANTE";

// Template do elenco profissional: 25 vagas fixas (05, seção 2 / 14, seção 1).
// Somatório = 25. Ajustável — é parâmetro de implementação, não regra de design.
export const TEMPLATE_ELENCO: Record<Posicao, number> = {
  GOLEIRO: 3,
  ZAGUEIRO: 5,
  LATERAL: 4,
  VOLANTE: 4,
  MEIA: 4,
  PONTA: 2,
  ATACANTE: 3,
};

export const TAMANHO_ELENCO = Object.values(TEMPLATE_ELENCO).reduce((a, b) => a + b, 0); // 25

export interface AtributosGerados {
  finalizacao: number;
  passe: number;
  drible: number;
  cabeceio: number;
  cruzamento: number;
  marcacao: number;
  desarme: number;
  velocidade: number;
  resistencia: number;
  forca: number;
  visaoDeJogo: number;
  posicionamento: number;
  reflexos: number;
  saidaDeGol: number;
}

export interface JogadorGerado {
  nome: string;
  idade: number;
  posicao: Posicao;
  atributos: AtributosGerados;
  potencialOculto: number;
  moral: number;
  fadiga: number;
  formaRecente: number;
  salarioSemanal: number;
  duracaoContratoAnos: number;
  tracos: Traco[]; // 04 §10
}

export interface ClubeUniverso {
  nome: string;
  cidade: string;
  cores: string;
  // "força" interna do clube (0..100) — só um insumo de geração, define o
  // nível médio de atributos e o salário. Não é exposto como atributo de jogo.
  forca: number;
  reputacao: number; // 0..100 (05, seção 5) — deriva de `forca` + ruído
  capacidadeEstadio: number; // 11, seção 1 — escala com a força; melhorável depois (05 §6)
  perfilIA: PerfilIA; // 12 §1
  elenco: JogadorGerado[];
}

export interface UniversoGerado {
  nomeLiga: string;
  seed: string;
  clubes: ClubeUniverso[];
}

// --- helpers de sorteio -----------------------------------------------------

function inteiroEntre(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** ~normal via soma de 3 uniformes (Bates), centrada, desvio moderado. */
function ruidoCentrado(rng: () => number): number {
  return (rng() + rng() + rng()) / 3 - 0.5; // ~[-0.5, 0.5], concentrado perto de 0
}

function clampAtributo(v: number): number {
  return Math.max(1, Math.min(20, Math.round(v)));
}

// Pesos por posição e lista de campos: fonte única em ../jogador/overall.ts
// (usados também pelo mercado). 04, seção 2 — ponderação, não trava.

// Fator de idade sobre o nível efetivo atual (04, seção 3):
// jovens ainda abaixo do teto; pico entre 25-29; declínio depois.
function fatorIdade(idade: number): number {
  if (idade <= 20) return 0.82;
  if (idade <= 24) return 0.92;
  if (idade <= 29) return 1.0;
  if (idade <= 32) return 0.94;
  return 0.86;
}

function sortearIdade(rng: () => number): number {
  // Concentra em 22-29, com caudas até 17 e 35.
  const r = rng();
  if (r < 0.15) return inteiroEntre(rng, 17, 20);
  if (r < 0.8) return inteiroEntre(rng, 21, 29);
  return inteiroEntre(rng, 30, 35);
}

function gerarAtributos(
  rng: () => number,
  posicao: Posicao,
  mediaClube: number,
  idade: number
): AtributosGerados {
  const base = mediaClube * fatorIdade(idade);
  const enfase = new Set(ENFASE_POSICAO[posicao]);
  const attrs = {} as AtributosGerados;

  for (const campo of CAMPOS_ATRIBUTO) {
    // atributo em escala ~ base, com bônus se o campo é ênfase da posição e
    // dispersão individual controlada.
    const bonusEnfase = enfase.has(campo) ? 2.5 : 0;
    // Atributos de goleiro só fazem sentido para o GOLEIRO; nos demais ficam
    // baixos (não influenciam a fórmula de disputa deles, mas evita ruído).
    const ehCampoDeGoleiro = campo === "reflexos" || campo === "saidaDeGol";
    if (ehCampoDeGoleiro && posicao !== "GOLEIRO") {
      attrs[campo] = clampAtributo(4 + rng() * 4);
      continue;
    }
    if (!ehCampoDeGoleiro && posicao === "GOLEIRO" && !enfase.has(campo)) {
      // goleiro em atributos de linha: medianos-baixos
      attrs[campo] = clampAtributo(base * 0.55 + ruidoCentrado(rng) * 6);
      continue;
    }
    attrs[campo] = clampAtributo(base + bonusEnfase + ruidoCentrado(rng) * 9);
  }
  return attrs;
}

function gerarJogador(
  rng: () => number,
  posicao: Posicao,
  mediaClube: number,
  forcaClube: number,
  nomesUsados: Set<string>
): JogadorGerado {
  const nome = gerarNomePessoa(rng, nomesUsados);
  const idade = sortearIdade(rng);
  const atributos = gerarAtributos(rng, posicao, mediaClube, idade);
  const overall = calcularOverall(atributos, posicao);

  // Potencial oculto (04, seção 4): teto de desenvolvimento. Jovens têm folga
  // grande sobre o atual; veteranos praticamente não têm.
  let folga: number;
  if (idade <= 20) folga = inteiroEntre(rng, 3, 8);
  else if (idade <= 24) folga = inteiroEntre(rng, 1, 5);
  else if (idade <= 29) folga = inteiroEntre(rng, 0, 2);
  else folga = 0;
  const potencialOculto = clampAtributo(overall + folga);

  // Salário semanal: cresce de forma acelerada com o overall e a força do
  // clube. Valores em unidade monetária do jogo (11). Faixa aproximada
  // R$ 2 mil – R$ 350 mil / semana. Parâmetro de balanceamento, ajustável.
  const escalaClube = 0.6 + (forcaClube / 100) * 0.8;
  const salarioSemanal =
    Math.round(
      (1500 + Math.pow(Math.max(1, overall - 4), 2.6) * 55) * escalaClube
    );

  return {
    nome,
    idade,
    posicao,
    atributos,
    potencialOculto,
    moral: inteiroEntre(rng, 55, 80),
    fadiga: 0,
    formaRecente: 0,
    salarioSemanal,
    duracaoContratoAnos: inteiroEntre(rng, 1, 4),
    tracos: sortearTracos(rng, posicao),
  };
}

// Paleta de pares de cores (hex) — puramente cosmético, sem relação com
// nenhuma identidade real.
const PARES_DE_CORES = [
  "#1e3a8a/#ffffff", "#166534/#fde047", "#7f1d1d/#000000", "#4c1d95/#ffffff",
  "#0f766e/#f8fafc", "#b45309/#1e293b", "#be123c/#ffffff", "#334155/#38bdf8",
  "#065f46/#ecfccb", "#701a75/#fbcfe8", "#1e293b/#f97316", "#000000/#eab308",
  "#0c4a6e/#e0f2fe", "#4d7c0f/#ffffff", "#9f1239/#fecdd3", "#312e81/#a5b4fc",
  "#14532d/#ffffff", "#7c2d12/#fed7aa", "#1f2937/#ef4444", "#0e7490/#cffafe",
];

/**
 * Gera o universo completo em memória: 1 liga, `qtdeClubes` clubes (padrão 20,
 * R9/R32) com elenco profissional de 25 jogadores cada.
 */
export function gerarUniverso(params: {
  nomeLiga: string;
  seed: string;
  qtdeClubes?: number;
}): UniversoGerado {
  const qtdeClubes = params.qtdeClubes ?? 20;
  const rng = createRng(params.seed);

  const nomesClubesUsados = new Set<string>();
  const nomesPessoasUsados = new Set<string>();
  const clubes: ClubeUniverso[] = [];

  // Força dos clubes distribuída de forma espalhada: do ~72 ao ~40, para o
  // universo ter clubes claramente fortes e claramente fracos (base para
  // "campeões variados" no backtesting, 02, seção 6).
  for (let i = 0; i < qtdeClubes; i++) {
    const t = qtdeClubes === 1 ? 0 : i / (qtdeClubes - 1);
    const forca = Math.round(72 - t * 32 + ruidoCentrado(rng) * 10);
    const forcaClamped = Math.max(30, Math.min(85, forca));
    const mediaAtributos = 5 + (forcaClamped / 100) * 13; // ~9 a ~16

    const nomeGerado: ClubeGerado = gerarNomeClube(rng, nomesClubesUsados);
    const cores = PARES_DE_CORES[Math.floor(rng() * PARES_DE_CORES.length)];

    const elenco: JogadorGerado[] = [];
    for (const [posicao, qtde] of Object.entries(TEMPLATE_ELENCO) as [Posicao, number][]) {
      for (let k = 0; k < qtde; k++) {
        elenco.push(
          gerarJogador(rng, posicao, mediaAtributos, forcaClamped, nomesPessoasUsados)
        );
      }
    }

    const reputacao = Math.max(1, Math.min(100, Math.round(forcaClamped + ruidoCentrado(rng) * 12)));
    // Capacidade do estádio escala com a força do clube (~14k a ~62k),
    // arredondada para múltiplos de 500. Melhorável depois (05 §6 / 11 §7).
    const capBase = 14000 + ((forcaClamped - 30) / 55) * 48000;
    const capacidadeEstadio =
      Math.round((capBase + ruidoCentrado(rng) * 12000) / 500) * 500;

    // Perfil de IA por arquétipo (12 §1), com seed própria derivada do
    // universo + índice do clube (determinístico e independente do fluxo do rng).
    const perfilIA = gerarPerfilIA(`${params.seed}:perfil:${i}`);

    clubes.push({
      nome: nomeGerado.nome,
      cidade: nomeGerado.cidade,
      cores,
      forca: forcaClamped,
      reputacao,
      capacidadeEstadio: Math.max(6000, capacidadeEstadio),
      perfilIA,
      elenco,
    });
  }

  return { nomeLiga: params.nomeLiga, seed: params.seed, clubes };
}
