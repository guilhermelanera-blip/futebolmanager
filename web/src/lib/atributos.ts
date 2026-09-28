/* Metadados dos 14 atributos da Fase 1 (04_SISTEMA_DE_JOGADORES §2).
   Escala 1..20. Rótulos e agrupamento para exibição; ênfase por posição
   espelha ENFASE_POSICAO do backend (overall.ts). */

export const ATRIBUTO_LABEL: Record<string, string> = {
  finalizacao: "Finalização",
  passe: "Passe",
  drible: "Drible",
  cabeceio: "Cabeceio",
  cruzamento: "Cruzamento",
  marcacao: "Marcação",
  desarme: "Desarme",
  velocidade: "Velocidade",
  resistencia: "Resistência",
  forca: "Força",
  visaoDeJogo: "Visão de jogo",
  posicionamento: "Posicionamento",
  reflexos: "Reflexos",
  saidaDeGol: "Saída de gol",
};

export interface GrupoAtributo {
  titulo: string;
  campos: string[];
}

export const GRUPOS_ATRIBUTO: GrupoAtributo[] = [
  { titulo: "Ataque", campos: ["finalizacao", "drible", "cabeceio", "cruzamento"] },
  { titulo: "Criação", campos: ["passe", "visaoDeJogo", "posicionamento"] },
  { titulo: "Defesa", campos: ["marcacao", "desarme"] },
  { titulo: "Físico", campos: ["velocidade", "resistencia", "forca"] },
  { titulo: "Goleiro", campos: ["reflexos", "saidaDeGol"] },
];

export const ENFASE_POSICAO: Record<string, string[]> = {
  GOLEIRO: ["reflexos", "saidaDeGol", "posicionamento"],
  ZAGUEIRO: ["marcacao", "desarme", "cabeceio", "forca"],
  LATERAL: ["velocidade", "cruzamento", "resistencia", "desarme"],
  VOLANTE: ["marcacao", "desarme", "passe", "resistencia"],
  MEIA: ["passe", "visaoDeJogo", "drible", "finalizacao"],
  PONTA: ["velocidade", "drible", "cruzamento", "finalizacao"],
  ATACANTE: ["finalizacao", "cabeceio", "posicionamento", "drible"],
};

/** Cor do valor conforme faixa (1..20). */
export function faixaAtributo(v: number): "alto" | "bom" | "medio" | "baixo" {
  if (v >= 16) return "alto";
  if (v >= 13) return "bom";
  if (v >= 9) return "medio";
  return "baixo";
}
