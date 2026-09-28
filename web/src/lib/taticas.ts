/* Opções táticas do protótipo — time e jogador.
   (10_TATICA_E_TREINAMENTO: tática definida antes do jogo na Fase 1.) */

export const POSTURAS = [
  { v: "DEFENSIVA", t: "Defensiva", d: "Recua as linhas, prioriza não sofrer." },
  { v: "EQUILIBRADA", t: "Equilibrada", d: "Sem exageros dos dois lados." },
  { v: "OFENSIVA", t: "Ofensiva", d: "Sobe o time, aceita mais risco atrás." },
] as const;

export const FORMACOES = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"] as const;

/** Instruções individuais por posição. A 1ª opção de cada lista é o padrão. */
export const FUNCOES_POR_POSICAO: Record<string, { titulo: string; opcoes: string[] }> = {
  GOLEIRO: { titulo: "Saída do gol", opcoes: ["Padrão", "Reativo (fica na linha)", "Líbero (adianta)"] },
  ZAGUEIRO: { titulo: "Função", opcoes: ["Padrão", "Sai jogando", "Só segura atrás"] },
  LATERAL: { titulo: "Apoio ao ataque", opcoes: ["Equilibrado", "Ala ofensivo", "Fecha atrás"] },
  VOLANTE: { titulo: "Função", opcoes: ["Equilíbrio", "1º volante (marca)", "Armador recuado"] },
  MEIA: { titulo: "Função", opcoes: ["Box-to-box", "Armador", "Chega na área"] },
  PONTA: { titulo: "Movimentação", opcoes: ["Aberto na linha", "Corta pra dentro", "Ajuda a marcar"] },
  ATACANTE: { titulo: "Movimentação", opcoes: ["Referência na área", "Recua pra construir", "Ataca o espaço"] },
};

export function funcaoDaPosicao(pos: string) {
  return FUNCOES_POR_POSICAO[pos] ?? { titulo: "Função", opcoes: ["Padrão"] };
}
