// Backtesting do motor de partida (02_GAME_DESIGN_DOCUMENT, seção 6).
//
// Roda N temporadas completas da Liga Nacional só com IA (postura
// EQUILIBRADA) e agrega estatísticas para comparar com o Campeonato
// Brasileiro Série A recente. Puro: usa o gerador de universo e o motor,
// sem banco.
//
//   npm run backtest            # 30 temporadas, seed padrão
//   npm run backtest -- 50 xyz  # 50 temporadas, seed "xyz"

import { gerarUniverso, JogadorGerado } from "../modules/liga/universo.generator";
import { gerarCalendarioIdaEVolta } from "../modules/competicao/calendario.generator";
import { simularPartida, TimeEntrada, JogadorAtributos } from "../modules/partida/engine/simulateMatch";
import { aplicarBonusTracos } from "../modules/jogador/tracos";
import { posturaParaMotor } from "../modules/clube/perfilIA";

const N = Number(process.argv[2]) || 30;
const SEED = process.argv[3] || "backtest-v1";

// Metas (Brasileirão Série A, médias recentes ~2019-2024).
const METAS = {
  golsPorJogo: [2.3, 2.7],
  vitMandantePct: [44, 52],
  empatePct: [24, 30],
  vitVisitantePct: [22, 28],
  campeaoPts: [70, 84],
  lanternaPts: [26, 36],
  amarelosPorJogo: [4.2, 6.0],
  vermelhosPorJogo: [0.18, 0.42],
};

function paraTime(clubeIdx: number, elenco: JogadorGerado[], perfilPostura: number): TimeEntrada {
  const jogadores: JogadorAtributos[] = elenco.map((j) => {
    const a = aplicarBonusTracos(j.atributos, j.tracos); // 04 §10
    return {
      finalizacao: a.finalizacao, passe: a.passe, drible: a.drible, marcacao: a.marcacao,
      desarme: a.desarme, velocidade: a.velocidade, posicionamento: a.posicionamento,
      reflexos: a.reflexos, saidaDeGol: a.saidaDeGol,
      ehGoleiro: j.posicao === "GOLEIRO",
    };
  });
  // clubes de backtest são todos IA → postura vem do perfil (12 §1).
  return { clubeId: `c${clubeIdx}`, jogadores, postura: posturaParaMotor(perfilPostura) };
}

interface Acc {
  jogos: number;
  gols: number;
  vitMandante: number;
  empates: number;
  vitVisitante: number;
  amarelos: number;
  vermelhos: number;
  lesoes: number;
  jogos00: number;
  maiorGoleada: number;
  campeaoPts: number[];
  lanternaPts: number[];
  campeoes: Record<number, number>; // idx do clube -> nº de títulos
  golsPorTimeJogo: number[]; // histograma [0,1,2,3,4,5+]
}

const acc: Acc = {
  jogos: 0, gols: 0, vitMandante: 0, empates: 0, vitVisitante: 0,
  amarelos: 0, vermelhos: 0, lesoes: 0, jogos00: 0, maiorGoleada: 0,
  campeaoPts: [], lanternaPts: [], campeoes: {}, golsPorTimeJogo: [0, 0, 0, 0, 0, 0],
};

const universo = gerarUniverso({ nomeLiga: "L", seed: `${SEED}:uni` });
const times = universo.clubes.map((c, i) => paraTime(i, c.elenco, c.perfilIA.posturaTatica));
const forcaMedia = universo.clubes.map((c) => c.forca);

