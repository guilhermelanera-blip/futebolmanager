import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Params = {
  a: string; b: string; capacidade: number; estilo: string; forma: string;
  corArq: string; corTeto: string; corAcesso: string; gramado: string;
  climaCond?: string; climaPeriodo?: string;
};

export const GRAMADOS = [
  { v: "faixas", t: "Listrado" },
  { v: "xadrez", t: "Xadrez" },
  { v: "circular", t: "Circular" },
  { v: "diagonal", t: "Diagonal" },
  { v: "liso", t: "Liso" },
] as const;

/* ------------------------------------------------------------------ texturas */
function desenharGrama(x: CanvasRenderingContext2D, w: number, h: number, tipo: string) {
  const claro = "#3f8f4e", escuro = "#357c43";
  x.fillStyle = escuro; x.fillRect(0, 0, w, h);
  if (tipo === "faixas") {
    for (let i = 0; i < 18; i++) { x.fillStyle = i % 2 ? claro : escuro; x.fillRect((i * w) / 18, 0, w / 18 + 1, h); }
  } else if (tipo === "xadrez") {
    const nx = 14, ny = 9;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { x.fillStyle = (i + j) % 2 ? claro : escuro; x.fillRect((i * w) / nx, (j * h) / ny, w / nx + 1, h / ny + 1); }
  } else if (tipo === "circular") {
    x.fillStyle = claro; x.fillRect(0, 0, w, h);
    for (let r = 680; r > 0; r -= 42) { x.fillStyle = (Math.round(r / 42) % 2) ? claro : escuro; x.beginPath(); x.arc(w / 2, h / 2, r, 0, Math.PI * 2); x.fill(); }
  } else if (tipo === "diagonal") {
    x.save(); x.translate(w / 2, h / 2); x.rotate(Math.PI / 5); x.translate(-w, -h);
    for (let i = 0; i < 44; i++) { x.fillStyle = i % 2 ? claro : escuro; x.fillRect((i * w * 2.4) / 44, 0, (w * 2.4) / 44 + 1, h * 2.4); }
    x.restore();
  } else {
    x.fillStyle = mix(claro, escuro, 0.5); x.fillRect(0, 0, w, h);
  }
}
function desenharLinhas(x: CanvasRenderingContext2D, w: number, h: number) {
  x.strokeStyle = "rgba(255,255,255,.92)";
  x.lineWidth = 4;
  const m = 30;
  x.strokeRect(m, m, w - 2 * m, h - 2 * m);
  x.beginPath(); x.moveTo(w / 2, m); x.lineTo(w / 2, h - m); x.stroke();
  x.beginPath(); x.arc(w / 2, h / 2, 84, 0, Math.PI * 2); x.stroke();
  x.fillStyle = "rgba(255,255,255,.95)";
  x.beginPath(); x.arc(w / 2, h / 2, 4, 0, 7); x.fill();
  const pah = 268, paw = 150, gah = 120, gaw = 54;
  x.strokeRect(m, h / 2 - pah / 2, paw, pah);
  x.strokeRect(w - m - paw, h / 2 - pah / 2, paw, pah);
  x.strokeRect(m, h / 2 - gah / 2, gaw, gah);
  x.strokeRect(w - m - gaw, h / 2 - gah / 2, gaw, gah);
  x.beginPath(); x.arc(m + 108, h / 2, 82, -0.9, 0.9); x.stroke();
  x.beginPath(); x.arc(w - m - 108, h / 2, 82, Math.PI - 0.9, Math.PI + 0.9); x.stroke();
}
function mkTex(draw: (x: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 660;
  draw(c.getContext("2d")!, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
/* gramado + linhas (usado no campo retangular) */
function texGramado(tipo = "faixas"): THREE.Texture {
  return mkTex((x, w, h) => { desenharGrama(x, w, h, tipo); desenharLinhas(x, w, h); });
}
/* só o padrão de corte (infield do estádio oval) */
function texGrama(tipo = "faixas"): THREE.Texture {
  return mkTex((x, w, h) => desenharGrama(x, w, h, tipo));
}
/* só as linhas, fundo transparente (marcação sobre o infield oval) */
function texLinhas(): THREE.Texture {
  return mkTex((x, w, h) => desenharLinhas(x, w, h));
}
function texAssentos(hex: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const x = c.getContext("2d")!;
  const dk = mix(hex, "#000", 0.55);       // vãos / corredores
  const lt = mix(hex, "#fff", 0.3);        // topo do encosto (brilho)
  const sh = mix(hex, "#000", 0.3);        // sombra do assento
  x.fillStyle = dk; x.fillRect(0, 0, 256, 256);
  const cols = 24, rows = 30;
  const cw = 256 / cols, rh = 256 / rows;
  for (let r = 0; r < rows; r++) for (let s = 0; s < cols; s++) {
    const px = s * cw, py = r * rh;
    const gx = 1.1, gT = 1.0, gB = 2.3;
    const bw = cw - gx * 2, bh = rh - gT - gB;
    x.fillStyle = hex; x.fillRect(px + gx, py + gT, bw, bh);            // cadeira
    x.fillStyle = lt; x.fillRect(px + gx, py + gT, bw, bh * 0.36);      // encosto
    x.fillStyle = sh; x.fillRect(px + gx, py + gT + bh * 0.78, bw, bh * 0.22); // base
  }
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255,255,255,.12)");
  g.addColorStop(1, "rgba(0,0,0,.24)");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
type CeuKind = "dia" | "noite" | "nublado" | "chuva" | "tempestade" | "calor";
const CEU_PALETA: Record<CeuKind, [string, string, string]> = {
  dia: ["#9cc0e0", "#cdddec", "#e9e3d6"],
  calor: ["#8fb4d6", "#dcdcc9", "#f2e6c9"],
  nublado: ["#9aa3ad", "#b9c0c6", "#cdd2d4"],
  chuva: ["#5c6670", "#78828c", "#8f97a0"],
  tempestade: ["#3a4048", "#4c535c", "#5b636c"],
  noite: ["#04060b", "#070a12", "#0c1019"],
};
function texCeu(kind: CeuKind = "dia"): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 8; c.height = 256;
  const x = c.getContext("2d")!;
  const [a, b, d] = CEU_PALETA[kind];
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, a);
  g.addColorStop(0.55, b);
  g.addColorStop(1, d);
  x.fillStyle = g; x.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** partículas de chuva (Points) num volume acima do estádio */
function criarChuva(n: number): THREE.Points {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = Math.random() * 22 + 1;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 34;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xcfd6dd, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/* ------------------------------------------------------------------ helpers */
function mix(a: string, b: string, k: number): string {
  const p = (h: string) => {
    const s = h.replace("#", "");
    const q = s.length === 3 ? s.split("").map((z) => z + z).join("") : s;
    return [parseInt(q.slice(0, 2), 16) || 0, parseInt(q.slice(2, 4), 16) || 0, parseInt(q.slice(4, 6), 16) || 0];
  };
  const A = p(a), B = p(b);
  const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * k);
  return "#" + [m(0), m(1), m(2)].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}

/* superfície elíptica varrida: perfil (d=distância radial p/ fora, h=altura)
   revolvido ao redor de uma elipse (ax,az). Gera um bowl inclinado de verdade. */
function bowlOval(ax: number, az: number, perfil: [number, number][], N = 190): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const M = perfil.length;
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI * 2;
    const ct = Math.cos(th), st = Math.sin(th);
    for (let j = 0; j < M; j++) {
      const [d, hh] = perfil[j];
      pos.push((ax + d) * ct, hh, (az + d) * st);
      uv.push((i / N) * 10, j / (M - 1));
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) {
    const a0 = i * M + j, a1 = a0 + 1, b0 = (i + 1) * M + j, b1 = b0 + 1;
    idx.push(a0, b0, a1, a1, b0, b1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* nuvem de cadeirinhas (InstancedMesh) sobre uma superfície de arquibancada */
function fazCadeiras(pts: { x: number; y: number; z: number }[], cor: string): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(0.055, 0.05, 0.052);
  const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 });
  const im = new THREE.InstancedMesh(geo, mat, pts.length);
  const d = new THREE.Object3D();
  for (let i = 0; i < pts.length; i++) {
    d.position.set(pts[i].x, pts[i].y, pts[i].z);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = true;
  return im;
}

/* bocas de vomitório (saídas de torcedores) recuadas na rampa da arquibancada.
   Gera quads escuros sobre a superfície do rake, cobrindo a parte de baixo. */
function vomitoriosRake(
  ptRake: (t: number, u: number) => [number, number, number],
  centros: number[], larguraT: number, uMax: number, cor: number,
): THREE.Mesh {
  const pos: number[] = [], idx: number[] = [];
  let base = 0;
  for (const c of centros) {
    const a0 = ptRake(c - larguraT, 0), a1 = ptRake(c - larguraT, uMax);
    const b0 = ptRake(c + larguraT, 0), b1 = ptRake(c + larguraT, uMax);
    pos.push(...a0, ...a1, ...b0, ...b1);
    idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    base += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cor, roughness: 1, side: THREE.DoubleSide }));
}

