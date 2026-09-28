// Cálculos financeiros — funções PURAS (11_FINANCAS).
// Recebem os parâmetros de configuração já resolvidos (números) e os dados
// do clube; não tocam no banco. Fáceis de testar e de recalibrar.

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// --- Receita: bilheteria (11, seção 1) ------------------------------------
// público = capacidade × ocupação; renda = público × preço do ingresso.
// Ocupação parte de uma base e é modulada por moral da torcida, reputação
// dos dois times e elasticidade do preço em torno de um preço de referência.

export interface EntradaBilheteria {
  capacidadeEstadio: number;
  precoIngresso: number;
  moralTorcida: number; // 0..100
  reputacaoMandante: number; // 0..100
  reputacaoVisitante: number; // 0..100
  ocupacaoBase: number; // param
  precoReferencia: number; // param
}

export interface ResultadoBilheteria {
  publico: number;
  renda: number;
  ocupacao: number; // 0..1
}

export function calcularBilheteria(e: EntradaBilheteria): ResultadoBilheteria {
  const fatorMoral = 0.5 + e.moralTorcida / 100; // 0.5 .. 1.5
  const fatorReputacao =
    0.7 + ((e.reputacaoMandante + e.reputacaoVisitante) / 200) * 0.6; // ~0.7 .. 1.3
  // Elasticidade simples: preço acima da referência esvazia; abaixo, enche.
  const fatorPreco = clamp(1.15 - (e.precoIngresso / e.precoReferencia) * 0.3, 0.4, 1.15);

  const ocupacao = clamp(e.ocupacaoBase * fatorMoral * fatorReputacao * fatorPreco, 0.05, 1);
  const publico = Math.round(e.capacidadeEstadio * ocupacao);
  const renda = Math.round(publico * e.precoIngresso);
  return { publico, renda, ocupacao };
}

// --- Receita: patrocínio semanal (11, seção 1) ---------------------------
// valor influenciado pela reputação do clube.
export function calcularPatrocinioSemanal(reputacao: number, baseSemanal: number): number {
  const fator = 0.4 + (clamp(reputacao, 0, 100) / 100) * 1.6; // rep 50 -> 1.2x ; rep 100 -> 2.0x
  return Math.round(baseSemanal * fator);
}

// --- Despesa: folha salarial semanal (11, seção 2) ----------------------
// elenco (+ comissão técnica quando existir; hoje só elenco).
export function calcularFolhaSemanal(salariosSemanais: number[]): number {
  return Math.round(salariosSemanais.reduce((s, v) => s + v, 0));
}

// --- Despesa: manutenção de infraestrutura semanal (11, seções 2 e 7) ---
export function calcularManutencaoSemanal(params: {
  nivelEstadio: number;
  nivelCT: number;
  custoEstadioPorNivel: number;
  custoCTPorNivel: number;
}): number {
  return Math.round(
    params.nivelEstadio * params.custoEstadioPorNivel +
      params.nivelCT * params.custoCTPorNivel
  );
}

// --- Receita: premiação da Liga Nacional por colocação final (11, seção 1)
// Interpolação linear entre o prêmio do campeão (posição 1) e o do último
// (posição N).
export function calcularPremiacaoLiga(params: {
  posicao: number; // 1..qtdeClubes
  qtdeClubes: number;
  premioCampeao: number;
  premioUltimo: number;
}): number {
  const { posicao, qtdeClubes, premioCampeao, premioUltimo } = params;
  if (qtdeClubes <= 1) return premioCampeao;
  const t = (clamp(posicao, 1, qtdeClubes) - 1) / (qtdeClubes - 1); // 0 no 1º, 1 no último
  return Math.round(premioCampeao + t * (premioUltimo - premioCampeao));
}

// --- Falência: critério de caixa (11, seção 6) --------------------------
// "saldo de caixa negativo por N dias consecutivos COMBINADO COM
//  incapacidade de pagar a folha salarial do mês corrente."
// (o critério de dívida é adiado à Fase 2 — 20_ROADMAP.)
export interface EntradaFalenciaCaixa {
  diasCaixaNegativoConsecutivos: number;
  folhaEmAtraso: boolean;
  limiteDias: number; // param FALENCIA_DIAS_CAIXA_NEGATIVO
}

export function deveDeclararFalenciaPorCaixa(e: EntradaFalenciaCaixa): boolean {
  return e.folhaEmAtraso && e.diasCaixaNegativoConsecutivos >= e.limiteDias;
}

// --- Contador de dias de caixa negativo --------------------------------
// Puro: dado o contador atual, o saldo e quantos dias se passaram, devolve
// o novo contador. Reinicia em 0 assim que o caixa deixa de ser negativo.
export function atualizarContadorCaixaNegativo(params: {
  contadorAtual: number;
  saldoCaixa: number;
  diasDecorridos: number;
}): number {
  if (params.saldoCaixa < 0) return params.contadorAtual + params.diasDecorridos;
  return 0;
}
