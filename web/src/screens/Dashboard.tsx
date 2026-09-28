import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, jogoAgendado, agendarJogo, cancelarJogo, jogoComecou, jogoAoVivo, jogoEncerrado } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Forma, Brasao, Loading } from "../components/bits";
import { NomeClube, NomeJogador, TextoComNomes } from "../components/nomes";
import { dataCurta, dinheiro } from "../lib/format";

function contagem(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const z = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${z(m)}:${z(ss)}` : `${z(m)}:${z(ss)}`;
}

export default function Dashboard() {
  const nav = useNavigate();
  const [nonce, setNonce] = useState(0);
  const [agora, setAgora] = useState(Date.now());
  const [hora, setHora] = useState("23:30");
  const jaComecou = useRef(jogoComecou());
  const { data, carregando } = useAsync(() => api.dashboard(), [nonce]);

  const jaEncerrou = useRef(jogoEncerrado());
  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      if (jogoComecou() && !jaComecou.current) jaComecou.current = true;
      if (jogoEncerrado() && !jaEncerrou.current) {
        jaEncerrou.current = true;
        setNonce((n) => n + 1); // a rodada foi revelada — recarrega o painel
        window.dispatchEvent(new Event("fm:tick")); // atualiza cabeçalho/tabela
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (carregando || !data) return <Loading label="Montando o painel…" />;

  const { clube, proximo, ultimos, miniTabela, alertas, noticias, artilheiroClube, liga, temporada, termometro } = data;

  const jog = jogoAgendado();
  const kickoff = jog ? new Date(jog.kickoff).getTime() : 0;
  const aoVivo = jogoAoVivo();
  const encerrado = jogoEncerrado();
  const antes = !!jog && !aoVivo && !encerrado;
  const resultadoJog = jog && encerrado ? ultimos.find((p) => p.rodada === jog.rodada) : undefined;

  function agendar(iso: string) {
    agendarJogo(iso);
    jaComecou.current = false;
    jaEncerrou.current = false;
    setNonce((n) => n + 1);
  }
  function agendarHoje() {
    const [h, m] = hora.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 23, m || 30, 0, 0);
    agendar(d.toISOString());
  }

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">{liga.nome} · Temporada 1</div>
        <h1>{clube.posicao}º lugar · {clube.pontos} pts</h1>
        <p>
          Após {temporada.rodada} rodadas. Aqui está o que pede sua atenção agora.
        </p>
      </div>

      <Card title="Notícias" flush right={<Link to="/noticias" className="linkish">ver todas →</Link>}>
        <div className="news compact news-scroll">
          {noticias.map((n, i) => (
            <div className="item" key={i}>
              <span className="tag">{n.tag}</span>{" "}
              <span className="when">· {dataCurta(n.data)}</span>
              <h4><TextoComNomes texto={n.manchete} /></h4>
              <p><TextoComNomes texto={n.corpo} /></p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid dash" style={{ marginTop: 16 }}>
        {/* coluna principal */}
        <div className="grid" style={{ gap: 16 }}>
          {proximo && (
            <Card title="Próximo compromisso" hint={`Rodada ${proximo.rodada} · ${dataCurta(proximo.data)}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Brasao cores={clube.cores} size={40} id={clube.id} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>
                  {proximo.casa ? "×" : "@"}
                </div>
                <Brasao cores={proximo.adversario.cores} size={40} id={proximo.adversario.id} />
                <div style={{ marginLeft: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    <NomeClube id={proximo.adversario.id}>{proximo.adversario.nomeCurto}</NomeClube>
                  </div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                    {proximo.casa ? "Em casa" : "Fora de casa"} · {proximo.adversario.cidade}
                  </div>
                </div>
                <Link to="/elenco" className="btn ghost sm" style={{ marginLeft: "auto" }}>
                  Escalar time
                </Link>
              </div>

              <div className="agendar">
                {!jog && (
                  <>
                    <span className="lbl">Agendar para hoje às</span>
                    <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                    <button className="btn sm" onClick={agendarHoje}>agendar</button>
                    <button className="linkish" onClick={() => agendar(new Date().toISOString())}>▶ ver agora</button>
                    <span className="dica">transmissão 2D de ~7 min</span>
                  </>
                )}
                {antes && (
                  <>
                    <span className="pill live">⏱ começa em {contagem(kickoff - agora)}</span>
                    <span className="dica">
                      às {new Date(kickoff).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button className="linkish" onClick={() => { cancelarJogo(); setNonce((n) => n + 1); }}>cancelar</button>
                  </>
                )}
                {aoVivo && (
                  <>
                    <span className="pill live">🔴 AO VIVO</span>
                    <Link to="/ao-vivo" className="btn sm">assistir a partida →</Link>
                    <span className="dica">transmissão 2D em andamento</span>
                  </>
                )}
              </div>
            </Card>
          )}

          {jog && encerrado && (
            <Card flush>
              <div
                className="jogo-feito"
                onClick={() => resultadoJog && nav(`/partida/${jog.rodada}`)}
                style={{ cursor: resultadoJog ? "pointer" : "default" }}
              >
                <span className="pill win">✓</span>
                <span style={{ flex: 1 }}>
                  <b>Rodada {jog.rodada} disputada</b>
                  {resultadoJog && (
                    <> — <NomeClube id={clube.id} isolar>{clube.nomeCurto}</NomeClube> <b>{resultadoJog.golsPro}–{resultadoJog.golsContra}</b> <NomeClube id={resultadoJog.adversario.id} isolar>{resultadoJog.adversario.nomeCurto}</NomeClube></>
                  )}
                </span>
                {resultadoJog && <span className="ver">ver súmula ›</span>}
                <button
                  className="linkish"
                  onClick={(e) => { e.stopPropagation(); cancelarJogo(); jaComecou.current = false; setNonce((n) => n + 1); }}
                >
                  limpar
                </button>
              </div>
            </Card>
          )}

          <Card title="Ações pendentes" flush>
            {alertas.length === 0 ? (
              <div className="empty">Nada pendente. Elenco, caixa e mercado sob controle.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {alertas.map((a, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex", gap: 11, alignItems: "flex-start",
                      padding: "12px 16px",
                      borderBottom: i < alertas.length - 1 ? "1px solid var(--line-soft)" : "none",
                    }}
                  >
                    <span
                      style={{
                        color: a.nivel === "critico" ? "var(--loss)" : a.nivel === "aviso" ? "var(--live)" : "var(--brand)",
                        fontWeight: 700, lineHeight: 1.4,
                      }}
                    >
                      {a.icone}
                    </span>
                    <span style={{ fontSize: 13.5, flex: 1 }}>{a.texto}</span>
                    <Link to={a.para} className="pill" style={{ textDecoration: "none" }}>abrir</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Últimos resultados" flush>
            <table className="tbl">
              <tbody>
                {ultimos.slice().reverse().map((p, i) => (
                  <tr key={i} onClick={() => nav(`/partida/${p.rodada}`)} style={{ cursor: "pointer" }}>
                    <td className="pos l">R{p.rodada}</td>
                    <td className="l" style={{ color: "var(--ink-soft)" }}>
                      {p.casa ? "" : "@ "}<NomeClube id={p.adversario.id} isolar>{p.adversario.nomeCurto}</NomeClube>
                    </td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{p.golsPro}–{p.golsContra}</td>
                    <td style={{ width: 26 }}>
                      <span className={"pill " + (p.resultado === "V" ? "win" : p.resultado === "D" ? "loss" : "draw")}>
                        {p.resultado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* coluna lateral */}
        <div className="grid" style={{ gap: 16 }}>
          <Card title="Situação na liga">
            <div style={{ display: "flex", gap: 18, marginBottom: 14 }}>
              <div className="stat">
                <span className="v">{clube.posicao}º</span>
                <span className="k">Posição</span>
              </div>
              <div className="stat">
                <span className="v tnum">{clube.pontos}</span>
                <span className="k">Pontos</span>
              </div>
              <div className="stat">
                <span className="v"><Forma s={clube.forma} /></span>
                <span className="k">Últimos 6</span>
              </div>
            </div>
            <table className="tbl">
              <tbody>
                {miniTabela.map((l) => (
                  <tr key={l.id} className={l.ehVoce ? "you" : ""}>
                    <td className="pos l">{l.posicao}</td>
                    <td className="l name" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Brasao cores={l.cores} size={18} id={l.id} />
                      <NomeClube id={l.id} className="tbl-clube">{l.nomeCurto}</NomeClube>
                    </td>
                    <td className="tnum">{l.pontos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link to="/classificacao" className="pill" style={{ marginTop: 12 }}>ver tabela completa</Link>
          </Card>

          <Card title="Resumo rápido">
            <div className="trend">
              <div className="row">
                <span className="lbl">Caixa</span>
                <span className={"val " + (clube.saldoCaixa >= 0 ? "money-pos" : "money-neg")}>
                  {dinheiro(clube.saldoCaixa, true)}
                </span>
              </div>
              <div className="row">
                <span className="lbl">Elenco</span>
                <span className="val">{clube.tamanhoElenco} jogadores</span>
              </div>
              <div className="row">
                <span className="lbl">No departamento médico</span>
                <span className="val">{clube.lesionados}</span>
              </div>
              {artilheiroClube && (
                <div className="row">
                  <span className="lbl">Artilheiro do clube</span>
                  <span className="val" style={{ fontFamily: "var(--font-body)" }}>
                    <NomeJogador chave={artilheiroClube.nome} nome={artilheiroClube.nome.split(" ")[0]} /> · {artilheiroClube.golsNaTemporada}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {termometro && (
            <Card title="Termômetro da torcida" right={<Link to="/torcida" className="linkish">abrir →</Link>}>
              <div className="dash-term">
                <div className="dash-term-l">
                  <b style={{ color: termometro.cor }}>{termometro.banda}</b>
                  <span>relação {termometro.valor}/100</span>
                </div>
                <div className="dash-term-p">
                  <span className="dash-term-plbl">pressão</span>
                  <div className="dash-term-bar">
                    <span style={{ width: `${termometro.pressao}%`, background: termometro.pressao >= 66 ? "var(--loss)" : termometro.pressao >= 46 ? "var(--live)" : "var(--win)" }} />
                  </div>
                  <span className="dash-term-cad">{termometro.cadeira}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
