/* ============================================================ uniformes
   Cada kit tem 3 peças independentes — Camisa, Calção, Meião — cada uma
   com seu próprio padrão e cores. Renderização em ../components/Uniforme. */

export type PadraoCamisa =
  | "solido" | "listras" | "listrasFinas" | "barras" | "metades"
  | "faixa" | "faixaV" | "ombros" | "xadrez" | "degrade" | "risca" | "central";
export type Mangas = "base" | "cor2" | "cor3" | "ponta";
export type Gola = "redonda" | "v" | "polo" | "sem";
export type Fonte = "padrao" | "condensada" | "bloco" | "arredondada" | "mono";

export interface Camisa {
  padrao: PadraoCamisa;
  cor1: string; cor2: string; cor3: string;
  mangas: Mangas;
  gola: Gola;
  corGola: string;
  corNumero: string;
  fonte: Fonte;
  nome: string;        // nome nas costas (mockup)
  numEscala: number;   // 0.6 – 1.6 (tamanho do número)
}

export const FONTES: { v: Fonte; t: string; css: string; peso: string }[] = [
  { v: "padrao", t: "Padrão", css: '"Archivo", Arial, sans-serif', peso: "800" },
  { v: "condensada", t: "Condensada", css: '"Oswald", "Arial Narrow", sans-serif', peso: "700" },
  { v: "bloco", t: "Bloco", css: '"Anton", "Arial Black", sans-serif', peso: "400" },
  { v: "arredondada", t: "Arredondada", css: '"Rubik", Arial, sans-serif', peso: "800" },
  { v: "mono", t: "Digital", css: '"IBM Plex Mono", monospace', peso: "700" },
];
export function fonteCss(f: Fonte): { css: string; peso: string } {
  const o = FONTES.find((x) => x.v === f) ?? FONTES[0];
  return { css: o.css, peso: o.peso };
}

export type PadraoCalcao = "solido" | "lateral" | "duasCores" | "listras";
export interface Calcao {
  padrao: PadraoCalcao;
  cor1: string;
  cor2: string;
}

export type PadraoMeiao = "solido" | "faixaTopo" | "aneis" | "listras";
export interface Meiao {
  padrao: PadraoMeiao;
  cor1: string;
  cor2: string;
}

export interface Kit { camisa: Camisa; calcao: Calcao; meiao: Meiao }
export type TipoKit = "casa" | "fora" | "terceiro" | "goleiro";
export type Kits = Record<TipoKit, Kit>;
export type Peca = "camisa" | "calcao" | "meiao";

export const TIPOS: { v: TipoKit; t: string }[] = [
  { v: "casa", t: "Casa" },
  { v: "fora", t: "Fora" },
  { v: "terceiro", t: "Terceiro" },
  { v: "goleiro", t: "Goleiro" },
];
export const PECAS: { v: Peca; t: string }[] = [
  { v: "camisa", t: "Camisa" },
  { v: "calcao", t: "Calção" },
  { v: "meiao", t: "Meião" },
];

export const PADROES_CAMISA: { v: PadraoCamisa; t: string }[] = [
  { v: "solido", t: "Liso" },
  { v: "listras", t: "Listras verticais" },
  { v: "listrasFinas", t: "Listras finas" },
  { v: "barras", t: "Barras horizontais" },
  { v: "metades", t: "Meia a meia" },
  { v: "faixa", t: "Faixa no peito" },
  { v: "faixaV", t: "Faixa diagonal" },
  { v: "ombros", t: "Ombros destacados" },
  { v: "xadrez", t: "Xadrez" },
  { v: "degrade", t: "Degradê" },
  { v: "risca", t: "Riscas de giz" },
  { v: "central", t: "Faixa central" },
];
export const PADROES_CALCAO: { v: PadraoCalcao; t: string }[] = [
  { v: "solido", t: "Liso" },
  { v: "lateral", t: "Faixa lateral" },
  { v: "duasCores", t: "Bicolor" },
  { v: "listras", t: "Listras" },
];
export const PADROES_MEIAO: { v: PadraoMeiao; t: string }[] = [
  { v: "solido", t: "Liso" },
  { v: "faixaTopo", t: "Faixa no topo" },
  { v: "aneis", t: "Anéis" },
  { v: "listras", t: "Listras" },
];
export const GOLAS: { v: Gola; t: string }[] = [
  { v: "redonda", t: "Careca" },
  { v: "v", t: "Gola V" },
  { v: "polo", t: "Polo" },
  { v: "sem", t: "Sem gola" },
];
export const MANGAS: { v: Mangas; t: string }[] = [
  { v: "base", t: "Cor do corpo" },
  { v: "cor2", t: "Cor 2" },
  { v: "cor3", t: "Cor 3" },
  { v: "ponta", t: "Punho contrastante" },
];