/* textura de rede (losango) com fundo transparente p/ alphaTest */
function texRede(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 48; c.height = 48;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, 48, 48);
  x.strokeStyle = "rgba(255,255,255,0.96)";
  x.lineWidth = 4;
  x.lineCap = "square";
  x.beginPath();
  x.moveTo(-4, -4); x.lineTo(52, 52);
  x.moveTo(52, -4); x.lineTo(-4, 52);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* trave estilo estádio: frame frontal + estrutura traseira inclinada + rede em losango */
function fazGol(W: number, H: number): THREE.Group {
  const g = new THREE.Group();
  const branco = new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.4, metalness: 0.05 });
  const r = 0.015;
  const Dt = H * 0.52, Db = H * 1.05;             // profundidade da rede no topo / no chão
  const Ht = H * 0.8;                             // altura do apoio traseiro superior
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const tubo = (a: THREE.Vector3, b: THREE.Vector3) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), branco);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true;
    return m;
  };
  // frame frontal
  g.add(tubo(V(0, 0, -W / 2), V(0, H, -W / 2)));
  g.add(tubo(V(0, 0, W / 2), V(0, H, W / 2)));
  g.add(tubo(V(0, H, -W / 2), V(0, H, W / 2)));
  // estrutura traseira
  g.add(tubo(V(-Db, 0.01, -W / 2), V(-Db, 0.01, W / 2)));
  [-1, 1].forEach((s) => {
    g.add(tubo(V(0, H, s * W / 2), V(-Dt, Ht, s * W / 2)));          // apoio superior
    g.add(tubo(V(-Dt, Ht, s * W / 2), V(-Db, 0.01, s * W / 2)));     // apoio traseiro
  });
  // rede
  const tex = texRede();
  const netMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, alphaTest: 0.32, side: THREE.DoubleSide, roughness: 1,
  });
  const K = 26; // células de rede por unidade
  const quad = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
    const ru = p0.distanceTo(p2) * K, rv = p0.distanceTo(p1) * K;
    const pos = new Float32Array([
      p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
      p2.x, p2.y, p2.z, p1.x, p1.y, p1.z, p3.x, p3.y, p3.z,
    ]);
    const uv = new Float32Array([0, 0, 0, rv, ru, 0, ru, 0, 0, rv, ru, rv]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, netMat);
  };
  const fbl = V(0, 0, -W / 2), ftl = V(0, H, -W / 2), fbr = V(0, 0, W / 2), ftr = V(0, H, W / 2);
  const btl = V(-Dt, Ht, -W / 2), btr = V(-Dt, Ht, W / 2), bbl = V(-Db, 0.01, -W / 2), bbr = V(-Db, 0.01, W / 2);
  g.add(quad(bbl, btl, bbr, btr));   // fundo (inclinado)
  g.add(quad(btl, ftl, btr, ftr));   // teto
  g.add(quad(fbl, ftl, bbl, btl));   // lateral esq
  g.add(quad(bbr, btr, fbr, ftr));   // lateral dir
  return g;
}


/* dugout / banco de reservas simples */
function fazBanco(cor: string): THREE.Group {
  const g = new THREE.Group();
  const W = 0.95, D = 0.32, H = 0.24;
  const estrut = new THREE.MeshStandardMaterial({ color: 0x2c2f34, roughness: 0.7 });
  const teto = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, D), new THREE.MeshStandardMaterial({ color: mix(cor, "#000", 0.2), roughness: 0.5 }));
  teto.position.set(0, H, -0.02); teto.castShadow = true;
  const fundo = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.02), estrut);
  fundo.position.set(0, H / 2, -D / 2 + 0.02);
  const assento = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0x394049, roughness: 0.8 }));
  assento.position.set(0, 0.12, 0.02);
  g.add(teto, fundo, assento);
  return g;
}

type MatsExt = { aco: THREE.Material; teto: THREE.Material; concreto: THREE.Material };

/* portão de torcedores: vão + pilares + marquise + placa + catracas + rampa.
   O módulo "olha" para +z (fora do estádio); base no nível do piso da praça. */
