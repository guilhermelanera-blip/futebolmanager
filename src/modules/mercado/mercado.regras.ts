// Regras puras do mercado de transferências — 09_TRANSFERENCIAS_E_MERCADO.
// Compra/venda/empréstimo, valor de mercado, janelas, decisões de IA,
// cláusulas de bônus por desempenho e sell-on fee (§4).
//
// Sem dependência de banco.

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// --- Cláusulas §4: bônus por desempenho e sell-on fee -------------------

export type TipoBonus = "GOLS_NA_TEMPORADA" | "TITULO_LIGA" | "TITULO_COPA";
export const TIPOS_BONUS: TipoBonus[] = ["GOLS_NA_TEMPORADA", "TITULO_LIGA", "TITULO_COPA"];

export interface BonusClausula {
  tipo: TipoBonus;
  meta: number; // GOLS: nº de gols; títulos: ignorado (=1)
  valor: number;
}

export function validarBonus(
  bonus: unknown,
  maxClausulas: number
): { ok: boolean; erro?: string; normalizado: BonusClausula[] } {
  if (bonus == null) return { ok: true, normalizado: [] };
  if (!Array.isArray(bonus)) return { ok: false, erro: "bonus deve ser uma lista.", normalizado: [] };
  if (bonus.length > maxClausulas) {
    return { ok: false, erro: `Máximo de ${maxClausulas} cláusulas de bônus.`, normalizado: [] };
  }
  const out: BonusClausula[] = [];
  for (const b of bonus) {
    const tipo = (b as { tipo?: string })?.tipo as TipoBonus;
    if (!TIPOS_BONUS.includes(tipo)) {
      return { ok: false, erro: `Tipo de bônus inválido: ${tipo}`, normalizado: [] };
    }
    const valor = Math.round(Number((b as { valor?: number }).valor));
    if (!Number.isFinite(valor) || valor <= 0) {
      return { ok: false, erro: "Valor de bônus deve ser positivo.", normalizado: [] };
    }
    let meta = Math.trunc(Number((b as { meta?: number }).meta));
    if (tipo === "GOLS_NA_TEMPORADA") {
      if (!Number.isFinite(meta) || meta < 1 || meta > 60) {
        return { ok: false, erro: "Meta de gols deve estar entre 1 e 60.", normalizado: [] };
      }
    } else {
      meta = 1;
    }
    out.push({ tipo, meta, valor });
  }
  return { ok: true, normalizado: out };
}

export function validarSellOn(
  percentual: unknown,
  maxPerc: number
): { ok: boolean; erro?: string; valor: number } {
  if (percentual == null || percentual === 0) return { ok: true, valor: 0 };
  const p = Number(percentual);
  if (!Number.isFinite(p) || p < 0 || p > maxPerc) {
    return { ok: false, erro: `Sell-on fee deve estar entre 0 e ${maxPerc} (0-${Math.round(maxPerc * 100)}%).`, valor: 0 };
  }
  return { ok: true, valor: Math.round(p * 1000) / 1000 };
}

/**
 * Rateio da mais-valia numa revenda (09 §4): cada beneficiário recebe
 * `percentual × valorRevenda`. Pago pelo clube que está vendendo agora.
 */
export function calcularPayoutSellOn(
  valorRevenda: number,
  sellOns: { clubeBeneficiarioId: string; percentual: number }[]
): { clubeBeneficiarioId: string; valor: number }[] {
  return sellOns
    .map((s) => ({
      clubeBeneficiarioId: s.clubeBeneficiarioId,
      valor: Math.round(Math.max(0, valorRevenda) * s.percentual),
    }))
    .filter((x) => x.valor > 0);
}

/** Uma meta de bônus foi atingida nesta temporada? */
export function bonusAtingido(params: {
  tipo: TipoBonus;
  meta: number;
  golsNaTemporada: number;
  clubeCampeaoLiga: boolean;
  clubeCampeaoCopa: boolean;
}): boolean {
  switch (params.tipo) {
    case "GOLS_NA_TEMPORADA":
      return params.golsNaTemporada >= params.meta;
    case "TITULO_LIGA":
      return params.clubeCampeaoLiga;
    case "TITULO_COPA":
      return params.clubeCampeaoCopa;
  }
}

