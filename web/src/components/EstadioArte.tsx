/**
 * Cena de estádio — ilustração 100% fictícia (nenhuma arena real: R6/R7 e
 * direitos autorais). Vetorial, para o fundo das telas de entrada.
 *   - EstadioArte: interior de arena à noite — arquibancada colorida e um
 *     campo em perspectiva embaixo, visto de trás do gol.
 *   - EstadioFaixa: silhueta baixa de arenas, para rodapés/divisórias.
 */

type SeatRow = { y: number; h: number; step: number; jitter: number; dark: number };

function mosaicoAssentos() {
  // gerador determinístico (sem flicker entre renders)
  let s = 0x9e3779b9;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const palet = ["#eef2f4", "#d7dee2", "#aeb9c0", "#f4c542", "#3f9d57", "#2f6fb0", "#d9544d", "#8b5cf6"];
  const linhas: SeatRow[] = [
    { y: 20, h: 12, step: 15, jitter: 3, dark: 0.30 },
    { y: 40, h: 13, step: 16, jitter: 3, dark: 0.24 },
    { y: 62, h: 14, step: 17, jitter: 4, dark: 0.20 },
    { y: 86, h: 15, step: 18, jitter: 4, dark: 0.17 },
    { y: 112, h: 16, step: 19, jitter: 5, dark: 0.14 },
    { y: 140, h: 18, step: 20, jitter: 5, dark: 0.12 },
    { y: 172, h: 20, step: 22, jitter: 6, dark: 0.10 },
  ];
  const out: { x: number; y: number; w: number; h: number; fill: string; o: number }[] = [];
  for (const L of linhas) {
    for (let x = -40; x < 1320; x += L.step) {
      const r = rnd();
      let fill: string;
      if (r < L.dark) fill = "#3a4550";
      else if (r < L.dark + 0.12) fill = palet[3 + Math.floor(rnd() * 5)];
      else fill = palet[Math.floor(rnd() * 3)];
      out.push({
        x: x + (rnd() - 0.5) * L.jitter,
        y: L.y + (rnd() - 0.5) * L.jitter,
        w: L.step - 3 - rnd() * 2,
        h: L.h,
        fill,
        o: 0.72 + rnd() * 0.28,
      });
    }
  }
  return out;
}

/** Faixas de corte do gramado, paralelas à linha de fundo (perto do observador). */
function listrasGramado() {
  const faixas: { d: string; claro: boolean }[] = [];
  const y = (t: number) => 300 + t * 258;
  const bow = (t: number) => 40 * (1 - t); // a curva some perto do observador
  for (let i = 0; i < 9; i++) {
    const t0 = i / 9;
    const t1 = (i + 1) / 9;
    const yA = y(t0);
    const yB = y(t1);
    const d =
      `M-40,${yA.toFixed(1)} C 320,${(yA - bow(t0)).toFixed(1)} 880,${(yA - bow(t0)).toFixed(1)} 1240,${yA.toFixed(1)} ` +
      `L1240,${yB.toFixed(1)} C 880,${(yB - bow(t1)).toFixed(1)} 320,${(yB - bow(t1)).toFixed(1)} -40,${yB.toFixed(1)} Z`;
    faixas.push({ d, claro: i % 2 === 0 });
  }
  return faixas;
}

