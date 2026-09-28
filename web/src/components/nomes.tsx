import { type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { clubeHref, jogadorHref, jogadorIdPorNome, dicionarioNomes } from "../api/client";

type Clk = (e: MouseEvent) => void;
/** Não deixa o clique no nome disparar o onClick da linha/card em volta. */
const pararLinha: Clk = (e) => e.stopPropagation();

/** Link para a página de um clube (elenco + situação). */
export function NomeClube({
  id, children, className, isolar,
}: { id: string; children: ReactNode; className?: string; isolar?: boolean }) {
  return (
    <Link
      to={clubeHref(id)}
      className={"nome-link" + (className ? " " + className : "")}
      onClick={isolar ? pararLinha : undefined}
    >
      {children}
    </Link>
  );
}

/**
 * Nome de jogador como link: do meu elenco → /jogador/:id; de fora → página do
 * clube dele; sem destino conhecido → só negrito.
 */
export function NomeJogador({
  id, clubeId, nome, chave, className, isolar,
}: { id?: string | null; clubeId?: string | null; nome: ReactNode; chave?: string; className?: string; isolar?: boolean }) {
  const cls = "nome-link" + (className ? " " + className : "");
  const clk = isolar ? pararLinha : undefined;
  const rid = id ?? jogadorIdPorNome(chave ?? (typeof nome === "string" ? nome : ""));
  if (rid) return <Link to={jogadorHref(rid)} className={cls} onClick={clk}>{nome}</Link>;
  if (clubeId) return <Link to={clubeHref(clubeId)} className={cls} onClick={clk}>{nome}</Link>;
  return <b className={className}>{nome}</b>;
}

// -------- linkificador de texto corrido (notícias, narração) --------
function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let _re: RegExp | null = null;
let _reKey = "";
let _map = new Map<string, string>();

function garantirRegex() {
  const dic = dicionarioNomes();
  const key = dic.length + "|" + (dic[0]?.texto ?? "");
  if (_reKey === key) return;
  _map = new Map(dic.map((d) => [d.texto, d.href]));
  const alt = dic.map((d) => escapeRe(d.texto)).join("|");
  try {
    _re = alt ? new RegExp(`(?<![\\p{L}\\p{N}])(${alt})(?![\\p{L}\\p{N}])`, "gu") : null;
  } catch {
    _re = alt ? new RegExp(`\\b(${alt})\\b`, "g") : null;
  }
  _reKey = key;
}

/** Renderiza um texto trocando todo nome de clube/jogador conhecido por um link. */
export function TextoComNomes({ texto }: { texto: string }) {
  garantirRegex();
  if (!_re || !texto) return <>{texto}</>;
  const re = _re;
  re.lastIndex = 0;
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const nome = m[1];
    if (m.index > last) out.push(texto.slice(last, m.index));
    const href = _map.get(nome);
    out.push(href ? <Link key={k++} to={href} className="nome-link">{nome}</Link> : nome);
    last = m.index + nome.length;
    if (re.lastIndex <= m.index) re.lastIndex = m.index + 1;
  }
  if (last < texto.length) out.push(texto.slice(last));
  return <>{out}</>;
}
