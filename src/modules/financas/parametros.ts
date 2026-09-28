// Parâmetros de configuração centrais — 11_FINANCAS, seção 0 e seção 8.
//
// "Todos os valores numéricos deste documento são parâmetros de configuração
// centralizados, não regras fixas embutidas na lógica do sistema."
//
// As chaves e os valores iniciais recomendados ficam AQUI (fonte única).
// Em runtime, `config.service.ts` lê da tabela ParametroConfiguravel e cai
// nestes defaults quando a chave ainda não foi semeada.

export interface DefParametro {
  chave: string;
  valor: string; // sempre string na tabela; interpretado pela aplicação
  descricao: string;
}

// Chaves usadas como constantes para evitar erro de digitação.
export const P = {
  // --- Falência (11, seção 6 + seção 8): critério de caixa E critério de dívida
  FALENCIA_DIAS_CAIXA_NEGATIVO: "financas.falencia.diasCaixaNegativo",
  FALENCIA_MULTIPLO_DIVIDA_RECEITA: "financas.falencia.multiploDividaReceitaAnual",

  // --- Alertas financeiros multi-nível (11, seção 5)
  ALERTA_N1_DIAS_ATE_CAIXA_NEGATIVO: "financas.alerta.n1.diasAteCaixaNegativo",
  ALERTA_N2_MULTIPLO_DIVIDA_RECEITA: "financas.alerta.n2.multiploDividaReceitaAnual",
  ALERTA_N3_DIAS_CAIXA_NEGATIVO: "financas.alerta.n3.diasCaixaNegativoConsecutivo",

  // --- Voto do Conselho (11, seção 4)
  CONSELHO_LIMITE_GASTO_PERC_ORCAMENTO: "financas.conselho.limiteGastoPercOrcamentoAnual",
  CONSELHO_QUEDA_POR_VOTO: "financas.conselho.quedaRelacaoPorVoto",
  CONSELHO_RECUPERACAO_POR_DIA: "financas.conselho.recuperacaoRelacaoPorDia",
  CONSELHO_RELACAO_NEUTRA: "financas.conselho.relacaoNeutra",

  // --- Receita: patrocínio semanal (11, seção 1) — valor ~ reputação
  PATROCINIO_BASE_SEMANAL: "financas.patrocinio.baseSemanal",

  // --- Receita: bilheteria (11, seção 1)
  BILHETERIA_OCUPACAO_BASE: "financas.bilheteria.ocupacaoBase",
  INGRESSO_PRECO_REFERENCIA: "financas.ingresso.precoReferencia",
  INGRESSO_PRECO_MIN: "financas.ingresso.precoMin",
  INGRESSO_PRECO_MAX: "financas.ingresso.precoMax",

  // --- Despesa: manutenção de infraestrutura semanal (11, seção 2 / seção 7)
  MANUTENCAO_ESTADIO_POR_NIVEL_SEMANAL: "financas.manutencao.estadioPorNivelSemanal",
  MANUTENCAO_CT_POR_NIVEL_SEMANAL: "financas.manutencao.ctPorNivelSemanal",

  // --- Receita: premiação da Liga Nacional por colocação final (11, seção 1)
  PREMIACAO_LIGA_CAMPEAO: "financas.premiacao.liga.campeao",
  PREMIACAO_LIGA_ULTIMO: "financas.premiacao.liga.ultimo",

  // --- Receita: premiação da Copa Nacional por fase alcançada (11 §1 / 06 §2)
  PREMIACAO_COPA_CAMPEAO: "financas.premiacao.copa.campeao",
  PREMIACAO_COPA_VICE: "financas.premiacao.copa.vice",
  PREMIACAO_COPA_SEMIFINAL: "financas.premiacao.copa.semifinal",
  PREMIACAO_COPA_QUARTAS: "financas.premiacao.copa.quartas",
  PREMIACAO_COPA_OITAVAS: "financas.premiacao.copa.oitavas",
  PREMIACAO_COPA_PRELIMINAR: "financas.premiacao.copa.preliminar",

  // --- Mercado de transferências (09)
  MERCADO_PRAZO_PROPOSTA_DIAS: "mercado.prazoPropostaDias",
  MERCADO_SELL_ON_MAX_PERC: "mercado.sellOnMaxPerc",
  MERCADO_BONUS_MAX_POR_PROPOSTA: "mercado.bonusMaxPorProposta",

  // --- Moderação de chat (18, seção 3) — array JSON de termos bloqueados
  CHAT_TERMOS_BLOQUEADOS: "chat.termosBloqueados",

  // --- Tick diário do universo (08, seção 1)
  TICK_FADIGA_RECUPERACAO_DIA: "tick.fadiga.recuperacaoPorDia",
  TICK_FADIGA_POR_PARTIDA: "tick.fadiga.ganhoPorPartida",
  TICK_MORAL_JOGADOR_NEUTRO: "tick.moral.jogadorNeutro",
  TICK_MORAL_TORCIDA_NEUTRO: "tick.moral.torcidaNeutro",
  TICK_MORAL_PASSO_DIA: "tick.moral.passoPorDia",

  // --- Lesões (04, seção 7) — faixas de recuperação por tier + pesos
  LESAO_LEVE_DIAS_MIN: "lesao.leve.diasMin",
  LESAO_LEVE_DIAS_MAX: "lesao.leve.diasMax",
  LESAO_MODERADA_DIAS_MIN: "lesao.moderada.diasMin",
  LESAO_MODERADA_DIAS_MAX: "lesao.moderada.diasMax",
  LESAO_GRAVE_DIAS_MIN: "lesao.grave.diasMin",
  LESAO_GRAVE_DIAS_MAX: "lesao.grave.diasMax",
  LESAO_PESO_LEVE: "lesao.peso.leve",
  LESAO_PESO_MODERADA: "lesao.peso.moderada",
  LESAO_PESO_GRAVE: "lesao.peso.grave",
} as const;