// --- Valor de mercado (09, seção 7) --------------------------------------
// "Fórmula considerando atributos atuais, potencial, idade, forma recente,
//  tempo restante de contrato, escassez por posição e desempenho recente.
//  É uma referência de mercado, não trava o valor real de negociação."

export interface EntradaValorMercado {
  overall: number; // 1..20 — média ponderada pela posição (ver 04, seção 2)
  potencial: number; // 1..20
  idade: number;
  formaRecente: number; // ~ -1..1
  anosRestantesContrato: number;
  fatorEscassez?: number; // 0.8 (posição abundante) .. 1.3 (rara); padrão 1
}

function fatorIdadeValor(idade: number): number {
  if (idade <= 21) return 1.15; // jovem com margem de valorização
  if (idade <= 26) return 1.25; // auge de valor de revenda
  if (idade <= 29) return 1.0;
  if (idade <= 32) return 0.6;
  return 0.3;
}

function fatorContratoValor(anosRestantes: number): number {
  if (anosRestantes <= 0) return 0.25; // a ponto de sair de graça
  if (anosRestantes < 1) return 0.5;
  if (anosRestantes < 2) return 0.85;
  return 1.0;
}

const K_VALOR = 2500; // calibração — parâmetro de balanceamento (02, seção 6)

export function calcularValorDeMercado(e: EntradaValorMercado): number {
  const base = Math.pow(Math.max(1, e.overall - 3), 3) * K_VALOR;
  const fPotencial = 1 + (Math.max(0, e.potencial - e.overall) / 20) * 0.8;
  const fForma = 1 + clamp(e.formaRecente, -1, 1) * 0.1;
  const fIdade = fatorIdadeValor(e.idade);
  const fContrato = fatorContratoValor(e.anosRestantesContrato);
  const fEscassez = clamp(e.fatorEscassez ?? 1, 0.5, 1.6);

  const valor = base * fPotencial * fForma * fIdade * fContrato * fEscassez;
  return Math.max(0, Math.round(valor / 1000) * 1000);
}

/** Salário semanal "justo" para um jogador com esse valor de mercado. */
export function salarioJustoSemanal(valorMercado: number): number {
  return Math.round(valorMercado * 0.006 + 2000);
}

// --- Janelas de transferência (09, seção 6) ----------------------------
// Principal: durante toda a entressafra de 4 semanas antes do início da
//   temporada (08, seção 7).
// Intermediária: 3 semanas no meio da temporada.
// Fora das janelas: apenas jogador livre (tipo LIVRE).

const DIA_MS = 24 * 60 * 60 * 1000;

export interface JanelasResultado {
  principal: boolean;
  intermediaria: boolean;
  algumaAberta: boolean;
}

export function janelasAbertas(
  agora: Date,
  temporada: { inicio: Date; fimPrevisto: Date | null }
): JanelasResultado {
  const t = agora.getTime();
  const inicio = temporada.inicio.getTime();

  const principal = t >= inicio - 28 * DIA_MS && t < inicio;

  let intermediaria = false;
  if (temporada.fimPrevisto) {
    const dur = temporada.fimPrevisto.getTime() - inicio;
    const meio = inicio + Math.floor(dur / 2);
    intermediaria = t >= meio && t < meio + 21 * DIA_MS;
  }

  return { principal, intermediaria, algumaAberta: principal || intermediaria };
}

export type TipoTransferencia = "COMPRA" | "EMPRESTIMO" | "LIVRE";

/** COMPRA/EMPRÉSTIMO exigem janela aberta; LIVRE é permitido a qualquer momento. */
export function tipoPermitidoAgora(tipo: TipoTransferencia, janelas: JanelasResultado): boolean {
  if (tipo === "LIVRE") return true;
  return janelas.algumaAberta;
}

// --- Decisão da IA: clube detentor responde a uma oferta (09 §2/§3, 12 §3) --

export type AcaoDetentor = "ACEITAR" | "CONTRAPROPOR" | "RECUSAR";