export const PALETA = [
  "#e11d2e", "#b91c1c", "#7f1d1d", "#ea580c", "#f59e0b", "#fde047",
  "#22c55e", "#16a34a", "#166534", "#0f766e", "#0ea5e9", "#1d4ed8",
  "#1e3a8a", "#4c1d95", "#7c3aed", "#db2777", "#9d174d",
  "#ffffff", "#d4d4d8", "#71717a", "#27272a", "#0a0a0a",
];

export function contraste(hex: string): string {
  const c = (hex || "").replace("#", "");
  const s = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  if (s.length < 6) return "#ffffff";
  const r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111827" : "#ffffff";
}

export function camisaPadrao(cor1: string, cor2: string, cor3?: string): Camisa {
  return {
    padrao: "solido", cor1, cor2, cor3: cor3 || cor2,
    mangas: "base", gola: "redonda", corGola: cor2,
    corNumero: contraste(cor1), fonte: "padrao", nome: "", numEscala: 1,
  };
}
export function calcaoPadrao(cor1: string, cor2: string): Calcao {
  return { padrao: "solido", cor1, cor2 };
}
export function meiaoPadrao(cor1: string, cor2: string): Meiao {
  return { padrao: "solido", cor1, cor2 };
}
export function kitPadrao(cor1: string, cor2: string, cor3?: string): Kit {
  return { camisa: camisaPadrao(cor1, cor2, cor3), calcao: calcaoPadrao(cor1, cor2), meiao: meiaoPadrao(cor1, cor2) };
}

/** Kits padrão a partir das cores do clube (2 ou 3 hex). */
export function kitsPadrao(cores: string[]): Kits {
  const a = cores[0] || "#1e3a8a";
  const b = cores[1] || "#ffffff";
  const c = cores[2] || "";

  // casa: modelo padrão — corpo na cor 1, colarinho + punho na cor 2, número contrastante
  const casa: Kit = {
    camisa: { padrao: "solido", cor1: a, cor2: b, cor3: c || b, mangas: "base", gola: "redonda", corGola: b, corNumero: contraste(a), fonte: "padrao", nome: "", numEscala: 1 },
    calcao: { padrao: "solido", cor1: a, cor2: b },
    meiao: { padrao: "solido", cor1: a, cor2: b },
  };

  const fora: Kit = {
    camisa: { padrao: "solido", cor1: b, cor2: a, cor3: c || a, mangas: "base", gola: "redonda", corGola: a, corNumero: contraste(b), fonte: "padrao", nome: "", numEscala: 1 },
    calcao: { padrao: "solido", cor1: b, cor2: a },
    meiao: { padrao: "solido", cor1: b, cor2: a },
  };

  const terceiro = kitPadrao(c || "#0f172a", a, b);
  terceiro.camisa.padrao = "faixaV";

  const goleiro = kitPadrao("#111827", "#f59e0b", "#f59e0b");
  goleiro.calcao.cor1 = "#111827"; goleiro.meiao.cor1 = "#111827";
  goleiro.camisa.corNumero = "#f59e0b";

  return { casa, fora, terceiro, goleiro };
}