function moduloEntrada(cor: string, M: MatsExt, deckH: number): THREE.Group {
  const g = new THREE.Group();
  const W = 1.0, Hp = 0.62;
  [-1, 1].forEach((s) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, Hp + deckH, 0.09), M.aco);
    post.position.set((s * W) / 2, (Hp + deckH) / 2, 0.02);
    post.castShadow = true;
    g.add(post);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.16, 0.1, 0.13), M.aco);
  lintel.position.set(0, deckH + Hp + 0.05, 0.02);
  g.add(lintel);
  // marquise inclinada para fora
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.05, 0.62), M.teto);
  canopy.position.set(0, deckH + Hp + 0.04, 0.36);
  canopy.rotation.x = 0.13;
  canopy.castShadow = true;
  g.add(canopy);
  const stay = (s: number) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 4), M.aco);
    b.position.set(s * (W / 2), deckH + Hp + 0.24, 0.28);
    b.rotation.x = 0.7;
    g.add(b);
  };
  stay(-1); stay(1);
  // placa luminosa
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.17, 0.05),
    new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.55, roughness: 0.5 }),
  );
  sign.position.set(0, deckH + Hp + 0.24, 0.12);
  g.add(sign);
  // catracas
  for (let i = -1; i <= 1; i++) {
    const tq = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.32), M.aco);
    tq.position.set(i * 0.3, deckH + 0.15, 0.5);
    tq.castShadow = true;
    g.add(tq);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 4), M.aco);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(i * 0.3 + 0.16, deckH + 0.22, 0.5);
    g.add(arm);
  }
  // rampa do piso da praça até a soleira (desce para fora)
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.06, 1.15), M.concreto);
  ramp.position.set(0, deckH / 2 - 0.02, 1.2);
  ramp.rotation.x = Math.atan2(deckH, 1.1);
  ramp.receiveShadow = true;
  g.add(ramp);
  [-1, 1].forEach((s) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 1.15), M.aco);
    rail.position.set(s * (W / 2 + 0.22), deckH / 2 + 0.12, 1.2);
    rail.rotation.x = ramp.rotation.x;
    g.add(rail);
  });
  return g;
}

/* escada larga de saída: degraus descendo do deck até a praça, olhando p/ +z */
function escadaSaida(M: MatsExt, deckH: number): THREE.Group {
  const g = new THREE.Group();
  const W = 1.9, steps = 5, run = 0.26, rise = deckH / steps;
  for (let i = 0; i < steps; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(W, rise + 0.02, run + 0.02), M.concreto);
    st.position.set(0, deckH - (i + 0.5) * rise, 0.2 + i * run);
    st.receiveShadow = true; st.castShadow = true;
    g.add(st);
  }
  [-1, 1].forEach((s) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, deckH + 0.12, steps * run + 0.3), M.concreto);
    wall.position.set(s * (W / 2 + 0.06), (deckH + 0.12) / 2 - 0.06, 0.2 + (steps * run) / 2);
    g.add(wall);
  });
  return g;
}

/* rand determinístico p/ a cidade */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* cidade fictícia ao redor: praça do estádio, avenidas, quarteirões, torres, parques */
function construirCidade(scene: THREE.Scene) {
  const R = rng(0xC1DADE);
  const cid = new THREE.Group();
  cid.name = "cidade";

  const M = {
    asfalto: new THREE.MeshStandardMaterial({ color: 0x8a8e8a, roughness: 1 }),
    rua: new THREE.MeshStandardMaterial({ color: 0x35383e, roughness: 1 }),
    calcada: new THREE.MeshStandardMaterial({ color: 0xb4b6b1, roughness: 1 }),
    faixa: new THREE.MeshStandardMaterial({ color: 0xdad7c4, roughness: 1 }),
    grama: new THREE.MeshStandardMaterial({ color: 0x4f7c45, roughness: 1 }),
    agua: new THREE.MeshStandardMaterial({ color: 0x3d6f88, roughness: 0.25, metalness: 0.25 }),
    teto: new THREE.MeshStandardMaterial({ color: 0x5c606a, roughness: 0.9 }),
    tanque: new THREE.MeshStandardMaterial({ color: 0x9c9c94, roughness: 0.8 }),
    poste: new THREE.MeshStandardMaterial({ color: 0x2b2e32, roughness: 0.6, metalness: 0.4 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffe6a0, emissiveIntensity: 1, roughness: 0.4 }),
    vidro: new THREE.MeshStandardMaterial({ color: 0x9ec6da, roughness: 0.16, metalness: 0.6 }),
  };
  const predio = ["#cbc7bd", "#bcb6a9", "#a89a8c", "#9aa4ae", "#8f99a4", "#d6d1c4", "#7f8b97", "#c0a48e", "#b7bcc2"]
    .map((h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.85 }));
  const carro = ["#d24b3a", "#3a6bd9", "#dfb43a", "#2e2e32", "#dcdcdc", "#39a069", "#b1b6bd"]
    .map((h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.5, metalness: 0.3 }));

  // chão
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), M.asfalto);
  chao.rotation.x = -Math.PI / 2; chao.position.y = -0.03; chao.receiveShadow = true;
  cid.add(chao);

  // ---- praça do estádio: anel pavimentado, canteiros, caminhos radiais, postes
  const praca = new THREE.Mesh(new THREE.RingGeometry(6.8, 16, 56), M.calcada);
  praca.rotation.x = -Math.PI / 2; praca.position.y = -0.018; praca.receiveShadow = true;
  cid.add(praca);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const cant = new THREE.Mesh(new THREE.CircleGeometry(1.7, 14), M.grama);
    cant.rotation.x = -Math.PI / 2;
    cant.position.set(Math.cos(ang) * 11.5, -0.01, Math.sin(ang) * 11.5);
    cid.add(cant);
    arvore(cid, Math.cos(ang) * 11.5, Math.sin(ang) * 11.5, 0.42 + R() * 0.3);
  }
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const via = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 1.8), M.asfalto);
    via.rotation.x = -Math.PI / 2; via.rotation.z = -ang;
    via.position.set(Math.cos(ang) * 11.4, -0.012, Math.sin(ang) * 11.4);
    cid.add(via);
  }
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + 0.15;
    poste(cid, Math.cos(ang) * 16.6, Math.sin(ang) * 16.6, M);
  }

  // ---- avenidas em grade, com faixa central contínua
  const eixos = [-58, -46, -34, -23, 23, 34, 46, 58];
  eixos.forEach((v) => {
    const rh = new THREE.Mesh(new THREE.PlaneGeometry(180, 3.8), M.rua);
    rh.rotation.x = -Math.PI / 2; rh.position.set(0, 0.004, v); cid.add(rh);
    const rv = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 180), M.rua);
    rv.rotation.x = -Math.PI / 2; rv.position.set(v, 0.004, 0); cid.add(rv);
    const lh = new THREE.Mesh(new THREE.PlaneGeometry(180, 0.14), M.faixa);
    lh.rotation.x = -Math.PI / 2; lh.position.set(0, 0.011, v); cid.add(lh);
    const lv = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 180), M.faixa);
    lv.rotation.x = -Math.PI / 2; lv.position.set(v, 0.011, 0); cid.add(lv);
  });

  // ---- quarteirões
  const cells = [-50, -39, -29, -19, 19, 29, 39, 50];
  for (const cx of cells) for (const cz of cells) {
    const dist = Math.hypot(cx, cz);

    if (R() < 0.13) {
      const pg = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 8.6), M.grama);
      pg.rotation.x = -Math.PI / 2; pg.position.set(cx, 0.06, cz); pg.receiveShadow = true;
      cid.add(pg);
      if (R() < 0.5) {
        const lago = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20), M.agua);
        lago.rotation.x = -Math.PI / 2; lago.position.set(cx, 0.07, cz); cid.add(lago);
      }
      const nA = 4 + Math.floor(R() * 4);
      for (let k = 0; k < nA; k++) arvore(cid, cx + (R() - 0.5) * 7, cz + (R() - 0.5) * 7, 0.45 + R() * 0.5);
      continue;
    }

    const downtown = dist < 32;
    const n = 1 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) {
      const bw = 1.6 + R() * 2.6, bd = 1.6 + R() * 2.6;
      const torre = downtown && R() < 0.4;
      const bh = torre ? 5 + R() * 8 : downtown ? 2.4 + R() * 4 : 0.8 + R() * 2.6;
      const bx = cx + (R() - 0.5) * (8 - bw), bz = cz + (R() - 0.5) * (8 - bd);
      const mat = torre && R() < 0.6 ? M.vidro : predio[Math.floor(R() * predio.length)];
      const p = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      p.position.set(bx, bh / 2 + 0.05, bz);
      p.castShadow = true; p.receiveShadow = true; cid.add(p);
      if (bh > 1.8) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(bw * 1.04, 0.16, bd * 1.04), M.teto);
        cap.position.set(bx, bh + 0.05, bz); cid.add(cap);
      }
      if (bh > 3 && R() < 0.55) {
        const tq = new THREE.Mesh(
          R() < 0.5 ? new THREE.CylinderGeometry(0.26, 0.26, 0.48, 8) : new THREE.BoxGeometry(0.58, 0.4, 0.58),
          M.tanque,
        );
        tq.position.set(bx + (R() - 0.5) * bw * 0.4, bh + 0.3, bz + (R() - 0.5) * bd * 0.4);
        tq.castShadow = true; cid.add(tq);
      }
    }
  }

  // ---- árvores de calçada ao longo das avenidas
  for (let i = 0; i < 52; i++) {
    const ex = eixos[Math.floor(R() * eixos.length)];
    const along = (R() - 0.5) * 150;
    if (Math.hypot(ex, along) < 19) continue;
    if (R() < 0.5) arvore(cid, ex + (R() < 0.5 ? 2.6 : -2.6), along, 0.32 + R() * 0.28);
    else arvore(cid, along, ex + (R() < 0.5 ? 2.6 : -2.6), 0.32 + R() * 0.28);
  }

  // ---- carros nas avenidas
  for (let i = 0; i < 30; i++) {
    const ex = eixos[Math.floor(R() * eixos.length)];
    const along = (R() - 0.5) * 150;
    if (Math.hypot(ex, along) < 19) continue;
    const horiz = R() < 0.5;
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(horiz ? 0.95 : 0.4, 0.22, horiz ? 0.4 : 0.95),
      carro[Math.floor(R() * carro.length)],
    );
    c.castShadow = true;
    if (horiz) c.position.set(along, 0.12, ex + (R() < 0.5 ? 0.9 : -0.9));
    else c.position.set(ex + (R() < 0.5 ? 0.9 : -0.9), 0.12, along);
    cid.add(c);
  }

  scene.add(cid);
}
function arvore(parent: THREE.Object3D, x: number, z: number, s: number) {
  const g = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s * 2, 0.07 * s * 2, s, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  tr.position.y = s / 2;
  const cp = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.9, 0),
    new THREE.MeshStandardMaterial({ color: "#3f7a3a", roughness: 1, flatShading: true }));
  cp.position.y = s * 1.1; cp.castShadow = true;
  g.add(tr, cp); g.position.set(x, 0, z);
  parent.add(g);
}
function poste(parent: THREE.Object3D, x: number, z: number, M: { poste: THREE.Material; lamp: THREE.Material }) {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 5), M.poste);
  mast.position.y = 0.85;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), M.poste);
  arm.position.set(0.2, 1.66, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.12), M.lamp);
  head.position.set(0.4, 1.62, 0);
  g.add(mast, arm, head);
  g.position.set(x, 0, z);
  parent.add(g);
}