export interface EntradaDecisaoDetentor {
  tipo: TipoTransferencia; // COMPRA ou EMPRESTIMO (LIVRE não tem detentor)
  valorOferta: number;
  valorMercado: number;
  idadeJogador: number;
  jogadorExcedente: boolean; // clube tem sobra na posição
  perfilToleranciaRisco: number; // 0..1 (12, seção 1) — maior => vende mais fácil
  perfilValorizaJovens?: number; // 0..1 (12, seção 1) — segura jovens, larga veteranos
}

export interface DecisaoDetentor {
  acao: AcaoDetentor;
  valorContraproposta?: number;
  motivo: string;
}

export function decidirComoDetentorIA(e: EntradaDecisaoDetentor): DecisaoDetentor {
  // Preço-alvo do detentor: um prêmio sobre o valor de mercado, reduzido se
  // o jogador está em declínio, se sobra na posição ou se o clube tolera
  // mais risco de mercado.
  let multiplicador = 1.2;
  if (e.idadeJogador >= 30) multiplicador -= 0.25;
  if (e.jogadorExcedente) multiplicador -= 0.15;
  multiplicador -= clamp(e.perfilToleranciaRisco, 0, 1) * 0.1;

  // 12 §1: um clube que valoriza jovens cobra mais caro por um jovem (≤23)
  // e libera mais barato um veterano (≥30).
  const vj = clamp(e.perfilValorizaJovens ?? 0.5, 0, 1);
  if (e.idadeJogador <= 23) multiplicador += (vj - 0.5) * 0.4;
  else if (e.idadeJogador >= 30) multiplicador -= (vj - 0.5) * 0.3;

  multiplicador = clamp(multiplicador, 0.7, 1.6);

  // Empréstimo: taxa esperada é uma fração pequena do valor de mercado.
  const alvo =
    e.tipo === "EMPRESTIMO"
      ? Math.round(e.valorMercado * 0.12 * multiplicador)
      : Math.round(e.valorMercado * multiplicador);

  if (e.valorOferta >= alvo) {
    return { acao: "ACEITAR", motivo: "Oferta compatível com a avaliação do clube." };
  }
  const margemContra = alvo * 0.8;
  if (e.valorOferta >= margemContra) {
    return {
      acao: "CONTRAPROPOR",
      valorContraproposta: alvo,
      motivo: `Clube pede ${alvo} pelo jogador.`,
    };
  }
  return { acao: "RECUSAR", motivo: "Oferta muito abaixo da avaliação do clube." };
}

// --- Decisão da IA: o jogador aceita os termos? (09 §2.3) ----------------

export interface EntradaDecisaoJogador {
  salarioOfertaSemanal: number;
  luvas: number;
  duracaoAnos: number;
  valorMercado: number;
  reputacaoClubeDestino: number; // 0..100
  reputacaoClubeAtual: number | null; // null = jogador livre
  poucoUtilizado: boolean; // quer jogar mais
}

export interface DecisaoJogador {
  aceita: boolean;
  motivo: string;
}

export function decidirComoJogadorIA(e: EntradaDecisaoJogador): DecisaoJogador {
  if (e.duracaoAnos < 1) {
    return { aceita: false, motivo: "Duração de contrato muito curta." };
  }
  const justo = salarioJustoSemanal(e.valorMercado);
  const luvasSemana = e.duracaoAnos > 0 ? e.luvas / (e.duracaoAnos * 52) : 0;
  const salarioEfetivo = e.salarioOfertaSemanal + luvasSemana;

  if (salarioEfetivo < justo * 0.9) {
    return { aceita: false, motivo: "Proposta salarial abaixo do esperado." };
  }

  // Ambição: aceita clube de reputação semelhante ou maior; um degrau abaixo
  // só se estiver jogando pouco no clube atual.
  if (e.reputacaoClubeAtual != null) {
    const degrau = e.reputacaoClubeAtual - e.reputacaoClubeDestino;
    if (degrau > 8 && !e.poucoUtilizado) {
      return { aceita: false, motivo: "Jogador não quer trocar por um clube de menor expressão." };
    }
  }
  return { aceita: true, motivo: "Termos aceitos pelo jogador." };
}
