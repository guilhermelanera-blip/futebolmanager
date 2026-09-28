/* Camada de dados do protótipo.
 *
 * Hoje: lê `mock/estado.json`. O bloco `simulacao` traz a Temporada 1
 * inteira (380 partidas) já resolvida pelo motor; o "relógio" fica AQUI —
 * `rodadaAtual()` guarda até onde a temporada foi revelada (localStorage) e
 * `derivar()` recalcula tabela/artilharia/calendário para essa rodada.
 * Avançar a rodada é o pilar de "persistência viva" do projeto.
 *
 * Amanhã: cada método vira um fetch em /v1/... — as telas não mudam, só esta
 * camada. Por isso tudo é async e retorna o mesmo formato da API HTTP.
 */
import estadoRaw from "../mock/estado.json";
import type { Estado, LinhaTabela, SimClube, Jogador } from "./types";
import { kitsPadrao, normalizarKit, type Kit, type Kits, type TipoKit } from "../lib/uniforme";

const estado = estadoRaw as unknown as Estado;
const sim = estado.simulacao;

// ---------------------------------------------------------------- perfil (1º login)
const PERFIL = "fm.proto.perfil";
export interface Perfil {
  manager: string;
  clube: string;
  clubeCurto: string;
  cores: string[]; // 2 ou 3 hex
  estadio: string;
  cidade: string;
}
export function perfilSalvo(): Perfil | null {
  try {
    const o = JSON.parse(localStorage.getItem(PERFIL) || "null");
    return o && typeof o === "object" && o.clube ? (o as Perfil) : null;
  } catch {
    return null;
  }
}
export function temPerfil(): boolean {
  return !!perfilSalvo();
}
/** Sugestão inicial para o onboarding (clube atribuído). */
export function perfilPadrao(): Perfil {
  const c = estado.clube;
  const [a, b] = (c.cores || "#1c6b45/#ffffff").split("/");
  return {
    manager: "",
    clube: c.nome,
    clubeCurto: c.nomeCurto,
    cores: [a || "#1c6b45", b || "#ffffff"],
    estadio: `Estádio ${c.cidade}`,
    cidade: c.cidade,
  };
}
export function salvarPerfil(p: Perfil) {
  localStorage.setItem(PERFIL, JSON.stringify(p));
  aplicarPerfil();
  avisar();
}

// ---------------------------------------------------------------- escudo do clube (imagem enviada)
const ESCUDO = "fm.proto.escudo";
/** id do clube do jogador — para telas saberem qual escudo trocar. */
export const meuClubeId: string = sim.meuClubeId;
/** Data URL do escudo enviado pelo jogador, ou "". */
export function escudoSalvo(): string {
  try {
    const v = localStorage.getItem(ESCUDO);
    return v && v.startsWith("data:image/") ? v : "";
  } catch {
    return "";
  }
}
/** Grava (data URL PNG) ou remove (null) o escudo do clube. */
export function salvarEscudo(dataUrl: string | null) {
  if (dataUrl) localStorage.setItem(ESCUDO, dataUrl);
  else localStorage.removeItem(ESCUDO);
  avisar();
}
export function limparPerfil() {
  localStorage.removeItem(PERFIL);
  localStorage.removeItem("fm.proto.estadio");
  localStorage.removeItem("fm.proto.kits");
  localStorage.removeItem(PATROCINIOS);
  localStorage.removeItem("fm.proto.mercado");
  localStorage.removeItem("fm.proto.relogio");
  localStorage.removeItem("fm.proto.treino");
  localStorage.removeItem("fm.proto.rodada_live");
  localStorage.removeItem("fm.proto.admin");
  localStorage.removeItem("fm.proto.escudo");
  localStorage.removeItem("fm.proto.torcida");
}
export function managerNome(): string {
  return perfilSalvo()?.manager || "Você";
}

// ---------------------------------------------------------------- patrocínios de uniforme
// Marcas fictícias inspiradas no cenário BR (bets, bancos, fintech, telecom, varejo…).
// Nada de nome/marca real (R6/R7). Valor = cota anual base do peito; os outros
// espaços pagam uma fração (ver PATROCINIO_SLOTS).
const PATROCINIOS = "fm.proto.patrocinios";
export type CatPatro = "bet" | "banco" | "fintech" | "telecom" | "varejo" | "energia" | "seguro" | "bebida";
export interface Patrocinador {
  id: string;
  nome: string;
  cat: CatPatro;
  cor1: string;
  cor2: string;
  valorAno: number; // cota anual (peito)
  slogan: string;
}
/** Monograma de 2 letras para o "logo" da marca. */
export function iniciaisMarca(nome: string): string {
  const w = nome.replace(/[^A-Za-zÀ-ÿ ]/g, "").trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  return (w[0] || "?").slice(0, 2).toUpperCase();
}
export const CAT_PATRO: Record<CatPatro, string> = {
  bet: "Casa de apostas", banco: "Banco", fintech: "Fintech", telecom: "Telecom",
  varejo: "Varejo", energia: "Energia", seguro: "Seguros", bebida: "Bebidas",
};
export const PATROCINADORES: Patrocinador[] = [
  { id: "reibet", nome: "Reibet", cat: "bet", cor1: "#0b7d3b", cor2: "#ffe14d", valorAno: 25_000_000, slogan: "O rei do palpite" },
  { id: "golbet", nome: "GolBet", cat: "bet", cor1: "#101418", cor2: "#00e0a4", valorAno: 25_000_000, slogan: "Seu gol antes do jogo" },
  { id: "brasabet", nome: "BrasaBet", cat: "bet", cor1: "#c81e1e", cor2: "#ffca28", valorAno: 25_000_000, slogan: "Aposta que pega fogo" },
  { id: "sortegol", nome: "SorteGol", cat: "bet", cor1: "#1d4ed8", cor2: "#ffffff", valorAno: 25_000_000, slogan: "A sorte joga com você" },
  { id: "aposta21", nome: "Aposta21", cat: "bet", cor1: "#18122b", cor2: "#f43f8e", valorAno: 25_000_000, slogan: "21 é o número da vez" },
  { id: "betplacar", nome: "BetPlacar", cat: "bet", cor1: "#0f3d3e", cor2: "#7cf0d0", valorAno: 25_000_000, slogan: "Cravou o placar, levou" },
  { id: "mandabet", nome: "MandaBet", cat: "bet", cor1: "#e2571c", cor2: "#111111", valorAno: 25_000_000, slogan: "Manda ver" },
  { id: "banco-aurora", nome: "Banco Aurora", cat: "banco", cor1: "#0b3d91", cor2: "#f6c344", valorAno: 25_000_000, slogan: "Um novo dia pro seu dinheiro" },
  { id: "banco-ipe", nome: "Banco Ipê", cat: "banco", cor1: "#7a3ea1", cor2: "#ffd54a", valorAno: 25_000_000, slogan: "Raiz firme, futuro claro" },
  { id: "credito-sul", nome: "Crédito Sul", cat: "banco", cor1: "#0f5132", cor2: "#d7f0dd", valorAno: 25_000_000, slogan: "Crédito que joga junto" },
  { id: "pagrapido", nome: "PagRápido", cat: "fintech", cor1: "#111827", cor2: "#22d3ee", valorAno: 25_000_000, slogan: "Recebeu, caiu na hora" },
  { id: "cofre-digital", nome: "Cofre Digital", cat: "fintech", cor1: "#1e293b", cor2: "#a3e635", valorAno: 25_000_000, slogan: "Seu dinheiro trancado a 7 chaves" },
  { id: "telz", nome: "TelZ Telecom", cat: "telecom", cor1: "#5b21b6", cor2: "#ffffff", valorAno: 25_000_000, slogan: "Conexão de arquibancada" },
  { id: "velonet", nome: "VeloNet", cat: "telecom", cor1: "#083344", cor2: "#38bdf8", valorAno: 25_000_000, slogan: "Fibra na veia" },
  { id: "lojas-farol", nome: "Lojas Farol", cat: "varejo", cor1: "#b91c1c", cor2: "#fde68a", valorAno: 25_000_000, slogan: "Ilumina suas compras" },
  { id: "mercado-bom", nome: "Mercado Bom", cat: "varejo", cor1: "#166534", cor2: "#fef08a", valorAno: 25_000_000, slogan: "Do seu bairro pro Brasil" },
  { id: "vertex-energia", nome: "Vertex Energia", cat: "energia", cor1: "#0e7490", cor2: "#fde047", valorAno: 25_000_000, slogan: "Energia que não cai" },
  { id: "solbrasil", nome: "SolBrasil", cat: "energia", cor1: "#c2410c", cor2: "#ffedd5", valorAno: 25_000_000, slogan: "Do sol pra sua casa" },
  { id: "escudo-seguros", nome: "Escudo Seguros", cat: "seguro", cor1: "#1f2937", cor2: "#93c5fd", valorAno: 25_000_000, slogan: "Defesa em qualquer campo" },
  { id: "guarana-serra", nome: "Guaraná Serra", cat: "bebida", cor1: "#166534", cor2: "#facc15", valorAno: 25_000_000, slogan: "O gás da torcida" },
];
export const PATROCINIO_SLOTS = [
  { v: "camisa" as const, t: "Peito da camisa", mult: 1 },
  { v: "manga" as const, t: "Manga", mult: 0.34 },
  { v: "costas" as const, t: "Costas", mult: 0.5 },
  { v: "calcao" as const, t: "Calção", mult: 0.28 },
];
export type SlotPatro = (typeof PATROCINIO_SLOTS)[number]["v"];
export interface PatrociniosStore { camisa: string | null; manga: string | null; costas: string | null; calcao: string | null }
export function patrociniosSalvos(): PatrociniosStore {
  const base: PatrociniosStore = { camisa: null, manga: null, costas: null, calcao: null };
  try {
    const o = JSON.parse(localStorage.getItem(PATROCINIOS) || "{}");
    return { ...base, ...(o && typeof o === "object" ? o : {}) };
  } catch {
    return base;
  }
}
export function patrociniosOk(): boolean {
  const s = patrociniosSalvos();
  return !!(s.camisa && s.manga && s.costas && s.calcao);
}
export function salvarPatrocinios(s: PatrociniosStore) {
  localStorage.setItem(PATROCINIOS, JSON.stringify(s));
  cache = null;
  avisar();
}
export function patrociniosAtuais() {
  const s = patrociniosSalvos();
  const acordos = PATROCINIO_SLOTS.map((sl) => {
    const p = PATROCINADORES.find((x) => x.id === s[sl.v]) || null;
    return { slot: sl.v, slotT: sl.t, patrocinador: p, valorAno: p ? Math.round(p.valorAno * sl.mult) : 0 };
  });
  return { acordos, totalAno: acordos.reduce((t, a) => t + a.valorAno, 0) };
}

// Aplica o perfil ao estado em memória (nome/cores/cidade do clube do jogador).
const clubeBase = { ...estado.clube };
const elencoBase = estado.elenco.slice();
const simMeuBase = sim.clubes.find((c) => c.id === sim.meuClubeId);
const simMeuBaseCopy = simMeuBase ? { ...simMeuBase } : null;
function aplicarPerfil() {
  const p = perfilSalvo();
  const c = clubeBase;
  const s = simMeuBase;
  if (p) {
    const cores = p.cores.slice(0, 2).join("/");
    estado.clube = { ...c, nome: p.clube, nomeCurto: p.clubeCurto, cores, cidade: p.cidade };
    if (s && simMeuBaseCopy) {
      s.nome = p.clube; s.nomeCurto = p.clubeCurto; s.cores = cores; s.cidade = p.cidade;
    }
  } else {
    estado.clube = { ...c };
    if (s && simMeuBaseCopy) Object.assign(s, simMeuBaseCopy);
  }
  aplicarMercado();
  cache = null;
}

// ---------------------------------------------------------------- mercado / contratos
// Fluxo: proposta → clube responde (aceita / contraproposta / recusa) → o jogador
// vem fazer EXAMES MÉDICOS (falha em ~1 a cada 50) → assinatura → entra no elenco.
const MERCADO = "fm.proto.mercado";
export type FaseNeg =
  | "proposta" | "contraproposta" | "recusada"
  | "aceita" | "exames" | "aprovado" | "reprovado" | "assinado";
