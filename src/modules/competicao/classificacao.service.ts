// Classificação da Liga Nacional — 06_COMPETICOES_E_CALENDARIO, seção 1:
// pontos corridos (vitória 3, empate 1, derrota 0), todos contra todos,
// ida e volta.
//
// Função PURA sobre a lista de partidas já ENCERRADAS. É a projeção de
// "estado atual" derivada de eventos imutáveis (16_BANCO_DE_DADOS, seção 3):
// nada é gravado numa tabela de classificação — ela é sempre recalculada a
// partir dos resultados das partidas.
//
// Critérios de desempate: 06 não fixa a ordem exata (é detalhe de
// implementação). Adotado o conjunto clássico do futebol brasileiro:
//   1) pontos  2) nº de vitórias  3) saldo de gols  4) gols pró
//   5) nome do clube (determinístico, só para não haver empate instável)
// Sinalizado ao responsável do projeto para validação.

const PONTOS_VITORIA = 3;
const PONTOS_EMPATE = 1;

export interface PartidaResultado {
  mandanteId: string;
  visitanteId: string;
  golsMandante: number | null;
  golsVisitante: number | null;
  status: string;
}

export interface LinhaClassificacao {
  posicao: number;
  clubeId: string;
  nome: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
}

export function calcularClassificacao(
  clubes: { id: string; nome: string }[],
  partidas: PartidaResultado[]
): LinhaClassificacao[] {
  const tabela = new Map<string, LinhaClassificacao>();
  for (const c of clubes) {
    tabela.set(c.id, {
      posicao: 0,
      clubeId: c.id,
      nome: c.nome,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0,
    });
  }

  for (const p of partidas) {
    if (p.status !== "ENCERRADA") continue;
    if (p.golsMandante == null || p.golsVisitante == null) continue;
    const mandante = tabela.get(p.mandanteId);
    const visitante = tabela.get(p.visitanteId);
    if (!mandante || !visitante) continue; // partida de clube fora desta lista

    mandante.jogos++;
    visitante.jogos++;
    mandante.golsPro += p.golsMandante;
    mandante.golsContra += p.golsVisitante;
    visitante.golsPro += p.golsVisitante;
    visitante.golsContra += p.golsMandante;

    if (p.golsMandante > p.golsVisitante) {
      mandante.vitorias++;
      mandante.pontos += PONTOS_VITORIA;
      visitante.derrotas++;
    } else if (p.golsMandante < p.golsVisitante) {
      visitante.vitorias++;
      visitante.pontos += PONTOS_VITORIA;
      mandante.derrotas++;
    } else {
      mandante.empates++;
      visitante.empates++;
      mandante.pontos += PONTOS_EMPATE;
      visitante.pontos += PONTOS_EMPATE;
    }
  }

  const linhas = [...tabela.values()];
  for (const l of linhas) l.saldo = l.golsPro - l.golsContra;

  linhas.sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldo - a.saldo ||
      b.golsPro - a.golsPro ||
      a.nome.localeCompare(b.nome, "pt-BR")
  );

  linhas.forEach((l, i) => (l.posicao = i + 1));
  return linhas;
}
