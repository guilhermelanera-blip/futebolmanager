/**
 * Brasão da Liga Nacional de Futebol Manager — escudo fictício (R6/R7).
 * Motivo: campo de futebol (linha de meio + círculo central) dentro do escudo,
 * com uma estrela no chefe. Combina com a arte de estádio das telas de entrada.
 */

function pontosEstrela(cx: number, cy: number, rOut: number, rIn: number, pts = 5) {
  const p: string[] = [];
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = -Math.PI / 2 + (i * Math.PI) / pts;
    p.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(" ");
}
function pontosPoligono(cx: number, cy: number, r: number, n: number) {
  const p: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    p.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(" ");
}

export function LogoLiga({ size = 40, className }: { size?: number; className?: string }) {
  const id = "lg";
  return (
    <svg
      width={size}
      height={Math.round(size * (72 / 64))}
      viewBox="0 0 64 72"
      className={className}
      role="img"
      aria-label="Liga Nacional de Futebol Manager"
    >
      <defs>
        <linearGradient id={`${id}-sh`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a9760" />
          <stop offset="0.55" stopColor="#1c6b45" />
          <stop offset="1" stopColor="#0d4a2a" />
        </linearGradient>
      </defs>

      {/* escudo */}
      <path
        d="M32 3 L59 11 V33 C59 51 47 63 32 69 C17 63 5 51 5 33 V11 Z"
        fill={`url(#${id}-sh)`}
        stroke="#f2e7c6"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* keyline interna */}
      <path
        d="M32 8 L54 14.5 V33 C54 47 44 57.5 32 63 C20 57.5 10 47 10 33 V14.5 Z"
        fill="none"
        stroke="#f2e7c6"
        strokeWidth="1"
        opacity="0.32"
      />

      {/* estrela no chefe */}
      <polygon points={pontosEstrela(32, 12.5, 3.7, 1.55)} fill="#f4cf5e" />

      {/* campo: linha do meio-campo + círculo central */}
      <g fill="none" stroke="#f4ecd6" strokeWidth="2" strokeLinecap="round" opacity="0.92">
        <path d="M12 41 H52" />
        <circle cx="32" cy="41" r="9" />
      </g>

      {/* bola na marca central */}
      <circle cx="32" cy="41" r="4.6" fill="#ffffff" />
      <polygon points={pontosPoligono(32, 41, 2.15, 5)} fill="#123320" />
    </svg>
  );
}