export interface ExameMedico {
  ok: boolean;
  fisico?: number;          // 1..10
  gordura?: string;         // "% "
  cardio?: string;
  imagem?: string;
  nota?: string;
  motivo?: string;          // quando reprovado
}
export interface Negociacao {
  id: string;
  alvoId: string;
  jogador: { nome: string; posicao: string; idade: number; overall: number };
  clube: { id: string; nome: string; nomeCurto: string; cores: string };
  valor: number;
  salarioSemanal: number;
  anos: number;
  status: FaseNeg;
  contra?: number;
  motivo?: string;
  criadaEm: string;
  exame: ExameMedico | null;
  jogadorFull?: Jogador;
}
interface MercadoStore { negs: Negociacao[]; gasto: number }
function mercadoStore(): MercadoStore {
  try {
    const o = JSON.parse(localStorage.getItem(MERCADO) || "{}");
    return { negs: Array.isArray(o.negs) ? o.negs : [], gasto: Number(o.gasto) || 0 };
  } catch {
    return { negs: [], gasto: 0 };
  }
}
function gravarMercado(s: MercadoStore) {
  localStorage.setItem(MERCADO, JSON.stringify(s));
  aplicarMercado();
  avisar();
}
/** Reflete contratações assinadas no elenco + caixa (idempotente). */
function aplicarMercado() {
  const s = mercadoStore();
  const assinados = s.negs.filter((n) => n.status === "assinado" && n.jogadorFull);
  const extras = assinados
    .map((n) => n.jogadorFull!)
    .filter((j, i, arr) => arr.findIndex((x) => x.id === j.id) === i && !elencoBase.some((e) => e.id === j.id));
  estado.elenco = [...elencoBase, ...extras];
  estado.clube = { ...estado.clube, saldoCaixa: clubeBase.saldoCaixa - s.gasto };
  cache = null;
}
function rngNeg(k: string) {
  let x = fnv1a(`${estado.seed}|mkt|${k}`) >>> 0;
  return () => { x = (x + 0x6d2b79f5) | 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function alvoDe(id: string) {
  return (estado.mercado.alvos as { id: string; nome: string; posicao: string; idade: number; overall: number; valor: number; tracos: string[]; clube: { id: string; nome: string; nomeCurto: string; cores: string } }[]).find((a) => a.id === id);
}
function jogadorDeAlvo(n: Negociacao): Jogador {
  const a = alvoDe(n.alvoId);
  const ovr = a?.overall ?? n.jogador.overall;
  const rr = rngNeg(n.id + "|attr");
  const at = (base: number) => Math.max(2, Math.min(20, Math.round(base + (rr() * 6 - 3))));
  return {
    id: `sign-${n.alvoId}`,
    nome: n.jogador.nome, apelido: "", nomeExibido: n.jogador.nome, numero: 0,
    posicao: n.jogador.posicao, idade: n.jogador.idade, overall: ovr,
    potencial: Math.min(20, ovr + 1 + Math.round(rr() * 3)),
    valor: n.valor,
    atributos: {
      finalizacao: at(ovr), passe: at(ovr), drible: at(ovr), cabeceio: at(ovr), cruzamento: at(ovr),
      marcacao: at(ovr), desarme: at(ovr), velocidade: at(ovr), resistencia: at(ovr), forca: at(ovr),
      visaoDeJogo: at(ovr), posicionamento: at(ovr), reflexos: at(ovr), saidaDeGol: at(ovr),
    },
    moral: 80, fadiga: 0, forma: 0, tracos: a?.tracos ?? [],
    salarioSemanal: n.salarioSemanal, contratoAnos: n.anos, golsNaTemporada: 0, lesionado: false, diasLesao: 0,
  };
}

export function salarioSugerido(valor: number): number {
  // ~0,9% do valor da transferência por semana, arredondado
  return Math.max(4000, Math.round((valor * 0.009) / 500) * 500);
}
/** Envia proposta de compra. O clube-alvo responde na hora (determinístico). */
export function proporCompra(alvoId: string, valor: number, salarioSemanal: number, anos: number): { ok: boolean; msg: string } {
  if (!estado.mercado.janelaAberta) return { ok: false, msg: "A janela de transferências está fechada." };
  const a = alvoDe(alvoId);
  if (!a) return { ok: false, msg: "Jogador não encontrado no mercado." };
  const s = mercadoStore();
  if (s.negs.some((n) => n.alvoId === alvoId && !["recusada", "reprovado"].includes(n.status)))
    return { ok: false, msg: "Já existe uma negociação em aberto por esse jogador." };
  if (valor > estado.clube.saldoCaixa - s.gasto) return { ok: false, msg: "Caixa insuficiente para essa proposta." };

  const R = rngNeg(`${alvoId}|${Math.round(valor)}`);
  const ratio = valor / Math.max(1, a.valor);
  let status: FaseNeg; let contra: number | undefined; let motivo: string | undefined;
  if (a.overall >= 17 && ratio < 1.6 && R() < 0.45) { status = "recusada"; motivo = `O ${a.clube.nomeCurto} considera ${a.nome} inegociável no momento.`; }
  else if (ratio >= 1.05) status = "aceita";
  else if (ratio >= 0.8) { status = "contraproposta"; contra = Math.round(a.valor * (1.08 + R() * 0.18)); }
  else { status = "recusada"; motivo = `Proposta muito abaixo do que o ${a.clube.nomeCurto} pede.`; }

  const neg: Negociacao = {
    id: `neg-${alvoId}-${Date.now().toString(36)}`,
    alvoId, jogador: { nome: a.nome, posicao: a.posicao, idade: a.idade, overall: a.overall },
    clube: a.clube, valor: Math.round(valor), salarioSemanal: Math.round(salarioSemanal), anos: Math.max(1, Math.min(5, anos)),
    status, contra, motivo, criadaEm: estado.hoje, exame: null,
  };
  gravarMercado({ ...s, negs: [neg, ...s.negs] });
  return {
    ok: true,
    msg: status === "aceita" ? `${a.clube.nomeCurto} aceitou! Chame ${a.nome} para os exames médicos.`
      : status === "contraproposta" ? `${a.clube.nomeCurto} pede ${dinheiroCurto(contra!)}.`
        : motivo || `${a.clube.nomeCurto} recusou a proposta.`,
  };
}
function atualizarNeg(id: string, patch: Partial<Negociacao>) {
  const s = mercadoStore();
  gravarMercado({ ...s, negs: s.negs.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
}
export function pagarContraproposta(id: string): { ok: boolean; msg: string } {
  const s = mercadoStore();
  const n = s.negs.find((x) => x.id === id);
  if (!n || n.status !== "contraproposta" || n.contra == null) return { ok: false, msg: "Negociação inválida." };
  if (n.contra > estado.clube.saldoCaixa - s.gasto) return { ok: false, msg: "Caixa insuficiente para pagar a contraproposta." };
  atualizarNeg(id, { valor: n.contra, status: "aceita" });
  return { ok: true, msg: `Acordo fechado com o ${n.clube.nomeCurto}. Chame ${n.jogador.nome} para os exames.` };
}
export function encerrarNeg(id: string): void {
  atualizarNeg(id, { status: "recusada", motivo: "Negociação encerrada por você." });
}
export function chamarParaExames(id: string): void {
  atualizarNeg(id, { status: "exames" });
}
export function realizarExames(id: string): ExameMedico {
  const s = mercadoStore();
  const n = s.negs.find((x) => x.id === id);
  if (!n || n.status !== "exames") return { ok: false, motivo: "Negociação inválida." };
  const R = rngNeg(n.id + "|exame");
  const reprovado = R() < 0.02; // ~1 a cada 50
  let exame: ExameMedico;
  if (reprovado) {
    exame = {
      ok: false,
      motivo: [
        "Ressonância aponta desgaste no menisco — risco alto para o departamento médico.",
        "Teste ergométrico com alteração cardíaca a investigar.",
        "Edema ósseo no tornozelo detectado no exame de imagem.",
        "Histórico de lesão muscular recorrente reprova o jogador nos critérios do clube.",
      ][Math.floor(R() * 4)],
    };
    atualizarNeg(id, { status: "reprovado", exame });
  } else {
    exame = {
      ok: true,
      fisico: 7 + Math.round(R() * 3),
      gordura: (7.5 + R() * 5).toFixed(1) + "%",
      cardio: "sem alterações",
      imagem: "sem lesões ativas",
      nota: "Apto sem restrições.",
    };
    atualizarNeg(id, { status: "aprovado", exame });
  }
  return exame;
}
export function assinarContrato(id: string): { ok: boolean; msg: string } {
  if (!estado.mercado.janelaAberta) return { ok: false, msg: "A janela de transferências está fechada." };
  const s = mercadoStore();
  const n = s.negs.find((x) => x.id === id);
  if (!n || n.status !== "aprovado") return { ok: false, msg: "O jogador ainda não foi aprovado nos exames." };
  if (n.valor > estado.clube.saldoCaixa - s.gasto) return { ok: false, msg: "Caixa insuficiente para pagar a transferência." };
  const jogadorFull = jogadorDeAlvo(n);
  gravarMercado({
    ...s, gasto: s.gasto + n.valor,
    negs: s.negs.map((x) => (x.id === id ? { ...x, status: "assinado" as FaseNeg, jogadorFull } : x)),
  });
  return { ok: true, msg: `${n.jogador.nome} assinou! Já faz parte do elenco.` };
}
export function negociacoes(): Negociacao[] {
  return mercadoStore().negs;
}
export function limparMercado(): void {
  localStorage.removeItem(MERCADO);
  aplicarMercado();
}
function dinheiroCurto(v: number): string {
  return v >= 1_000_000 ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
}

// ---------------------------------------------------------------- estádio (05 §1/§6)
const ESTADIO = "fm.proto.estadio";
/** Uma obra de ampliação: prazo de ~1 mês (4 rodadas) até ficar pronta. */
export interface Obra {
  lugares: number;
  custo: number;
  inicioRodada: number;
  fimRodada: number;
  prazo: string; // AAAA-MM-DD (referência de calendário, ~1 mês)
}
export const RODADAS_POR_MES = 4;
export interface EstadioStore {
  nome: string;
  extra: number;
  estilo: "simples" | "coberto" | "anel";
  forma: "retangular" | "oval";
  corArq: string;
  corTeto: string;
  corAcesso: string;
  gramado: string;
  obras: Obra[];
  naming: { patrocinador: string; nome: string; valorAno: number; ate: number } | null;
}
function estadioStore(): EstadioStore {
  const base: EstadioStore = { nome: "", extra: 0, estilo: "simples", forma: "retangular", corArq: "", corTeto: "", corAcesso: "", gramado: "faixas", obras: [], naming: null };
  try {
    const o = JSON.parse(localStorage.getItem(ESTADIO) || "{}");
    const merged = { ...base, ...(o && typeof o === "object" ? o : {}) };
    merged.obras = Array.isArray(merged.obras) ? merged.obras : [];
    return merged;
  } catch {
    return base;
  }
}
function prazoUmMes(): string {
  const d = new Date(estado.hoje + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
function gravarEstadio(s: EstadioStore) {
  localStorage.setItem(ESTADIO, JSON.stringify(s));
  avisar();
}
/** Ofertas fictícias de naming rights. */
export const NAMING_OFERTAS = [
  { patrocinador: "Vertex Energia", sufixo: "Vertex Arena", valorAno: 8_500_000 },
  { patrocinador: "Banco Aurora", sufixo: "Arena Aurora", valorAno: 12_000_000 },
  { patrocinador: "TelZ Telecom", sufixo: "TelZ Stadium", valorAno: 6_000_000 },
  { patrocinador: "Móveis Cordel", sufixo: "Arena Cordel", valorAno: 3_200_000 },
];
export const ESTADIO_ESTILOS = [
  { v: "simples", t: "Arquibancadas abertas", cap: 0 },
  { v: "coberto", t: "Setores cobertos", cap: 3000 },
  { v: "anel", t: "Anel superior completo", cap: 12000 },
] as const;

/** Teto rígido de capacidade — nenhum estádio passa disso. */
export const CAPACIDADE_MAX = 100_000;

// ---------------------------------------------------------------- clima (por rodada)
export type CondicaoClima = "limpo" | "parcial" | "nublado" | "garoa" | "chuva" | "tempestade";
export interface Clima {
  rodada: number;
  cond: CondicaoClima;
  rotulo: string;
  icone: string;
  tempC: number;
  sensacao: "frio" | "ameno" | "quente" | "calor intenso";
  periodo: "dia" | "noite";
  ventoKmh: number;
  gramado: "firme" | "úmido" | "pesado" | "encharcado";
  nota: string;
}
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngClima(rodada: number) {
  let x = fnv1a(`${estado.seed}|clima|${rodada}`) >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const CLIMA_META: Record<CondicaoClima, { rotulo: string; icone: string }> = {
  limpo: { rotulo: "Céu limpo", icone: "☀️" },
  parcial: { rotulo: "Sol entre nuvens", icone: "🌤️" },
  nublado: { rotulo: "Nublado", icone: "☁️" },
  garoa: { rotulo: "Garoa", icone: "🌦️" },
  chuva: { rotulo: "Chuva", icone: "🌧️" },
  tempestade: { rotulo: "Tempestade", icone: "⛈️" },
};
/** Clima determinístico da rodada (mesma rodada → mesmo clima, sempre). */
export function climaDaRodada(rodada: number): Clima {
  const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const R = rngClima(rodada);
  const total = estado.liga.totalRodadas || 38;
  // onda sazonal: começo de temporada mais frio, meio/fim mais quente
  const faseAno = Math.sin(((rodada / total) * 1.6 - 0.35) * Math.PI);
  const periodo: "dia" | "noite" = R() < 0.42 ? "noite" : "dia";
  let temp = 21 + faseAno * 8 + (R() * 10 - 5);
  if (periodo === "noite") temp -= 4 + R() * 4;
  temp = Math.round(cl(temp, 3, 39));

  const rr = R();
  let cond: CondicaoClima;
  if (rr < 0.46) cond = R() < 0.58 ? "limpo" : "parcial";
  else if (rr < 0.7) cond = "nublado";
  else if (rr < 0.84) cond = "garoa";
  else if (rr < 0.95) cond = "chuva";
  else cond = "tempestade";

  const ventoKmh = Math.round(4 + R() * (cond === "tempestade" ? 48 : cond === "chuva" ? 28 : 20));
  const sensacao = temp <= 12 ? "frio" : temp <= 24 ? "ameno" : temp <= 31 ? "quente" : "calor intenso";
  const gramado =
    cond === "tempestade" ? "encharcado" : cond === "chuva" ? "pesado" : cond === "garoa" ? "úmido" : "firme";

  const meta = CLIMA_META[cond];
  const noiteClara = periodo === "noite" && (cond === "limpo" || cond === "parcial");
  const rotulo = noiteClara ? "Noite limpa" : meta.rotulo;
  const icone = noiteClara ? "🌙" : meta.icone;

  const notas: string[] = [];
  if (cond === "tempestade") notas.push("gramado encharcado — bola trava nas poças");
  else if (cond === "chuva") notas.push("gramado pesado — passe corre menos");
  else if (cond === "garoa") notas.push("piso úmido — jogada rápida e escorregões");
  if (sensacao === "calor intenso") notas.push("calor castiga — ritmo cai no 2º tempo");
  else if (sensacao === "frio") notas.push("frio — jogo mais truncado");
  if (ventoKmh >= 34) notas.push("vento forte — bolas alçadas ficam imprevisíveis");
  if (periodo === "noite") notas.push("jogo sob os holofotes");

  return {
    rodada, cond, rotulo, icone, tempC: temp, sensacao, periodo, ventoKmh, gramado,
    nota: notas.join(" · ") || "condições normais para o jogo",
  };
}

export function estadioAtual() {
  const s = estadioStore();
  const p = perfilSalvo();
  const capBase = estado.clube.capacidadeEstadio;
  const bonusEstilo = ESTADIO_ESTILOS.find((e) => e.v === s.estilo)?.cap ?? 0;
  const extraMax = Math.max(0, CAPACIDADE_MAX - capBase - bonusEstilo);
  const nomeBase = s.nome || p?.estadio || `Estádio ${estado.clube.cidade}`;
  const [cc1, cc2] = (estado.clube.cores || "#1c6b45/#ffffff").split("/");

  // obras: cada uma leva ~1 mês (RODADAS_POR_MES rodadas) até concluir
  const r = rodadaAtual();
  const obras = Array.isArray(s.obras) ? s.obras : [];
  const concluidas = obras.filter((o) => r >= o.fimRodada);
  const pendentes = obras.filter((o) => r < o.fimRodada);
  const extraBruto = Math.max(0, s.extra || 0) + concluidas.reduce((t, o) => t + o.lugares, 0);
  const extraEfetivo = Math.max(0, Math.min(extraBruto, extraMax));
  const extraPendente = pendentes.reduce((t, o) => t + o.lugares, 0);
  const comprometido = Math.min(extraMax, extraEfetivo + extraPendente);
  const emObras = pendentes.length > 0;
  const mandoProvisorio = emObras ? `Estádio Municipal de ${estado.clube.cidade}` : null;

  // clima do próximo jogo em casa + previsão das próximas rodadas
  const proxCasa = derivar().proximos.find((j) => j.casa);
  const rodadaClima = proxCasa ? proxCasa.rodada : r + 1;
  const clima = climaDaRodada(rodadaClima);
  const previsao: Clima[] = [];
  for (let k = 0; k < 4; k++) {
    const rr2 = rodadaClima + k;
    if (rr2 <= (estado.liga.totalRodadas || 38)) previsao.push(climaDaRodada(rr2));
  }

  return {
    nome: s.naming ? s.naming.nome : nomeBase,
    nomeProprio: nomeBase,
    naming: s.naming,
    estilo: s.estilo,
    forma: s.forma,
    corArq: s.corArq || cc1 || "#1c6b45",
    corTeto: s.corTeto || "#b4b9c1",
    corAcesso: s.corAcesso || "#9c9c97",
    gramado: s.gramado || "faixas",
    capacidade: Math.min(CAPACIDADE_MAX, capBase + bonusEstilo + extraEfetivo),
    capacidadeComObras: Math.min(CAPACIDADE_MAX, capBase + bonusEstilo + comprometido),
    capacidadeBase: capBase,
    capacidadeMax: CAPACIDADE_MAX,
    bonusEstilo,
    extra: extraEfetivo,
    extraMax,
    comprometido,
    emObras,
    mandoProvisorio,
    obras: pendentes
      .slice()
      .sort((x, y) => x.fimRodada - y.fimRodada)
      .map((o) => ({ lugares: o.lugares, custo: o.custo, prazo: o.prazo, faltamRodadas: Math.max(0, o.fimRodada - r) })),
    clima,
    previsao,
    clubeCores: estado.clube.cores,
    corClube2: cc2 || "#ffffff",
  };
}
export function renomearEstadio(nome: string) {
  gravarEstadio({ ...estadioStore(), nome: nome.trim().slice(0, 48) });
}
export function definirEstiloEstadio(v: EstadioStore["estilo"]) {
  gravarEstadio({ ...estadioStore(), estilo: v });
}
export function definirFormaEstadio(v: EstadioStore["forma"]) {
  gravarEstadio({ ...estadioStore(), forma: v });
}
export function definirCorArquibancada(hex: string) {
  gravarEstadio({ ...estadioStore(), corArq: hex });
}
export function definirCorCobertura(hex: string) {
  gravarEstadio({ ...estadioStore(), corTeto: hex });
}
export function definirCorAcesso(hex: string) {
  gravarEstadio({ ...estadioStore(), corAcesso: hex });
}
export function definirGramado(v: string) {
  gravarEstadio({ ...estadioStore(), gramado: v });
}
export function expandirEstadio(lugares: number, custo = 0) {
  const cur = estadioAtual();
  const add = Math.min(lugares, Math.max(0, cur.extraMax - cur.comprometido));
  if (add <= 0) return;
  const r = rodadaAtual();
  const s = estadioStore();
  const obra: Obra = { lugares: add, custo, inicioRodada: r, fimRodada: r + RODADAS_POR_MES, prazo: prazoUmMes() };
  gravarEstadio({ ...s, obras: [...(Array.isArray(s.obras) ? s.obras : []), obra] });
}
export function aplicarNaming(o: (typeof NAMING_OFERTAS)[number]) {
  gravarEstadio({
    ...estadioStore(),
    naming: { patrocinador: o.patrocinador, nome: o.sufixo, valorAno: o.valorAno, ate: 2029 },
  });
}
export function encerrarNaming() {
  gravarEstadio({ ...estadioStore(), naming: null });
}


export type {
  Estado, ClubeInfo, LinhaTabela, Jogador, Financas, Alvo, Noticia,
  Escalacao, PartidaDetalhe, EventoSumula,
} from "./types";

/** Instantâneo do estado, tipado — para telas que só precisam ler valores fixos. */
export const snapshot: Estado = estado;

const LAT = 170;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function ok<T>(data: T): Promise<T> {
  await sleep(LAT + Math.random() * 110);
  return JSON.parse(JSON.stringify(data)) as T;
}

const SESSAO = "fm.proto.sessao";
const RODADA = "fm.proto.rodada";
const XI = "fm.proto.xi";
const APELIDOS = "fm.proto.apelidos";

// ---------------------------------------------------------------- apelidos (persistidos)
function apelidosSalvos(): Record<string, string> {
  try {
    const o = JSON.parse(localStorage.getItem(APELIDOS) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
/** Define (ou remove, se vazio) o apelido de um jogador. */
export function salvarApelido(id: string, apelido: string) {
  const o = apelidosSalvos();
  const v = apelido.trim();
  if (v) o[id] = v.slice(0, 24);
  else delete o[id];
  localStorage.setItem(APELIDOS, JSON.stringify(o));
  avisar();
}

/** Nome a exibir de um jogador do elenco (apelido ou nome), ou null. Síncrono. */
export function nomeJogadorExibido(id: string): string | null {
  const j = estado.elenco.find((x) => x.id === id);
  if (!j) return null;
  return apelidosSalvos()[id] || j.nome;
}
/** id de um jogador do MEU elenco a partir do nome/apelido exibido, ou null. */
export function jogadorIdPorNome(nome: string): string | null {
  if (!nome) return null;
  const ap = apelidosSalvos();
  const j = estado.elenco.find((x) => x.nome === nome || (ap[x.id] || "") === nome);
  return j ? j.id : null;
}

// ---------------------------------------------------------------- números de camisa
const NUMEROS = "fm.proto.numeros";

function numerosManuais(): Record<string, number> {
  try {
    const o = JSON.parse(localStorage.getItem(NUMEROS) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
export function salvarNumero(id: string, n: number) {
  const o = numerosManuais();
  if (n >= 1 && n <= 99) o[id] = Math.round(n);
  else delete o[id];
  localStorage.setItem(NUMEROS, JSON.stringify(o));
  avisar();
}

/** Numeração padrão do elenco (04 / convenção): GK 1/12/22; ZAG 4,3; LAT 2,6;
 *  meio pra frente 10,5,8,7,11,9; o resto preenche até 25. Manual sobrepõe. */
function calcularNumeros(): Map<string, number> {
  const manual = numerosManuais();
  const num = new Map<string, number>();
  const usados = new Set<number>();
  const porOvr = (a: { overall: number }, b: { overall: number }) => b.overall - a.overall;
  const grupo = (preds: string[]) => estado.elenco.filter((j) => preds.includes(j.posicao)).sort(porOvr);

  const atribui = (ids: { id: string }[], pool: number[]) => {
    let k = 0;
    for (const j of ids) {
      if (manual[j.id]) continue; // resolvido depois
      while (k < pool.length && usados.has(pool[k])) k++;
      if (k < pool.length) { num.set(j.id, pool[k]); usados.add(pool[k]); k++; }
    }
  };

  atribui(grupo(["GOLEIRO"]), [1, 12, 22]);
  atribui(grupo(["ZAGUEIRO"]).slice(0, 2), [4, 3]);
  atribui(grupo(["LATERAL"]).slice(0, 2), [2, 6]);
  atribui(grupo(["VOLANTE", "MEIA", "PONTA", "ATACANTE"]).slice(0, 6), [10, 5, 8, 7, 11, 9]);

  // o resto (por overall) preenche os números livres até 25, depois 26+
  const resto = [...estado.elenco].sort(porOvr).filter((j) => !num.has(j.id) && !manual[j.id]);
  const livres: number[] = [];
  for (let n = 1; n <= 99 && livres.length < resto.length; n++) if (!usados.has(n)) livres.push(n);
  resto.forEach((j, i) => { if (livres[i]) { num.set(j.id, livres[i]); usados.add(livres[i]); } });

  // aplica os manuais por cima
  for (const j of estado.elenco) if (manual[j.id]) num.set(j.id, manual[j.id]);
  return num;
}
export function numeroDe(id: string): number {
  return calcularNumeros().get(id) ?? 0;
}
export function numeroManual(id: string): number {
  return numerosManuais()[id] ?? 0;
}

// ---------------------------------------------------------------- uniformes (05 §1)
// Editáveis 1x por temporada, no começo. Ao confirmar, trava até a virada.
const KITS = "fm.proto.kits";
/** Temporada da liga no protótipo (o mundo fica na T1). */
export const TEMPORADA_ATUAL = 1;
export interface KitsStore { temporada: number; travado: boolean; kits: Kits }

function coresClube(): string[] {
  return (estado.clube.cores || "#1e3a8a/#ffffff").split("/").filter(Boolean);
}
function kitsStore(): KitsStore {
  const base = kitsPadrao(coresClube());
  let raw: unknown = null;
  try { raw = JSON.parse(localStorage.getItem(KITS) || "null"); } catch { raw = null; }
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<KitsStore>;
  const k = (o.kits && typeof o.kits === "object" ? o.kits : {}) as Partial<Kits>;
  const kits: Kits = {
    casa: normalizarKit(k.casa, base.casa),
    fora: normalizarKit(k.fora, base.fora),
    terceiro: normalizarKit(k.terceiro, base.terceiro),
    goleiro: normalizarKit(k.goleiro, base.goleiro),
  };
  const temporada = typeof o.temporada === "number" ? o.temporada : TEMPORADA_ATUAL;
  // virou a temporada -> destrava
  const travado = temporada === TEMPORADA_ATUAL ? o.travado === true : false;
  return { temporada: TEMPORADA_ATUAL, travado, kits };
}
function gravarKits(s: KitsStore) {
  localStorage.setItem(KITS, JSON.stringify(s));
  // as cores do clube passam a vir do uniforme de casa (reflete em tudo)
  const p = perfilSalvo();
  if (p) {
    const cm = s.kits.casa.camisa;
    const novas = [cm.cor1, cm.cor2, cm.cor3].filter((c, i, a) => c && a.indexOf(c) === i).slice(0, 3);
    if (novas.join("/") !== p.cores.join("/")) {
      localStorage.setItem(PERFIL, JSON.stringify({ ...p, cores: novas }));
      aplicarPerfil();
    }
  }
  cache = null;
  avisar();
}
export function kitsSalvos(): KitsStore { return kitsStore(); }
export function kitAtual(tipo: TipoKit): Kit { return kitsStore().kits[tipo]; }
export function podeEditarKits(): boolean { return !kitsStore().travado; }
/** Salva o rascunho dos uniformes (segue editável). */
export function salvarKits(kits: Kits) {
  const s = kitsStore();
  gravarKits({ ...s, kits });
}
/** Confirma os uniformes da temporada — trava a edição até a virada. */
export function confirmarKitsTemporada(kits: Kits) {
  gravarKits({ temporada: TEMPORADA_ATUAL, travado: true, kits });
}
/** Reabre a edição (só protótipo / "refazer configuração"). */
export function destravarKits() {
  const s = kitsStore();
  gravarKits({ ...s, travado: false });
}

// ---------------------------------------------------------------- táticas (persistidas)
const POSTURA = "fm.proto.postura";
const TATICAS_JOG = "fm.proto.taticas_jog";

export function posturaSalva(): string {
  const v = localStorage.getItem(POSTURA);
  return v === "DEFENSIVA" || v === "OFENSIVA" ? v : "EQUILIBRADA";
}
export function salvarPostura(p: string) {
  localStorage.setItem(POSTURA, p);
  avisar();
}
function taticasJogSalvas(): Record<string, string> {
  try {
    const o = JSON.parse(localStorage.getItem(TATICAS_JOG) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
export function taticaJogador(id: string): string {
  return taticasJogSalvas()[id] ?? "";
}
export function salvarTaticaJogador(id: string, opcao: string) {
  const o = taticasJogSalvas();
  o[id] = opcao;
  localStorage.setItem(TATICAS_JOG, JSON.stringify(o));
  avisar();
}
/** Acrescenta a um jogador do elenco: `apelido`, `nomeExibido` e `numero`. */
function comApelido<T extends { id: string; nome: string }>(j: T): T & { apelido: string; nomeExibido: string; numero: number } {
  const ap = apelidosSalvos()[j.id] ?? "";
  return { ...j, apelido: ap, nomeExibido: ap || j.nome, numero: numeroDe(j.id) };
}

// ---------------------------------------------------------------- escalação (persistida)
export const FORMACAO_LINHAS = [
  { faixa: "Goleiro", n: 1 },
  { faixa: "Defesa", n: 4 },
  { faixa: "Meio", n: 3 },
  { faixa: "Ataque", n: 3 },
] as const;

const idsElenco = new Set(estado.elenco.map((j) => j.id));

/** Craque = maior overall do elenco. */
export const craqueId = [...estado.elenco].sort((a, b) => b.overall - a.overall)[0]?.id ?? "";

function xiSalvo(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(XI) || "null");
    if (Array.isArray(raw) && raw.length === 11 && raw.every((id) => idsElenco.has(id)) && new Set(raw).size === 11) {
      return raw;
    }
  } catch {
    /* ignora */
  }
  return estado.escalacao.titulares.slice(0, 11);
}
function salvarXi(ids: string[]) {
  if (ids.length === 11 && ids.every((id) => idsElenco.has(id)) && new Set(ids).size === 11) {
    localStorage.setItem(XI, JSON.stringify(ids));
  }
}

// ---------------------------------------------------------------- o relógio
// A temporada fica fixa na rodada inicial. Dá pra AGENDAR o próximo jogo para
// um horário real: no horário ele entra AO VIVO (partida 2D de ~7 min); ao
// terminar (assistido ou pulado), a rodada é revelada — tabela/artilharia/
// súmula recalculadas, como faria o servidor.
const JOGO = "fm.proto.jogo";
const JOGO_FIM = "fm.proto.jogo_fim";
/** Rodada mais alta que o usuário já disputou ao vivo (persistida). */
const RODADA_LIVE = "fm.proto.rodada_live";
function rodadaLiveSalva(): number {
  const n = Number(localStorage.getItem(RODADA_LIVE) || 0);
  return Number.isFinite(n) ? n : 0;
}
/** Duração da partida ao vivo (tempo real comprimido). */
export const LIVE_DURACAO_MS = 7 * 60 * 1000;

export interface JogoAgendado { rodada: number; kickoff: string }
export function jogoAgendado(): JogoAgendado | null {
  try {
    const o = JSON.parse(localStorage.getItem(JOGO) || "null");
    return o && typeof o.rodada === "number" && typeof o.kickoff === "string" ? o : null;
  } catch {
    return null;
  }
}
/** Agenda uma rodada do clube para um horário (ISO). Por padrão, a próxima. */
export function agendarJogo(kickoffISO: string, rodada?: number) {
  const prox = Math.min(sim.totalRodadas, Math.max(sim.rodadaInicial + 1, rodada ?? rodadaAtual() + 1));
  localStorage.setItem(JOGO, JSON.stringify({ rodada: prox, kickoff: kickoffISO }));
  localStorage.removeItem(JOGO_FIM);
  cache = null;
  avisar();
}
export function cancelarJogo() {
  localStorage.removeItem(JOGO);
  localStorage.removeItem(JOGO_FIM);
  cache = null;
  avisar();
}
const kickoffMs = () => {
  const j = jogoAgendado();
  return j ? new Date(j.kickoff).getTime() : Infinity;
};
/** O horário do jogo agendado já chegou? */
export function jogoComecou(): boolean {
  return !!jogoAgendado() && Date.now() >= kickoffMs();
}
/** Partida acontecendo agora (horário chegou, ainda não encerrou). */
export function jogoAoVivo(): boolean {
  return jogoComecou() && !jogoEncerrado();
}
/** Partida já terminou: playback concluído/pulado, ou passou a janela dos 7 min. */
export function jogoEncerrado(): boolean {
  if (!jogoComecou()) return false;
  if (localStorage.getItem(JOGO_FIM)) return true;
  return Date.now() >= kickoffMs() + LIVE_DURACAO_MS;
}
/** Marca a partida ao vivo como concluída (fim do 2D ou "pular"). */
export function finalizarJogoAoVivo() {
  localStorage.setItem(JOGO_FIM, String(Date.now()));
  const j = jogoAgendado();
  if (j) localStorage.setItem(RODADA_LIVE, String(Math.max(rodadaLiveSalva(), j.rodada)));
  cache = null;
  avisar();
}

function rodadaAtual(): number {
  let r = Math.max(sim.rodadaInicial, rodadaLiveSalva());
  if (jogoEncerrado()) {
    const j = jogoAgendado();
    if (j) r = Math.max(r, j.rodada);
  }
  return Math.min(sim.totalRodadas, r);
}
function setRodada(r: number) {
  localStorage.setItem(RODADA, String(Math.max(sim.rodadaInicial, Math.min(sim.totalRodadas, r))));
}

const clubeSim = new Map<string, SimClube>(sim.clubes.map((c) => [c.id, c]));
const resumo = (id: string) => {
  const c = clubeSim.get(id)!;
  return { id: c.id, nome: c.nome, nomeCurto: c.nomeCurto, cidade: c.cidade, cores: c.cores };
};

/** Aplica o perfil (nome/cores) a um clube-resumo se for o do jogador. */
function personalizarClube<T extends { id?: string; nome?: string; nomeCurto?: string; cores?: string }>(c: T): T {
  if (!c || c.id !== sim.meuClubeId) return c;
  return { ...c, nome: estado.clube.nome, nomeCurto: estado.clube.nomeCurto, cores: estado.clube.cores };
}

// ---------------------------------------------------------------- derivação por rodada
interface Derivado {
  rodada: number;
  linhas: LinhaTabela[];
  minhaLinha: LinhaTabela;
  forma: string;
  proximos: JogoDoClube[];
  ultimos: JogoDoClube[];
  todos: JogoGrade[];
  artilharia: { nome: string; clube: string; clubeId: string; posicao: string; gols: number }[];
  golsPorJogadorMeu: Map<string, number>;
}
interface JogoDoClube {
  rodada: number; data: string; casa: boolean; competicao: string;
  adversario: ReturnType<typeof resumo>;
  golsPro: number | null; golsContra: number | null; resultado: "V" | "E" | "D" | null;
}
interface JogoGrade {
  rodada: number; data: string;
  mandante: ReturnType<typeof resumo>; visitante: ReturnType<typeof resumo>;
  golsMandante: number | null; golsVisitante: number | null; envolveVoce: boolean;
}

let cache: Derivado | null = null;

function derivar(): Derivado {
  const r = rodadaAtual();
  if (cache && cache.rodada === r) return cache;

  const MEU = sim.meuClubeId;
  const jogadas = sim.partidas.filter((p) => p.rodada <= r);

  // tabela
  type Ac = { id: string; j: number; v: number; e: number; d: number; gp: number; gc: number; pts: number };
  const acc = new Map<string, Ac>(
    sim.clubes.map((c) => [c.id, { id: c.id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }])
  );
  for (const p of jogadas) {
    const m = acc.get(p.mandanteId)!, vis = acc.get(p.visitanteId)!;
    m.j++; vis.j++;
    m.gp += p.golsMandante; m.gc += p.golsVisitante;
    vis.gp += p.golsVisitante; vis.gc += p.golsMandante;
    if (p.golsMandante > p.golsVisitante) { m.v++; m.pts += 3; vis.d++; }
    else if (p.golsMandante < p.golsVisitante) { vis.v++; vis.pts += 3; m.d++; }
    else { m.e++; vis.e++; m.pts++; vis.pts++; }
  }
  const linhas: LinhaTabela[] = [...acc.values()]
    .sort((a, b) => b.pts - a.pts || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp)
    .map((a, i) => {
      const c = clubeSim.get(a.id)!;
      return {
        posicao: i + 1, id: a.id, nome: c.nome, nomeCurto: c.nomeCurto, cidade: c.cidade, cores: c.cores, arquetipo: c.arquetipo,
        jogos: a.j, vitorias: a.v, empates: a.e, derrotas: a.d,
        golsPro: a.gp, golsContra: a.gc, saldo: a.gp - a.gc, pontos: a.pts,
        ehVoce: a.id === MEU,
      };
    });
  const minhaLinha = linhas.find((l) => l.ehVoce)!;

  // jogos do meu clube
  const meus = sim.partidas
    .filter((p) => p.mandanteId === MEU || p.visitanteId === MEU)
    .sort((a, b) => a.rodada - b.rodada)
    .map((p): JogoDoClube => {
      const casa = p.mandanteId === MEU;
      const advId = casa ? p.visitanteId : p.mandanteId;
      const feito = p.rodada <= r;
      const gp = feito ? (casa ? p.golsMandante : p.golsVisitante) : null;
      const gc = feito ? (casa ? p.golsVisitante : p.golsMandante) : null;
      return {
        rodada: p.rodada, data: p.data, casa, competicao: "LIGA_NACIONAL",
        adversario: resumo(advId),
        golsPro: gp, golsContra: gc,
        resultado: gp == null ? null : gp > gc! ? "V" : gp < gc! ? "D" : "E",
      };
    });
  const ultimos = meus.filter((p) => p.resultado).slice(-6);
  const proximos = meus.filter((p) => !p.resultado).slice(0, 5);
  const forma = ultimos.map((p) => p.resultado).join("");

  // grade completa
  const todos = sim.partidas.map((p): JogoGrade => ({
    rodada: p.rodada, data: p.data,
    mandante: resumo(p.mandanteId), visitante: resumo(p.visitanteId),
    golsMandante: p.rodada <= r ? p.golsMandante : null,
    golsVisitante: p.rodada <= r ? p.golsVisitante : null,
    envolveVoce: p.mandanteId === MEU || p.visitanteId === MEU,
  }));

  // artilharia
  const gm = new Map<string, { nome: string; clube: string; clubeId: string; posicao: string; gols: number }>();
  for (const g of sim.gols) {
    if (g.rodada > r) continue;
    const k = `${g.clubeId}:${g.jogador}`;
    const cur = gm.get(k) ?? { nome: g.jogador, clube: clubeSim.get(g.clubeId)!.nomeCurto, clubeId: g.clubeId, posicao: g.posicao, gols: 0 };
    cur.gols++; gm.set(k, cur);
  }
  const artilharia = [...gm.values()].sort((a, b) => b.gols - a.gols).slice(0, 15);
  const golsPorJogadorMeu = new Map<string, number>(
    [...gm.values()].filter((x) => x.clubeId === MEU).map((x) => [x.nome, x.gols])
  );

  cache = { rodada: r, linhas, minhaLinha, forma, proximos, ultimos, todos, artilharia, golsPorJogadorMeu };
  return cache;
}

/** Clube do jogador, com posição/pontos/forma da rodada atual. */
function meuClubeVivo() {
  const d = derivar();
  return {
    ...estado.clube,
    posicao: d.minhaLinha.posicao,
    pontos: d.minhaLinha.pontos,
    forma: d.forma,
    lesionados: estado.elenco.filter((j) => j.lesionado).length,
  };
}

export const api = {
  // ---- conta ----------------------------------------------------------------
  async login(email: string, senha: string) {
    await sleep(LAT + 200);
    if (!email.trim()) {
      throw new Error("Informe um e-mail para entrar.");
    }
    void senha; // protótipo: sem servidor de contas, qualquer senha serve
    sessionStorage.setItem(SESSAO, JSON.stringify({ email, desde: Date.now() }));
    return { conta: estado.conta, clube: { id: estado.clube.id, nome: estado.clube.nome } };
  },
  logado: () => !!sessionStorage.getItem(SESSAO),
  logout: () => sessionStorage.removeItem(SESSAO),

  // ---- relógio da temporada ------------------------------------------------
  temporada() {
    const r = rodadaAtual();
    return { rodada: r, proxima: Math.min(sim.totalRodadas, r + 1), total: sim.totalRodadas, terminou: r >= sim.totalRodadas };
  },
  async avancarRodada() {
    const atual = rodadaAtual();
    if (atual >= sim.totalRodadas) throw new Error("A temporada já terminou.");
    const nova = atual + 1;
    setRodada(nova);
    cache = null;
    avisar();
    await sleep(520); // "simulando a rodada…"
    const d = derivar();
    const meuJogo = d.ultimos.find((p) => p.rodada === nova) ?? null;
    const rodadaJogos = sim.partidas
      .filter((p) => p.rodada === nova)
      .map((p) => ({
        mandante: resumo(p.mandanteId), visitante: resumo(p.visitanteId),
        golsMandante: p.golsMandante, golsVisitante: p.golsVisitante,
        envolveVoce: p.mandanteId === sim.meuClubeId || p.visitanteId === sim.meuClubeId,
      }));
    return {
      rodada: nova, total: sim.totalRodadas,
      meuJogo,
      minhaPosicao: d.minhaLinha.posicao,
      jogos: rodadaJogos,
      terminou: nova >= sim.totalRodadas,
    };
  },
  reiniciarTemporada() {
    localStorage.removeItem(RODADA);
    localStorage.removeItem(RODADA_LIVE);
    localStorage.removeItem("fm.proto.relogio");
    localStorage.removeItem(JOGO);
    localStorage.removeItem(JOGO_FIM);
    cache = null;
    avisar();
  },

  // ---- painel / dashboard -------------------------------------------------
  async dashboard() {
    const d = derivar();
    const t = this.temporada();
    const clube = meuClubeVivo();
    return ok({
      hoje: estado.hoje,
      liga: { ...estado.liga, rodadaAtual: t.rodada },
      temporada: t,
      clube,
      proximo: d.proximos[0] ?? null,
      ultimos: d.ultimos,
      miniTabela: recorte(d.linhas, clube.posicao),
      alertas: montarAlertas(),
      noticias: montarNoticias(d),
      artilheiroClube: [...d.golsPorJogadorMeu.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([nome, gols]) => ({ nome, golsNaTemporada: gols }))[0] ?? null,
      termometro: (() => {
        const tr = montarTorcida();
        return { valor: tr.valor, banda: tr.banda.rot, cor: tr.banda.cor, pressao: tr.pressao, cadeira: tr.cadeira.rot };
      })(),
    });
  },

  // ---- elenco -----------------------------------------------------------
  async elenco() {
    const d = derivar();
    const jogadores = estado.elenco.map((j) => comApelido({
      ...j,
      golsNaTemporada: d.golsPorJogadorMeu.get(j.nome) ?? 0,
    }));
    return ok({
      clube: meuClubeVivo(),
      jogadores,
      craqueId,
      xi: xiSalvo(),
      formacao: FORMACAO_LINHAS.map((l) => ({ ...l })),
    });
  },

  // ---- jogador (detalhe) ------------------------------------------------
  async jogador(id: string) {
    const d = derivar();
    const base = estado.elenco.find((j) => j.id === id);
    if (!base) throw new Error("Jogador não encontrado.");
    const j = comApelido({ ...base, golsNaTemporada: d.golsPorJogadorMeu.get(base.nome) ?? 0 });
    const noXI = xiSalvo().includes(id);
    const rankOVR =
      [...estado.elenco].sort((a, b) => b.overall - a.overall).findIndex((x) => x.id === id) + 1;
    const naPosicao = [...estado.elenco]
      .filter((x) => x.posicao === base.posicao)
      .sort((a, b) => b.overall - a.overall)
      .findIndex((x) => x.id === id) + 1;
    return ok({
      clube: meuClubeVivo(),
      jogador: j,
      craque: id === craqueId,
      noXI,
      rankOVR,
      totalElenco: estado.elenco.length,
      naPosicao,
    });
  },

  /** Salva o XI (11 ids na ordem GK, defesa, meio, ataque). */
  async salvarEscalacao(ids: string[]) {
    salvarXi(ids);
    return ok({ ok: true, xi: xiSalvo() });
  },
  escalacaoAutomatica(): string[] {
    localStorage.removeItem(XI);
    return xiSalvo();
  },

  // ---- tática do time (modal) -------------------------------------
  async taticaTime() {
    const d = derivar();
    return ok({
      formacao: "4-3-3",
      postura: posturaSalva(),
      proximo: d.proximos[0] ?? null,
      lesionados: estado.elenco.filter((j) => j.lesionado).length,
      tamanhoXI: xiSalvo().length,
    });
  },

  // ---- súmula de uma partida ---------------------------------------
  async partida(rodada: number) {
    const p = estado.partidasDetalhe.find((x) => x.rodada === rodada);
    if (!p) throw new Error("Partida não encontrada.");
    const disponivel = rodada <= rodadaAtual();
    return ok({
      ...p,
      mandante: personalizarClube(p.mandante), visitante: personalizarClube(p.visitante),
      adversario: personalizarClube(p.adversario),
      jogada: disponivel && p.jogada,
      clima: climaDaRodada(rodada),
    });
  },

  /** Detalhe da partida ao vivo (independe da rodada estar revelada). */
  async partidaAoVivo() {
    const j = jogoAgendado();
    if (!j) throw new Error("Nenhum jogo agendado.");
    const p = estado.partidasDetalhe.find((x) => x.rodada === j.rodada);
    if (!p) throw new Error("Partida não encontrada.");
    const porId = new Map(estado.elenco.map((x) => [x.id, comApelido(x)]));
    const xi = xiSalvo().map((id) => porId.get(id)).filter(Boolean);
    const meuXI = xi.map((x) => ({ nome: x!.nomeExibido, numero: x!.numero, posicao: x!.posicao }));

    // ---- inteligência do motor: força de cada time pela tabela + rosters p/ narração
    const linhas = derivar().linhas;
    const mId = p.mandante.id, vId = p.visitante.id;
    const forcaDe = (id: string) => {
      const l = linhas.find((x) => x.id === id);
      if (!l || l.jogos < 2) return 0.5;
      const ppg = l.pontos / l.jogos;                 // 0..3
      const gd = (l.golsPro - l.golsContra) / l.jogos; // ~ -3..3
      return Math.max(0.12, Math.min(0.9, 0.5 + (ppg - 1.4) * 0.16 + gd * 0.06));
    };
    const meuEhMandante = mId === sim.meuClubeId;
    const roleBucket = (pos: string): "def" | "mid" | "atk" => {
      const s = (pos || "").toUpperCase();
      if (s.includes("ATAC") || s.includes("PONTA") || s.includes("CENTRO")) return "atk";
      if (s.includes("MEIA") || s.includes("VOLANTE") || s.includes("MEIO")) return "mid";
      return "def";
    };
    const rosterMeu = () => {
      const b: { gk: string[]; def: string[]; mid: string[]; atk: string[] } = { gk: [], def: [], mid: [], atk: [] };
      for (const x of meuXI) {
        if ((x.posicao || "").toUpperCase().includes("GOL")) b.gk.push(x.nome);
        else b[roleBucket(x.posicao)].push(x.nome);
      }
      return b;
    };
    const rosterAdv = (id: string) => {
      const b: { gk: string[]; def: string[]; mid: string[]; atk: string[] } = { gk: [], def: [], mid: [], atk: [] };
      const vistos = new Set<string>();
      for (const g of sim.gols) {
        if (g.clubeId !== id || g.rodada > j.rodada) continue;
        if (vistos.has(g.jogador)) continue;
        vistos.add(g.jogador);
        b[roleBucket(g.posicao)].push(g.jogador);
      }
      const pool = nwJogadores();
      const fill = (arr: string[], n: number) => { while (arr.length < n) arr.push(pool[Math.floor((fnv1a(id + arr.length) % pool.length))]); };
      fill(b.gk, 1); fill(b.def, 3); fill(b.mid, 3); fill(b.atk, 3);
      return b;
    };

    return ok({
      ...p,
      mandante: personalizarClube(p.mandante), visitante: personalizarClube(p.visitante),
      adversario: personalizarClube(p.adversario),
      jogada: true,
      kickoff: j.kickoff,
      duracaoMs: LIVE_DURACAO_MS,
      clima: climaDaRodada(j.rodada),
      meuXI,
      motor: {
        forcaMandante: forcaDe(mId),
        forcaVisitante: forcaDe(vId),
        arqMandante: clubeSim.get(mId)?.arquetipo ?? "EQUILIBRADO",
        arqVisitante: clubeSim.get(vId)?.arquetipo ?? "EQUILIBRADO",
        posMandante: linhas.find((x) => x.id === mId)?.posicao ?? 10,
        posVisitante: linhas.find((x) => x.id === vId)?.posicao ?? 10,
        elencoMandante: meuEhMandante ? rosterMeu() : rosterAdv(mId),
        elencoVisitante: meuEhMandante ? rosterAdv(vId) : rosterMeu(),
      },
    });
  },

  // ---- classificação --------------------------------------------------
  async classificacao() {
    const d = derivar();
    return ok({
      liga: { ...estado.liga, rodadaAtual: d.rodada },
      linhas: d.linhas,
      artilharia: d.artilharia,
    });
  },

  // ---- calendário ---------------------------------------------------
  async calendario() {
    const d = derivar();
    return ok({
      liga: { ...estado.liga, rodadaAtual: d.rodada },
      clube: meuClubeVivo(),
      proximos: d.proximos.map((j) => ({ ...j, clima: climaDaRodada(j.rodada) })),
      ultimos: d.ultimos,
      todos: d.todos,
    });
  },

  // ---- notícias (mundo do futebol) ---------------------------------
  async noticias() {
    return ok({ rodada: rodadaAtual(), lista: listaNoticias() });
  },

  // ---- finanças (valores mensais) ------------------------------------
  async financas() {
    const f = estado.financas;
    const M = 30 / 7; // semanas por mês
    const est = estadioAtual();
    const nm = est.naming;
    const namingMes = nm ? Math.round(nm.valorAno / 12) : 0;
    const patro = patrociniosAtuais();
    const uniformeMes = Math.round(patro.totalAno / 12);
    const patrocinioMes = Math.round(f.projecaoSemanal.patrocinio * M);
    const folhaMes = Math.round(f.projecaoSemanal.folha * M);
    const manutencaoMes = Math.round(f.projecaoSemanal.manutencao * M);
    const bilheteriaMes = Math.round(f.publicoMedio * f.precoIngresso * 2); // ~2 jogos em casa/mês

    const hoje = new Date(estado.hoje + "T00:00:00");
    const historico: { data: string; tipo: string; descricao: string; valor: number }[] = [];
    for (let m = 0; m < 6; m++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - m, 12).toISOString().slice(0, 10);
      historico.push({ data: d, tipo: "RECEITA_PATROCINIO", descricao: "Cota mensal de patrocínios", valor: patrocinioMes });
      if (uniformeMes) historico.push({ data: d, tipo: "RECEITA_PATROCINIO", descricao: "Cotas de patrocínio de uniforme", valor: uniformeMes });
      if (namingMes && m === 0) historico.push({ data: d, tipo: "RECEITA_NAMING", descricao: `Naming rights — ${nm!.patrocinador}`, valor: namingMes });
      historico.push({ data: d, tipo: "RECEITA_BILHETERIA", descricao: `Bilheteria — ~${f.publicoMedio.toLocaleString("pt-BR")} pagantes/jogo`, valor: bilheteriaMes });
      historico.push({ data: d, tipo: "DESPESA_FOLHA", descricao: "Folha salarial mensal", valor: -folhaMes });
      historico.push({ data: d, tipo: "DESPESA_MANUTENCAO", descricao: "Manutenção de estádio e CT", valor: -manutencaoMes });
    }

    return ok({
      ...f,
      capacidadeEstadio: est.capacidade,
      naming: nm,
      emObras: est.emObras,
      mandoProvisorio: est.mandoProvisorio,
      obras: est.obras,
      projecaoMensal: {
        patrocinio: patrocinioMes,
        uniforme: uniformeMes,
        naming: namingMes,
        bilheteria: bilheteriaMes,
        folha: folhaMes,
        manutencao: manutencaoMes,
      },
      patrociniosUniforme: patro.acordos,
      historico,
    });
  },

  // ---- mercado --------------------------------------------------------
  async mercado() {
    return ok({
      ...estado.mercado,
      saldoCaixa: estado.clube.saldoCaixa,
      negociacoes: negociacoes(),
    });
  },

  // ---- treinos & semana ---------------------------------------------
  async treinos() {
    const t = treinoStore();
    const prox = proximoCompromisso();
    const dAtual = dataAtual();
    const per = periodoAtual();
    const dj = diaDeJogo();
    const fim = prox ? prox.data : isoAddDias(dAtual, 6);
    const dias: { data: string; jogo: boolean; hoje: boolean; passado: boolean }[] = [];
    for (let i = 0, cur = baseSemana(); i < 21 && cur <= fim; i++, cur = isoAddDias(cur, 1)) {
      dias.push({ data: cur, jogo: !!prox && cur === prox.data, hoje: cur === dAtual, passado: cur < dAtual });
    }
    return ok({
      data: dAtual,
      periodo: per,
      periodoRot: PERIODO_ROT[per],
      diaDeJogo: dj,
      proximo: prox,
      eventos: dj ? [] : eventosDoDia(dAtual, per),
      dias,
      foco: t.foco,
      focos: FOCOS_TREINO,
      individuais: t.individuais,
      dicas: dicasAuxiliar(),
      elenco: estado.elenco.map((j) => {
        const c = comApelido(j);
        return { id: j.id, nome: c.nomeExibido, numero: c.numero, posicao: j.posicao, overall: j.overall };
      }),
    });
  },

  // ---- painel do master (gestão de usuários) -----------------------
  async adminUsuarios() {
    return ok(montarAdmin());
  },

  // ---- página de um clube (elenco + situação) ----------------------
  async clube(id: string) {
    const dado = montarClube(id);
    if (!dado) throw new Error("Clube não encontrado.");
    return ok(dado);
  },

  // ---- torcida & pressão sobre o treinador ------------------------
  async torcida() {
    return ok(montarTorcida());
  },
};

// ---------------------------------------------------------------- helpers
function recorte(linhas: LinhaTabela[], posicao: number) {
  const i = Math.max(0, Math.min(linhas.length - 5, posicao - 3));
  return linhas.slice(i, i + 5);
}

// ============================================================ clubes & nomes-link
// Toda menção a um clube ou jogador vira link: clube → sua página de elenco
// (/clube/:id); jogador do meu elenco → /jogador/:id; jogador de fora → a
// página do clube dele. `dicionarioNomes()` alimenta o linkificador de texto.
export function clubeHref(id: string): string { return `/clube/${id}`; }
export function jogadorHref(id: string): string { return `/jogador/${encodeURIComponent(id)}`; }
/** Nome curto de um clube (com o perfil aplicado ao meu). Síncrono; "" se desconhecido. */
export function nomeClubeCurto(id: string): string {
  return clubeSim.has(id) ? personalizarClube(resumo(id)).nomeCurto : "";
}

export interface JogadorDoClube {
  id: string | null; // id real só para jogadores do meu clube (têm /jogador/:id)
  nome: string;
  posicao: string;
  idade: number;
  overall: number;
  numero: number;
  gols: number;
  sintetico: boolean;
}

const POS_ORDEM_CLUBE = ["GOLEIRO", "ZAGUEIRO", "LATERAL", "VOLANTE", "MEIA", "PONTA", "ATACANTE"];
const POS_MOLDE_SINT = [
  "GOLEIRO", "GOLEIRO", "GOLEIRO", "ZAGUEIRO", "ZAGUEIRO", "ZAGUEIRO", "ZAGUEIRO", "ZAGUEIRO",
  "LATERAL", "LATERAL", "LATERAL", "LATERAL", "VOLANTE", "VOLANTE", "VOLANTE",
  "MEIA", "MEIA", "MEIA", "PONTA", "PONTA", "ATACANTE", "ATACANTE", "ATACANTE",
];

/** Elenco de qualquer clube: o meu = elenco real; adversário = sintético determinístico. */
export function elencoDoClube(clubeId: string): JogadorDoClube[] {
  if (clubeId === sim.meuClubeId) {
    const golsMeu = derivar().golsPorJogadorMeu;
    return estado.elenco.map((j) => {
      const c = comApelido(j);
      return {
        id: j.id, nome: c.nomeExibido, posicao: j.posicao, idade: j.idade,
        overall: j.overall, numero: c.numero, gols: golsMeu.get(j.nome) ?? 0, sintetico: false,
      };
    });
  }
  const r = rodadaAtual();
  let x = fnv1a("elenco|" + clubeId) >>> 0;
  const rnd = () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const golsPorNome = new Map<string, { pos: string; gols: number }>();
  for (const g of sim.gols) {
    if (g.clubeId !== clubeId || g.rodada > r) continue;
    const cur = golsPorNome.get(g.jogador) ?? { pos: g.posicao, gols: 0 };
    cur.gols++;
    golsPorNome.set(g.jogador, cur);
  }
  const usados = new Set<string>();
  const out: JogadorDoClube[] = [];
  for (const [nome, info] of golsPorNome) {
    usados.add(nome);
    out.push({
      id: null, nome, posicao: info.pos, idade: 20 + Math.floor(rnd() * 15),
      overall: Math.round((11.5 + rnd() * 5.5) * 10) / 10, numero: 0, gols: info.gols, sintetico: true,
    });
  }
  let guard = 0;
  while (out.length < 23 && guard++ < 400) {
    const nome = NW_NOMES[Math.floor(rnd() * NW_NOMES.length)] + " " + NW_SOBR[Math.floor(rnd() * NW_SOBR.length)];
    if (usados.has(nome)) continue;
    usados.add(nome);
    out.push({
      id: null, nome, posicao: POS_MOLDE_SINT[Math.min(POS_MOLDE_SINT.length - 1, out.length)],
      idade: 18 + Math.floor(rnd() * 17), overall: Math.round((10.5 + rnd() * 6.5) * 10) / 10,
      numero: 0, gols: 0, sintetico: true,
    });
  }
  out.sort((a, b) => POS_ORDEM_CLUBE.indexOf(a.posicao) - POS_ORDEM_CLUBE.indexOf(b.posicao) || b.overall - a.overall);
  out.forEach((j, k) => { j.numero = k + 1; });
  return out;
}

function formaDoClube(id: string, r: number): string {
  return sim.partidas
    .filter((p) => (p.mandanteId === id || p.visitanteId === id) && p.rodada <= r)
    .sort((a, b) => a.rodada - b.rodada)
    .slice(-5)
    .map((p) => {
      const casa = p.mandanteId === id;
      const gp = casa ? p.golsMandante : p.golsVisitante;
      const gc = casa ? p.golsVisitante : p.golsMandante;
      return gp > gc ? "V" : gp < gc ? "D" : "E";
    })
    .join("");
}

function montarClube(id: string) {
  const c0 = clubeSim.get(id);
  if (!c0) return null;
  const c = personalizarClube(resumo(id));
  const d = derivar();
  const linha = d.linhas.find((l) => l.id === id);
  const r = d.rodada;
  const jogos = sim.partidas
    .filter((p) => p.mandanteId === id || p.visitanteId === id)
    .sort((a, b) => a.rodada - b.rodada)
    .map((p) => {
      const casa = p.mandanteId === id;
      const advId = casa ? p.visitanteId : p.mandanteId;
      const feito = p.rodada <= r;
      const gp = feito ? (casa ? p.golsMandante : p.golsVisitante) : null;
      const gc = feito ? (casa ? p.golsVisitante : p.golsMandante) : null;
      return {
        rodada: p.rodada, data: p.data, casa,
        adversario: personalizarClube(resumo(advId)),
        golsPro: gp, golsContra: gc,
        resultado: gp == null ? null : gp > (gc as number) ? "V" : gp < (gc as number) ? "D" : "E",
      };
    });
  const elenco = elencoDoClube(id);
  return {
    id,
    nome: c.nome,
    nomeCurto: c.nomeCurto,
    cidade: c.cidade,
    cores: c.cores,
    ehMeu: id === sim.meuClubeId,
    arquetipo: c0.arquetipo,
    capacidadeEstadio: id === sim.meuClubeId ? estado.clube.capacidadeEstadio : 18000 + (fnv1a("cap|" + id) % 42) * 1000,
    posicao: linha?.posicao ?? null,
    pontos: linha?.pontos ?? 0,
    jogos: linha?.jogos ?? 0,
    vitorias: linha?.vitorias ?? 0,
    empates: linha?.empates ?? 0,
    derrotas: linha?.derrotas ?? 0,
    golsPro: linha?.golsPro ?? 0,
    golsContra: linha?.golsContra ?? 0,
    saldo: linha?.saldo ?? 0,
    forma: formaDoClube(id, r),
    ultimos: jogos.filter((j) => j.resultado).slice(-5),
    proximos: jogos.filter((j) => !j.resultado).slice(0, 5),
    elenco,
    artilheiros: [...elenco].filter((j) => j.gols > 0).sort((a, b) => b.gols - a.gols).slice(0, 5),
  };
}

export interface NomeLink { texto: string; href: string }
let _dicNomes: { key: string; itens: NomeLink[] } | null = null;
/** Nomes de clube/jogador conhecidos → destino, do mais longo para o mais curto. */
export function dicionarioNomes(): NomeLink[] {
  const r = rodadaAtual();
  const key = r + "|" + estado.clube.nomeCurto + "|" + estado.clube.nome + "|" + estado.elenco.length;
  if (_dicNomes && _dicNomes.key === key) return _dicNomes.itens;
  const m = new Map<string, string>();
  for (const c of sim.clubes) {
    const p = personalizarClube(resumo(c.id));
    for (const nome of [p.nome, p.nomeCurto]) if (nome && nome.length >= 4) m.set(nome, clubeHref(c.id));
  }
  for (const j of estado.elenco) {
    const c = comApelido(j);
    for (const nome of [j.nome, c.nomeExibido, c.apelido]) if (nome && nome.length >= 3) m.set(nome, jogadorHref(j.id));
  }
  for (const g of sim.gols) {
    if (g.rodada > r) continue;
    if (!m.has(g.jogador)) m.set(g.jogador, clubeHref(g.clubeId));
  }
  const itens = [...m.entries()]
    .map(([texto, href]) => ({ texto, href }))
    .sort((a, b) => b.texto.length - a.texto.length);
  _dicNomes = { key, itens };
  return itens;
}

// ============================================================ torcida & pressão
// Régua da relação com as organizadas. Quanto mais estremecida, mais pressão o
// treinador sofre — e mais agressiva a torcida fica (protesto, faixa, cerco ao
// CT). Tudo FICTÍCIO (R6). Derivado do desempenho + expectativa (reputação),
// com um pequeno modificador de ações do treinador que zera a cada rodada.
const TORCIDA = "fm.proto.torcida";

export interface BandaTorcida { id: string; rot: string; cor: string; min: number }
export const BANDAS_TORCIDA: BandaTorcida[] = [
  { id: "guerra", rot: "Clima de guerra", cor: "#8f1d16", min: 0 },
  { id: "revolta", rot: "Revolta", cor: "#c0392b", min: 14 },
  { id: "desconfianca", rot: "Desconfiança", cor: "#c77c1e", min: 30 },
  { id: "cautela", rot: "Cautela", cor: "#8a8578", min: 46 },
  { id: "apoio", rot: "Apoio", cor: "#2f8f52", min: 64 },
  { id: "idolatria", rot: "Idolatria", cor: "#1c6b45", min: 84 },
];
function bandaDe(v: number): BandaTorcida {
  let b = BANDAS_TORCIDA[0];
  for (const x of BANDAS_TORCIDA) if (v >= x.min) b = x;
  return b;
}

const ORGANIZADAS_POOL = [
  "Fúria Independente", "Movimento Raça", "Legião do Cerrado", "Frente Ultra",
  "Brava Gente", "Setor 8", "Os Fanáticos do Vale", "Pavilhão 77",
  "Comando Jovem", "Guarda do Sertão", "Esquadrão da Colina", "Ala 15",
  "Camisa Suada", "Trincheira do Vale", "Nação Guará", "Bancada Norte",
];

export interface OrganizadaTorcida { nome: string; membros: number; humor: number; radical: boolean }
export function organizadasDoClube(clubeId: string): OrganizadaTorcida[] {
  const r = rngStr("org|" + clubeId);
  const nomes = ORGANIZADAS_POOL;
  const escolhidas: string[] = [];
  const usadas = new Set<number>();
  while (escolhidas.length < 3 && usadas.size < nomes.length) {
    const i = Math.floor(r() * nomes.length);
    if (usadas.has(i)) continue;
    usadas.add(i);
    escolhidas.push(nomes[i]);
  }
  return escolhidas.map((nome, k) => ({
    nome,
    membros: 800 + Math.floor(r() * 60) * 100,
    humor: 0,
    radical: k === 0 ? true : r() < 0.4,
  }));
}

interface TorcidaMod { rodada: number; mod: number; acoes: string[] }
function torcidaStore(): TorcidaMod {
  try {
    const o = JSON.parse(localStorage.getItem(TORCIDA) || "null");
    if (o && typeof o.mod === "number") return { rodada: o.rodada ?? 0, mod: o.mod, acoes: o.acoes ?? [] };
  } catch { /* ignore */ }
  return { rodada: 0, mod: 0, acoes: [] };
}
function torcidaModVigente(): TorcidaMod {
  const s = torcidaStore();
  return s.rodada === rodadaAtual() ? s : { rodada: rodadaAtual(), mod: 0, acoes: [] };
}

export type AcaoTorcida = "conversar" | "prometer" | "peitar";
const ACOES_TORCIDA: Record<AcaoTorcida, { rot: string; delta: number; nota: string }> = {
  conversar: { rot: "Reunir as lideranças e ouvir as pautas", delta: 6, nota: "As organizadas saem da reunião mais calmas — por ora." },
  prometer: { rot: "Ir à imprensa prometer briga até o fim", delta: 3, nota: "O discurso pegou. A cobrança volta dobrada se o próximo resultado for ruim." },
  peitar: { rot: "Peitar as organizadas publicamente", delta: -7, nota: "Impôs autoridade para uns; para a maioria, jogou lenha na fogueira." },
};
export function fazerAcaoTorcida(a: AcaoTorcida): { ok: boolean; msg: string } {
  const s = torcidaModVigente();
  if (s.acoes.includes(a)) return { ok: false, msg: "Você já usou essa carta nesta rodada." };
  s.acoes.push(a);
  s.mod = Math.max(-12, Math.min(12, s.mod + ACOES_TORCIDA[a].delta));
  localStorage.setItem(TORCIDA, JSON.stringify(s));
  avisar();
  return { ok: true, msg: ACOES_TORCIDA[a].nota };
}

function formaPontos(forma: string): number {
  return [...forma].reduce((s, c) => s + (c === "V" ? 3 : c === "E" ? 1 : 0), 0);
}
function sequenciaSemVencer(forma: string): number {
  let n = 0;
  for (let i = forma.length - 1; i >= 0 && forma[i] !== "V"; i--) n++;
  return n;
}

function montarTorcida() {
  const d = derivar();
  const linha = d.minhaLinha;
  const rep = estado.clube.reputacao ?? 55;
  const forma = d.forma || "";
  const posEsperada = Math.round(21 - rep / 5); // rep 80 → ~5º; rep 40 → ~13º
  const ptsForma = formaPontos(forma);
  const njogos = forma.length || 1;
  const semVencer = sequenciaSemVencer(forma);

  const fatores: { rot: string; delta: number }[] = [];
  const add = (rot: string, delta: number) => { if (Math.abs(delta) >= 1) fatores.push({ rot, delta: Math.round(delta) }); };

  let v = 54;
  const dForma = (ptsForma / (njogos * 3) - 0.5) * 58;
  add(`Campanha recente (${forma || "—"})`, dForma); v += dForma;
  const dExp = (posEsperada - linha.posicao) * 2.4;
  add(linha.posicao <= posEsperada ? "Acima da expectativa da diretoria" : "Abaixo do que a torcida espera", dExp); v += dExp;
  if (semVencer >= 3) { add(`${semVencer} jogos sem vencer`, -semVencer * 3); v -= semVencer * 3; }
  const dCaixa = estado.clube.saldoCaixa < 0 ? -6 : 0;
  if (dCaixa) { add("Clube no vermelho", dCaixa); v += dCaixa; }
  const mod = torcidaModVigente();
  if (mod.mod) { add("Sua conversa com a torcida", mod.mod); v += mod.mod; }

  const valor = Math.max(3, Math.min(97, Math.round(v)));
  const banda = bandaDe(valor);

  // pressão sobre o treinador: inversa da relação + posição + jejum
  let pressao = (100 - valor) * 0.82;
  if (linha.posicao >= 17) pressao += 14;
  else if (linha.posicao >= 13) pressao += 6;
  pressao += Math.min(18, semVencer * 4);
  pressao = Math.max(2, Math.min(100, Math.round(pressao)));

  const cadeira =
    pressao >= 82 ? { rot: "Por um fio", jogos: 2, nota: "A diretoria admite internamente que a próxima derrota pode ser a última." }
      : pressao >= 66 ? { rot: "Muito pressionado", jogos: 4, nota: "Cada resultado é tratado como decisão. Precisa de uma reação já." }
        : pressao >= 46 ? { rot: "Sob observação", jogos: 8, nota: "A diretoria banca, mas acompanha de perto." }
          : pressao >= 28 ? { rot: "Prestigiado", jogos: 0, nota: "Ambiente tranquilo para trabalhar." }
            : { rot: "Blindado", jogos: 0, nota: "Torcida e diretoria ao seu lado." };

  const orgs = organizadasDoClube(sim.meuClubeId).map((o, i) => ({
    ...o,
    humor: Math.max(2, Math.min(99, valor + (o.radical ? -12 : 4) + (i === 1 ? 3 : 0))),
  }));

  const eventos = eventosTorcida(banda.id, valor, semVencer, forma);

  return {
    valor, banda, tendencia: dForma >= 2 ? "subindo" : dForma <= -2 ? "caindo" : "estável",
    pressao, cadeira,
    posicao: linha.posicao, posEsperada, semVencer, forma,
    organizadas: orgs,
    fatores: fatores.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    eventos,
    acoesFeitas: mod.acoes,
    acoes: (Object.keys(ACOES_TORCIDA) as AcaoTorcida[]).map((k) => ({ id: k, ...ACOES_TORCIDA[k] })),
  };
}

interface EvtTorcida { grav: "apoio" | "aviso" | "grave"; ico: string; texto: string }
function eventosTorcida(bandaId: string, valor: number, semVencer: number, forma: string): EvtTorcida[] {
  const R = rngStr("evtorc|" + rodadaAtual() + "|" + estado.clube.id + "|" + valor);
  const orgNomes = organizadasDoClube(sim.meuClubeId).map((o) => o.nome);
  const org = () => orgNomes[Math.floor(R() * orgNomes.length)];
  const pega = <T,>(a: T[]): T => a[Math.floor(R() * a.length)];
  const perdeu = forma.slice(-1) === "D";
  const pool: Record<string, EvtTorcida[]> = {
    idolatria: [
      { grav: "apoio", ico: "🎇", texto: `Mosaico gigante confirmado pela ${org()} para o próximo jogo em casa.` },
      { grav: "apoio", ico: "🚌", texto: "Caravana com dezenas de ônibus já está organizada para o jogo fora." },
      { grav: "apoio", ico: "🎤", texto: "Faixões de agradecimento ao elenco na saída do CT." },
    ],
    apoio: [
      { grav: "apoio", ico: "📣", texto: `A ${org()} marcou treino aberto com festa antes da próxima rodada.` },
      { grav: "apoio", ico: "🎫", texto: "Ingressos para o próximo jogo em casa esgotando rápido." },
      { grav: "apoio", ico: "🥁", texto: "Ensaio da bateria no entorno do estádio reúne centenas." },
    ],
    cautela: [
      { grav: "aviso", ico: "😐", texto: "Clima morno nas redes: a torcida pede 'mais entrega' sem peso na mão." },
      { grav: "aviso", ico: "🎫", texto: "Diretoria libera ingresso promocional para tentar encher um setor." },
      { grav: "aviso", ico: "📻", texto: `Rádios locais repercutem 'paciência no limite' com o time.` },
    ],
    desconfianca: [
      { grav: "aviso", ico: "🚩", texto: `Faixa da ${org()} na saída do CT: "Vestir a camisa é obrigação".` },
      { grav: "aviso", ico: "🗣️", texto: "Vaias no apito final do último jogo, mesmo com o time buscando o resultado." },
      { grav: "aviso", ico: "📉", texto: "Sócios ameaçam não renovar o plano se o desempenho não melhorar." },
    ],
    revolta: [
      { grav: "grave", ico: "✊", texto: `Cerca de 200 torcedores da ${org()} fazem protesto no portão do CT.` },
      { grav: "grave", ico: "📛", texto: `Líderes de ${orgNomes.length} organizadas pedem reunião com a diretoria e cobram mudanças.` },
      { grav: "grave", ico: "✈️", texto: "Elenco recebido com xingamentos e ovos na chegada do aeroporto." },
      { grav: "grave", ico: "🎯", texto: "Ato na porta do clube pede a saída do treinador." },
    ],
    guerra: [
      { grav: "grave", ico: "🔥", texto: `Torcedores da ${org()} invadem o treino; há princípio de confronto com a segurança.` },
      { grav: "grave", ico: "🚗", texto: "Carro de jogadores é cercado no estacionamento após a derrota." },
      { grav: "grave", ico: "⚠️", texto: "Faixa com ameaça é pendurada no muro do CT; clube aciona a polícia." },
      { grav: "grave", ico: "🚪", texto: "Diretoria estuda treinos fechados por tempo indeterminado." },
      { grav: "grave", ico: "🚨", texto: "Confusão entre organizada e polícia na porta do estádio termina com detidos." },
    ],
  };
  const base = pool[bandaId] ?? pool.cautela;
  const n = bandaId === "guerra" || bandaId === "revolta" ? 3 : 2;
  const out: EvtTorcida[] = [];
  const usados = new Set<string>();
  for (let i = 0; i < n && usados.size < base.length; i++) {
    let e = pega(base);
    let guard = 0;
    while (usados.has(e.texto) && guard++ < 8) e = pega(base);
    usados.add(e.texto);
    out.push(e);
  }
  if (perdeu && semVencer >= 2 && valor < 46) {
    out.unshift({ grav: "grave", ico: "🕯️", texto: `Sequência de ${semVencer} jogos sem vitória tem a paciência da arquibancada no fim.` });
  }
  return out;
}

// ============================================================ painel do master
// Protótipo: um único usuário, que é o "master" da liga. Esta camada simula a
// gestão das 20 vagas humanas (07_MULTIPLAYER_ONLINE), convites, fila de espera
// e a regra de inatividade de 14 dias → gestão por IA (00_REGRAS_IMUTAVEIS R40).
const ADMIN = "fm.proto.admin";

export type StatusJogadorLiga = "ativo" | "inativo" | "ia";
export interface JogadorLiga {
  id: string; nome: string; email: string;
  clubeId: string | null;
  status: StatusJogadorLiga;
  diasInativo: number;
  entrouEm: string;
  ehMaster?: boolean;
}
export interface Convite { codigo: string; criadoEm: string; clubeAlvo: string | null; usadoPor: string | null }
export interface FilaItem { nome: string; email: string; desde: string }
interface AdminStore {
  inscricoesAbertas: boolean;
  jogadores: JogadorLiga[];
  convites: Convite[];
  fila: FilaItem[];
}
export interface AdminSlot {
  clubeId: string; nome: string; nomeLongo: string; cidade: string; cores: string;
  ehMeu: boolean;
  gestao: "humano" | "inativo" | "ia";
  vaga: boolean;
  dono: { id: string; nome: string; email: string; status: StatusJogadorLiga; diasInativo: number; ehMaster: boolean } | null;
}

/** No protótipo, o usuário logado é sempre o master da liga. */
export function ehMaster(): boolean {
  return localStorage.getItem("fm.proto.master") !== "0";
}

function clubesDaLiga() {
  return sim.clubes.map((c) =>
    c.id === sim.meuClubeId
      ? { ...c, nome: estado.clube.nome, nomeCurto: estado.clube.nomeCurto, cidade: estado.clube.cidade, cores: estado.clube.cores }
      : c,
  );
}
function nomeCurtoClube(id: string): string {
  return clubesDaLiga().find((c) => c.id === id)?.nomeCurto ?? id;
}
function novoCodigoConvite(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let x = "";
  for (let i = 0; i < 6; i++) x += A[Math.floor(Math.random() * A.length)];
  return "LN-" + x;
}

function seedAdmin(): AdminStore {
  const R = rngStr("admin|" + (sim.meuClubeId || "x") + "|v1");
  const amigos: [string, string][] = [
    ["Rafa Nunes", "rafa.nunes@email.com"],
    ["Bia Camargo", "bia.camargo@email.com"],
    ["Teo Assis", "teo.assis@email.com"],
    ["Leo Vidal", "leo.vidal@email.com"],
    ["Duda Prado", "duda.prado@email.com"],
    ["Nando Rocha", "nando.rocha@email.com"],
  ];
  const meu = sim.meuClubeId;
  const outros = sim.clubes.map((c) => c.id).filter((id) => id !== meu);
  for (let i = outros.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [outros[i], outros[j]] = [outros[j], outros[i]];
  }
  const jogadores: JogadorLiga[] = [
    { id: "u-master", nome: managerNome(), email: "voce@email.com", clubeId: meu, status: "ativo", diasInativo: 0, entrouEm: estado.hoje, ehMaster: true },
  ];
  amigos.forEach(([nome, email], i) => {
    let status: StatusJogadorLiga = "ativo";
    let dias = 0;
    if (i === 4) { status = "inativo"; dias = 9; }
    if (i === 5) { status = "ia"; dias = 17; }
    jogadores.push({ id: "u" + (i + 1), nome, email, clubeId: outros[i], status, diasInativo: dias, entrouEm: estado.hoje });
  });
  return {
    inscricoesAbertas: true,
    jogadores,
    convites: [{ codigo: novoCodigoConvite(), criadoEm: estado.hoje, clubeAlvo: null, usadoPor: null }],
    fila: [
      { nome: "Rui Pasca", email: "rui.pasca@email.com", desde: estado.hoje },
      { nome: "Nina Corte", email: "nina.corte@email.com", desde: estado.hoje },
    ],
  };
}
function adminStore(): AdminStore {
  try {
    const o = JSON.parse(localStorage.getItem(ADMIN) || "null");
    if (o && Array.isArray(o.jogadores)) return o as AdminStore;
  } catch { /* ignore */ }
  const s = seedAdmin();
  localStorage.setItem(ADMIN, JSON.stringify(s));
  return s;
}
function gravarAdmin(s: AdminStore) {
  localStorage.setItem(ADMIN, JSON.stringify(s));
  avisar();
}

function montarAdmin() {
  const s = adminStore();
  const clubes = clubesDaLiga();
  const porClube = new Map<string, JogadorLiga>();
  for (const j of s.jogadores) if (j.clubeId) porClube.set(j.clubeId, j);
  const slots: AdminSlot[] = clubes.map((c) => {
    const dono = porClube.get(c.id) ?? null;
    const gestao: AdminSlot["gestao"] = !dono || dono.status === "ia" ? "ia" : dono.status === "inativo" ? "inativo" : "humano";
    return {
      clubeId: c.id, nome: c.nomeCurto, nomeLongo: c.nome, cidade: c.cidade, cores: c.cores,
      ehMeu: c.id === sim.meuClubeId,
      gestao,
      vaga: !dono || dono.status === "ia",
      dono: dono
        ? { id: dono.id, nome: dono.nome, email: dono.email, status: dono.status, diasInativo: dono.diasInativo, ehMaster: !!dono.ehMaster }
        : null,
    };
  });
  return {
    ehMaster: ehMaster(),
    inscricoesAbertas: s.inscricoesAbertas,
    calendarioComecou: jogoComecou(),
    rodada: rodadaCorrente(),
    resumo: {
      total: 20,
      humanos: slots.filter((x) => x.dono && x.dono.status !== "ia").length,
      inativos: slots.filter((x) => x.gestao === "inativo").length,
      vagas: slots.filter((x) => x.vaga).length,
      fila: s.fila.length,
    },
    slots,
    semClube: s.jogadores.filter((j) => !j.clubeId).map((j) => ({ id: j.id, nome: j.nome, email: j.email })),
    convites: s.convites.slice().sort((a, b) => (a.usadoPor ? 1 : 0) - (b.usadoPor ? 1 : 0)),
    fila: s.fila,
    clubesLivres: slots.filter((x) => x.vaga).map((x) => ({ id: x.clubeId, nome: x.nome })),
  };
}

// -------- mutações do master --------
export function adminToggleInscricoes() {
  const s = adminStore();
  s.inscricoesAbertas = !s.inscricoesAbertas;
  gravarAdmin(s);
}
export function adminGerarConvite(clubeAlvo: string | null = null): string {
  const s = adminStore();
  const cod = novoCodigoConvite();
  s.convites.push({ codigo: cod, criadoEm: dataAtual(), clubeAlvo, usadoPor: null });
  gravarAdmin(s);
  return cod;
}
export function adminRevogarConvite(codigo: string) {
  const s = adminStore();
  s.convites = s.convites.filter((c) => c.codigo !== codigo);
  gravarAdmin(s);
}
/** Simula um amigo entrando com o código (demo). */
export function adminUsarConvite(codigo: string, nome: string, email: string): { ok: boolean; msg: string } {
  const s = adminStore();
  const c = s.convites.find((x) => x.codigo === codigo.trim().toUpperCase() && !x.usadoPor);
  if (!c) return { ok: false, msg: "Convite inválido ou já usado." };
  if (!s.inscricoesAbertas) return { ok: false, msg: "As inscrições estão fechadas." };
  c.usadoPor = nome.trim() || "Convidado";
  const livre = c.clubeAlvo && !s.jogadores.some((j) => j.clubeId === c.clubeAlvo && j.status !== "ia");
  if (c.clubeAlvo && livre) {
    for (const j of s.jogadores) if (j.clubeId === c.clubeAlvo) j.clubeId = null;
    s.jogadores.push({ id: "u-" + Date.now().toString(36), nome: c.usadoPor, email: email.trim(), clubeId: c.clubeAlvo, status: "ativo", diasInativo: 0, entrouEm: dataAtual() });
    gravarAdmin(s);
    return { ok: true, msg: `${c.usadoPor} entrou e assumiu ${nomeCurtoClube(c.clubeAlvo)}.` };
  }
  s.fila.push({ nome: c.usadoPor, email: email.trim(), desde: dataAtual() });
  gravarAdmin(s);
  return { ok: true, msg: `${c.usadoPor} entrou na fila de espera.` };
}
export function adminEntrarNaFila(nome: string, email: string) {
  const s = adminStore();
  if (!nome.trim()) return;
  s.fila.push({ nome: nome.trim(), email: email.trim(), desde: dataAtual() });
  gravarAdmin(s);
}
export function adminSairDaFila(email: string) {
  const s = adminStore();
  s.fila = s.fila.filter((f) => f.email !== email);
  gravarAdmin(s);
}
/** Dá um clube livre a alguém (da fila, de "sem clube", ou novo) e/ou troca de clube. */
export function adminAtribuirClube(
  quem: { jogadorId?: string; nome?: string; email?: string },
  clubeId: string,
): { ok: boolean; msg: string } {
  const s = adminStore();
  const ocupado = s.jogadores.find((j) => j.clubeId === clubeId && j.status !== "ia");
  if (ocupado) return { ok: false, msg: `${nomeCurtoClube(clubeId)} já é de ${ocupado.nome}.` };
  for (const j of s.jogadores) if (j.clubeId === clubeId) j.clubeId = null; // solta IA-inativo
  let alvo = quem.jogadorId ? s.jogadores.find((j) => j.id === quem.jogadorId) : undefined;
  if (!alvo && quem.email) alvo = s.jogadores.find((j) => j.email === quem.email);
  if (alvo) {
    alvo.clubeId = clubeId; alvo.status = "ativo"; alvo.diasInativo = 0;
  } else {
    s.jogadores.push({
      id: "u-" + Date.now().toString(36),
      nome: (quem.nome || "Novo presidente").trim(),
      email: (quem.email || "").trim(),
      clubeId, status: "ativo", diasInativo: 0, entrouEm: dataAtual(),
    });
  }
  const alvoEmail = quem.email || alvo?.email;
  if (alvoEmail) s.fila = s.fila.filter((f) => f.email !== alvoEmail);
  gravarAdmin(s);
  return { ok: true, msg: `Clube atribuído a ${alvo?.nome || quem.nome || "novo presidente"}.` };
}
/** Tira o presidente do clube — o clube volta para gestão de IA; a pessoa fica sem clube. */
export function adminLiberarClube(jogadorId: string) {
  const s = adminStore();
  const j = s.jogadores.find((x) => x.id === jogadorId);
  if (j) { j.clubeId = null; j.status = "ativo"; j.diasInativo = 0; }
  gravarAdmin(s);
}
export function adminRemoverJogador(jogadorId: string) {
  const s = adminStore();
  s.jogadores = s.jogadores.filter((j) => j.id !== jogadorId || j.ehMaster);
  gravarAdmin(s);
}
export function adminDefinirStatus(jogadorId: string, status: StatusJogadorLiga) {
  const s = adminStore();
  const j = s.jogadores.find((x) => x.id === jogadorId);
  if (j && !j.ehMaster) {
    j.status = status;
    j.diasInativo = status === "ia" ? 17 : status === "inativo" ? 9 : 0;
  }
  gravarAdmin(s);
}
export function adminResetPainel() {
  localStorage.removeItem(ADMIN);
  avisar();
}

// ============================================================ semana & treinos
// O usuário "vive" a semana período a período (manhã/tarde/noite) até o dia do
// próximo jogo. Nesse dia o fluxo TRAVA — só resta ir para a partida. Depois de
// disputada, o relógio retoma no dia seguinte, rumo ao próximo compromisso.
const RELOGIO = "fm.proto.relogio";
const TREINO = "fm.proto.treino";

export type PeriodoDia = 0 | 1 | 2;
export const PERIODO_ROT: readonly string[] = ["Manhã", "Tarde", "Noite"];

export interface EventoDia {
  id: string;
  ico: string;
  tom: "treino" | "tatico" | "medico" | "elenco" | "imprensa" | "base" | "folga";
  titulo: string;
  texto: string;
}
export interface DicaAux {
  id: string; nome: string; posicao: string; overall: number;
  urgencia: "alta" | "media" | "baixa";
  ico: string; frase: string; focoSugerido: string;
}
export interface FocoTreino { id: string; rot: string; ico: string; dica: string }
export interface ProxCompromisso {
  rodada: number; data: string; casa: boolean; dias: number;
  adversario: { id: string; nome: string; nomeCurto: string; cidade: string; cores: string };
}

export const FOCOS_TREINO: FocoTreino[] = [
  { id: "fisico", rot: "Preparação física", ico: "🏃", dica: "Alivia a fadiga acumulada e sustenta o ritmo no fim dos jogos." },
  { id: "tatico", rot: "Trabalho tático", ico: "📋", dica: "Entrosamento, posicionamento e a ideia de jogo para o próximo rival." },
  { id: "bolaparada", rot: "Bola parada", ico: "🎯", dica: "Escanteios, faltas ensaiadas e marcação nas jogadas de bola parada." },
  { id: "posse", rot: "Posse e saída de bola", ico: "🔄", dica: "Passe curto, triangulação e controle sob pressão." },
  { id: "finalizacao", rot: "Finalização", ico: "⚽", dica: "Chute, cruzamento e movimentação dentro da área." },
  { id: "defensivo", rot: "Sistema defensivo", ico: "🛡️", dica: "Marcação, coberturas e a linha de impedimento." },
  { id: "recuperacao", rot: "Recuperação", ico: "💆", dica: "Carga leve, fisioterapia e regeneração — semana curta ou elenco desgastado." },
];
const ATR_ROT: Record<string, string> = {
  finalizacao: "finalização", passe: "passe", drible: "drible", cabeceio: "cabeceio",
  cruzamento: "cruzamento", marcacao: "marcação", desarme: "desarme", velocidade: "velocidade",
  resistencia: "resistência", forca: "força", visaoDeJogo: "visão de jogo",
  posicionamento: "posicionamento", reflexos: "reflexos", saidaDeGol: "saída de gol",
};

function isoAddDias(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function diffDias(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}
function partidasDoClube() {
  return sim.partidas
    .filter((p) => p.mandanteId === sim.meuClubeId || p.visitanteId === sim.meuClubeId)
    .sort((a, b) => a.rodada - b.rodada);
}
function ultimaPartidaData(): string {
  const r = rodadaAtual();
  const feitas = partidasDoClube().filter((p) => p.rodada <= r);
  return feitas.length ? feitas[feitas.length - 1].data : estado.hoje;
}
/** Começo natural da semana: dia seguinte à última partida disputada. */
function baseSemana(): string {
  return isoAddDias(ultimaPartidaData(), 1);
}
function proxPartidaBruta() {
  const r = rodadaAtual();
  return partidasDoClube().find((p) => p.rodada > r) ?? null;
}
export function proximoCompromisso(): ProxCompromisso | null {
  const prox = proxPartidaBruta();
  if (!prox) return null;
  const casa = prox.mandanteId === sim.meuClubeId;
  const advId = casa ? prox.visitanteId : prox.mandanteId;
  const c = clubeSim.get(advId)!;
  return {
    rodada: prox.rodada, data: prox.data, casa,
    dias: Math.max(0, diffDias(dataAtual(), prox.data)),
    adversario: { id: advId, nome: c.nome, nomeCurto: c.nomeCurto, cidade: c.cidade, cores: c.cores },
  };
}

interface RelogioRaw { data: string; periodo: PeriodoDia }
function relogioRaw(): RelogioRaw {
  try {
    const o = JSON.parse(localStorage.getItem(RELOGIO) || "null");
    if (o && typeof o.data === "string" && (o.periodo === 0 || o.periodo === 1 || o.periodo === 2)) return o;
  } catch { /* ignore */ }
  return { data: baseSemana(), periodo: 0 };
}
/** Dia (ISO) que o usuário está vivendo agora. */
export function dataAtual(): string {
  const base = baseSemana();
  const r = relogioRaw();
  let d = r.data > base ? r.data : base;
  const prox = proxPartidaBruta();
  if (prox && d > prox.data) d = prox.data;
  return d;
}
export function periodoAtual(): PeriodoDia {
  const r = relogioRaw();
  return dataAtual() === r.data ? r.periodo : 0;
}
/** O dia vivido é o dia do próximo jogo? (fluxo travado) */
export function diaDeJogo(): boolean {
  const prox = proxPartidaBruta();
  return !!prox && dataAtual() === prox.data;
}
function gravarRelogio(data: string, periodo: PeriodoDia) {
  localStorage.setItem(RELOGIO, JSON.stringify({ data, periodo }));
  cache = null;
  avisar();
}
/** Avança um período: manhã → tarde → noite → manhã do dia seguinte. */
export function passarPeriodo() {
  if (diaDeJogo()) return;
  const d = dataAtual();
  const p = periodoAtual();
  let nd = d;
  let np: PeriodoDia = (p + 1) as PeriodoDia;
  if (p >= 2) { nd = isoAddDias(d, 1); np = 0; }
  const prox = proxPartidaBruta();
  if (prox && nd > prox.data) { nd = prox.data; np = 0; }
  gravarRelogio(nd, np);
}
/** Pula direto para a manhã do dia seguinte (sem passar por tarde/noite). */
export function passarDia() {
  if (diaDeJogo()) return;
  let nd = isoAddDias(dataAtual(), 1);
  const prox = proxPartidaBruta();
  if (prox && nd > prox.data) nd = prox.data;
  gravarRelogio(nd, 0);
}

// -------- foco de treino (persistido) --------
interface TreinoRaw { foco: string; individuais: Record<string, string> }
function treinoStore(): TreinoRaw {
  try {
    const o = JSON.parse(localStorage.getItem(TREINO) || "null");
    if (o && typeof o === "object") return { foco: o.foco || "tatico", individuais: o.individuais || {} };
  } catch { /* ignore */ }
  return { foco: "tatico", individuais: {} };
}
export function definirFocoTreino(id: string) {
  const s = treinoStore();
  s.foco = id;
  localStorage.setItem(TREINO, JSON.stringify(s));
  avisar();
}
export function definirFocoIndividual(jogadorId: string, focoId: string) {
  const s = treinoStore();
  if (!focoId || s.individuais[jogadorId] === focoId) delete s.individuais[jogadorId];
  else s.individuais[jogadorId] = focoId;
  localStorage.setItem(TREINO, JSON.stringify(s));
  avisar();
}

// -------- dicas do auxiliar técnico --------
// Atributos que fazem sentido treinar por posição (evita sugerir "reflexos"
// para um lateral ou "finalização" para um goleiro).
const ATR_POR_POS: Record<string, string[]> = {
  GOLEIRO: ["reflexos", "posicionamento", "saidaDeGol", "passe"],
  ZAGUEIRO: ["marcacao", "desarme", "cabeceio", "posicionamento", "forca", "passe"],
  LATERAL: ["cruzamento", "velocidade", "marcacao", "resistencia", "desarme", "drible"],
  VOLANTE: ["marcacao", "desarme", "passe", "visaoDeJogo", "resistencia", "forca"],
  MEIA: ["passe", "visaoDeJogo", "drible", "finalizacao", "cruzamento"],
  PONTA: ["drible", "velocidade", "cruzamento", "finalizacao", "passe"],
  ATACANTE: ["finalizacao", "cabeceio", "posicionamento", "velocidade", "drible", "forca"],
};
function menorAtributo(at: Record<string, number>, pos?: string): string {
  const chaves = (pos && ATR_POR_POS[pos]) || Object.keys(at);
  let k = "", v = 99;
  for (const kk of chaves) {
    const vv = at[kk];
    if (typeof vv === "number" && vv < v) { v = vv; k = kk; }
  }
  return k;
}
/** Foco de treino coletivo que melhor cobre um atributo. */
function focoDoAtributo(attr: string): string {
  if (["finalizacao", "cabeceio"].includes(attr)) return "finalizacao";
  if (["marcacao", "desarme", "posicionamento"].includes(attr)) return "defensivo";
  if (["passe", "visaoDeJogo", "drible", "saidaDeGol"].includes(attr)) return "posse";
  if (["cruzamento"].includes(attr)) return "bolaparada";
  if (["velocidade", "resistencia", "forca"].includes(attr)) return "fisico";
  return "tatico";
}
export function dicasAuxiliar(): DicaAux[] {
  const el = estado.elenco;
  if (!el.length) return [];
  const media = el.reduce((s, j) => s + j.overall, 0) / el.length;
  const out: DicaAux[] = [];
  for (const j of el) {
    const p1 = j.nome.split(" ")[0];
    const fracoKey = menorAtributo(j.atributos as unknown as Record<string, number>, j.posicao);
    const fraco = ATR_ROT[fracoKey] ?? "fundamentos";
    const focoFraco = focoDoAtributo(fracoKey);
    let urgencia: DicaAux["urgencia"] = "baixa";
    let ico = "✔";
    let frase: string;
    let foco = "tatico";
    if (j.lesionado) {
      urgencia = "alta"; ico = "✚"; foco = "recuperacao";
      frase = `${p1} segue no departamento médico (${j.diasLesao} dia(s) previstos). Zero carga até a alta — nada de antecipar.`;
    } else if (j.fadiga >= 34) {
      urgencia = "alta"; ico = "🔋"; foco = "recuperacao";
      frase = `${p1} está no vermelho da fadiga (${j.fadiga}). Poupa no jogo ou dá dois dias de carga leve, ou o risco de lesão dispara.`;
    } else if (j.moral <= 58) {
      urgencia = "alta"; ico = "💬"; foco = "tatico";
      frase = `A moral de ${p1} está no fundo (${j.moral}). Uma conversa franca e minutos em campo valem mais que qualquer treino agora.`;
    } else if (j.fadiga >= 22) {
      urgencia = "media"; ico = "🔋"; foco = "recuperacao";
      frase = `${p1} vem pesado de minutagem (fadiga ${j.fadiga}). Encaixa uma sessão regenerativa antes do jogo.`;
    } else if (j.moral <= 64) {
      urgencia = "media"; ico = "💬"; foco = "tatico";
      frase = `${p1} anda meio pra baixo (moral ${j.moral}). Um elogio público e sequência entre os titulares levantam.`;
    } else if (j.idade <= 20 && j.potencial - j.overall >= 3) {
      urgencia = "media"; ico = "⭐"; foco = focoFraco;
      frase = `${p1} tem teto alto (potencial ${j.potencial}, hoje ${j.overall.toFixed(1)}). O ponto a lapidar é ${fraco} — foco individual aí acelera a evolução.`;
    } else if (j.idade >= 30) {
      urgencia = "media"; ico = "⏳"; foco = "recuperacao";
      frase = `${p1} já tem ${j.idade} anos. Gestão de carga jogo a jogo: poupe-o nos treinos fortes e ele chega inteiro no fim de semana.`;
    } else if (j.overall <= media - 1.4) {
      urgencia = "baixa"; ico = "🔧"; foco = focoFraco;
      frase = `${p1} está abaixo da média do elenco. Ou puxa um foco individual mirando ${fraco}, ou fica como alternativa de banco.`;
    } else if (j.moral >= 76) {
      urgencia = "baixa"; ico = "🔥"; foco = "finalizacao";
      frase = `${p1} está confiante (moral ${j.moral}). Momento de titular — mantém no ritmo e aproveita a fase.`;
    } else {
      urgencia = "baixa"; ico = "✔"; foco = focoFraco;
      frase = `${p1} está ok para o jogo. Se sobrar espaço na semana, um retoque em ${fraco} não faz mal.`;
    }
    const c = comApelido(j);
    out.push({ id: j.id, nome: c.nomeExibido, posicao: j.posicao, overall: j.overall, urgencia, ico, frase, focoSugerido: foco });
  }
  const ord = { alta: 0, media: 1, baixa: 2 };
  return out.sort((a, b) => ord[a.urgencia] - ord[b.urgencia] || b.overall - a.overall);
}

// -------- eventos do dia (flavor determinístico por período) --------
type EvtCtx = { R: () => number; jog: string; jog2: string; foco: string; adv: string; dias: number };
type EvtTpl = { tom: EventoDia["tom"]; ico: string; w: number; per?: PeriodoDia[]; f: (c: EvtCtx) => [string, string] };
const EVT_TPLS: EvtTpl[] = [
  { tom: "treino", ico: "🏃", w: 6, per: [0], f: (c) => [`Treino principal: ${c.foco}`, `Comissão fechou a manhã em cima de ${c.foco}. ${c.jog} foi um dos destaques da atividade; o grupo respondeu bem à intensidade.`] },
  { tom: "treino", ico: "💪", w: 5, per: [0], f: (c) => [`Trabalho de força na academia`, `Circuito de força pela manhã antes de ir a campo. ${c.jog} e ${c.jog2} ficaram um pouco mais na parte física, sob supervisão do preparador.`] },
  { tom: "tatico", ico: "📋", w: 6, per: [0, 1], f: (c) => [`Ensaio tático para o ${c.adv}`, `Trabalho posicional com o time titular espelhando o provável esquema do ${c.adv}. O técnico parou a atividade várias vezes para ajustar as linhas.`] },
  { tom: "tatico", ico: "🎯", w: 4, per: [1], f: (c) => [`Bola parada ensaiada`, `Meia hora só de escanteios e faltas. ${c.jog} bateu bem e a comissão testou três variações de marcação na área.`] },
  { tom: "treino", ico: "⚽", w: 4, per: [1], f: (c) => [`Coletivo de dois tempos`, `Jogo-treino contra o time sub-20. ${c.jog} marcou, mas o técnico reclamou da saída de bola no segundo tempo.`] },
  { tom: "medico", ico: "🩺", w: 4, per: [0, 1], f: (c) => [`${c.jog} faz tratamento no CT`, `${c.jog} sentiu um incômodo muscular e ficou na fisioterapia enquanto o grupo treinava. Departamento médico fala em precaução, sem exames por ora.`] },
  { tom: "medico", ico: "✅", w: 3, per: [1], f: (c) => [`${c.jog} volta a treinar com bola`, `Depois de dias na transição, ${c.jog} participou de parte da atividade com o grupo. Ainda sem previsão de retorno aos jogos, mas o clima melhorou.`] },
  { tom: "base", ico: "🌱", w: 3, per: [0], f: (c) => [`Garoto da base sobe para o profissional`, `A comissão chamou um jovem do sub-20 para completar o treino. ${c.jog2} elogiou a personalidade do menino na atividade.`] },
  { tom: "elenco", ico: "🗣️", w: 3, per: [2], f: (c) => [`Conversa no vestiário`, `O capitão puxou uma roda com o elenco no fim do dia. Assunto: concentração para o jogo com o ${c.adv} e cobrança por mais intensidade.`] },
  { tom: "folga", ico: "🌤️", w: 3, per: [1], f: () => [`Tarde livre concedida`, `A comissão liberou o elenco no período da tarde depois de uma manhã puxada. Reapresentação amanhã cedo.`] },
  { tom: "imprensa", ico: "🎙️", w: 3, per: [1, 2], f: (c) => [`Técnico concede entrevista coletiva`, `Perguntado sobre o ${c.adv}, o treinador evitou polêmica e destacou a evolução do time nos treinos da semana.`] },
  { tom: "imprensa", ico: "📺", w: 3, per: [1], f: (c) => [`Sessão de análise de vídeo`, `Elenco reunido no auditório do CT vendo cortes do ${c.adv}: bola parada, transições e o lado por onde o adversário mais ataca.`] },
  { tom: "treino", ico: "🥵", w: 3, per: [0], f: (c) => [`Teste físico no gramado`, `Preparação aplicou teste de resistência com GPS. ${c.jog} puxou o pelotão; dois atletas ficaram abaixo do esperado e terão carga individual.`] },
  { tom: "elenco", ico: "🎂", w: 2, per: [2], f: (c) => [`Clima leve no CT`, `${c.jog} levou bolo para os companheiros e a atividade da tarde terminou descontraída. Ambiente do grupo segue bom.`] },
  { tom: "imprensa", ico: "📣", w: 2, per: [1], f: () => [`Torcedores no treino`, `Um grupo de organizados foi ao CT dar apoio antes da partida. Bandeirão, sinalizadores e cobrança por "raça no fim de semana".`] },
  { tom: "elenco", ico: "🤝", w: 2, per: [1], f: () => [`Dirigente visita o treino`, `Membro da diretoria passou pelo CT, cumprimentou o elenco e conversou em separado com o técnico e o capitão.`] },
  { tom: "treino", ico: "🧤", w: 2, per: [0, 1], f: (c) => [`Treino específico de goleiros`, `Sessão à parte para os goleiros: reposição, saída de gol e cobranças de pênalti. ${c.jog2} bateu a série final.`] },
  { tom: "folga", ico: "😴", w: 2, per: [2], f: () => [`Noite de descanso`, `Nada programado para a noite. Comissão pediu sono em dia e hidratação — a semana ainda tem trabalho forte pela frente.`] },
  { tom: "tatico", ico: "🧩", w: 3, per: [0, 1], f: (c) => [`Treino de ${c.foco}`, `Estações de ${c.foco} durante boa parte da atividade. ${c.jog} e ${c.jog2} ficaram no grupo que repetiu o exercício mais vezes.`] },
  { tom: "elenco", ico: "⚠️", w: 2, per: [0, 1], f: (c) => [`Bate-boca no coletivo`, `${c.jog} e ${c.jog2} discutiram após uma dividida mais dura. O técnico encerrou o lance na hora e chamou os dois para conversar depois.`] },
];
export function eventosDoDia(dataISO: string, periodo: PeriodoDia): EventoDia[] {
  const R = rngStr(estado.clube.id + "|dia|" + dataISO + "|" + periodo);
  const nomes = [...new Set(estado.elenco.map((j) => j.nome.split(" ")[0]))];
  if (nomes.length < 2) nomes.push("o camisa 10", "o capitão");
  const pega = <T,>(a: T[]): T => a[Math.floor(R() * a.length)] ?? a[0];
  const pega2 = (excl: string): string => {
    let n = pega(nomes);
    for (let i = 0; i < 4 && n === excl; i++) n = pega(nomes);
    return n;
  };
  const focoObj = FOCOS_TREINO.find((f) => f.id === treinoStore().foco) ?? FOCOS_TREINO[0];
  const prox = proximoCompromisso();
  const cand = EVT_TPLS.filter((t) => !t.per || t.per.includes(periodo));
  const total = cand.reduce((s, t) => s + t.w, 0);
  const qtd = 1 + (R() < 0.65 ? 1 : 0);
  const usados = new Set<number>();
  const out: EventoDia[] = [];
  for (let k = 0; k < qtd; k++) {
    let acc = R() * total, idx = 0;
    for (let i = 0; i < cand.length; i++) { acc -= cand[i].w; if (acc <= 0) { idx = i; break; } }
    while (usados.has(idx)) idx = (idx + 1) % cand.length;
    usados.add(idx);
    const t = cand[idx];
    const jog = pega(nomes);
    const ctx: EvtCtx = {
      R, jog, jog2: pega2(jog),
      foco: focoObj.rot.toLowerCase(),
      adv: prox?.adversario.nomeCurto ?? "o próximo rival",
      dias: prox?.dias ?? 6,
    };
    const [titulo, texto] = t.f(ctx);
    out.push({ id: `${dataISO}-${periodo}-${k}`, ico: t.ico, tom: t.tom, titulo, texto });
  }
  return out;
}

// ============================================================ notícias (mundo do futebol)
// Tudo FICTÍCIO (R6/R7). Gerador determinístico por rodada cobrindo o que existe
// no futebol de verdade: resultados, mercado, lesões graves, indisciplina,
// violência de torcida, luto/tragédias, casos fora de campo (balada, direção
// alcoolizada, acidentes), crises institucionais, seleção, arbitragem, bastidores.
export type CatNoticia =
  | "resultado" | "tabela" | "mercado" | "lesao" | "disciplina"
  | "torcida" | "tragedia" | "extracampo" | "institucional" | "selecao" | "arbitragem" | "bastidores";
export const CAT_NOTICIA: Record<CatNoticia, { t: string; ico: string }> = {
  resultado: { t: "Rodada", ico: "⚽" },
  tabela: { t: "Tabela", ico: "📊" },
  mercado: { t: "Mercado", ico: "⇄" },
  lesao: { t: "Dep. médico", ico: "✚" },
  disciplina: { t: "Disciplina", ico: "🟥" },
  torcida: { t: "Torcida", ico: "📣" },
  tragedia: { t: "Luto", ico: "🕯️" },
  extracampo: { t: "Fora de campo", ico: "🚨" },
  institucional: { t: "Bastidores do clube", ico: "🏛️" },
  selecao: { t: "Seleção", ico: "🌟" },
  arbitragem: { t: "Arbitragem", ico: "🧑‍⚖️" },
  bastidores: { t: "Bastidores", ico: "🎙️" },
};
export interface NoticiaItem {
  id: string; rodada: number; data: string; cat: CatNoticia;
  grav: "nota" | "quente" | "grave"; fonte: string;
  manchete: string; corpo: string; clube: string | null; meu: boolean;
}

function rngStr(s: string) {
  let x = fnv1a(s) >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NW_FONTES = ["Placar Nacional", "Rádio Gol AM", "Portal Bola em Jogo", "Jornal do Lance Certo", "Canal Meio de Campo", "Gazeta da Bola", "Blog Zaga Central", "Agência Craque"];
const NW_NOMES = ["Adão", "Ademir", "Osmar", "Nivaldo", "Djalma", "Válter", "Aluízio", "Reinaldo", "Cléber", "Jonas", "Dario", "Ubirajara", "Renê", "Gilmar", "Wanderson", "Cauê", "Elias", "Sílvio", "Hamilton", "Tarcísio"];
const NW_SOBR = ["Bittencourt", "Quaresma", "Vilar", "Peçanha", "Andrade", "Sampaio", "Falcão", "Régis", "Bastos", "Cordeiro", "Rangel", "Trindade", "Aguiar", "Portela", "Serra", "Leal", "Camargo", "Assunção", "Padilha", "Vasques"];
let _nwJog: string[] | null = null;
function nwJogadores(): string[] {
  if (!_nwJog) _nwJog = [...new Set(sim.gols.map((g) => g.jogador))];
  return _nwJog.length ? _nwJog : ["Jogador"];
}
function nwCurto(id: string): string {
  return id === sim.meuClubeId ? estado.clube.nomeCurto : (clubeSim.get(id)?.nomeCurto ?? "—");
}

type NwCtx = { R: () => number; clube: string; clube2: string; cidade: string; jog: string; jog2: string; pes: string; pn: string; rod: number };
type NwTpl = { cat: CatNoticia; grav: NoticiaItem["grav"]; w: number; f: (c: NwCtx) => [string, string] };

const NW_TPLS: NwTpl[] = [
  // ---- lesões
  { cat: "lesao", grav: "grave", w: 4, f: (c) => [`${c.jog} rompe ligamento do joelho e está fora da temporada`, `Exames confirmaram lesão de LCA no jogador do ${c.clube}. Cirurgia marcada; recuperação estimada em 8 a 10 meses.`] },
  { cat: "lesao", grav: "grave", w: 3, f: (c) => [`Fratura tira ${c.jog} dos gramados por cerca de 4 meses`, `O jogador do ${c.clube} deixou o último jogo de maca. O departamento médico descarta sequela, mas o retorno só é esperado para o fim do campeonato.`] },
  { cat: "lesao", grav: "quente", w: 6, f: (c) => [`${c.jog} sente a coxa e vira dúvida no ${c.clube}`, `Lesão muscular de grau 1 detectada. O ${c.clube} não deve arriscar; ${c.pn} fica fora da próxima rodada.`] },
  { cat: "lesao", grav: "quente", w: 4, f: (c) => [`Pancada na cabeça: ${c.jog} deixa o campo com suspeita de concussão`, `O jogador do ${c.clube} passou pelo protocolo e foi levado ao hospital para exames. O clube informou que ele está consciente e estável.`] },
  { cat: "lesao", grav: "quente", w: 3, f: (c) => [`${c.jog} passa por cirurgia no tornozelo; ${c.clube} fala em sucesso`, `O procedimento durou cerca de 90 minutos. A transição física deve começar em seis semanas.`] },
  { cat: "lesao", grav: "nota", w: 4, f: (c) => [`${c.jog} treina com bola e se aproxima da volta ao ${c.clube}`, `Depois de dois meses parado, participou de atividade com o grupo e pode ser relacionado já na próxima rodada.`] },
  { cat: "lesao", grav: "nota", w: 3, f: (c) => [`${c.jog} tem recaída e atrasa retorno ao ${c.clube}`, `O jogador voltou a sentir a lesão no treino. O ${c.clube} recalcula o prazo e fala em 'cautela redobrada'.`] },
  // ---- disciplina
  { cat: "disciplina", grav: "quente", w: 5, f: (c) => [`Expulso, ${c.jog} pega gancho de três jogos no tribunal`, `Punido por reclamação e conduta antidesportiva. O ${c.clube} estuda recorrer, mas o jogador já está fora do clássico.`] },
  { cat: "disciplina", grav: "grave", w: 2, f: (c) => [`${c.jog} é denunciado por agressão e pode pegar até 12 jogos`, `Imagens flagraram o lance longe da bola em ${c.clube} x ${c.clube2}. O procurador pediu pena máxima; julgamento na próxima terça.`] },
  { cat: "disciplina", grav: "quente", w: 4, f: (c) => [`${c.jog} bate boca com companheiro no vestiário após derrota do ${c.clube}`, `A discussão quase virou briga e precisou da intervenção do capitão. O ${c.clube} minimiza: 'coisa de jogo'.`] },
  { cat: "disciplina", grav: "nota", w: 4, f: (c) => [`${c.jog} se recusa a ser substituído e irrita o técnico do ${c.clube}`, `Saiu reclamando e chutou uma garrafa no banco. A comissão promete conversa 'olho no olho'.`] },
  { cat: "disciplina", grav: "quente", w: 4, f: (c) => [`Direção do ${c.clube} multa jogadores por indisciplina`, `O clube não divulgou nomes, mas confirmou punição financeira 'por descumprimento das regras internas de concentração'.`] },
  { cat: "disciplina", grav: "nota", w: 3, f: (c) => [`${c.jog} chega atrasado ao treino pela terceira vez e é multado pelo ${c.clube}`, `Pagará o equivalente a uma diária de multa, conforme o regulamento interno.`] },
  { cat: "disciplina", grav: "quente", w: 3, f: (c) => [`Rachão no treino do ${c.clube}: ${c.jog} e ${c.jog2} trocam empurrões`, `O treino foi encerrado mais cedo. O técnico garantiu depois que 'está tudo resolvido'.`] },
  // ---- torcida
  { cat: "torcida", grav: "quente", w: 5, f: (c) => [`Confronto entre organizadas antes de ${c.clube} x ${c.clube2} deixa feridos`, `A briga foi a três quarteirões do estádio. A PM registrou ocorrência; há relatos de pedras e rojões. Nenhum jogador se envolveu.`] },
  { cat: "torcida", grav: "grave", w: 3, f: (c) => [`Ônibus da delegação do ${c.clube} é apedrejado; ${c.jog} tem corte na testa`, `O ataque ocorreu na chegada ao CT. ${c.pn} levou pontos e passa por exames por precaução. O clube vai à polícia.`] },
  { cat: "torcida", grav: "quente", w: 4, f: (c) => [`Jogo do ${c.clube} é paralisado após bomba cair perto do gol`, `A partida ficou parada por oito minutos. Ninguém se feriu. O caso vai ao tribunal.`] },
  { cat: "torcida", grav: "quente", w: 4, f: (c) => [`Torcedores invadem o gramado no fim de ${c.clube} x ${c.clube2}`, `Cerca de 20 pessoas pularam o alambrado para cobrar o elenco. O ${c.clube} pode ser punido com portões fechados.`] },
  { cat: "torcida", grav: "grave", w: 3, f: (c) => [`Tribunal pune ${c.clube} com dois jogos de portões fechados`, `A decisão cita 'reiterada conduta violenta da torcida'. O clube perde renda milionária e vai recorrer.`] },
  { cat: "torcida", grav: "nota", w: 4, f: (c) => [`Torcida do ${c.clube} faz protesto e fecha a entrada do CT`, `Cerca de 300 torcedores cobraram 'mais raça'. A diretoria recebeu uma comissão; o treino foi remarcado.`] },
  { cat: "torcida", grav: "grave", w: 1, f: (c) => [`Briga entre torcidas em bar termina com um morto`, `A confusão envolveu integrantes de organizadas de ${c.clube} e ${c.clube2}. Dois suspeitos foram presos; a investigação segue em andamento.`] },
  { cat: "torcida", grav: "quente", w: 3, f: (c) => [`Delegação do ${c.clube} treina de portões fechados após pressão da torcida`, `Depois da quarta derrota seguida, o clube isolou o CT 'para preservar o grupo'.`] },
  // ---- tragédia / luto
  { cat: "tragedia", grav: "grave", w: 2, f: (c) => [`Morre ${c.pes}, ídolo histórico do ${c.clube}, aos ${70 + Math.floor(c.R() * 16)} anos`, `O ex-camisa 10 defendeu o ${c.clube} por dez temporadas. O clube decretou luto oficial; haverá minuto de silêncio na rodada e os jogadores usarão braçadeira preta.`] },
  { cat: "tragedia", grav: "grave", w: 2, f: (c) => [`${c.pes}, ex-dirigente do ${c.clube}, morre após problema de saúde`, `Ele comandou o clube em duas gestões e é lembrado pela reforma do estádio. O velório será no salão nobre.`] },
  { cat: "tragedia", grav: "grave", w: 1, f: (c) => [`Ex-goleiro do ${c.clube}, ${c.pes} sofre acidente de carro e está internado`, `O acidente foi na madrugada, na rodovia que liga ${c.cidade} ao litoral. O hospital informa quadro estável.`] },
  { cat: "tragedia", grav: "grave", w: 1, f: (c) => [`Jovem da base do ${c.clube} passa mal em treino e é hospitalizado`, `O atleta de 17 anos foi socorrido pela equipe médica. O ${c.clube} informou que ele está consciente e fará bateria de exames cardíacos.`] },
  { cat: "tragedia", grav: "nota", w: 2, f: (c) => [`Rodada terá minuto de silêncio em homenagem a ${c.pes}`, `A federação confirmou o gesto em todos os estádios após a morte do ex-árbitro, referência de uma geração.`] },
  // ---- fora de campo
  { cat: "extracampo", grav: "grave", w: 4, f: (c) => [`${c.jog} é flagrado dirigindo alcoolizado e é afastado pelo ${c.clube}`, `Passou pelo teste do bafômetro numa blitz de madrugada e teve a CNH suspensa. O clube abriu processo interno, multou o jogador e ele não treina até segunda ordem.`] },
  { cat: "extracampo", grav: "grave", w: 2, f: (c) => [`${c.jog} se envolve em acidente de trânsito de madrugada; motociclista fica ferido`, `O carro do jogador do ${c.clube} bateu numa moto na saída de um bar. ${c.pn} foi à delegacia, prestou depoimento e foi liberado. O clube 'aguarda esclarecimentos'.`] },
  { cat: "extracampo", grav: "quente", w: 5, f: (c) => [`${c.jog} aparece em vídeo de balada na véspera do clássico e é cortado pelo ${c.clube}`, `As imagens circularam de madrugada. O ${c.clube} tirou o jogador da lista de relacionados e aplicou multa 'exemplar'.`] },
  { cat: "extracampo", grav: "quente", w: 4, f: (c) => [`Festa clandestina reúne jogadores do ${c.clube} durante a semana; elenco é multado`, `Cerca de seis atletas estariam no local. A diretoria confirmou punição financeira a todos os presentes e reforço nas regras de concentração.`] },
  { cat: "extracampo", grav: "quente", w: 3, f: (c) => [`${c.jog} briga em boate e caso vai parar na polícia`, `Testemunhas dizem que a confusão começou com um pedido de foto. O atacante do ${c.clube} nega agressão; o clube 'apura os fatos'.`] },
  { cat: "extracampo", grav: "quente", w: 3, f: (c) => [`${c.jog} some por dois dias e retorna atrasado da folga; ${c.clube} pune`, `O jogador ficou incomunicável. Multado, pediu desculpas ao grupo em reunião.`] },
  { cat: "extracampo", grav: "grave", w: 2, f: (c) => [`Justiça condena ${c.jog} a prestação de serviços por dirigir embriagado`, `A sentença também prevê multa e suspensão da habilitação por oito meses. O ${c.clube} diz que vai 'acompanhar o jogador de perto'.`] },
  { cat: "extracampo", grav: "nota", w: 2, f: (c) => [`Foto de ${c.jog} em cassino no exterior gera mal-estar no ${c.clube}`, `O jogador estava de férias, mas a imagem repercutiu mal entre torcedores. O clube classificou como 'assunto particular'.`] },
  // ---- institucional
  { cat: "institucional", grav: "grave", w: 3, f: (c) => [`Justiça bloqueia contas do ${c.clube} por dívida trabalhista`, `A cobrança de ex-funcionários gira em torno de R$ 6 milhões. O ${c.clube} diz que negocia acordo e que 'as atividades seguem normais'.`] },
  { cat: "institucional", grav: "quente", w: 3, f: (c) => [`${c.clube} troca de presidente no meio da temporada`, `${c.pes} assume interinamente após a renúncia da diretoria. A promessa é 'organizar a casa' e manter o técnico.`] },
  { cat: "institucional", grav: "grave", w: 2, f: (c) => [`Federação pune ${c.clube} com perda de 3 pontos por escalação irregular`, `Um jogador suspenso entrou em campo por erro do departamento de registro. O clube vai recorrer, mas a punição vale a partir de já.`] },
  { cat: "institucional", grav: "grave", w: 2, f: (c) => [`Patrocinador rompe contrato com o ${c.clube} após série de escândalos`, `A marca alega 'quebra de valores'. O clube perde receita relevante e já busca substituto no mercado.`] },
  { cat: "institucional", grav: "quente", w: 3, f: (c) => [`Elenco do ${c.clube} ameaça não treinar por salários atrasados`, `Os jogadores estão com dois meses em aberto. A diretoria pediu 'mais 15 dias'.`] },
  { cat: "institucional", grav: "nota", w: 3, f: (c) => [`${c.clube} fecha o CT para visitas e reforça a segurança patrimonial`, `A medida veio após furto de equipamentos na semana passada. Nada de grave, segundo o clube.`] },
  // ---- seleção
  { cat: "selecao", grav: "nota", w: 4, f: (c) => [`${c.jog}, do ${c.clube}, é convocado para a Seleção Nacional`, `É a primeira chamada. O ${c.clube} comemora, mas perde o jogador por dois jogos por causa da data Fifa.`] },
  { cat: "selecao", grav: "quente", w: 3, f: (c) => [`${c.jog} é cortado da Seleção por lesão e acende alerta no ${c.clube}`, `Problema muscular detectado na reapresentação ao selecionado. Pode ser desfalque na volta do campeonato.`] },
  { cat: "selecao", grav: "nota", w: 2, f: (c) => [`${c.jog} estreia pela Seleção com assistência e volta prestigiado ao ${c.clube}`, `Entrou no segundo tempo e participou do gol da vitória por 2 a 1.`] },
  // ---- arbitragem
  { cat: "arbitragem", grav: "quente", w: 4, f: (c) => [`Pênalti não marcado revolta o ${c.clube} em rodada polêmica`, `O lance no fim do jogo teria sido penal claro sobre ${c.jog}. A comissão de arbitragem admitiu erro 'em áudio a ser divulgado'.`] },
  { cat: "arbitragem", grav: "nota", w: 3, f: (c) => [`Árbitro de ${c.clube} x ${c.clube2} é afastado da próxima rodada`, `Decisão da própria comissão 'para preservar o profissional', após reclamações dos dois lados.`] },
  { cat: "arbitragem", grav: "nota", w: 3, f: (c) => [`Gol de ${c.jog} é anulado por impedimento de poucos centímetros`, `A revisão no vídeo levou quatro minutos. O ${c.clube} reclamou da demora; a marcação foi mantida.`] },
  // ---- bastidores
  { cat: "bastidores", grav: "nota", w: 3, f: (c) => [`Comemoração de ${c.jog} vira polêmica e rende resposta nas redes`, `O jogador do ${c.clube} fez um gesto para a torcida adversária após o gol. Ele minimizou: 'foi na emoção'.`] },
  { cat: "bastidores", grav: "nota", w: 3, f: (c) => [`Técnico do ${c.clube} bate boca com repórter em entrevista`, `A discussão foi por uma pergunta sobre a escalação. O clube pediu 'respeito ao trabalho' em nota.`] },
  { cat: "bastidores", grav: "nota", w: 3, f: (c) => [`Capitão do ${c.clube} faz mea-culpa após vaias`, `O zagueiro assumiu a responsabilidade pela fase ruim e pediu apoio da torcida na sequência em casa.`] },
  { cat: "bastidores", grav: "nota", w: 3, f: (c) => [`Diretoria do ${c.clube} dá 'voto de confiança' ao técnico apesar da pressão`, `Após reunião de emergência, o presidente garantiu o comando 'até o fim da temporada'.`] },
  // ---- mercado
  { cat: "mercado", grav: "nota", w: 4, f: (c) => [`${c.clube} recebe sondagem do exterior por ${c.jog}`, `Um clube do futebol asiático teria pedido informações. O ${c.clube} diz que 'não há proposta' e que o jogador 'não está à venda'.`] },
  { cat: "mercado", grav: "nota", w: 4, f: (c) => [`${c.clube} recusa proposta por ${c.jog}`, `A oferta veio de um rival direto. A diretoria considerou 'muito abaixo' e encerrou a conversa.`] },
  { cat: "mercado", grav: "quente", w: 3, f: (c) => [`${c.jog} renova com o ${c.clube} com multa recorde`, `O novo vínculo triplica a cláusula de rescisão. O clube blinda o jogador contra 'assédio'.`] },
  { cat: "mercado", grav: "quente", w: 3, f: (c) => [`${c.jog} pede para sair do ${c.clube} e não se reapresenta`, `O estafe alega 'desgaste com a diretoria'. O ${c.clube} garante que só libera 'por proposta que interesse'.`] },
];

function gerarNoticias(rMax: number): NoticiaItem[] {
  const clubesOutros = sim.clubes.filter((x) => x.id !== sim.meuClubeId);
  const jogPool = nwJogadores();
  const total = NW_TPLS.reduce((s, t) => s + t.w, 0);
  const lista: NoticiaItem[] = [];

  for (let r = 1; r <= Math.max(1, rMax); r++) {
    const R = rngStr(`${estado.seed}|noticias|${r}`);
    const dataR = sim.partidas.find((p) => p.rodada === r)?.data ?? estado.hoje;
    const pega = <T,>(arr: T[]) => arr[Math.floor(R() * arr.length)];
    const pessoa = () => `${pega(NW_NOMES)} ${pega(NW_SOBR)}`;

    // 1) resultado de destaque da rodada
    const jogosR = sim.partidas.filter((p) => p.rodada === r);
    if (jogosR.length) {
      const meuJogo = jogosR.find((p) => p.mandanteId === sim.meuClubeId || p.visitanteId === sim.meuClubeId);
      const p = meuJogo && R() < 0.6
        ? meuJogo
        : [...jogosR].sort((a, b) => Math.abs(b.golsMandante - b.golsVisitante) - Math.abs(a.golsMandante - a.golsVisitante))[0];
      const m = nwCurto(p.mandanteId), v = nwCurto(p.visitanteId);
      const dif = Math.abs(p.golsMandante - p.golsVisitante);
      const venceu = p.golsMandante === p.golsVisitante ? null : (p.golsMandante > p.golsVisitante ? m : v);
      const manch = p.golsMandante === p.golsVisitante
        ? `${m} e ${v} ficam no ${p.golsMandante} a ${p.golsVisitante} pela ${r}ª rodada`
        : dif >= 3
          ? `${venceu} atropela e vence por ${Math.max(p.golsMandante, p.golsVisitante)} a ${Math.min(p.golsMandante, p.golsVisitante)}`
          : `${venceu} vence ${venceu === m ? v : m} por ${Math.max(p.golsMandante, p.golsVisitante)} a ${Math.min(p.golsMandante, p.golsVisitante)}`;
      const envolveMeu = p.mandanteId === sim.meuClubeId || p.visitanteId === sim.meuClubeId;
      lista.push({
        id: `n${r}-res`, rodada: r, data: dataR, cat: "resultado", grav: "nota", fonte: pega(NW_FONTES),
        manchete: manch,
        corpo: `${m} ${p.golsMandante} x ${p.golsVisitante} ${v}, no fechamento da ${r}ª rodada.` + (envolveMeu ? " Seu time entrou em campo nesta partida." : ""),
        clube: envolveMeu ? estado.clube.nomeCurto : m, meu: envolveMeu,
      });
    }

    // 2) leitura de tabela a cada 3 rodadas
    if (r % 3 === 0) {
      lista.push({
        id: `n${r}-tab`, rodada: r, data: dataR, cat: "tabela", grav: "nota", fonte: pega(NW_FONTES),
        manchete: R() < 0.5
          ? `Briga pelo título e pelo rebaixamento esquenta após ${r} rodadas`
          : `Panorama da ${r}ª rodada: quem sobe e quem desce`,
        corpo: `A ${r}ª rodada mexeu com as duas pontas da tabela. Confira a classificação completa e a sua posição.`,
        clube: null, meu: false,
      });
    }

    // 3) 2 a 4 itens de mundo do futebol
    const n = 2 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) {
      let acc = R() * total, tpl = NW_TPLS[0];
      for (const t of NW_TPLS) { acc -= t.w; if (acc <= 0) { tpl = t; break; } }
      const proximoDoMeu = ["lesao", "disciplina", "extracampo", "torcida", "institucional"].includes(tpl.cat);
      const usaMeu = R() < (proximoDoMeu ? 0.3 : 0.16);
      const cl = usaMeu ? clubeSim.get(sim.meuClubeId)! : pega(clubesOutros);
      let cl2 = pega(clubesOutros);
      if (cl2.id === cl.id) cl2 = pega(clubesOutros);
      const jogNome = usaMeu && estado.elenco.length && R() < 0.5
        ? pega(estado.elenco).nome
        : pega(jogPool);
      const ctx: NwCtx = {
        R,
        clube: usaMeu ? estado.clube.nomeCurto : cl.nomeCurto,
        clube2: cl2.nomeCurto,
        cidade: (usaMeu ? estado.clube.cidade : cl.cidade) || "capital",
        jog: jogNome,
        jog2: pega(jogPool),
        pes: pessoa(),
        pn: jogNome.split(" ")[0],
        rod: r,
      };
      const [manchete, corpo] = tpl.f(ctx);
      lista.push({
        id: `n${r}-${k}`, rodada: r, data: dataR, cat: tpl.cat, grav: tpl.grav, fonte: pega(NW_FONTES),
        manchete, corpo, clube: usaMeu ? estado.clube.nomeCurto : cl.nomeCurto, meu: usaMeu,
      });
    }
  }
  return lista.reverse(); // mais recentes primeiro
}

/** Lista completa de notícias até a rodada revelada. */
export function listaNoticias(): NoticiaItem[] {
  return gerarNoticias(rodadaAtual());
}

function montarNoticias(d: Derivado) {
  return gerarNoticias(d.rodada).slice(0, 6).map((n) => ({
    data: n.data,
    tag: CAT_NOTICIA[n.cat].t.toUpperCase(),
    manchete: n.manchete,
    corpo: n.corpo,
  }));
}

function montarAlertas() {
  const out: { nivel: "info" | "aviso" | "critico"; icone: string; texto: string; para: string }[] = [];
  for (const a of estado.financas.alertas) {
    out.push({ nivel: a.nivel >= 2 ? "critico" : "aviso", icone: "▲", texto: a.mensagem, para: "/financas" });
  }
  const lesionados = estado.elenco.filter((j) => j.lesionado);
  if (lesionados.length) {
    out.push({
      nivel: "aviso", icone: "✚", para: "/elenco",
      texto: `${lesionados.length} jogador(es) no departamento médico: ${lesionados.map((j) => j.nome.split(" ")[0]).join(", ")}.`,
    });
  }
  const recebidas = estado.mercado.propostasRecebidas.filter((p) => p.status === "PENDENTE");
  if (recebidas.length) {
    out.push({
      nivel: "info", icone: "⇄", para: "/mercado",
      texto: `${recebidas.length} proposta(s) recebida(s) aguardando sua resposta.`,
    });
  }
  const contra = estado.mercado.propostasEnviadas.filter((p) => p.status === "CONTRAPROPOSTA");
  if (contra.length) {
    out.push({
      nivel: "info", icone: "⇄", para: "/mercado",
      texto: `${contra.length} contraproposta(s) de outros clubes na sua mesa.`,
    });
  }
  const t = montarTorcida();
  if (t.pressao >= 66) {
    out.push({
      nivel: t.pressao >= 82 ? "critico" : "aviso", icone: "📣", para: "/torcida",
      texto: t.pressao >= 82
        ? `Sua cadeira balança: relação com a torcida em "${t.banda.rot.toLowerCase()}" e a diretoria fala em ${t.cadeira.jogos} jogos.`
        : `Pressão da torcida subindo — relação em "${t.banda.rot.toLowerCase()}". Reação é cobrada.`,
    });
  }
  return out;
}

export function pendenciasMercado(): number {
  const acionaveis = new Set<FaseNeg>(["contraproposta", "aceita", "exames", "aprovado"]);
  return (
    estado.mercado.propostasRecebidas.filter((p) => p.status === "PENDENTE").length +
    estado.mercado.propostasEnviadas.filter((p) => p.status === "CONTRAPROPOSTA").length +
    mercadoStore().negs.filter((n) => acionaveis.has(n.status)).length
  );
}

/** Rodada atual do relógio (síncrono) — para o cabeçalho. */
export function rodadaCorrente(): number {
  return rodadaAtual();
}

/** Próximo jogo do clube (síncrono) — para o cabeçalho. */
export function proximoJogo() {
  return derivar().proximos[0] ?? null;
}

/** Notifica quem escuta que o relógio andou (avançar / reiniciar). */
function avisar() {
  window.dispatchEvent(new CustomEvent("fm:tick"));
}

// aplica o perfil salvo (nome/cores do clube do jogador) na carga do módulo
aplicarPerfil();