/* cunha de arquibancada (perfil inclinado) extrudada no comprimento L */
function cunha(D: number, hFrente: number, hFundo: number, L: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0, hFrente);
  s.lineTo(D, hFundo);
  s.lineTo(D, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
  g.translate(0, 0, -L / 2);
  return g;
}

/* ============================================================== componente */
export default function EstadioMaquete({ a, b, capacidade, estilo, forma, corArq, corTeto, corAcesso, gramado, climaCond = "limpo", climaPeriodo = "dia" }: Params) {
  const wrap = useRef<HTMLDivElement>(null);
  const eng = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    controls: OrbitControls; grupo: THREE.Group; raf: number; ro: ResizeObserver;
    pitchTex: THREE.Texture;
    sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; fill: THREE.DirectionalLight;
    refletores: THREE.SpotLight[];
    chuva: THREE.Points | null; chuvaVel: number; vento: number; raio: number;
  } | null>(null);

  // ---- init (uma vez)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:#888;font-size:13px">3D indisponível neste navegador.</div>';
      return;
    }
    const w = el.clientWidth || 600, h = Math.round((el.clientWidth || 600) * 0.62);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.borderRadius = "10px";

    const scene = new THREE.Scene();
    scene.background = texCeu();
    scene.fog = new THREE.Fog(0xd7dde6, 34, 78);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 220);
    camera.position.set(8.5, 5, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enablePan = false;
    controls.minDistance = 6.5;
    controls.maxDistance = 30;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = 1.5;
    controls.target.set(0, 0.35, 0);

    const hemi = new THREE.HemisphereLight(0xbcd4ec, 0x6b6250, 0.8);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2e0, 1.7);
    sun.position.set(9, 14, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 55;
    sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd2ec, 0.35);
    fill.position.set(-8, 5, -6);
    scene.add(fill);

    // refletores: bank alto central (coluna de luz só no gramado) + 4 fontes
    // baixas nos cantos do campo, TODAS com `distance` curta → a luz morre
    // logo depois do gramado e não vaza para arquibancada alta / cidade.
    const refletores: THREE.SpotLight[] = [];
    const flDefs: [number, number, number, number, number, number][] = [
      // x, y, z, angle, penumbra, distance
      [0, 15, 0, 0.44, 0.6, 20],
      [4, 8, 3, 0.62, 0.45, 13],
      [-4, 8, 3, 0.62, 0.45, 13],
      [4, 8, -3, 0.62, 0.45, 13],
      [-4, 8, -3, 0.62, 0.45, 13],
    ];
    flDefs.forEach(([x, y, z, ang, pen, dist], i) => {
      const sp = new THREE.SpotLight(0xfff4e6, 0, dist, ang, pen, 1.1);
      sp.position.set(x, y, z);
      sp.target.position.set(0, 0.05, 0);
      sp.castShadow = i === 0;
      sp.shadow.mapSize.set(2048, 2048);
      sp.shadow.camera.near = 1;
      sp.shadow.camera.far = 26;
      sp.shadow.bias = -0.0005;
      scene.add(sp);
      scene.add(sp.target);
      refletores.push(sp);
    });

    // cidade fictícia ao redor
    construirCidade(scene);

    const grupo = new THREE.Group();
    scene.add(grupo);

    const pitchTex = texGramado();
    eng.current = {
      renderer, scene, camera, controls, grupo, raf: 0, ro: null as unknown as ResizeObserver, pitchTex,
      sun, hemi, fill, refletores, chuva: null, chuvaVel: 0, vento: 0, raio: 0,
    };

    let tRaio = 0;
    const loop = () => {
      controls.update();
      const E = eng.current!;
      if (E.chuva) {
        const p = E.chuva.geometry.attributes.position as THREE.BufferAttribute;
        const arr = p.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] -= E.chuvaVel;
          arr[i - 1] += E.vento;
          if (arr[i] < 0.2) { arr[i] = 22 + Math.random() * 2; arr[i - 1] = (Math.random() - 0.5) * 34; }
        }
        p.needsUpdate = true;
      }
      if (E.raio > 0) {
        tRaio -= 1;
        if (tRaio <= 0) {
          tRaio = 90 + Math.floor(Math.random() * 220);
          E.fill.intensity = 3.2;
        } else if (E.fill.intensity > 0.5) {
          E.fill.intensity = Math.max(0.5, E.fill.intensity - 0.35);
        }
      }
      renderer.render(scene, camera);
      E.raf = requestAnimationFrame(loop);
    };
    eng.current.raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth || 600, nh = Math.round(nw * 0.62);
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);
    eng.current.ro = ro;

    return () => {
      cancelAnimationFrame(eng.current!.raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if ((m as THREE.InstancedMesh).isInstancedMesh) (m as THREE.InstancedMesh).dispose();
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { const mm = x as THREE.MeshStandardMaterial; if (mm.map) mm.map.dispose(); x.dispose(); });
      });
      eng.current?.pitchTex.dispose();
      (scene.background as THREE.Texture | null)?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      eng.current = null;
    };
  }, []);

  // ---- clima: céu, luz, neblina e chuva
  useEffect(() => {
    const E = eng.current;
    if (!E) return;
    const noite = climaPeriodo === "noite";
    const cond = climaCond;
    const tempestade = cond === "tempestade";
    const chuvoso = cond === "chuva" || tempestade;
    const garoa = cond === "garoa";
    const nublado = cond === "nublado";
    const parcial = cond === "parcial";

    const kind: CeuKind = noite ? "noite" : tempestade ? "tempestade" : chuvoso ? "chuva" : nublado ? "nublado" : "dia";
    (E.scene.background as THREE.Texture | null)?.dispose?.();
    E.scene.background = texCeu(kind);

    const fog = E.scene.fog as THREE.Fog;
    if (noite) { fog.color.set(0x0b1220); fog.near = 22; fog.far = 60; }
    else if (tempestade) { fog.color.set(0x555b63); fog.near = 16; fog.far = 46; }
    else if (chuvoso) { fog.color.set(0x828a93); fog.near = 20; fog.far = 52; }
    else if (nublado) { fog.color.set(0xb7bdc2); fog.near = 28; fog.far = 68; }
    else { fog.color.set(0xd7dde6); fog.near = 34; fog.far = 78; }

    E.sun.intensity = noite ? 0.05 : tempestade ? 0.22 : chuvoso ? 0.4 : nublado ? 0.6 : parcial ? 1.35 : 1.7;
    E.sun.color.set(noite ? 0x223047 : chuvoso || nublado ? 0xdfe6ee : 0xfff2e0);
    E.hemi.intensity = noite ? 0.16 : chuvoso ? 0.5 : nublado ? 0.62 : 0.8;
    E.hemi.color.set(noite ? 0x2a2f3a : 0xbcd4ec);
    E.hemi.groundColor.set(noite ? 0x0c0e13 : 0x6b6250);
    E.fill.color.set(noite ? 0xb8c2d6 : 0xbcd2ec);
    E.renderer.toneMappingExposure = noite ? 1.1 : tempestade ? 0.92 : chuvoso ? 0.98 : 1.05;

    // refletores: acesos só à noite. Bank alto forte + 4 fontes de canto médias.
    E.refletores.forEach((sp, i) => {
      sp.intensity = noite ? (i === 0 ? (chuvoso ? 10 : 13) : (chuvoso ? 4.5 : 6)) : 0;
      sp.color.set(chuvoso ? 0xeef2ff : 0xfff4e6);
    });

    if (E.chuva) {
      E.scene.remove(E.chuva);
      E.chuva.geometry.dispose();
      (E.chuva.material as THREE.Material).dispose();
      E.chuva = null;
    }
    if (chuvoso || garoa) {
      const p = criarChuva(tempestade ? 5200 : chuvoso ? 3200 : 1200);
      (p.material as THREE.PointsMaterial).opacity = garoa ? 0.32 : 0.5;
      E.scene.add(p);
      E.chuva = p;
      E.chuvaVel = garoa ? 0.14 : tempestade ? 0.6 : 0.36;
      E.vento = tempestade ? 0.09 : chuvoso ? 0.05 : 0.02;
    } else {
      E.chuvaVel = 0; E.vento = 0;
    }
    E.raio = tempestade ? 1 : 0;
    E.fill.intensity = noite ? 0.12 : 0.35;
  }, [climaCond, climaPeriodo]);

  // ---- (re)constrói o estádio quando muda a config
  useEffect(() => {
    const E = eng.current;
    if (!E) return;
    const { grupo, scene } = E;

    // gramado: recria a textura conforme o tipo escolhido
    E.pitchTex.dispose();
    E.pitchTex = texGramado(gramado);
    const pitchTex = E.pitchTex;

    // limpa (inclui as texturas de assento geradas a cada rebuild)
    grupo.traverse((o) => {
      const m = o as THREE.Mesh;
      if ((m as THREE.InstancedMesh).isInstancedMesh) (m as THREE.InstancedMesh).dispose();
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        const mm = x as THREE.MeshStandardMaterial;
        if (mm.map && mm.map !== pitchTex) mm.map.dispose();
        x.dispose();
      });
    });
    grupo.clear();

    const oval = forma === "oval";
    const anel = estilo === "anel";
    const teto = estilo === "coberto" || anel;
    const PX = 2.6, PZ = 1.68;                          // meio-campo (x/z)
    // capacidade cresce PARA OS LADOS (profundidade), quase nada pra cima
    const dep = THREE.MathUtils.clamp(1.0 + capacidade / 42000, 1.0, 3.4);
    const H1 = THREE.MathUtils.clamp(0.78 + capacidade / 320000, 0.82, 1.15);
    const H2 = H1 + (anel ? 0.82 : teto ? 0.5 : 0.32);

    const matAssento = (col: string, ru = 6, rv = 4) => {
      const m = new THREE.MeshStandardMaterial({ map: texAssentos(col), roughness: 0.95 });
      m.map!.repeat.set(ru, rv);
      return m;
    };
    const matRim = new THREE.MeshStandardMaterial({ color: b, roughness: 0.55, emissive: b, emissiveIntensity: 0.06 });
    const matTeto = new THREE.MeshStandardMaterial({ color: corTeto, roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide });
    const matAco = new THREE.MeshStandardMaterial({ color: mix(corTeto, "#000", 0.35), roughness: 0.35, metalness: 0.7 });
    const matLamp = new THREE.MeshStandardMaterial({ color: 0xfff6d2, emissive: 0xffe27a, emissiveIntensity: 1.8, roughness: 0.4 });
    const matFacade = new THREE.MeshStandardMaterial({ color: mix(corArq, "#000", 0.14), roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide });
    const matConcreto = new THREE.MeshStandardMaterial({ color: corAcesso || "#9c9c97", roughness: 1, side: THREE.DoubleSide });
    const matsExt: MatsExt = { aco: matAco, teto: matRim, concreto: matConcreto };
    const deckH = 0.13;                                  // altura do passeio externo

    const luzesPonto: THREE.Vector3[] = [];

    if (oval) {
      // ---------------- estádio OVAL: bowl elíptico, baixo e largo
      const ax = PX + 0.66, az = PZ + 0.54;      // elipse na frente da bancada — recuada p/ o gol aparecer
      const dp = dep * 0.62 + (anel ? 0.7 : 0);  // bancada cresce p/ FORA com a capacidade
      const Hb = H2;

      // infield: retângulo de grama cujos cantos ficam ocultos sob a arquibancada
      // — só grama à vista, sem pista de atletismo, só as linhas do campo.
      const gramaTex = texGrama(gramado);
      const infield = new THREE.Mesh(
        new THREE.PlaneGeometry((ax + 0.22) * 2, (az + 0.22) * 2),
        new THREE.MeshStandardMaterial({ map: gramaTex, roughness: 1 }),
      );
      infield.rotation.x = -Math.PI / 2;
      infield.position.y = 0.012;
      infield.receiveShadow = true;
      grupo.add(infield);

      // linhas do campo — fundo transparente, nada de retângulo sólido
      const linhasTex = texLinhas();
      const linhas = new THREE.Mesh(
        new THREE.PlaneGeometry(PX * 1.4, PZ * 1.3),
        new THREE.MeshStandardMaterial({ map: linhasTex, transparent: true, roughness: 1, depthWrite: false }),
      );
      linhas.rotation.x = -Math.PI / 2;
      linhas.position.y = 0.03;
      grupo.add(linhas);

      // ---- mobiliário de campo: traves + bancos de reservas
      {
        const mx = PX * 0.7, mz = PZ * 0.65;   // meia-extensão das marcações
        const gW = mz * 0.62, gH = 0.24;
        const g1 = fazGol(gW, gH); g1.position.set(mx - 0.02, 0.03, 0); g1.rotation.y = Math.PI; grupo.add(g1);
        const g2 = fazGol(gW, gH); g2.position.set(-(mx - 0.02), 0.03, 0); grupo.add(g2);

        const b1 = fazBanco(a); b1.position.set(0.62, 0.02, -(mz + 0.32)); grupo.add(b1);
        const b2 = fazBanco(b); b2.position.set(-0.62, 0.02, -(mz + 0.32)); grupo.add(b2);
      }

      // arquibancada (perfil: d p/ fora, h p/ cima)
      const perf: [number, number][] = [
        [0, 0], [0, 0.45], [dp, Hb], [dp + 0.22, Hb], [dp + 0.22, 0],
      ];
      const bowl = new THREE.Mesh(bowlOval(ax, az, perf), matAssento(corArq, 0.8, 2));
      bowl.castShadow = true; bowl.receiveShadow = true;
      grupo.add(bowl);

      // vomitórios (saídas de torcedores) — bocas escuras recuadas na base da bancada
      const vW = 0.025, vU = 0.32;
      const nV = THREE.MathUtils.clamp(Math.round((ax + az) / 0.85), 8, 16);
      const vCen = Array.from({ length: nV }, (_, k) => (k / nV) * Math.PI * 2 + 0.2);
      const dentroVom = (th: number, u: number) =>
        u < vU + 0.04 && vCen.some((c) => {
          let d = Math.abs(((th - c + Math.PI) % (Math.PI * 2)) - Math.PI);
          return d < vW + 0.012;
        });
      {
        const ptRake = (th: number, u: number): [number, number, number] => {
          const d = u * dp, h = 0.45 + u * (Hb - 0.45) + 0.014;
          return [(ax + d) * Math.cos(th), h, (az + d) * Math.sin(th)];
        };
        grupo.add(vomitoriosRake(ptRake, vCen, vW, vU, 0x14161a));
      }

      // cadeirinhas na rampa (pulando onde há vomitório)
      {
        const nA = THREE.MathUtils.clamp(Math.round((ax + az) * Math.PI / 0.16), 90, 260);
        const nR = THREE.MathUtils.clamp(Math.round(dp / 0.13), 5, 16);
        const pts: { x: number; y: number; z: number }[] = [];
        for (let ai = 0; ai < nA; ai++) {
          const th = (ai / nA) * Math.PI * 2, ct = Math.cos(th), st = Math.sin(th);
          for (let ri = 0; ri < nR; ri++) {
            const u = (ri + 0.5) / nR;
            if (dentroVom(th, u)) continue;
            const d = u * dp;
            pts.push({ x: (ax + d) * ct, y: 0.45 + u * (Hb - 0.45) + 0.03, z: (az + d) * st });
          }
        }
        grupo.add(fazCadeiras(pts, mix(corArq, "#fff", 0.06)));
      }

      // fachada externa (cor da arquibancada, mais escura) — lisa
      const fac = new THREE.Mesh(bowlOval(ax, az, [[dp + 0.24, 0], [dp + 0.24, Hb]]), matFacade);
      grupo.add(fac);

      // ---- acabamento externo: passeio elevado + portões + escadas de saída
      const deck = new THREE.Mesh(
        bowlOval(ax, az, [[dp + 0.27, deckH], [dp + 1.05, deckH], [dp + 1.05, 0], [dp + 0.27, 0]]),
        matConcreto,
      );
      deck.receiveShadow = true;
      grupo.add(deck);
      const nEnt = THREE.MathUtils.clamp(Math.round((ax + az) / 1.1), 6, 12);
      for (let i = 0; i < nEnt; i++) {
        const th = (i / nEnt) * Math.PI * 2 + Math.PI / nEnt;
        const ct = Math.cos(th), st = Math.sin(th);
        const isSaida = i % 3 === 1;
        const mod = isSaida ? escadaSaida(matsExt, deckH) : moduloEntrada(b, matsExt, deckH);
        mod.position.set((ax + dp + 0.28) * ct, 0, (az + dp + 0.28) * st);
        mod.rotation.y = Math.atan2(ct, st);
        grupo.add(mod);
      }

      if (anel) {
        const rib = new THREE.Mesh(bowlOval(ax, az, [[dp * 0.5, H1], [dp * 0.5, H1 + 0.09], [dp * 0.5 + 0.05, H1 + 0.09], [dp * 0.5 + 0.05, H1]]), matRim);
        grupo.add(rib);
      }

      if (teto) {
        // cobertura em anel: só sobre a arquibancada, deixando o campo aberto
        const roofGeo = bowlOval(ax, az, [
          [dp * 0.18, Hb + 0.46], [dp + 0.22, Hb + 0.98], [dp + 0.22, Hb + 0.88], [dp * 0.18, Hb + 0.4],
        ]);
        const roof = new THREE.Mesh(roofGeo, matTeto);
        roof.castShadow = true;
        grupo.add(roof);
        for (let i = 0; i < 36; i++) {
          const t = (i / 36) * Math.PI * 2;
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, dp * 0.9, 5), matAco);
          strut.position.set((ax + dp * 0.55) * Math.cos(t), Hb + 0.35, (az + dp * 0.55) * Math.sin(t));
          strut.rotation.z = Math.PI / 2 - 0.28;
          strut.rotation.y = -t;
          grupo.add(strut);
          if (i % 6 === 0) {
            const lm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), matLamp);
            lm.position.set((ax - 0.2) * Math.cos(t), Hb + 0.44, (az - 0.2) * Math.sin(t));
            grupo.add(lm);
          }
        }
      } else {
        // 6 torres de refletor esguias ao redor da elipse
        for (let i = 0; i < 6; i++) {
          const t = (i / 6) * Math.PI * 2 + 0.3;
          const rx = (ax + dp + 0.55) * Math.cos(t), rz = (az + dp + 0.55) * Math.sin(t);
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, Hb + 1.7, 6), matAco);
          mast.position.set(rx, (Hb + 1.7) / 2, rz); mast.castShadow = true; grupo.add(mast);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.09), matLamp);
          head.position.set(rx, Hb + 1.6, rz); head.lookAt(0, H1, 0); grupo.add(head);
          if (i < 4) luzesPonto.push(new THREE.Vector3(rx, Hb + 1.6, rz));
        }
      }
    } else {
      // ---------------- estádio RETANGULAR: 4 arquibancadas em cunha (sem muro)
      const H1 = THREE.MathUtils.clamp(1.0 + capacidade / 60000, 1.12, 2.3);   // um pouco mais alta
      const H2 = H1 + (anel ? 1.7 : teto ? 1.0 : 0.5);
      const rc = 0.55;   // recuo da arquibancada em relação à linha do campo (deixa o gol à mostra)
      const FX = PX + rc, FZ = PZ + rc;   // frente das arquibancadas

      // faixa de grama entre o campo e a arquibancada
      const apron = new THREE.Mesh(
        new THREE.PlaneGeometry((FX + 0.15) * 2, (FZ + 0.15) * 2),
        new THREE.MeshStandardMaterial({ color: 0x2f6f3c, roughness: 1 }),
      );
      apron.rotation.x = -Math.PI / 2;
      apron.position.y = 0.008;
      apron.receiveShadow = true;
      grupo.add(apron);

      const pitch = new THREE.Mesh(
        new THREE.PlaneGeometry(PX * 2, PZ * 2),
        new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 1 }),
      );
      pitch.rotation.x = -Math.PI / 2;
      pitch.position.y = 0.02;
      pitch.receiveShadow = true;
      grupo.add(pitch);

      // ---- mobiliário de campo: traves + bancos de reservas
      {
        const gW = PZ * 0.5, gH = 0.24;
        const g1 = fazGol(gW, gH); g1.position.set(PX - 0.02, 0.02, 0); g1.rotation.y = Math.PI; grupo.add(g1);
        const g2 = fazGol(gW, gH); g2.position.set(-(PX - 0.02), 0.02, 0); grupo.add(g2);

        const b1 = fazBanco(a); b1.position.set(0.55, 0.02, -(PZ + rc * 0.55)); grupo.add(b1);
        const b2 = fazBanco(b); b2.position.set(-0.55, 0.02, -(PZ + rc * 0.55)); grupo.add(b2);
      }

      const lados: { rotY: number; px: number; pz: number; L: number }[] = [
        { rotY: -Math.PI / 2, px: 0, pz: FZ, L: FX * 2 },
        { rotY: Math.PI / 2, px: 0, pz: -FZ, L: FX * 2 },
        { rotY: 0, px: FX, pz: 0, L: FZ * 2 },
        { rotY: Math.PI, px: -FX, pz: 0, L: FZ * 2 },
      ];
      lados.forEach((s) => {
        const g = new THREE.Group();
        g.rotation.y = s.rotY;
        g.position.set(s.px, 0, s.pz);

        const d1 = dep * (teto ? 0.6 : 1.0);
        const t1 = new THREE.Mesh(cunha(d1, 0.55, H1, s.L), matAssento(corArq, 2.2, 2.4));
        t1.castShadow = true; t1.receiveShadow = true;
        g.add(t1);
        {
          // vomitórios (saídas) — bocas escuras recuadas na base da bancada
          const vW = 0.016, vU = 0.32;
          const ptRake = (v: number, u: number): [number, number, number] => [
            u * d1, 0.55 + u * (H1 - 0.55) + 0.014, -s.L / 2 + v * s.L,
          ];
          const mV = THREE.MathUtils.clamp(Math.round(s.L / 1.6), 2, 5);
          const vCen = Array.from({ length: mV }, (_, k) => (k + 0.5) / mV);
          g.add(vomitoriosRake(ptRake, vCen, vW, vU, 0x14161a));

          const nC = THREE.MathUtils.clamp(Math.round(s.L / 0.11), 14, 62);
          const nR = THREE.MathUtils.clamp(Math.round(d1 / 0.12), 5, 16);
          const pts: { x: number; y: number; z: number }[] = [];
          for (let ri = 0; ri < nR; ri++) {
            const u = (ri + 0.5) / nR;
            for (let ci = 0; ci < nC; ci++) {
              const v = (ci + 0.5) / nC;
              if (u < vU + 0.05 && vCen.some((c) => Math.abs(v - c) < vW + 0.008)) continue;
              pts.push({ x: u * d1, y: 0.55 + u * (H1 - 0.55) + 0.03, z: -s.L / 2 + v * s.L });
            }
          }
          g.add(fazCadeiras(pts, mix(corArq, "#fff", 0.06)));
        }

        if (teto) {
          const t2 = new THREE.Mesh(cunha(dep * 0.55, 0.2, H2 - H1 - 0.1, s.L * 0.99), matAssento(mix(corArq, "#000", 0.24), 2, 2));
          t2.position.set(d1 + 0.12, H1 + 0.1, 0);
          t2.castShadow = true; t2.receiveShadow = true;
          g.add(t2);
          {
            const D2 = dep * 0.55, hB2 = H2 - H1 - 0.1, L2 = s.L * 0.99;
            const nC2 = THREE.MathUtils.clamp(Math.round(L2 / 0.11), 14, 60);
            const nR2 = THREE.MathUtils.clamp(Math.round(D2 / 0.12), 3, 12);
            const p2: { x: number; y: number; z: number }[] = [];
            for (let ri = 0; ri < nR2; ri++) {
              const u = (ri + 0.5) / nR2;
              for (let ci = 0; ci < nC2; ci++) {
                const v = (ci + 0.5) / nC2;
                p2.push({ x: d1 + 0.12 + u * D2, y: H1 + 0.1 + 0.2 + u * (hB2 - 0.2) + 0.03, z: -L2 / 2 + v * L2 });
              }
            }
            g.add(fazCadeiras(p2, mix(corArq, "#fff", 0.06)));
          }

          const roofD = dep * 1.0;
          const roof = new THREE.Mesh(new THREE.BoxGeometry(roofD, 0.09, s.L), matTeto);
          roof.position.set(d1 * 0.7, H2 + 0.42, 0);
          roof.rotation.z = -0.16; roof.castShadow = true;
          g.add(roof);
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, s.L), matAco);
          beam.position.set(d1 * 0.7 + roofD * 0.48, H2 + 0.34, 0);
          g.add(beam);
          for (let i = 0; i < 7; i++) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, roofD, 6), matAco);
            bar.rotation.z = Math.PI / 2 - 0.16;
            bar.position.set(d1 * 0.7, H2 + 0.48, -s.L / 2 + 0.5 + (i * (s.L - 1)) / 6);
            g.add(bar);
          }
          [-1, 1].forEach((sg) => {
            const st = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.1, 6), matAco);
            st.position.set(d1 * 0.3, H2 - 0.2, sg * (s.L / 2 - 0.5));
            st.rotation.x = 0.6 * sg;
            g.add(st);
          });
          for (let i = 0; i < 6; i++) {
            const lm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.12), matLamp);
            lm.position.set(d1 * 0.7 + roofD * 0.46, H2 + 0.24, -s.L / 2 + 0.7 + (i * (s.L - 1.4)) / 5);
            g.add(lm);
          }
        }
        grupo.add(g);
      });

      // cantos: pilastras finas chanfradas a 45° (não mais blocos)
      ([[1, 1], [1, -1], [-1, 1], [-1, -1]] as const).forEach(([sx, sz]) => {
        const h = teto ? H2 * 0.9 : H1 + 0.15;
        const cg = new THREE.Mesh(new THREE.BoxGeometry(dep * 0.42, h, dep * 0.42), matAssento(mix(corArq, "#000", 0.16), 0.8, 1.4));
        cg.position.set(sx * (FX + dep * 0.42), h / 2, sz * (FZ + dep * 0.42));
        cg.rotation.y = Math.PI / 4;
        cg.castShadow = true; cg.receiveShadow = true;
        grupo.add(cg);
      });

      if (!teto) {
        ([[1, 1], [1, -1], [-1, 1], [-1, -1]] as const).forEach(([sx, sz]) => {
          const x = sx * (FX + dep + 0.6), z = sz * (FZ + dep + 0.6);
          const th = H2 + 3.0;
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, th, 8), matAco);
          mast.position.set(x, th / 2, z); mast.castShadow = true;
          grupo.add(mast);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.12), matLamp);
          head.position.set(x, th - 0.15, z);
          head.lookAt(0, H1, 0);
          grupo.add(head);
          luzesPonto.push(new THREE.Vector3(x, th - 0.15, z));
        });
      }

      // ---- acabamento externo: passeio elevado + portões + escadas de saída
      {
        const d1 = dep * (teto ? 0.6 : 1.0);
        const ox = FX + d1 + 0.95, oz = FZ + d1 + 0.95;
        const ix = FX + 0.02, iz = FZ + 0.02;
        const sh = new THREE.Shape();
        sh.moveTo(-ox, -oz); sh.lineTo(ox, -oz); sh.lineTo(ox, oz); sh.lineTo(-ox, oz); sh.lineTo(-ox, -oz);
        const hole = new THREE.Path();
        hole.moveTo(-ix, -iz); hole.lineTo(ix, -iz); hole.lineTo(ix, iz); hole.lineTo(-ix, iz); hole.lineTo(-ix, -iz);
        sh.holes.push(hole);
        const deck = new THREE.Mesh(new THREE.ShapeGeometry(sh), matConcreto);
        deck.rotation.x = -Math.PI / 2; deck.position.y = deckH; deck.receiveShadow = true;
        grupo.add(deck);

        const sides: { c: [number, number]; out: [number, number]; hl: number; n: number }[] = [
          { c: [0, FZ + d1 + 0.3], out: [0, 1], hl: FX * 0.72, n: 4 },
          { c: [0, -(FZ + d1 + 0.3)], out: [0, -1], hl: FX * 0.72, n: 4 },
          { c: [FX + d1 + 0.3, 0], out: [1, 0], hl: FZ * 0.7, n: 3 },
          { c: [-(FX + d1 + 0.3), 0], out: [-1, 0], hl: FZ * 0.7, n: 3 },
        ];
        sides.forEach((L) => {
          const [ox2, oz2] = L.out;
          const tx = -oz2, tz = ox2;
          const angY = Math.atan2(ox2, oz2);
          for (let i = 0; i < L.n; i++) {
            const f = L.n === 1 ? 0 : (i / (L.n - 1) - 0.5) * 2;
            const along = f * L.hl;
            const isSaida = L.n >= 4 ? (i === 1 || i === L.n - 2) : i === Math.floor(L.n / 2);
            const mod = isSaida ? escadaSaida(matsExt, deckH) : moduloEntrada(b, matsExt, deckH);
            mod.position.set(L.c[0] + tx * along, 0, L.c[1] + tz * along);
            mod.rotation.y = angY;
            grupo.add(mod);
          }
        });
      }
    }

    // no máximo 4 point-lights (refletores)
    luzesPonto.slice(0, 4).forEach((p) => {
      const pl = new THREE.PointLight(0xfff2cc, 5, 16, 2);
      pl.position.copy(p);
      grupo.add(pl);
    });

    grupo.position.y = 0;
    void scene;
  }, [a, b, capacidade, estilo, forma, corArq, corTeto, corAcesso, gramado]);

  return <div ref={wrap} className="est-3d" />;
}