// Valores iniciais recomendados. Os de `11` §8 seguem a tabela do documento;
// os operacionais (bilheteria, patrocínio, manutenção, premiação) são
// estimativas de balanceamento — SINALIZADAS ao responsável para calibração
// por backtesting (02, seção 6). Moeda: unidade monetária do jogo (~BRL).
export const PARAMETROS_PADRAO: DefParametro[] = [
  { chave: P.FALENCIA_DIAS_CAIXA_NEGATIVO, valor: "30", descricao: "11 §8: dias de caixa negativo consecutivo que caracterizam falência (critério de caixa)." },
  { chave: P.FALENCIA_MULTIPLO_DIVIDA_RECEITA, valor: "2", descricao: "11 §8: múltiplo dívida/receita anual para falência (critério de dívida)." },

  { chave: P.ALERTA_N1_DIAS_ATE_CAIXA_NEGATIVO, valor: "30", descricao: "11 §8: alerta nível 1 — dias até o caixa ficar negativo na projeção." },
  { chave: P.ALERTA_N2_MULTIPLO_DIVIDA_RECEITA, valor: "1.5", descricao: "11 §8: alerta nível 2 — múltiplo dívida/receita anual." },
  { chave: P.ALERTA_N3_DIAS_CAIXA_NEGATIVO, valor: "15", descricao: "11 §8: alerta nível 3 — dias de caixa negativo consecutivo." },

  { chave: P.CONSELHO_LIMITE_GASTO_PERC_ORCAMENTO, valor: "0.4", descricao: "11 §8: fração da receita anual estimada que, se ultrapassada por um único gasto, aciona voto do Conselho." },
  { chave: P.CONSELHO_QUEDA_POR_VOTO, valor: "6", descricao: "Pontos de relação com o Conselho perdidos a cada voto formal contra (11 §4)." },
  { chave: P.CONSELHO_RECUPERACAO_POR_DIA, valor: "0.3", descricao: "Pontos de relação com o Conselho recuperados por dia em direção ao neutro." },
  { chave: P.CONSELHO_RELACAO_NEUTRA, valor: "70", descricao: "Valor neutro da relação com o Conselho (0-100)." },

  { chave: P.PATROCINIO_BASE_SEMANAL, valor: "60000", descricao: "Base semanal de patrocínio; escalada pela reputação do clube (11 §1)." },

  { chave: P.BILHETERIA_OCUPACAO_BASE, valor: "0.55", descricao: "Ocupação-base do estádio antes de moral/reputação/preço (11 §1)." },
  { chave: P.INGRESSO_PRECO_REFERENCIA, valor: "80", descricao: "Preço de ingresso de referência para o cálculo de elasticidade (11 §1)." },
  { chave: P.INGRESSO_PRECO_MIN, valor: "20", descricao: "Preço mínimo de ingresso que o presidente pode definir." },
  { chave: P.INGRESSO_PRECO_MAX, valor: "400", descricao: "Preço máximo de ingresso que o presidente pode definir." },

  { chave: P.MANUTENCAO_ESTADIO_POR_NIVEL_SEMANAL, valor: "18000", descricao: "Custo semanal de manutenção do estádio por nível (11 §2/§7)." },
  { chave: P.MANUTENCAO_CT_POR_NIVEL_SEMANAL, valor: "14000", descricao: "Custo semanal de manutenção do centro de treinamento por nível (11 §2/§7)." },

  { chave: P.PREMIACAO_LIGA_CAMPEAO, valor: "40000000", descricao: "Premiação do campeão da Liga Nacional (11 §1). Interpolado linearmente até o último." },
  { chave: P.PREMIACAO_LIGA_ULTIMO, valor: "4000000", descricao: "Premiação do último colocado da Liga Nacional (11 §1)." },

  { chave: P.PREMIACAO_COPA_CAMPEAO, valor: "20000000", descricao: "Premiação do campeão da Copa Nacional (11 §1)." },
  { chave: P.PREMIACAO_COPA_VICE, valor: "8000000", descricao: "Premiação do vice da Copa Nacional." },
  { chave: P.PREMIACAO_COPA_SEMIFINAL, valor: "4000000", descricao: "Premiação por chegar às semifinais da Copa Nacional." },
  { chave: P.PREMIACAO_COPA_QUARTAS, valor: "2000000", descricao: "Premiação por chegar às quartas da Copa Nacional." },
  { chave: P.PREMIACAO_COPA_OITAVAS, valor: "1000000", descricao: "Premiação por chegar às oitavas da Copa Nacional." },
  { chave: P.PREMIACAO_COPA_PRELIMINAR, valor: "300000", descricao: "Premiação por disputar a preliminar da Copa Nacional (T1 expandida, R38)." },

  { chave: P.MERCADO_PRAZO_PROPOSTA_DIAS, valor: "4", descricao: "09 §2: prazo de validade (dias) de uma proposta antes de expirar (recomendado 3-5)." },
  { chave: P.MERCADO_SELL_ON_MAX_PERC, valor: "0.4", descricao: "09 §4: percentual máximo de mais-valia em revenda (sell-on fee)." },
  { chave: P.MERCADO_BONUS_MAX_POR_PROPOSTA, valor: "4", descricao: "09 §4: número máximo de cláusulas de bônus por desempenho numa proposta." },

  // 18 §3: filtro automático de linguagem ofensiva/discriminatória no chat.
  // Lista inicial curta e editável (o processo de moderação humana completo
  // fica para depois). Comparação sem acento e sem caixa, por palavra inteira.
  {
    chave: P.CHAT_TERMOS_BLOQUEADOS,
    valor: JSON.stringify([
      "viado", "veado", "bicha", "sapatao", "traveco",
      "macaco", "crioulo", "negrada", "preto de alma",
      "retardado", "mongoloide", "aleijado",
      "vagabunda", "puta que pariu", "filho da puta", "arrombado",
      "toma no cu", "vai se foder", "cuzao",
    ]),
    descricao: "18 §3: termos bloqueados no chat (array JSON de strings; comparação normalizada por palavra).",
  },

  { chave: P.TICK_FADIGA_RECUPERACAO_DIA, valor: "10", descricao: "08 §1: pontos de fadiga recuperados por dia sem jogo." },
  { chave: P.TICK_FADIGA_POR_PARTIDA, valor: "18", descricao: "Fadiga ganha pelo elenco a cada partida (proxy — a Fase 1 não modela minutos em campo)." },
  { chave: P.TICK_MORAL_JOGADOR_NEUTRO, valor: "60", descricao: "04 §5: valor neutro para o qual a moral do jogador tende no tempo." },
  { chave: P.TICK_MORAL_TORCIDA_NEUTRO, valor: "50", descricao: "05 §5: valor neutro para o qual a moral da torcida tende no tempo." },
  { chave: P.TICK_MORAL_PASSO_DIA, valor: "1", descricao: "08 §1: passo diário de decaimento da moral em direção ao neutro." },

  { chave: P.LESAO_LEVE_DIAS_MIN, valor: "3", descricao: "04 §7: recuperação mínima de lesão leve (dias)." },
  { chave: P.LESAO_LEVE_DIAS_MAX, valor: "7", descricao: "04 §7: recuperação máxima de lesão leve (dias)." },
  { chave: P.LESAO_MODERADA_DIAS_MIN, valor: "14", descricao: "04 §7: recuperação mínima de lesão moderada (dias)." },
  { chave: P.LESAO_MODERADA_DIAS_MAX, valor: "42", descricao: "04 §7: recuperação máxima de lesão moderada (dias)." },
  { chave: P.LESAO_GRAVE_DIAS_MIN, valor: "60", descricao: "04 §7: recuperação mínima de lesão grave (dias)." },
  { chave: P.LESAO_GRAVE_DIAS_MAX, valor: "180", descricao: "04 §7: recuperação máxima de lesão grave (dias)." },
  { chave: P.LESAO_PESO_LEVE, valor: "0.66", descricao: "04 §7: peso relativo de lesão leve no sorteio de gravidade." },
  { chave: P.LESAO_PESO_MODERADA, valor: "0.27", descricao: "04 §7: peso relativo de lesão moderada no sorteio de gravidade." },
  { chave: P.LESAO_PESO_GRAVE, valor: "0.07", descricao: "04 §7: peso relativo de lesão grave no sorteio de gravidade." },
];