export const PRESETS: { nome: string; hint: string; aplicar: (c: Camisa) => Camisa }[] = [
  { nome: "Modelo padrão", hint: "liso + colarinho e punho", aplicar: (k) => ({ ...k, padrao: "solido", mangas: "base", gola: "redonda", corGola: k.cor2, corNumero: contraste(k.cor1) }) },
  { nome: "Tradicional listrado", hint: "listras + polo", aplicar: (k) => ({ ...k, padrao: "listras", mangas: "cor2", gola: "polo", corGola: k.cor2 }) },
  { nome: "Faixa diagonal", hint: "sash no peito", aplicar: (k) => ({ ...k, padrao: "faixaV", mangas: "base", gola: "v", corGola: k.cor2 }) },
  { nome: "Barras clássicas", hint: "aros horizontais", aplicar: (k) => ({ ...k, padrao: "barras", mangas: "cor2", gola: "redonda" }) },
  { nome: "Xadrez moderno", hint: "damas discretas", aplicar: (k) => ({ ...k, padrao: "xadrez", mangas: "base", gola: "sem" }) },
  { nome: "Degradê", hint: "cor1 → cor2", aplicar: (k) => ({ ...k, padrao: "degrade", mangas: "ponta", gola: "v", corGola: k.cor3 }) },
  { nome: "Riscas de giz", hint: "pinstripes", aplicar: (k) => ({ ...k, padrao: "risca", mangas: "base", gola: "polo", corGola: k.cor1 }) },
  { nome: "Peito partido", hint: "meia a meia", aplicar: (k) => ({ ...k, padrao: "metades", mangas: "cor2", gola: "redonda" }) },
  { nome: "Ombros fortes", hint: "yoke destacado", aplicar: (k) => ({ ...k, padrao: "ombros", mangas: "cor2", gola: "redonda", corGola: k.cor2 }) },
  { nome: "Minimalista", hint: "liso + punho", aplicar: (k) => ({ ...k, padrao: "solido", mangas: "ponta", gola: "v", corGola: k.cor3 }) },
  { nome: "Faixa central", hint: "trilho no meio", aplicar: (k) => ({ ...k, padrao: "central", mangas: "base", gola: "redonda" }) },
];

const hexOk = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : d);

function normalizarCamisa(raw: unknown, fb: Camisa): Camisa {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Camisa>;
  const padroesOk = PADROES_CAMISA.map((p) => p.v);
  const golasOk = GOLAS.map((g) => g.v);
  const mangasOk = MANGAS.map((m) => m.v);
  const fontesOk = FONTES.map((f) => f.v);
  return {
    padrao: padroesOk.includes(o.padrao as PadraoCamisa) ? (o.padrao as PadraoCamisa) : fb.padrao,
    cor1: hexOk(o.cor1, fb.cor1), cor2: hexOk(o.cor2, fb.cor2), cor3: hexOk(o.cor3, fb.cor3),
    mangas: mangasOk.includes(o.mangas as Mangas) ? (o.mangas as Mangas) : fb.mangas,
    gola: golasOk.includes(o.gola as Gola) ? (o.gola as Gola) : fb.gola,
    corGola: hexOk(o.corGola, fb.corGola),
    corNumero: hexOk(o.corNumero, fb.corNumero),
    fonte: fontesOk.includes(o.fonte as Fonte) ? (o.fonte as Fonte) : (fb.fonte ?? "padrao"),
    nome: typeof o.nome === "string" ? o.nome.slice(0, 14) : (fb.nome ?? ""),
    numEscala: typeof o.numEscala === "number" && isFinite(o.numEscala) ? Math.max(0.6, Math.min(1.6, o.numEscala)) : (fb.numEscala ?? 1),
  };
}
function normalizarCalcao(raw: unknown, fb: Calcao): Calcao {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Calcao>;
  const ok = PADROES_CALCAO.map((p) => p.v);
  return { padrao: ok.includes(o.padrao as PadraoCalcao) ? (o.padrao as PadraoCalcao) : fb.padrao, cor1: hexOk(o.cor1, fb.cor1), cor2: hexOk(o.cor2, fb.cor2) };
}
function normalizarMeiao(raw: unknown, fb: Meiao): Meiao {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Meiao>;
  const ok = PADROES_MEIAO.map((p) => p.v);
  return { padrao: ok.includes(o.padrao as PadraoMeiao) ? (o.padrao as PadraoMeiao) : fb.padrao, cor1: hexOk(o.cor1, fb.cor1), cor2: hexOk(o.cor2, fb.cor2) };
}
/** Sanitiza um kit vindo do storage (garante todos os campos, peça a peça). */
export function normalizarKit(raw: unknown, fb: Kit): Kit {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Kit>;
  return {
    camisa: normalizarCamisa(o.camisa, fb.camisa),
    calcao: normalizarCalcao(o.calcao, fb.calcao),
    meiao: normalizarMeiao(o.meiao, fb.meiao),
  };
}
