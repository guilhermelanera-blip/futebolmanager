// Cálculo do "overall" de um jogador a partir dos 14 atributos da Fase 1,
// com ponderação por posição (04_SISTEMA_DE_JOGADORES, seção 2).
//
// Ponderação, não trava: um jogador fora do padrão para a posição continua
// possível e pode ter overall alto pela média geral.
//
// Fonte única — usado tanto pela geração do universo quanto pelo mercado.

export type PosicaoJogador =
  | "GOLEIRO"
  | "ZAGUEIRO"
  | "LATERAL"
  | "VOLANTE"
  | "MEIA"
  | "PONTA"
  | "ATACANTE";

export interface AtributosBasicos {
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

export const CAMPOS_ATRIBUTO: (keyof AtributosBasicos)[] = [
  "finalizacao", "passe", "drible", "cabeceio", "cruzamento", "marcacao",
  "desarme", "velocidade", "resistencia", "forca", "visaoDeJogo",
  "posicionamento", "reflexos", "saidaDeGol",
];

export const ENFASE_POSICAO: Record<PosicaoJogador, (keyof AtributosBasicos)[]> = {
  GOLEIRO: ["reflexos", "saidaDeGol", "posicionamento"],
  ZAGUEIRO: ["marcacao", "desarme", "cabeceio", "forca"],
  LATERAL: ["velocidade", "cruzamento", "resistencia", "desarme"],
  VOLANTE: ["marcacao", "desarme", "passe", "resistencia"],
  MEIA: ["passe", "visaoDeJogo", "drible", "finalizacao"],
  PONTA: ["velocidade", "drible", "cruzamento", "finalizacao"],
  ATACANTE: ["finalizacao", "cabeceio", "posicionamento", "drible"],
};

/** Overall 1..20: 60% média dos atributos de ênfase da posição, 40% média geral. */
export function calcularOverall(a: AtributosBasicos, posicao: PosicaoJogador): number {
  const enfase = ENFASE_POSICAO[posicao];
  const mediaEnfase = enfase.reduce((s, c) => s + a[c], 0) / enfase.length;
  const mediaGeral =
    CAMPOS_ATRIBUTO.reduce((s, c) => s + a[c], 0) / CAMPOS_ATRIBUTO.length;
  return mediaEnfase * 0.6 + mediaGeral * 0.4;
}