for (let s = 0; s < N; s++) {
  const confrontos = gerarCalendarioIdaEVolta(20, `${SEED}:cal:${s}`);
  const pts = new Array(20).fill(0);
  const sg = new Array(20).fill(0);

  for (const c of confrontos) {
    const r = simularPartida(
      times[c.mandanteIndex],
      times[c.visitanteIndex],
      `${SEED}:${s}:${c.rodada}:${c.mandanteIndex}:${c.visitanteIndex}`
    );
    acc.jogos++;
    acc.gols += r.golsMandante + r.golsVisitante;
    if (r.golsMandante > r.golsVisitante) { acc.vitMandante++; pts[c.mandanteIndex] += 3; }
    else if (r.golsMandante < r.golsVisitante) { acc.vitVisitante++; pts[c.visitanteIndex] += 3; }
    else { acc.empates++; pts[c.mandanteIndex]++; pts[c.visitanteIndex]++; }
    sg[c.mandanteIndex] += r.golsMandante - r.golsVisitante;
    sg[c.visitanteIndex] += r.golsVisitante - r.golsMandante;

    if (r.golsMandante === 0 && r.golsVisitante === 0) acc.jogos00++;
    acc.maiorGoleada = Math.max(acc.maiorGoleada, Math.abs(r.golsMandante - r.golsVisitante));
    for (const g of [r.golsMandante, r.golsVisitante]) acc.golsPorTimeJogo[Math.min(5, g)]++;

    for (const e of r.eventos) {
      if (e.tipo === "CARTAO_AMARELO") acc.amarelos++;
      else if (e.tipo === "CARTAO_VERMELHO") acc.vermelhos++;
      else if (e.tipo === "LESAO") acc.lesoes++;
    }
  }

  const ordem = [...pts.keys()].sort((a, b) => pts[b] - pts[a] || sg[b] - sg[a]);
  acc.campeaoPts.push(pts[ordem[0]]);
  acc.lanternaPts.push(pts[ordem[19]]);
  acc.campeoes[ordem[0]] = (acc.campeoes[ordem[0]] ?? 0) + 1;
}

// --- relatório ---
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const min = (xs: number[]) => Math.min(...xs);
const max = (xs: number[]) => Math.max(...xs);
const pct = (n: number) => ((100 * n) / acc.jogos).toFixed(1);
const ok = (v: number, [lo, hi]: number[]) => (v >= lo && v <= hi ? "OK " : "!! ");

function linha(rot: string, valor: number, meta: number[], fmt = (v: number) => v.toFixed(2)) {
  console.log(
    `  ${ok(valor, meta)}${rot.padEnd(26)} ${fmt(valor).padStart(8)}   meta ${meta[0]}–${meta[1]}`
  );
}

console.log(`\n=== BACKTEST — ${N} temporadas (${acc.jogos} jogos) — seed "${SEED}" ===\n`);
linha("gols / jogo", acc.gols / acc.jogos, METAS.golsPorJogo);
linha("vitória mandante %", Number(pct(acc.vitMandante)), METAS.vitMandantePct, (v) => v.toFixed(1));
linha("empate %", Number(pct(acc.empates)), METAS.empatePct, (v) => v.toFixed(1));
linha("vitória visitante %", Number(pct(acc.vitVisitante)), METAS.vitVisitantePct, (v) => v.toFixed(1));
linha("pontos do campeão (méd)", media(acc.campeaoPts), METAS.campeaoPts, (v) => v.toFixed(1));
linha("pontos da lanterna (méd)", media(acc.lanternaPts), METAS.lanternaPts, (v) => v.toFixed(1));
linha("amarelos / jogo", acc.amarelos / acc.jogos, METAS.amarelosPorJogo);
linha("vermelhos / jogo", acc.vermelhos / acc.jogos, METAS.vermelhosPorJogo);

console.log("\n  --- outros indicadores (sem meta fixa) ---");
console.log(`     lesões / jogo               ${(acc.lesoes / acc.jogos).toFixed(2)}`);
console.log(`     jogos 0-0                   ${pct(acc.jogos00)}%`);
console.log(`     campeão: faixa de pontos    ${min(acc.campeaoPts)}–${max(acc.campeaoPts)}`);
console.log(`     lanterna: faixa de pontos   ${min(acc.lanternaPts)}–${max(acc.lanternaPts)}`);
console.log(`     maior goleada observada     ${acc.maiorGoleada} gols de diferença`);
const distintos = Object.keys(acc.campeoes).length;
console.log(`     campeões distintos          ${distintos} clubes em ${N} temporadas`);
const topCampeoes = Object.entries(acc.campeoes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([idx, t]) => `#${Number(idx) + 1}(força ${forcaMedia[Number(idx)]}): ${t}x`)
  .join("  ");
console.log(`     mais títulos                ${topCampeoes}`);
const hist = acc.golsPorTimeJogo;
const totTG = hist.reduce((a, b) => a + b, 0);
console.log(
  `     gols de um time num jogo    ` +
    hist.map((n, g) => `${g === 5 ? "5+" : g}:${((100 * n) / totTG).toFixed(0)}%`).join("  ")
);
console.log("");
