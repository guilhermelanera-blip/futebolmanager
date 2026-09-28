import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, finalizarJogoAoVivo } from "../api/client";
import { Loading } from "../components/bits";
import { NomeClube, TextoComNomes } from "../components/nomes";
import { coresDoClube } from "../lib/format";

/* ================================================================= util cor */
function hexRgb(h: string): [number, number, number] {
  const c = (h || "").replace("#", "");
  const s = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  if (s.length < 6) return [40, 90, 60];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function mix(a: string, b: string, k: number): string {
  const A = hexRgb(a), B = hexRgb(b);
  const r = Math.round(lerp(A[0], B[0], k)), g = Math.round(lerp(A[1], B[1], k)), bl = Math.round(lerp(A[2], B[2], k));
  return "#" + [r, g, bl].map((v) => clamp(v, 0, 255).toString(16).padStart(2, "0")).join("");
}
const clarear = (h: string, k: number) => mix(h, "#ffffff", k);
function claro(hex: string): boolean {
  const [r, g, b] = hexRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/* ================================================================= roteiro
   Um "roteiro" determinístico do jogo inteiro: gerado uma vez no load a partir
   de um RNG semeado. A tela ao vivo apenas revela os lances conforme o relógio
   anda — o texto é a narração; alguns lances disparam a cena em 2D.            */
type Tipo =
  | "apito" | "toque" | "avanco" | "escanteio"
  | "chance" | "trave" | "defesa" | "gol" | "bloqueio" | "prafora"
  | "amarelo" | "vermelho" | "lesao" | "falta" | "sub";
interface Beat {
  min: number;
  lado: "mandante" | "visitante" | null;
  tipo: Tipo;
  txt: string;
  cena: boolean;
  fx: number;               // 0 = gol do mandante ... 1 = gol do visitante
  stat?: "fin" | "alvo" | "esc" | "falta";
  poss?: number;            // território do mandante 0..1 no momento
}
type Ev = { minuto: number; tipo: string; lado: "mandante" | "visitante"; jogador: string };
type Roster = { gk: string[]; def: string[]; mid: string[]; atk: string[] };
type L = "mandante" | "visitante";
type RoteiroCtx = {
  mandante: string; visitante: string; eventos: Ev[]; seed: number; clima?: ClimaJogo;
  fMand: number; fVis: number; arqMand: string; arqVis: string; elMand: Roster; elVis: Roster;
};

function rng32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const T_DEF = [
  "{T} troca passes no campo de defesa.",
  "{T} sai jogando com paciência.",
  "Recuo para o goleiro do {T}.",
  "{T} recompõe as linhas.",
  "{T} respira e recomeça a jogada de trás.",
  "Zagueiro do {T} sai com a bola dominada.",
];
const T_MEIO = [
  "{T} controla as ações no meio-campo.",
  "{T} faz o pêndulo de um lado para o outro.",
  "Boa circulação de bola do {T}.",
  "{T} procura espaço entre as linhas.",
  "{T} toca de primeira no meio.",
  "O camisa 10 do {T} aparece para organizar.",
  "{T} troca de lado o campo de ataque.",
  "Meio-campo pega a bola no {T} e cadencia.",
];
const T_AVANCO = [
  "{T} acelera pelo meio!",
  "Lançamento longo do {T} nas costas da defesa!",
  "{T} puxa o contra-ataque!",
  "Bela tabela do {T} pela direita.",
  "{T} recebe entre os zagueiros e gira.",
  "{T} arranca pela esquerda com velocidade.",
  "Enfiada de bola do {T} para o atacante!",
  "{T} verticaliza e assusta a defesa.",
];
const T_ATAQUE = [
  "{T} chega com perigo pela esquerda.",
  "Cruzamento na área do {T}!",
  "{T} trabalha a bola na entrada da área.",
  "{T} pressiona no campo de ataque.",
  "{T} insiste pelo lado direito.",
  "Finalização do {T}, mas para fora!",
  "Bola alçada na área do {T}, a defesa afasta.",
  "{T} tenta o drible na linha de fundo.",
];
const T_PERDA = [
  "Perde a bola! O {O} recupera.",
  "Desarme certeiro do {O}.",
  "O {O} intercepta o passe e sai jogando.",
  "{T} erra o domínio e o {O} fica com a sobra.",
  "Bota pressão o {O} e rouba no meio!",
  "Passe errado do {T}, {O} contra-ataca.",
];

type ClimaJogo = {
  cond: string; rotulo: string; icone: string; tempC: number;
  sensacao: string; periodo: string; ventoKmh: number; gramado: string; nota: string;
};
function frasesClima(c: ClimaJogo, mand: string, vis: string): string[] {
  const o: string[] = [];
  if (c.periodo === "noite") o.push("Jogo sob os holofotes, com a arquibancada toda iluminada.");
  if (c.cond === "chuva" || c.cond === "tempestade") {
    o.push(
      "A chuva castiga o gramado — a bola vai ficando pesada.",
      "Poças no meio-campo: a bola trava e engana os jogadores.",
      `Jogador do ${mand} escorrega no gramado encharcado.`,
      `Recuo arriscado do ${vis} — a bola quase morre na água.`,
    );
  } else if (c.cond === "garoa") {
    o.push(
      "Garoa fina deixa o gramado rápido; os passes correm mais.",
      "Piso úmido — a bola desliza e pega os zagueiros de surpresa.",
      `Chuvisco constante; o goleiro do ${mand} limpa as luvas na camisa.`,
    );
  }
  if (c.cond === "nublado") o.push("Céu carregado sobre o estádio, mas a chuva segura.");
  o.push(
    `${c.periodo === "noite" ? "Sob os holofotes, a" : "A"} torcida empurra o ${mand} desde as arquibancadas.`,
  );
  if (c.cond === "tempestade") o.push("Um trovão ecoa ao longe e o árbitro olha para o céu.");
  if (c.sensacao === "calor intenso") {
    o.push(
      "Calor forte — os jogadores já pedem água na parada técnica.",
      "O ritmo cai com o sol castigando; jogo mais arrastado.",
    );
  } else if (c.sensacao === "frio") {
    o.push("Frio na cidade, respiração visível — jogo truncado no meio.");
  }
  if (c.ventoKmh >= 34) {
    o.push(
      "Vento forte atrapalha o cruzamento; a bola muda de rota no ar.",
      "O tiro de meta é levado pelo vento de volta ao ataque.",
    );
  }
  return o;
}

function gerarRoteiro(ctx: RoteiroCtx): Beat[] {
  const { mandante, visitante, eventos, seed, clima, fMand, fVis, elMand, elVis } = ctx;
  const R = rng32(seed);
  const recentes: string[] = [];
  const pick = (arr: string[]): string => {
    let s = arr[Math.floor(R() * arr.length)];
    for (let k = 0; k < 4 && recentes.includes(s); k++) s = arr[Math.floor(R() * arr.length)];
    recentes.push(s);
    if (recentes.length > 8) recentes.shift();
    return s;
  };
  const nome = (l: L) => (l === "mandante" ? mandante : visitante);
  const outro = (l: L): L => (l === "mandante" ? "visitante" : "mandante");
  const ros = (l: L) => (l === "mandante" ? elMand : elVis);
  const nm = (l: L, r: keyof Roster) => { const a = ros(l)[r]; return a && a.length ? a[Math.floor(R() * a.length)] : "o camisa 10"; };
  const fxAtk = (l: L) => (l === "mandante" ? 0.87 : 0.13);

  const evs = [...eventos].sort((a, b) => a.minuto - b.minuto);
  let ei = 0;
  const beats: Beat[] = [];
  const add = (b: Beat) => beats.push(b);

  // ---- estado do "motor"
  let placar: [number, number] = [0, 0];
  let homens: [number, number] = [11, 11];
  const subs: [number, number] = [0, 0];
  let momentum = (fMand - fVis) * 0.7 + 0.1;           // + mando de campo
  let posse: L = momentum >= 0 ? "mandante" : "visitante";
  let zona: "def" | "meio" | "ataque" = "meio";
  let run = 0;
  let min = 0.4;
  let htDone = false;
  let acresc = 0;

  const gd = () => placar[0] - placar[1];              // + mandante na frente
  const alvoMom = () => {
    let b = (fMand - fVis) * 0.7 + 0.1;
    const chase = min > 72 ? 0.32 : min > 55 ? 0.2 : 0.12;
    if (gd() > 0) b -= chase * Math.min(2, gd());
    else if (gd() < 0) b += chase * Math.min(2, -gd());
    b += (homens[0] - homens[1]) * 0.36;
    if (clima?.cond === "chuva" || clima?.cond === "tempestade") b *= 0.85;
    return clamp(b, -1, 1);
  };
  const territorio = () => {
    const zoff = zona === "def" ? -0.2 : zona === "ataque" ? 0.2 : 0;
    const dir = posse === "mandante" ? 1 : -1;
    return clamp(0.5 + momentum * 0.34 + zoff * dir, 0.05, 0.95);
  };
  const M = () => Math.round(min * 10) / 10;
  const emit = (l: L | null, tipo: Tipo, txt: string, o?: Partial<Beat>) =>
    add({ min: M(), lado: l, tipo, txt, cena: false, fx: territorio(), poss: territorio(), ...o });
  const virar = () => { posse = outro(posse); run = 0; };

  // ---- narração nomeada
  const falaZona = (l: L) => {
    const o = outro(l);
    if (zona === "def") return pick([
      `${nm(l, "gk")} cobra o tiro de meta para o ${nome(l)}.`,
      `${nm(l, "def")} sai jogando com calma pelo ${nome(l)}.`,
      `${nome(l)} recua para ${nm(l, "gk")} e recompõe as linhas.`,
      `${nm(l, "def")} corta o lançamento e devolve para o meio.`,
    ]);
    if (zona === "meio") return pick([
      `${nm(l, "mid")} organiza a saída de bola do ${nome(l)}.`,
      `${nome(l)} troca passes no meio; ${nm(l, "mid")} cadencia.`,
      `${nm(l, "mid")} tenta o lançamento, mas ${nm(o, "def")} afasta de cabeça.`,
      `${nome(l)} roda a bola de um lado para o outro à procura de espaço.`,
      `${nm(l, "mid")} arrisca de fora... a bola sobe demais.`,
      `${nm(l, "def")} avança pela lateral e cruza; ${nm(o, "def")} corta.`,
    ]);
    return pick([
      `${nm(l, "mid")} enfia para ${nm(l, "atk")}, travado por ${nm(o, "def")}.`,
      `Cruzamento de ${nm(l, "def")}; ${nm(o, "gk")} sai bem e segura firme.`,
      `${nm(l, "atk")} cai na área... o árbitro manda seguir.`,
      `${nome(l)} pressiona no campo de ataque; ${nm(o, "def")} se atira para o bloqueio.`,
      `${nm(l, "atk")} tenta o drible na linha de fundo e a bola sai.`,
    ]);
  };
  const falaPerda = (l: L) => {
    const o = outro(l);
    return pick([
      `${nm(o, "mid")} rouba de ${nm(l, "mid")} e o ${nome(o)} sai em transição.`,
      `Passe errado de ${nm(l, "def")}; ${nome(o)} recupera no ataque.`,
      `${nm(o, "def")} intercepta o cruzamento do ${nome(l)}.`,
      `${nome(l)} perde na intermediária e vê ${nm(o, "atk")} disparar.`,
    ]);
  };

  // ---- eventos da súmula, com mais leitura
  const emitirEvento = (e: Ev) => {
    run = 0;
    if (e.tipo === "GOL") {
      if (R() < 0.22) {
        emit(null, "toque", `O árbitro é chamado ao monitor do VAR para revisar o lance...`, { min: e.minuto - 0.3 });
        emit(null, "toque", `...e o gol do ${nome(e.lado)} está confirmado!`, { min: e.minuto - 0.1 });
      }
      placar = e.lado === "mandante" ? [placar[0] + 1, placar[1]] : [placar[0], placar[1] + 1];
      const d = gd();
      const ctxTxt = d === 0 ? "empata o jogo"
        : (e.lado === "mandante" ? (d > 0 ? (placar[0] > 1 ? "amplia" : "abre o placar") : "diminui")
          : (d < 0 ? (placar[1] > 1 ? "amplia" : "abre o placar") : "diminui"));
      add({ min: e.minuto, lado: e.lado, tipo: "gol", cena: true, fx: fxAtk(e.lado), poss: fxAtk(e.lado), stat: "alvo",
        txt: `⚽ GOOOL do ${nome(e.lado)}! ${e.jogador} recebe de ${nm(e.lado, "mid")} e ${ctxTxt}: ${placar[0]} a ${placar[1]}.` });
      posse = outro(e.lado); zona = "meio";
      momentum = clamp(momentum + (e.lado === "mandante" ? 0.28 : -0.28), -1, 1);
    } else if (e.tipo === "CARTAO_AMARELO") {
      const pend = R() < 0.3;
      emit(e.lado, "amarelo", `🟨 Amarelo para ${e.jogador} (${nome(e.lado)})${pend ? " — pendurado, desfalca a próxima" : " por falta tática"}.`, { min: e.minuto });
    } else if (e.tipo === "CARTAO_VERMELHO") {
      homens = e.lado === "mandante" ? [homens[0] - 1, homens[1]] : [homens[0], homens[1] - 1];
      const rest = Math.max(1, Math.round(90 - e.minuto));
      add({ min: e.minuto, lado: e.lado, tipo: "vermelho", cena: true, fx: territorio(), poss: territorio(),
        txt: `🟥 VERMELHO! ${e.jogador} (${nome(e.lado)}) foi expulso. O ${nome(e.lado)} joga com ${homens[e.lado === "mandante" ? 0 : 1]} pelos próximos ${rest} minutos.` });
      emit(outro(e.lado), "toque", `Com um a mais, o ${nome(outro(e.lado))} deve assumir de vez o controle.`, { min: e.minuto + 0.3 });
      posse = outro(e.lado); zona = "meio";
    } else if (e.tipo === "LESAO") {
      emit(e.lado, "lesao", `✚ ${e.jogador} (${nome(e.lado)}) cai sentindo. Atendimento em campo...`, { min: e.minuto });
      const s = e.lado === "mandante" ? 0 : 1;
      if (subs[s] < 5) { subs[s]++; emit(e.lado, "sub", `🔄 ${e.jogador} não tem condições — o ${nome(e.lado)} faz a troca forçada.`, { min: e.minuto + 0.5 }); }
    }
  };

  // substituições táticas programadas
  const janelas: { min: number; lado: L }[] = [];
  (["mandante", "visitante"] as L[]).forEach((l) => [60, 72, 82].forEach((base) => janelas.push({ min: base + Math.floor(R() * 6) - 2, lado: l })));
  janelas.sort((a, b) => a.min - b.min);
  let ji = 0;

  add({ min: 0, lado: null, tipo: "apito", cena: false, fx: 0.5, poss: 0.5,
    txt: `Apito inicial! ${mandante} com a bola. ${fMand - fVis > 0.14 ? `${mandante} é favorito jogando em casa.` : fVis - fMand > 0.14 ? `${visitante} chega embalado e assusta fora.` : "Jogo parelho no papel."}` });

  while (min < 90 + acresc) {
    if (ei < evs.length && evs[ei].minuto <= min) { emitirEvento(evs[ei++]); continue; }
    if (ji < janelas.length && janelas[ji].min <= min && min < 88) {
      const jn = janelas[ji++];
      const s = jn.lado === "mandante" ? 0 : 1;
      if (subs[s] < 5) {
        subs[s]++;
        const atras = gd() * (jn.lado === "mandante" ? 1 : -1) < 0;
        emit(jn.lado, "sub", `🔄 Mexe o ${nome(jn.lado)}: sai ${nm(jn.lado, R() < 0.5 ? "def" : "mid")}, entra ${atras ? "gente de frente para buscar o jogo" : "um jogador para dar equilíbrio"}.`);
      }
      continue;
    }
    if (!htDone && min >= 45) {
      add({ min: 45, lado: null, tipo: "apito", cena: false, fx: territorio(), poss: territorio(), txt: `Fim do primeiro tempo. ${placar[0]} a ${placar[1]}.` });
      add({ min: 45.4, lado: null, tipo: "apito", cena: false, fx: 0.5, poss: 0.5, txt: `Bola rolando para o segundo tempo.` });
      htDone = true; posse = R() < 0.5 ? "mandante" : "visitante"; zona = "meio"; min = 46; momentum = alvoMom() * 0.6;
      continue;
    }

    min += 0.42 + R() * 0.95;
    if (min >= 90 && acresc === 0) {
      acresc = clamp(2 + Math.round((evs.length + subs[0] + subs[1]) / 3), 2, 8);
      add({ min: 90, lado: null, tipo: "apito", cena: false, fx: territorio(), poss: territorio(), txt: `O quarto árbitro mostra ${acresc} minutos de acréscimo.` });
      const at: L | null = gd() < 0 ? "mandante" : gd() > 0 ? "visitante" : null;
      if (at) emit(at, "toque", `${nome(at)} se joga todo ao ataque nos acréscimos.`, { min: 90.2 });
      continue;
    }
    if (min >= 90 + acresc) break;

    momentum = clamp(momentum + (alvoMom() - momentum) * 0.14 + (R() - 0.5) * 0.13, -1, 1);
    run++;
    const pMand = 0.5 + momentum * 0.3;
    if (run > 4 && zona !== "ataque") {
      const f = R() < 0.35;
      emit(posse, f ? "falta" : "toque", falaPerda(posse), f ? { stat: "falta" } : undefined);
      virar(); zona = R() < 0.6 ? "meio" : "def";
      continue;
    }
    if (zona === "meio" && R() < 0.22) posse = R() < pMand ? "mandante" : "visitante";

    const favor = posse === "mandante" ? momentum : -momentum;
    const fase = min < 8 ? "abertura" : min > 78 ? "final" : "normal";
    const meunum = homens[posse === "mandante" ? 0 : 1];

    if (zona === "def") {
      emit(posse, "toque", falaZona(posse));
      zona = R() < 0.78 ? "meio" : "def";
    } else if (zona === "meio") {
      const r = R();
      const pAv = 0.44 + Math.max(0, favor) * 0.26 + (fase === "abertura" ? -0.12 : fase === "final" ? 0.12 : 0);
      if (r < 0.18) { emit(posse, "toque", falaPerda(posse)); virar(); zona = R() < 0.5 ? "def" : "meio"; }
      else if (r < 0.18 + pAv) {
        emit(posse, "avanco", pick([
          `${nm(posse, "mid")} lança ${nm(posse, "atk")} nas costas da defesa — o ${nome(posse)} chega com perigo!`,
          `${nome(posse)} puxa o contra-ataque em velocidade com ${nm(posse, "atk")}!`,
          `Tabela de ${nm(posse, "mid")} e ${nm(posse, "atk")}; o ${nome(posse)} acelera pela direita.`,
          `${nm(posse, "atk")} recebe entre os zagueiros e gira para o ataque do ${nome(posse)}.`,
        ]));
        zona = "ataque";
      } else emit(posse, "toque", falaZona(posse));
    } else {
      const r = R();
      const golProx = evs.some((e) => e.tipo === "GOL" && e.minuto <= min + 0.6 && e.minuto >= min - 2.4);
      const pChance = 0.26 + Math.max(0, favor) * 0.26 + (fase === "final" ? 0.08 : 0) - (meunum < 11 ? 0.05 : 0);
      if (golProx) { emit(posse, "avanco", `${nome(posse)} pressiona forte dentro da área...`); zona = "ataque"; }
      else if (r < pChance) {
        const rr = R();
        let t: Tipo, txt: string, cena = false, stat: Beat["stat"] = "fin";
        if (rr < 0.24) { t = "defesa"; cena = true; stat = "alvo"; txt = `DEFESAÇA de ${nm(outro(posse), "gk")}! Salvou o que era gol do ${nome(posse)} — cabeçada de ${nm(posse, "atk")}.`; }
        else if (rr < 0.34) { t = "trave"; cena = true; stat = "alvo"; txt = `NA TRAVE! ${nm(posse, "atk")} bateu firme e o ${nome(posse)} carimbou o travessão!`; }
        else if (rr < 0.5) { t = "chance"; cena = true; txt = `INCRÍVEL! ${nm(posse, "atk")} perdeu sozinho, mandou por cima. Que chance do ${nome(posse)}!`; }
        else if (rr < 0.7) { t = "bloqueio"; txt = `${nm(posse, "atk")} finaliza e ${nm(outro(posse), "def")} bloqueia quase em cima da linha!`; }
        else if (rr < 0.86) { t = "prafora"; txt = `${nm(posse, "mid")} arrisca de fora; a bola passa rente à trave do ${nome(outro(posse))}.`; }
        else { t = "defesa"; stat = "alvo"; txt = `${nm(posse, "atk")} chuta no meio do gol e ${nm(outro(posse), "gk")} segura sem dar rebote.`; }
        add({ min: M(), lado: posse, tipo: t, txt, cena, fx: fxAtk(posse), poss: fxAtk(posse), stat });
        virar(); zona = "def";
      } else if (r < pChance + 0.2) {
        emit(posse, "escanteio", pick([
          `Escanteio para o ${nome(posse)}. ${nm(posse, "mid")} cobra fechado e ${nm(outro(posse), "def")} afasta.`,
          `Na cobrança de escanteio, ${nm(posse, "atk")} cabeceia para fora por pouco.`,
          `${nm(outro(posse), "gk")} sobe bem no escanteio e segura firme.`,
        ]), { stat: "esc" });
        if (R() < 0.55) { virar(); zona = "def"; } else zona = "meio";
      } else if (r < pChance + 0.4) {
        if (R() < 0.08) emit(posse, "toque", `PÊNALTI? ${nm(posse, "atk")} cai na área e pede muito! O árbitro... manda seguir. Reclamação geral do ${nome(posse)}.`);
        else {
          const perigo = R() < 0.4;
          emit(outro(posse), "falta", perigo ? `Falta dura de ${nm(outro(posse), "def")} na entrada da área. Amarelo e bronca do árbitro.` : `Falta do ${nome(outro(posse))}. Jogo parado no meio.`, { stat: "falta", cena: perigo });
        }
        virar(); zona = "def";
      } else if (R() < 0.4) {
        emit(posse, "prafora", pick([
          `${nm(posse, "atk")} gira e finaliza; ${nm(outro(posse), "def")} manda para escanteio.`,
          `${nm(posse, "mid")} bate colocado e a bola sai à esquerda do gol do ${nome(outro(posse))}.`,
          `${nm(posse, "atk")} cabeceia por cima do travessão do ${nome(outro(posse))}.`,
          `Chute cruzado de ${nm(posse, "atk")}; ${nm(outro(posse), "gk")} espalma para longe.`,
        ]), { stat: "fin" });
        zona = R() < 0.5 ? "meio" : "ataque";
        if (R() < 0.3) { virar(); zona = "def"; }
      } else {
        emit(posse, "avanco", falaZona(posse));
        if (R() < 0.5) zona = "meio";
        if (R() < 0.28) { virar(); zona = "def"; }
      }
    }
  }
  while (ei < evs.length) emitirEvento(evs[ei++]);
  add({ min: 90 + acresc, lado: null, tipo: "apito", cena: false, fx: territorio(), poss: territorio(),
    txt: `Fim de jogo! ${mandante} ${placar[0]} x ${placar[1]} ${visitante}.` });

  // ambiente de clima: pulveriza algumas falas ao longo do jogo
  if (clima) {
    const amb = frasesClima(clima, mandante, visitante);
    if (amb.length) {
      const nAmb =
        clima.cond === "tempestade" ? 4 : clima.cond === "chuva" ? 3
          : clima.cond === "garoa" || clima.sensacao === "calor intenso" ? 2 : 1;
      const usados = new Set<string>();
      for (let k = 0; k < nAmb; k++) {
        let txt = amb[Math.floor(R() * amb.length)];
        for (let t = 0; t < 4 && usados.has(txt); t++) txt = amb[Math.floor(R() * amb.length)];
        usados.add(txt);
        const m = 5 + Math.floor(R() * 80);
        beats.push({ min: m, lado: null, tipo: "toque", txt, cena: false, fx: 0.5 });
      }
    }
  }

  beats.sort((a, b) => a.min - b.min);
  return beats;
}

/* ================================================================= geometria 2D */
const PW = 1050, PH = 620, Mg = 40;
const VBW = PW + Mg * 2, VBH = PH + Mg * 2;
const gx = (f: number) => Mg + f * PW;
const gy = (f: number) => Mg + f * PH;

/* keyframes da bola (ataque para a DIREITA); espelha em x quando é para a esquerda */
const KF: Record<string, { t: number; x: number; y: number }[]> = {
  gol: [{ t: 0, x: 0.58, y: 0.5 }, { t: 0.5, x: 0.8, y: 0.5 }, { t: 0.72, x: 0.88, y: 0.44 }, { t: 1, x: 0.985, y: 0.42 }],
  trave: [{ t: 0, x: 0.58, y: 0.5 }, { t: 0.5, x: 0.8, y: 0.52 }, { t: 0.78, x: 0.965, y: 0.55 }, { t: 1, x: 0.86, y: 0.9 }],
  defesa: [{ t: 0, x: 0.58, y: 0.5 }, { t: 0.5, x: 0.78, y: 0.47 }, { t: 0.72, x: 0.92, y: 0.5 }, { t: 1, x: 0.9, y: 0.26 }],
  chance: [{ t: 0, x: 0.58, y: 0.5 }, { t: 0.55, x: 0.82, y: 0.5 }, { t: 0.82, x: 0.99, y: 0.66 }, { t: 1, x: 1.03, y: 0.74 }],
  falta: [{ t: 0, x: 0.52, y: 0.5 }, { t: 0.45, x: 0.68, y: 0.5 }, { t: 0.62, x: 0.7, y: 0.52 }, { t: 1, x: 0.7, y: 0.52 }],
  vermelho: [{ t: 0, x: 0.5, y: 0.5 }, { t: 0.4, x: 0.64, y: 0.5 }, { t: 1, x: 0.64, y: 0.5 }],
};
function kfAt(list: { t: number; x: number; y: number }[], p: number, dirRight: boolean): [number, number] {
  let a = list[0], b = list[list.length - 1];
  for (let i = 0; i < list.length - 1; i++) {
    if (p >= list[i].t && p <= list[i + 1].t) { a = list[i]; b = list[i + 1]; break; }
  }
  const k = b.t === a.t ? 0 : (p - a.t) / (b.t - a.t);
  const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k);
  return [dirRight ? x : 1 - x, y];
}

function CenaChave({
  tipo, dirRight, p, cA, cD, capMin, capTxt, flash, clima,
}: {
  tipo: Tipo; dirRight: boolean; p: number;
  cA: [string, string]; cD: [string, string];
  capMin: number; capTxt: string; flash: boolean;
  clima?: ClimaJogo;
}) {
  const noite = clima?.periodo === "noite";
  const chuva = clima?.cond === "chuva" || clima?.cond === "tempestade";
  const garoa = clima?.cond === "garoa";
  const gBase = noite ? "#0c2c18" : "#123a20";
  const gA = noite ? "#1c5230" : "#358a47";
  const gB = noite ? "#164227" : "#2c743b";
  const list = KF[tipo] ?? KF.chance;
  const [bxF, byF] = kfAt(list, p, dirRight);
  const bx = gx(bxF), by = gy(byF);
  const ease = p < 0.52 ? p / 0.52 : 1;
  const dir = dirRight ? 1 : -1;
  const gX = dirRight ? 0.97 : 0.03;

  // portador: segue a bola na aproximação; depois "trava" no ponto do lance
  const carrF = kfAt(list, Math.min(p, 0.5), dirRight);
  let carrX = carrF[0] - dir * 0.018;
  let carrY = carrF[1];
  const queda = tipo === "falta" || tipo === "vermelho" ? clamp((p - 0.4) / 0.4, 0, 1) : 0;
  if ((tipo === "falta" || tipo === "vermelho") && p > 0.5) { carrX = dirRight ? 0.7 : 0.3; carrY = 0.5; }

  // defensores + goleiro
  const d1x = lerp(dirRight ? 0.78 : 0.22, dirRight ? 0.9 : 0.1, ease);
  const d2x = lerp(dirRight ? 0.76 : 0.24, dirRight ? 0.87 : 0.13, ease);
  let gky = 0.5 + (byF - 0.5) * 0.7;
  if (tipo === "gol") gky = 0.5 - (byF - 0.5) * 1.1;       // vai para o lado errado
  let gkx = dirRight ? 0.955 : 0.045;
  if (tipo === "defesa" && p > 0.55) { gkx = lerp(gkx, bxF + dir * 0.01, (p - 0.55) / 0.45); gky = lerp(gky, byF, (p - 0.55) / 0.45); }

  // apoios (correm para comemorar no gol)
  const cel = tipo === "gol" ? clamp((p - 0.72) / 0.28, 0, 1) : 0;
  const s1x = lerp(lerp(dirRight ? 0.5 : 0.5, dirRight ? 0.74 : 0.26, ease), gX - dir * 0.09, cel);
  const s1y = lerp(0.3, 0.2, cel);
  const s2x = lerp(lerp(dirRight ? 0.48 : 0.52, dirRight ? 0.72 : 0.28, ease), gX - dir * 0.09, cel);
  const s2y = lerp(0.72, 0.8, cel);

  const refP = (tipo === "falta" || tipo === "vermelho") ? clamp((p - 0.3) / 0.5, 0, 1) : -1;
  const refX = refP >= 0 ? lerp(0.5, carrX - dir * 0.05, refP) : 0;
  const refY = refP >= 0 ? lerp(0.5, 0.44, refP) : 0;
  const cartao = tipo === "vermelho" && p > 0.5;

  const R = 13;
  const disc = (x: number, y: number, fill: string, stroke: string, rot = 0) => (
    <g transform={rot ? `rotate(${rot} ${gx(x)} ${gy(y)})` : undefined}>
      <ellipse cx={gx(x)} cy={gy(y) + R * 0.85} rx={R * 0.8} ry={R * 0.3} fill="rgba(0,0,0,.28)" />
      <circle cx={gx(x)} cy={gy(y)} r={R} fill={fill} stroke={stroke} strokeWidth={2.4} />
    </g>
  );

  // ---- os 22 em campo: formações estáticas de fundo (as peças "em jogo" são desenhadas por cima)
  const fx = (x: number) => (dirRight ? x : 1 - x);
  // time que ATACA (gol adversário no lado gX): GK + 4 def + 3 meias  (frente = portador + s1 + s2)
  const bgA: [number, number][] = [
    [0.055, 0.5],
    [0.23, 0.22], [0.21, 0.42], [0.21, 0.58], [0.23, 0.78],
    [0.42, 0.3], [0.40, 0.5], [0.42, 0.7],
  ];
  // time que DEFENDE: 4 def na área + 3 meias + 1 avançado recuado  (GK = gkx/gky)
  const bgD: [number, number][] = [
    [0.90, 0.24], [0.92, 0.42], [0.92, 0.58], [0.90, 0.76],
    [0.77, 0.32], [0.74, 0.5], [0.77, 0.68],
    [0.60, 0.5],
  ];
  const pushA = dir * ease * 0.035;   // o time que ataca avança durante o lance
  const pushD = dir * ease * 0.02;    // a defesa recua para a própria área

  return (
    <div className={"cena-wrap" + (flash ? " flash" : "")}>
      <div className="cena-cap" style={{ color: clarear(cA[0], claro(cA[0]) ? 0 : 0.55) }}>
        {Math.floor(capMin)}&apos; · {capTxt}
      </div>
      <svg viewBox={`0 0 ${VBW} ${VBH}`} className="cena-campo" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <rect x="0" y="0" width={VBW} height={VBH} fill={gBase} />
        <g>
          <rect x={Mg} y={Mg} width={PW} height={PH} fill={noite ? "#245f37" : "#2f7d3f"} />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={Mg + (i * PW) / 12} y={Mg} width={PW / 12} height={PH} fill={i % 2 ? gA : gB} />
          ))}
          {(chuva || garoa) && <rect x={Mg} y={Mg} width={PW} height={PH} fill="#1a2f3a" opacity={chuva ? 0.28 : 0.14} />}
        </g>
        <g fill="none" stroke="#eef6ef" strokeWidth="3" opacity="0.9">
          <rect x={Mg} y={Mg} width={PW} height={PH} />
          <line x1={Mg + PW / 2} y1={Mg} x2={Mg + PW / 2} y2={Mg + PH} />
          <circle cx={Mg + PW / 2} cy={Mg + PH / 2} r="84" />
          <rect x={Mg} y={Mg + PH / 2 - 185} width="150" height="370" />
          <rect x={Mg + PW - 150} y={Mg + PH / 2 - 185} width="150" height="370" />
          <rect x={Mg} y={Mg + PH / 2 - 84} width="50" height="168" />
          <rect x={Mg + PW - 50} y={Mg + PH / 2 - 84} width="50" height="168" />
        </g>
        <g stroke="#e9f3ea" strokeWidth="3" fill="rgba(255,255,255,.12)">
          <rect x={Mg - 20} y={Mg + PH / 2 - 34} width="20" height="68" />
          <rect x={Mg + PW} y={Mg + PH / 2 - 34} width="20" height="68" />
        </g>

        {/* os 11 de cada time — formações de fundo */}
        {bgD.map(([x, y], i) => <g key={"d" + i}>{disc(fx(x) + pushD, y, cD[0], cD[1])}</g>)}
        {bgA.map(([x, y], i) => <g key={"a" + i}>{disc(fx(x) + (i === 0 ? 0 : pushA), y, cA[0], cA[1])}</g>)}
        {/* defensores próximos ao lance */}
        {disc(d1x, 0.4, cD[0], cD[1])}
        {disc(d2x, 0.6, cD[0], cD[1])}
        {/* goleiro que defende */}
        {disc(gkx, gky, "#1f2937", "#f4f4f5")}
        {/* apoios do time atacante */}
        {disc(s1x, s1y, cA[0], cA[1])}
        {disc(s2x, s2y, cA[0], cA[1])}
        {/* portador */}
        {disc(carrX, carrY, cA[0], cA[1], queda ? 68 * queda : 0)}
        {/* árbitro + cartão */}
        {refP >= 0 && disc(refX, refY, "#141414", "#fff")}
        {cartao && (
          <rect x={gx(refX) + 6} y={gy(refY) - 34} width="15" height="21" rx="2" fill="#e5484d" stroke="#fff" strokeWidth="1.4" />
        )}
        {/* bola */}
        <ellipse cx={bx} cy={by + 5} rx="5" ry="2.2" fill="rgba(0,0,0,.35)" />
        <circle cx={bx} cy={by} r="7" fill="#fff" stroke="#111" strokeWidth="1.6" />

        {(chuva || garoa) && (
          <g stroke="#dfe8ef" strokeWidth={chuva ? 2 : 1.4} opacity={chuva ? 0.5 : 0.3}>
            {Array.from({ length: chuva ? 70 : 34 }).map((_, i) => {
              const seed = (i * 2654435761) >>> 0;
              const sx = (seed % 1000) / 1000 * VBW;
              const sy = ((seed >>> 10) % 1000) / 1000 * VBH;
              const off = ((p * (chuva ? 520 : 300)) + sy) % (VBH + 40) - 20;
              return <line key={i} x1={sx} y1={off} x2={sx - 7} y2={off + 22} />;
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

/* ================================================================= tela */
export default function AoVivo() {
  const nav = useNavigate();
  const { data, erro, carregando } = useAsyncOnce();
  const [, render] = useState(0);
  const rel = useRef({ acc: 0, last: performance.now(), pausado: false, veloc: 1 });
  const finalizou = useRef(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const nVis = useRef(0);

  const dur = data?.duracaoMs ?? 420_000;
  const eventos = useMemo<Ev[]>(
    () => (data?.eventos ?? []).map((e) => ({ minuto: e.minuto, tipo: e.tipo, lado: e.lado, jogador: e.jogador })),
    [data]
  );
  const roteiro = useMemo(() => {
    if (!data) return [] as Beat[];
    const seed = (data.rodada * 2654435761) ^ hashStr(data.mandante.nomeCurto + "|" + data.visitante.nomeCurto);
    const m = (data as unknown as { motor?: {
      forcaMandante: number; forcaVisitante: number; arqMandante: string; arqVisitante: string;
      elencoMandante: Roster; elencoVisitante: Roster;
    } }).motor;
    const vazio: Roster = { gk: [], def: [], mid: [], atk: [] };
    return gerarRoteiro({
      mandante: data.mandante.nomeCurto, visitante: data.visitante.nomeCurto,
      eventos, seed: seed >>> 0, clima: data.clima as ClimaJogo | undefined,
      fMand: m?.forcaMandante ?? 0.5, fVis: m?.forcaVisitante ?? 0.5,
      arqMand: m?.arqMandante ?? "", arqVis: m?.arqVisitante ?? "",
      elMand: m?.elencoMandante ?? vazio, elVis: m?.elencoVisitante ?? vazio,
    });
  }, [data, eventos]);

  useEffect(() => {
    let raf = 0, lastR = 0;
    const loop = (now: number) => {
      const r = rel.current;
      const dt = Math.min(100, now - r.last);
      r.last = now;
      if (!r.pausado) r.acc += dt * r.veloc;
      if (now - lastR > 33) { lastR = now; render((n) => n + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const minF = Math.min(90, (rel.current.acc / dur) * 90);
  const minuto = Math.floor(minF);
  const fim = minF >= 90;

  useEffect(() => {
    if (fim && !finalizou.current) { finalizou.current = true; finalizarJogoAoVivo(); }
  }, [fim]);

  const visiveis = useMemo(() => roteiro.filter((b) => b.min <= minF), [roteiro, minF]);

  const stats = useMemo(() => {
    let finM = 0, finV = 0, alvoM = 0, alvoV = 0, escM = 0, escV = 0, falM = 0, falV = 0;
    let pSum = 0, pN = 0;
    for (const b of visiveis) {
      if (typeof b.poss === "number") { pSum += b.poss; pN++; }
      const isM = b.lado === "mandante", isV = b.lado === "visitante";
      if (b.stat === "fin" || b.stat === "alvo") { if (isM) finM++; else if (isV) finV++; }
      if (b.stat === "alvo") { if (isM) alvoM++; else if (isV) alvoV++; }
      if (b.stat === "esc") { if (isM) escM++; else if (isV) escV++; }
      if (b.stat === "falta") { if (isM) falM++; else if (isV) falV++; }
    }
    const posM = pN ? Math.round((pSum / pN) * 100) : 50;
    return { finM, finV, alvoM, alvoV, escM, escV, falM, falV, posM, posV: 100 - posM };
  }, [visiveis]);

  useEffect(() => {
    if (visiveis.length !== nVis.current) {
      nVis.current = visiveis.length;
      const el = feedRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [visiveis.length]);

  if (carregando) return <Loading label="Entrando em campo…" />;
  if (erro || !data) return <div className="empty">{erro ?? "Sem jogo ao vivo."}</div>;

  const cM = coresDoClube(data.mandante.cores);
  const cV = coresDoClube(data.visitante.cores);
  const clima = (data.clima ?? undefined) as ClimaJogo | undefined;
  const golsM = eventos.filter((e) => e.tipo === "GOL" && e.lado === "mandante" && e.minuto <= minF).length;
  const golsV = eventos.filter((e) => e.tipo === "GOL" && e.lado === "visitante" && e.minuto <= minF).length;

  const CENA = (90 * 5200) / dur;                    // ~5,2 s de cena em unidades de minF
  const atual = visiveis[visiveis.length - 1];
  const cenaAtiva = !!atual && atual.cena && minF - atual.min < CENA;
  const cenaP = cenaAtiva ? clamp((minF - atual!.min) / CENA, 0, 1) : 0;
  const flash = cenaAtiva && atual!.tipo === "gol";
  const fxAtual = atual ? atual.fx : 0.5;

  // ---- explosão de GOL: overlay grande e piscante nos ~6s do lance
  const golBoom = !!atual && atual.tipo === "gol" && minF - atual.min < CENA * 1.15;
  const golLado = golBoom ? atual!.lado : null;
  const golCor = golLado === "mandante" ? cM : cV;
  const golTime = golLado === "mandante" ? data.mandante.nomeCurto : data.visitante.nomeCurto;
  const golDesc = golBoom ? (atual!.txt.split("! ")[1] ?? atual!.txt).replace(/^⚽\s*/, "") : "";

  const tint = (hex: string) => {
    // garante leitura no painel escuro: escurece cor clara de menos, clareia cor escura o suficiente
    const [r, g, bl] = hexRgb(hex);
    const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
    if (lum > 190) return mix(hex, "#000000", 0.15);
    if (lum > 120) return hex;
    return clarear(hex, lum < 55 ? 0.62 : 0.48);
  };
  const corLinha = (b: Beat) => (b.lado ? tint(b.lado === "mandante" ? cM[0] : cV[0]) : "#94a0aa");

  return (
    <>
      {golBoom && (
        <div
          className={"gol-boom" + (golLado === "visitante" ? " lado-b" : " lado-a")}
          style={{ "--gc": golCor[0], "--gc2": golCor[1] } as React.CSSProperties}
          aria-hidden
        >
          <div className="gb-word">
            GOOOOOOOOOOL<span className="gb-bang">!!!</span>
          </div>
          <div className="gb-time">{golTime}</div>
          <div className="gb-desc">{golDesc}</div>
          <div className="gb-placar">{golsM} <i>–</i> {golsV}</div>
        </div>
      )}

      {/* placar grande — nomes em degradê das cores do time (estilo do banner do menu) */}
      <div className="cm-wrap">
        <div className="cm-board">
          <span className="cm-half a" style={{ "--ha": cM[0], "--hb": cM[1] } as React.CSSProperties}>
            <NomeClube id={data.mandante.id}>{data.mandante.nomeCurto}</NomeClube>
          </span>
          <span className="cm-mid">
            <span className="cm-clk">
              <i className={"lv" + (fim ? " off" : "")} />
              {fim ? "FT" : `${minuto}'`}
            </span>
            <span className="cm-sc">{golsM}<i>–</i>{golsV}</span>
          </span>
          <span className="cm-half b" style={{ "--ha": cV[0], "--hb": cV[1] } as React.CSSProperties}>
            <NomeClube id={data.visitante.id}>{data.visitante.nomeCurto}</NomeClube>
          </span>
        </div>
      </div>

      {clima && (
        <div className={"clima-chip lv-" + clima.cond}>
          <span className="cc-ico">{clima.icone}</span>
          <span className="cc-t">{clima.tempC}°</span>
          <span className="cc-r">{clima.rotulo}</span>
          {clima.gramado !== "firme" && <span className="cc-g">gramado {clima.gramado}</span>}
          {clima.ventoKmh >= 28 && <span className="cc-g">vento {clima.ventoKmh} km/h</span>}
        </div>
      )}

      {/* estatísticas ao vivo */}
      <div className="mstats" aria-hidden>
        {([
          ["Posse", stats.posM + "%", stats.posV + "%"],
          ["Finalizações", stats.finM, stats.finV],
          ["No alvo", stats.alvoM, stats.alvoV],
          ["Escanteios", stats.escM, stats.escV],
          ["Faltas", stats.falM, stats.falV],
        ] as [string, string | number, string | number][]).map(([k, a, b]) => (
          <div className="ms-col" key={k}>
            <span className="ms-a">{a}</span>
            <span className="ms-k">{k}</span>
            <span className="ms-b">{b}</span>
          </div>
        ))}
      </div>

      {/* cena 2D — só nos lances decisivos; entre eles, barra de campo */}
      {cenaAtiva ? (
        <CenaChave
          tipo={atual!.tipo} dirRight={atual!.lado === "mandante"} p={cenaP}
          cA={atual!.lado === "mandante" ? cM : cV}
          cD={atual!.lado === "mandante" ? cV : cM}
          capMin={atual!.min} capTxt={atual!.txt} flash={flash} clima={clima}
        />
      ) : (
        <div className="posse-bar" aria-hidden>
          <div className="pb-track" style={{ background: `linear-gradient(90deg, ${cM[0]} 0%, ${mix(cM[0], cV[0], 0.5)} 50%, ${cV[0]} 100%)` }}>
            <span className="pb-ball" style={{ left: `${clamp(fxAtual, 0.02, 0.98) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="narr" ref={feedRef}>
        {visiveis.length === 0 ? (
          <div className="empty">Bola rolando…</div>
        ) : (
          visiveis.map((b, i) => {
            const forte = b.cena || b.tipo === "gol" || b.tipo === "vermelho" || b.tipo === "amarelo" || b.tipo === "lesao";
            return (
              <div key={i} className={"nl" + (forte ? " key" : "")} style={forte && b.lado ? ({ "--kc": corLinha(b) } as React.CSSProperties) : undefined}>
                <span className="nlm">{Math.floor(b.min)}&apos;</span>
                <span className="nlt" style={{ color: corLinha(b) }}><TextoComNomes texto={b.txt} /></span>
              </div>
            );
          })
        )}
      </div>

      <div className="live-ctrl">
        <button className="btn ghost sm" onClick={() => { rel.current.pausado = !rel.current.pausado; render((n) => n + 1); }}>
          {rel.current.pausado ? "▶ retomar" : "⏸ pausar"}
        </button>
        <button
          className={"btn ghost sm" + (rel.current.veloc === 2 ? " on" : "")}
          onClick={() => { rel.current.veloc = rel.current.veloc === 1 ? 2 : 1; render((n) => n + 1); }}
        >
          velocidade ×{rel.current.veloc}
        </button>
        {fim ? (
          <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => nav(`/partida/${data.rodada}`, { replace: true })}>
            ver súmula →
          </button>
        ) : (
          <button className="linkish" style={{ marginLeft: "auto" }} onClick={() => { rel.current.acc = dur; render((n) => n + 1); }}>
            pular para o fim
          </button>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ carga */
function useAsyncOnce() {
  const [state, setState] = useState<{ data: Awaited<ReturnType<typeof api.partidaAoVivo>> | null; erro: string | null; carregando: boolean }>({
    data: null, erro: null, carregando: true,
  });
  useEffect(() => {
    let vivo = true;
    api.partidaAoVivo()
      .then((d) => vivo && setState({ data: d, erro: null, carregando: false }))
      .catch((e) => vivo && setState({ data: null, erro: e?.message ?? "Falha.", carregando: false }));
    return () => { vivo = false; };
  }, []);
  return state;
}
