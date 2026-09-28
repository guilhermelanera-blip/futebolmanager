import { coresDoClube, POS_ABREV } from "../lib/format";
import { escudoSalvo, meuClubeId } from "../api/client";

/**
 * Brasão do clube. Usa a imagem enviada pelo jogador quando o clube é o dele
 * (`id === meuClubeId`) ou quando `src` é passado; senão, faixa diagonal das cores.
 */
export function Brasao({ cores, size = 24, id, src }: { cores: string; size?: number; id?: string; src?: string }) {
  const [a, b] = coresDoClube(cores);
  const img = src ?? (id && id === meuClubeId ? escudoSalvo() : "");
  const r = Math.round(size * 0.28);
  if (img) {
    return (
      <img
        src={img}
        alt=""
        aria-hidden
        width={size}
        height={size}
        style={{
          width: size, height: size, borderRadius: r, objectFit: "cover",
          display: "inline-block", flexShrink: 0, background: "#fff",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: r,
        display: "inline-block", flexShrink: 0,
        background: `linear-gradient(120deg, ${a} 0 46%, ${b} 54% 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)",
      }}
    />
  );
}

/** Camiseta com as cores do clube e o número do jogador. */
export function Camiseta({ cores, numero, size = 60 }: { cores: string; numero: number; size?: number }) {
  const [a, b] = coresDoClube(cores);
  return (
    <svg viewBox="0 0 60 58" width={size} height={Math.round((size * 58) / 60)} aria-hidden style={{ flexShrink: 0 }}>
      <path d="M14 6 L2 16 L8 30 L18 25 Z" fill={b} />
      <path d="M46 6 L58 16 L52 30 L42 25 Z" fill={b} />
      <path d="M14 6 L22 10 Q30 15 38 10 L46 6 L46 54 Q30 58 14 54 Z" fill={a} stroke="rgba(0,0,0,.22)" strokeWidth="1" />
      <path d="M22 10 Q30 16 38 10 L38 7 Q30 12 22 7 Z" fill={b} />
      <text
        x="30" y="43" textAnchor="middle"
        fontFamily="var(--font-display), Arial, sans-serif" fontSize="26" fontWeight="800" fill="#fff"
        style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.4)", strokeWidth: 3.5 }}
      >
        {numero || "?"}
      </text>
    </svg>
  );
}

export function Card({
  title, hint, children, right, flush = false,
}: {
  title?: React.ReactNode; hint?: string; right?: React.ReactNode;
  children: React.ReactNode; flush?: boolean;
}) {
  return (
    <section className="card">
      {(title || right) && (
        <div className="card-h">
          {title && <h3>{title}</h3>}
          {hint && <span className="hint">{hint}</span>}
          {right}
        </div>
      )}
      <div className={"card-b" + (flush ? " flush" : "")}>{children}</div>
    </section>
  );
}

export function Forma({ s }: { s: string }) {
  if (!s) return <span className="tnum" style={{ color: "var(--ink-faint)" }}>—</span>;
  return (
    <span className="forma">
      {s.split("").map((c, i) => (
        <i key={i} className={c}>{c}</i>
      ))}
    </span>
  );
}

export function PosTag({ pos }: { pos: string }) {
  return <span className="pos-tag">{POS_ABREV[pos] ?? pos.slice(0, 3)}</span>;
}

export function Who({
  nome, sub, cores,
}: { nome: string; sub?: string; cores?: string }) {
  return (
    <span className="who">
      {cores && <Brasao cores={cores} size={22} />}
      <span className="meta">
        <span>{nome}</span>
        {sub && <small>{sub}</small>}
      </span>
    </span>
  );
}

export function Bar({ pct, tone }: { pct: number; tone?: "warn" | "bad" }) {
  return (
    <span className={"bar" + (tone ? " " + tone : "")} style={{ width: 84 }}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return <div className="empty">{label}</div>;
}
