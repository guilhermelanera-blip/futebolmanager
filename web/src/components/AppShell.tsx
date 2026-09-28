import { useEffect, useReducer, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { api, pendenciasMercado, rodadaCorrente, proximoJogo, nomeJogadorExibido, nomeClubeCurto, limparPerfil, managerNome, dataAtual, periodoAtual, diaDeJogo, ehMaster, PERIODO_ROT, snapshot as estado } from "../api/client";
import { Brasao } from "./bits";
import { dataLonga, dinheiro, coresDoClube } from "../lib/format";

type ItemNav = { to: string; ico: React.ReactNode; label: string; end?: boolean };

/** Rotas que vivem dentro da tela "Clube" (chips no topo da página). */
const ROTAS_CLUBE = ["/clube", "/elenco", "/torcida", "/editar-time", "/estadio", "/mercado", "/treinos", "/financas", "/jogador"];
/** Rotas que vivem dentro da tela "Competições". */
const ROTAS_COMP = ["/competicoes", "/calendario", "/classificacao", "/partida"];

const LINKS: ItemNav[] = [
  { to: "/", ico: "◧", label: "Painel", end: true },
  { to: "/noticias", ico: "❐", label: "Notícias" },
  { to: "/clube", ico: "◈", label: "Clube" },
  { to: "/competicoes", ico: "▦", label: "Competições" },
];

/** Rótulo da página a partir da rota, para o cabeçalho do clube. */
function rotuloDaRota(path: string): string {
  if (path === "/") return "Painel";
  if (path.startsWith("/noticias")) return "Notícias";
  if (path.startsWith("/admin")) return "Usuários da liga";
  if (path.startsWith("/ao-vivo")) return "Ao vivo";
  if (path.startsWith("/jogador") || path.startsWith("/clube")) return "Clube";
  if (ROTAS_CLUBE.some((r) => path.startsWith(r))) return "Clube";
  if (ROTAS_COMP.some((r) => path.startsWith(r))) return "Competições";
  return "";
}

function useTema() {
  const [tema, setTema] = useState<string>(() => localStorage.getItem("fm.tema") || "auto");
  useEffect(() => {
    const root = document.documentElement;
    if (tema === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", tema);
    localStorage.setItem("fm.tema", tema);
  }, [tema]);
  return { tema, ciclar: () => setTema((t) => (t === "auto" ? "light" : t === "light" ? "dark" : "auto")) };
}

/** Re-renderiza quando o relógio da temporada anda. */
function useTick() {
  const [, bump] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const h = () => bump();
    window.addEventListener("fm:tick", h);
    return () => window.removeEventListener("fm:tick", h);
  }, []);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  useTick();
  const c = estado.clube;
  const pend = pendenciasMercado();
  const { tema, ciclar } = useTema();
  const rodada = rodadaCorrente();
  const proximo = proximoJogo();
  const [c1, c2] = coresDoClube(c.cores);
  const rotulo = rotuloDaRota(loc.pathname);
  const mJog = loc.pathname.match(/^\/jogador\/(.+)$/);
  const nomeJog = mJog ? nomeJogadorExibido(decodeURIComponent(mJog[1])) : null;
  const mClube = loc.pathname.match(/^\/clube\/(.+)$/);
  const nomeClube = mClube ? nomeClubeCurto(mClube[1]) : null;
  const titulo = nomeJog ?? nomeClube ?? c.nomeCurto;
  const subtitulo = nomeJog || nomeClube ? c.nomeCurto : rotulo;
  const emAoVivo = loc.pathname.startsWith("/ao-vivo");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="club">
          <Brasao cores={c.cores} size={30} id={c.id} />
          <div>
            <div className="nome">{c.nomeCurto}</div>
            <div className="sub">{c.cidade} · rodada {rodada}/{estado.liga.totalRodadas}</div>
          </div>
        </div>

        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => {
                const grupo =
                  (l.to === "/clube" && ROTAS_CLUBE.some((r) => loc.pathname.startsWith(r))) ||
                  (l.to === "/competicoes" && ROTAS_COMP.some((r) => loc.pathname.startsWith(r)));
                return isActive || grupo ? "on" : "";
              }}
            >
              <span className="ico">{l.ico}</span>
              <span>{l.label}</span>
              {l.to === "/clube" && pend > 0 && <span className="badge">{pend}</span>}
            </NavLink>
          ))}

          {ehMaster() && (
            <NavLink to="/admin" className={({ isActive }) => "nav-master" + (isActive ? " on" : "")}>
              <span className="ico">★</span>
              <span>Usuários</span>
            </NavLink>
          )}
        </nav>

        <div className="foot">
          <div style={{ marginBottom: 6, color: "var(--on-brand-bar)" }}>{managerNome()}</div>
          <div style={{ marginBottom: 6 }}>
            tema:{" "}
            <button onClick={ciclar}>{tema === "auto" ? "automático" : tema === "light" ? "claro" : "escuro"}</button>
          </div>
          <button onClick={() => { limparPerfil(); nav("/inicio"); }}>refazer configuração</button>
          <br />
          <button onClick={() => { api.logout(); nav("/login"); }}>sair da conta</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="date">{dataLonga(dataAtual())}</span>
          <span className="periodo-tb">{diaDeJogo() ? "dia de jogo" : PERIODO_ROT[periodoAtual()].toLowerCase()}</span>
          <span className="sep" />
          <span className="kv">
            <span className="k">Caixa</span>
            <span className={"v " + (c.saldoCaixa >= 0 ? "money-pos" : "money-neg")}>{dinheiro(c.saldoCaixa, true)}</span>
          </span>
          <span className="kv">
            <span className="k">Rodada</span>
            <span className="v">{rodada} / {estado.liga.totalRodadas}</span>
          </span>
          {proximo ? (
            <span className="next">
              <span className="k" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-faint)" }}>
                Próximo
              </span>
              <Brasao cores={proximo.adversario.cores} size={18} id={proximo.adversario.id} />
              <b style={{ fontWeight: 600 }}>{proximo.adversario.nomeCurto}</b>
              <span style={{ color: "var(--ink-faint)" }}>{proximo.casa ? "(casa)" : "(fora)"}</span>
            </span>
          ) : (
            <span className="next" style={{ color: "var(--ink-faint)" }}>Temporada encerrada</span>
          )}
        </header>
        <main className="content">
          {!emAoVivo && (
            <div className="club-head">
              <div className="club-banner" style={{ "--c1": c1, "--c2": c2 } as React.CSSProperties}>
                <span>{titulo}</span>
                {subtitulo && <span className="cb-page">{subtitulo}</span>}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
