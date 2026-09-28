// Regras puras dos alertas financeiros (11_FINANCAS §5) e do critério de
// dívida para falência (§6). Sem banco.
//
// "Dívida total" no modelo da Fase 1/2: não há empréstimo bancário nem
// parcelamento, então dívida = quanto o caixa está negativo.

export function dividaDe(saldoCaixa: number): number {
  return Math.max(0, -saldoCaixa);
}

/**
 * Anualiza a receita a partir do que foi arrecadado num período conhecido.
 * Com menos de uma semana de histórico não há base para estimar → 0
 * (os alertas e a falência por dívida ficam inertes até haver dados).
 */
export function receitaAnualEstimada(receitaNoPeriodo: number, diasDoPeriodo: number): number {
  if (diasDoPeriodo < 7) return 0;
  if (diasDoPeriodo >= 365) return Math.max(0, Math.round(receitaNoPeriodo));
  return Math.max(0, Math.round((receitaNoPeriodo / diasDoPeriodo) * 365));
}

export interface EntradaAlertas {
  saldoCaixa: number;
  diasCaixaNegativoConsecutivos: number;
  folhaEmAtraso: boolean;
  fluxoLiquidoSemanal: number; // média recente (receita - despesa) por semana
  receitaAnual: number;
  params: {
    n1DiasAteCaixaNegativo: number;
    n2MultiploDividaReceita: number;
    n3DiasCaixaNegativo: number;
  };
}

export type TipoAlerta =
  | "PROJECAO_CAIXA_NEGATIVO"
  | "DIVIDA_ALTA"
  | "CAIXA_NEGATIVO_PROLONGADO"
  | "FOLHA_EM_ATRASO";

export interface AlertaAvaliado {
  nivel: 1 | 2 | 3;
  tipo: TipoAlerta;
  ativo: boolean;
  detalhe: string;
}

export function avaliarAlertas(e: EntradaAlertas): AlertaAvaliado[] {
  const divida = dividaDe(e.saldoCaixa);
  const alertas: AlertaAvaliado[] = [];

  // Nível 1 — projeção: se está queimando caixa e a projeção fica negativa
  // dentro de X dias.
  const projecao =
    e.saldoCaixa + e.fluxoLiquidoSemanal * (e.params.n1DiasAteCaixaNegativo / 7);
  alertas.push({
    nivel: 1,
    tipo: "PROJECAO_CAIXA_NEGATIVO",
    ativo: e.saldoCaixa >= 0 && e.fluxoLiquidoSemanal < 0 && projecao < 0,
    detalhe: `Projeção de caixa em ${e.params.n1DiasAteCaixaNegativo} dias: ${Math.round(projecao)}`,
  });

  // Nível 2 — risco: dívida > Y × receita anual (só avalia se há receita
  // anual estimada; sem histórico suficiente, não dispara).
  const limiteDivida = e.params.n2MultiploDividaReceita * e.receitaAnual;
  alertas.push({
    nivel: 2,
    tipo: "DIVIDA_ALTA",
    ativo: e.receitaAnual > 0 && divida > limiteDivida,
    detalhe: `Dívida ${Math.round(divida)} > ${e.params.n2MultiploDividaReceita}× receita anual (${Math.round(limiteDivida)})`,
  });

  // Nível 3 — crítico: caixa negativo há Z dias, e/ou folha do mês em atraso.
  alertas.push({
    nivel: 3,
    tipo: "CAIXA_NEGATIVO_PROLONGADO",
    ativo: e.diasCaixaNegativoConsecutivos >= e.params.n3DiasCaixaNegativo,
    detalhe: `Caixa negativo há ${e.diasCaixaNegativoConsecutivos} dias (limite ${e.params.n3DiasCaixaNegativo})`,
  });
  alertas.push({
    nivel: 3,
    tipo: "FOLHA_EM_ATRASO",
    ativo: e.folhaEmAtraso,
    detalhe: "Folha salarial do mês corrente não pôde ser paga integralmente",
  });

  return alertas;
}

/** Critério de DÍVIDA para falência (11 §6): dívida > múltiplo × receita anual. */
export function deveDeclararFalenciaPorDivida(params: {
  divida: number;
  receitaAnual: number;
  multiplo: number;
}): boolean {
  if (params.receitaAnual <= 0) return false;
  return params.divida > params.multiplo * params.receitaAnual;
}