export function EstadioArte({ className }: { className?: string }) {
  const assentos = mosaicoAssentos();
  const listras = listrasGramado();
  return (
    <svg
      className={className}
      viewBox="0 0 1200 560"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ea-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1836" />
          <stop offset="0.45" stopColor="#1a2f57" />
          <stop offset="0.78" stopColor="#3b2f63" />
          <stop offset="1" stopColor="#7a3f5d" />
        </linearGradient>
        <linearGradient id="ea-grama" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#217f41" />
          <stop offset="1" stopColor="#0d5227" />
        </linearGradient>
        <linearGradient id="ea-topglow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2cf" stopOpacity="0.20" />
          <stop offset="0.55" stopColor="#fff2cf" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ea-refletor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7dc" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#ffe9a8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ea-vinheta" cx="0.5" cy="0.6" r="0.75">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.68" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.44" />
        </radialGradient>
        <clipPath id="ea-arq">
          <path d="M-40,250 C 250,150 950,150 1240,250 L1240,-40 L-40,-40 Z" />
        </clipPath>
      </defs>

      {/* céu */}
      <rect x="0" y="0" width="1200" height="560" fill="url(#ea-ceu)" />

      {/* luz alta espalhada (sem orbes soltos) */}
      <rect x="0" y="0" width="1200" height="300" fill="url(#ea-topglow)" />
      <ellipse cx="140" cy="4" rx="230" ry="74" fill="url(#ea-refletor)" opacity="0.8" />
      <ellipse cx="1060" cy="4" rx="230" ry="74" fill="url(#ea-refletor)" opacity="0.8" />

      {/* torres de iluminação (fictícias) */}
      {[130, 600, 1070].map((x, i) => (
        <g key={i} transform={`translate(${x} 0)`}>
          <path d="M-9,120 L9,120 L5,18 L-5,18 Z" fill="#141b2c" />
          <rect x="-34" y="2" width="68" height="20" rx="4" fill="#1c2740" />
          {[-26, -13, 0, 13, 26].map((sx, j) => (
            <circle key={j} cx={sx} cy="12" r="4.4" fill="#fff7d6" />
          ))}
        </g>
      ))}

      {/* arquibancada do fundo (leque) */}
      <g clipPath="url(#ea-arq)">
        <path d="M-40,250 C 250,150 950,150 1240,250 L1240,-40 L-40,-40 Z" fill="#101a30" />
        <g transform="translate(0 18)">
          {assentos.map((a, i) => (
            <rect key={i} x={a.x} y={a.y} width={a.w} height={a.h} rx="2.5" fill={a.fill} opacity={a.o} />
          ))}
        </g>
        <path d="M-40,244 C 250,144 950,144 1240,244" fill="none" stroke="#0b1428" strokeWidth="10" opacity="0.55" />
      </g>

      {/* anel de placas de publicidade (sem texto — R6/R7), só cor */}
      <g>
        <path d="M-20,300 C 260,225 940,225 1220,300 L1220,268 C 940,196 260,196 -20,268 Z" fill="#0d1526" />
        {Array.from({ length: 26 }).map((_, i) => {
          const t = i / 25;
          const x = -20 + t * 1240;
          const y = 268 - Math.sin(t * Math.PI) * 44;
          const cols = ["#2f6fb0", "#d9544d", "#f4c542", "#3f9d57", "#e7ebee"];
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="34"
              height="16"
              rx="2"
              fill={cols[i % cols.length]}
              opacity="0.9"
              transform={`rotate(${(t - 0.5) * 14} ${x + 17} ${y + 8})`}
            />
          );
        })}
      </g>

      {/* ---- campo em perspectiva, visto de trás do gol ---- */}
      <g>
        <path d="M-40,300 C 300,236 900,236 1240,300 L1240,560 L-40,560 Z" fill="url(#ea-grama)" />
        {listras.map((f, i) => (
          <path key={i} d={f.d} fill={f.claro ? "#ffffff" : "#06351b"} opacity={f.claro ? 0.05 : 0.16} />
        ))}

        <g fill="none" stroke="#eafff1" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" opacity="0.62">
          {/* linha do meio-campo, ao fundo, + círculo central */}
          <path d="M322,300 Q600,314 878,300" />
          <ellipse cx="600" cy="305" rx="116" ry="26" />
          {/* linhas laterais convergindo para o fundo */}
          <path d="M56,551 L322,300" />
          <path d="M1144,551 L878,300" />
          {/* linha de fundo, perto do observador */}
          <path d="M56,551 Q600,562 1144,551" />
          {/* grande área */}
          <path d="M296,551 L390,426 L810,426 L904,551" />
          {/* pequena área */}
          <path d="M450,551 L487,503 L713,503 L750,551" />
          {/* meia-lua da grande área */}
          <path d="M470,426 Q600,392 730,426" />
          {/* gol, visto por trás */}
          <path d="M540,551 L540,512 L660,512 L660,551" />
          {/* rede */}
          <path
            d="M552,551 L552,515 M572,551 L572,515 M592,551 L592,515 M612,551 L612,515 M632,551 L632,515 M648,551 L648,515 M540,527 L660,527"
            strokeWidth="1.3"
            opacity="0.34"
          />
          {/* arcos de escanteio */}
          <path d="M56,538 A13,13 0 0 1 70,551" />
          <path d="M1144,538 A13,13 0 0 0 1130,551" />
        </g>
        {/* marca central e do pênalti */}
        <circle cx="600" cy="305" r="3.2" fill="#eafff1" opacity="0.7" />
        <circle cx="600" cy="470" r="3.8" fill="#eafff1" opacity="0.7" />
      </g>

      {/* vinheta */}
      <rect x="0" y="0" width="1200" height="560" fill="url(#ea-vinheta)" />
    </svg>
  );
}

export function EstadioFaixa({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ef-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path
        d="M0,90 L0,54 C 120,30 240,22 360,40 C 420,10 500,10 560,40 C 700,16 860,16 1000,44 C 1080,26 1140,30 1200,50 L1200,90 Z"
        fill="url(#ef-g)"
      />
      {[90, 300, 560, 830, 1090].map((x, i) => (
        <g key={i} fill="currentColor" opacity="0.9">
          <rect x={x - 2} y="6" width="4" height="26" />
          <rect x={x - 14} y="4" width="28" height="6" rx="2" />
        </g>
      ))}
    </svg>
  );
}
