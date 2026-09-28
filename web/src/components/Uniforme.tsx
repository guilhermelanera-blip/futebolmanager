import { useEffect, useRef, useState } from "react";
import { fonteCss } from "../lib/uniforme";
import type { Camisa as TCamisa, Calcao as TCalcao, Meiao as TMeiao, Kit, Peca } from "../lib/uniforme";

/* =============================================================== cor utils */
function rgb(h: string): [number, number, number] {
  const c = (h || "").replace("#", "");
  const s = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  if (s.length < 6) return [140, 140, 140];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function mix(a: string, b: string, k: number): string {
  const A = rgb(a), B = rgb(b);
  const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * k);
  return "#" + [m(0), m(1), m(2)].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
const dark = (h: string, k = 0.24) => mix(h, "#000000", k);
function claro(h: string): boolean {
  const [r, g, b] = rgb(h);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}
type Ctx = CanvasRenderingContext2D;

/* =============================================================== primitivas */
function contactShadow(c: Ctx, cx: number, cy: number, rx: number) {
  c.save();
  c.filter = "blur(5px)";
  c.fillStyle = "rgba(0,0,0,.22)";
  c.beginPath();
  c.ellipse(cx, cy, rx, rx * 0.16, 0, 0, 7);
  c.fill();
  c.restore();
}

/* -------------------------------------------------------------- CAMISA
   Básica: silhueta simétrica, cor lisa, gola e punho na cor 2, número. */
function pathCamisa(c: Ctx) {
  c.beginPath();
  c.moveTo(43, 12);
  c.lineTo(31, 9);
  c.lineTo(10, 17);
  c.quadraticCurveTo(7, 18, 8, 22);
  c.lineTo(11, 40);
  c.quadraticCurveTo(12, 44, 16, 43);
  c.lineTo(29, 37);
  c.lineTo(26, 104);
  c.quadraticCurveTo(26, 109, 32, 109);
  c.lineTo(68, 109);
  c.quadraticCurveTo(74, 109, 74, 104);
  c.lineTo(71, 37);
  c.lineTo(84, 43);
  c.quadraticCurveTo(88, 44, 89, 40);
  c.lineTo(92, 22);
  c.quadraticCurveTo(93, 18, 90, 17);
  c.lineTo(69, 9);
  c.lineTo(57, 12);
  c.quadraticCurveTo(50, 18, 43, 12);
  c.closePath();
}

function padraoCamisa(c: Ctx, k: TCamisa) {
  c.fillStyle = k.cor1;
  c.fillRect(4, 4, 92, 108);
  const faixa = (xs: number[], w: number) => { c.fillStyle = k.cor2; xs.forEach((x) => c.fillRect(x, 4, w, 108)); };
  switch (k.padrao) {
    case "listras": faixa([16, 30, 44, 58, 72], 7); break;
    case "listrasFinas": faixa([14, 22, 30, 38, 46, 54, 62, 70, 78, 86], 3.5); break;
    case "barras": c.fillStyle = k.cor2; [8, 32, 56, 80].forEach((y) => c.fillRect(4, y, 92, 12)); break;
    case "metades": c.fillStyle = k.cor2; c.fillRect(50, 4, 46, 108); break;
    case "faixa": c.fillStyle = k.cor2; c.fillRect(4, 48, 92, 18); break;
    case "faixaV":
      c.save(); c.beginPath();
      c.moveTo(14, 4); c.lineTo(34, 4); c.lineTo(90, 110); c.lineTo(70, 110); c.closePath();
      c.fillStyle = k.cor2; c.fill(); c.restore();
      break;
    case "central":
      c.fillStyle = k.cor2; c.fillRect(43, 4, 14, 108);
      break;
    case "xadrez":
      for (let r = 0; r < 20; r++) for (let s = 0; s < 16; s++) {
        c.fillStyle = (r + s) % 2 ? k.cor2 : k.cor1;
        c.fillRect(4 + s * 6, 4 + r * 6, 6, 6);
      }
      break;
    case "degrade": {
      const g = c.createLinearGradient(10, 6, 40, 110);
      g.addColorStop(0, k.cor1); g.addColorStop(1, k.cor2);
      c.fillStyle = g; c.fillRect(4, 4, 92, 108);
      break;
    }
    case "risca":
      c.fillStyle = k.cor2;
      for (let i = 0; i < 16; i++) c.fillRect(12 + i * 5, 4, 1.5, 108);
      break;
    case "ombros":
      c.fillStyle = k.cor2; c.fillRect(4, 4, 92, 20);
      break;
    default: break; // solido
  }
}

function drawCamisa(c: Ctx, ox: number, oy: number, S: number, k: TCamisa, numero: number | undefined, costas: boolean) {
  const px = (x: number) => ox + x * S;
  const py = (y: number) => oy + y * S;

  contactShadow(c, px(50), py(113), 30 * S);
  c.save();
  c.translate(ox, oy);
  c.scale(S, S);

  // corpo (cor lisa ou padrão) + leve sombreado
  pathCamisa(c);
  c.save();
  c.clip();
  padraoCamisa(c, k);
  const g = c.createLinearGradient(0, 8, 0, 110);
  g.addColorStop(0, "rgba(255,255,255,.09)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,.1)");
  c.fillStyle = g; c.fillRect(0, 0, 100, 112);
  c.restore();

  // contorno
  pathCamisa(c);
  c.lineWidth = 1.2; c.strokeStyle = "rgba(0,0,0,.26)"; c.stroke();

  // gola
  c.lineCap = "round";
  const gc = k.gola === "sem" ? k.cor1 : k.corGola;
  if (k.gola === "v") {
    c.lineWidth = 3.4; c.strokeStyle = gc;
    c.beginPath(); c.moveTo(42, 11); c.lineTo(50, 24); c.lineTo(58, 11); c.stroke();
  } else if (k.gola === "polo") {
    c.strokeStyle = gc; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(43, 12); c.quadraticCurveTo(50, 19, 57, 12); c.stroke();
    c.fillStyle = gc; c.fillRect(48.5, 12, 3, 12);
  } else {
    c.lineWidth = 3.8; c.strokeStyle = gc;
    c.beginPath(); c.moveTo(43, 12); c.quadraticCurveTo(50, 19, 57, 12); c.stroke();
  }

  c.restore();

  // nome + número (nítido, fora do scale, com a fonte escolhida)
  const { css: fCss, peso } = fonteCss(k.fonte);
  c.save();
  c.textAlign = "center"; c.textBaseline = "middle";

  if (costas && k.nome && k.nome.trim()) {
    const nm = k.nome.trim().toUpperCase();
    const nsize = Math.max(9, Math.min(15, 90 / nm.length));
    c.font = `${peso} ${nsize * S}px ${fCss}`;
    c.fillStyle = "rgba(0,0,0,.2)";
    c.fillText(nm, px(50), py(34) + 1 * S);
    c.fillStyle = k.corNumero;
    c.fillText(nm, px(50), py(34));
  }
  if (numero != null) {
    const esc = k.numEscala ?? 1;
    const base = costas ? (k.nome && k.nome.trim() ? 38 : 42) : 26;
    const size = base * esc;
    const ny = costas ? py(k.nome && k.nome.trim() ? 62 : 58) : py(52);
    c.font = `${peso} ${size * S}px ${fCss}`;
    c.fillStyle = "rgba(0,0,0,.2)";
    c.fillText(String(numero), px(50), ny + 1.3 * S);
    c.fillStyle = k.corNumero;
    c.fillText(String(numero), px(50), ny);
  }
  c.restore();
}

/* -------------------------------------------------------------- CALÇÃO
   Básico: silhueta simétrica, cor lisa, número numa perna. */
function pathCalcao(c: Ctx) {
  c.beginPath();
  c.moveTo(16, 6);
  c.quadraticCurveTo(16, 3, 20, 3);
  c.lineTo(80, 3);
  c.quadraticCurveTo(84, 3, 84, 6);
  c.lineTo(88, 54);
  c.quadraticCurveTo(88, 60, 82, 60);
  c.lineTo(58, 60);
  c.quadraticCurveTo(53, 60, 52, 54);
  c.lineTo(50, 38);
  c.lineTo(48, 54);
  c.quadraticCurveTo(47, 60, 42, 60);
  c.lineTo(18, 60);
  c.quadraticCurveTo(12, 60, 12, 54);
  c.closePath();
}
function drawCalcao(c: Ctx, ox: number, oy: number, S: number, k: TCalcao, numero: number | undefined, costas = false) {
  const px = (x: number) => ox + x * S;
  const py = (y: number) => oy + y * S;
  contactShadow(c, px(50), py(64), 36 * S);
  c.save();
  c.translate(ox, oy);
  c.scale(S, S);

  pathCalcao(c);
  c.save();
  c.clip();
  c.fillStyle = k.cor1; c.fillRect(0, 0, 100, 66);
  const c2 = k.cor2.toLowerCase() !== k.cor1.toLowerCase();
  if (k.padrao === "duasCores" && c2) { c.fillStyle = k.cor2; c.fillRect(50, 0, 50, 66); }
  if (k.padrao === "lateral" && c2) { c.fillStyle = k.cor2; c.fillRect(15, 4, 3.5, 52); c.fillRect(81.5, 4, 3.5, 52); }
  if (k.padrao === "listras" && c2) { c.fillStyle = k.cor2; [18, 26, 34, 66, 74, 82].forEach((x) => c.fillRect(x, 4, 2.4, 54)); }
  const g = c.createLinearGradient(0, 3, 0, 60);
  g.addColorStop(0, "rgba(255,255,255,.1)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,.12)");
  c.fillStyle = g; c.fillRect(0, 0, 100, 66);
  c.restore();

  pathCalcao(c);
  c.lineWidth = 1.2; c.strokeStyle = "rgba(0,0,0,.26)"; c.stroke();
  c.restore();

  if (numero != null && !costas) {
    c.save();
    c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `800 ${13 * S}px Archivo, Arial, sans-serif`;
    c.fillStyle = claro(k.cor1) ? "#1a1a1a" : "#ffffff";
    c.fillText(String(numero), px(31), py(32));
    c.restore();
  }
}

/* -------------------------------------------------------------- MEIÃO
   Básico: cano simples, cor lisa, opção de faixa/anéis/listras. */
function pathMeia(c: Ctx) {
  c.beginPath();
  c.moveTo(11, 4);
  c.quadraticCurveTo(6, 4, 6, 10);
  c.quadraticCurveTo(3, 48, 8, 84);
  c.quadraticCurveTo(9, 92, 16, 92);
  c.lineTo(30, 92);
  c.quadraticCurveTo(37, 92, 38, 84);
  c.quadraticCurveTo(43, 48, 40, 10);
  c.quadraticCurveTo(40, 4, 35, 4);
  c.closePath();
}
function drawMeiaBota(c: Ctx, ox: number, oy: number, S: number, k: TMeiao, flip: boolean) {
  c.save();
  c.translate(ox + (flip ? 46 * S : 0), oy);
  c.scale(flip ? -S : S, S);
  contactShadow(c, 22, 90, 16);

  pathMeia(c);
  c.save();
  c.clip();
  c.fillStyle = k.cor1; c.fillRect(0, 0, 46, 96);
  const c2 = k.cor2.toLowerCase() !== k.cor1.toLowerCase();
  if (k.padrao === "faixaTopo" && c2) { c.fillStyle = k.cor2; c.fillRect(0, 4, 46, 12); }
  if (k.padrao === "aneis" && c2) { c.fillStyle = k.cor2; [22, 33, 44].forEach((y) => c.fillRect(0, y, 46, 4)); }
  if (k.padrao === "listras" && c2) { c.fillStyle = k.cor2; [12, 17, 22, 27].forEach((x) => c.fillRect(x, 4, 1.6, 84)); }
  const g = c.createLinearGradient(0, 0, 46, 0);
  g.addColorStop(0, "rgba(0,0,0,.1)");
  g.addColorStop(0.4, "rgba(255,255,255,.1)");
  g.addColorStop(1, "rgba(0,0,0,.1)");
  c.fillStyle = g; c.fillRect(0, 0, 46, 96);
  c.restore();

  pathMeia(c);
  c.lineWidth = 1; c.strokeStyle = "rgba(0,0,0,.24)"; c.stroke();
  c.restore();
}

/* ============================================ modelo (imagem) do uniforme
   Se o usuário colocar PNGs em /public/uniforme/ (camisa.png, calcao.png,
   meiao.png — de preferência em tons de cinza/branco, sem número), o preview
   usa essas imagens como base e as cores do editor são aplicadas por cima
   (multiply + screen). Sem os arquivos, cai no desenho vetorial. */
const TPL_BASE = "/uniforme/";
type TplState = HTMLImageElement | null | "loading" | "fail";
const tplCache: Record<string, TplState> = {};
function getTpl(name: string): HTMLImageElement | null {
  const cur = tplCache[name];
  if (cur === undefined) {
    tplCache[name] = "loading";
    const img = new Image();
    img.onload = () => { tplCache[name] = img; window.dispatchEvent(new Event("fm:tpl")); };
    img.onerror = () => { tplCache[name] = "fail"; };
    img.src = TPL_BASE + name;
    return null;
  }
  return cur && cur !== "loading" && cur !== "fail" ? cur : null;
}
/** Desenha a imagem e tinge o retângulo com a cor (mantém sombras/detalhes escuros). */
function pecaTpl(c: Ctx, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number, cor: string) {
  c.save();
  c.beginPath(); c.rect(dx, dy, dw, dh); c.clip();
  c.drawImage(img, dx, dy, dw, dh);
  c.globalCompositeOperation = "multiply";
  c.globalAlpha = 0.92; c.fillStyle = cor; c.fillRect(dx, dy, dw, dh);
  c.globalCompositeOperation = "screen";
  c.globalAlpha = 0.16; c.fillStyle = cor; c.fillRect(dx, dy, dw, dh);
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.restore();
}
function numeroSobre(c: Ctx, cx: number, cy: number, size: number, txt: string, cor: string) {
  c.save();
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `800 ${size}px Archivo, Arial, sans-serif`;
  c.fillStyle = "rgba(0,0,0,.32)"; c.fillText(txt, cx, cy + size * 0.05);
  c.fillStyle = cor; c.fillText(txt, cx, cy);
  c.restore();
}

/* =============================================================== canvas host */
type Modo = "camisa" | "calcao" | "meiao" | "folha" | "folha-mini";
const DIMS: Record<Modo, [number, number]> = {
  camisa: [120, 138],
  calcao: [120, 92],
  meiao: [150, 116],
  folha: [560, 400],
  "folha-mini": [150, 172],
};

function CanvasKit({
  modo, w, camisa, calcao, meiao, numero,
}: { modo: Modo; w: number; camisa?: TCamisa; calcao?: TCalcao; meiao?: TMeiao; numero?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tplTick, setTplTick] = useState(0);
  const [LW, LH] = DIMS[modo];
  const h = Math.round((w * LH) / LW);
  const key = JSON.stringify({ modo, w, camisa, calcao, meiao, numero });

  useEffect(() => {
    const bump = () => setTplTick((t) => t + 1);
    window.addEventListener("fm:tpl", bump);
    return () => window.removeEventListener("fm:tpl", bump);
  }, []);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = LW * dpr; cv.height = LH * dpr;
    const c = cv.getContext("2d");
    if (!c) return;
    c.scale(dpr, dpr);
    c.clearRect(0, 0, LW, LH);

    // modelo em imagem (só nas visões "folha", que representam o uniforme inteiro)
    const usaTpl = modo === "folha" || modo === "folha-mini";
    const Tc = usaTpl ? getTpl("camisa.png") : null;
    const Tk = usaTpl ? getTpl("calcao.png") : null;
    const Tm = usaTpl ? getTpl("meiao.png") : null;

    if (modo === "camisa" && camisa) {
      drawCamisa(c, 8, 6, (LW - 16) / 100, camisa, numero, false);
    } else if (modo === "calcao" && calcao) {
      drawCalcao(c, 8, 6, (LW - 16) / 100, calcao, numero);
    } else if (modo === "meiao" && meiao) {
      const s = (LW - 24) / 100;
      drawMeiaBota(c, 4, 8, s, meiao, false);
      drawMeiaBota(c, LW / 2 + 6, 8, s, meiao, true);
    } else if (modo === "folha-mini" && camisa) {
      if (Tc) {
        pecaTpl(c, Tc, 8, 4, LW - 16, LH - 26, camisa.cor1);
        if (numero != null) numeroSobre(c, LW / 2, LH * 0.44, LH * 0.2, String(numero), camisa.corNumero);
      } else drawCamisa(c, 8, 6, 1.34, camisa, numero, false);
    } else if (modo === "folha" && camisa && calcao && meiao) {
      c.fillStyle = "#9096a0";
      c.font = "700 10px Archivo, sans-serif";
      c.textAlign = "center";
      // linha 1 — camisa frente / costas
      c.fillText("FRENTE", 145, 14); c.fillText("COSTAS", 415, 14);
      if (Tc) {
        pecaTpl(c, Tc, 55, 20, 180, 200, camisa.cor1);
        pecaTpl(c, Tc, 325, 20, 180, 200, camisa.cor1);
        if (numero != null) {
          numeroSobre(c, 145, 122, 30, String(numero), camisa.corNumero);
          numeroSobre(c, 415, 116, 52, String(numero), camisa.corNumero);
        }
      } else {
        drawCamisa(c, 60, 18, 1.7, camisa, numero, false);
        drawCamisa(c, 330, 18, 1.7, camisa, numero, true);
      }
      // linha 2 — calção + meião
      c.fillText("CALÇÃO", 145, 246); c.fillText("MEIÃO", 400, 246);
      if (Tk) pecaTpl(c, Tk, 78, 252, 148, 110, calcao.cor1);
      else drawCalcao(c, 70, 252, 1.6, calcao, numero, false);
      if (Tm) pecaTpl(c, Tm, 330, 252, 140, 140, meiao.cor1);
      else {
        drawMeiaBota(c, 328, 252, 1.4, meiao, false);
        drawMeiaBota(c, 400, 252, 1.4, meiao, true);
      }
    }
  }, [key, LW, LH, modo, camisa, calcao, meiao, numero, tplTick]);

  return <canvas ref={ref} style={{ width: w, height: h, display: "block" }} aria-hidden />;
}

/* =============================================================== API estável */
export function Camisa({ camisa, numero, tamanho = 120 }: { camisa: TCamisa; numero?: number; tamanho?: number; vista?: "frente" | "costas" }) {
  return <CanvasKit modo="camisa" w={tamanho} camisa={camisa} numero={numero} />;
}
export function Calcao({ calcao, numero, tamanho = 120 }: { calcao: TCalcao; numero?: number; tamanho?: number }) {
  return <CanvasKit modo="calcao" w={tamanho} calcao={calcao} numero={numero} />;
}
export function Meiao({ meiao, tamanho = 150 }: { meiao: TMeiao; tamanho?: number }) {
  return <CanvasKit modo="meiao" w={tamanho} meiao={meiao} />;
}
export function KitFolha({
  kit, numero, tamanho = 320, compacto = false,
}: { kit: Kit; numero?: number; ativo?: Peca; tamanho?: number; compacto?: boolean }) {
  return (
    <CanvasKit
      modo={compacto ? "folha-mini" : "folha"}
      w={compacto ? Math.min(tamanho, 132) : Math.min(tamanho * 1.7, 560)}
      camisa={kit.camisa} calcao={kit.calcao} meiao={kit.meiao} numero={numero}
    />
  );
}
