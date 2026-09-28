import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, posturaSalva, salvarPostura } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, PosTag, Camiseta, Loading } from "../components/bits";
import { POS_ABREV } from "../lib/format";
import { POSTURAS, FORMACOES } from "../lib/taticas";

const ORDEM_POS = ["GOLEIRO", "ZAGUEIRO", "LATERAL", "VOLANTE", "MEIA", "PONTA", "ATACANTE"];
const GRUPO_DEF = new Set(["GOLEIRO", "ZAGUEIRO", "LATERAL"]);
const sobren = (n: string) => n.split(" ").slice(-1)[0];

export default function Elenco(_props: { embutido?: boolean } = {}) {
  const { data, carregando } = useAsync(() => api.elenco(), []);
  const [ordem, setOrdem] = useState<"posicao" | "overall">("posicao");
  const [xi, setXi] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [modalTat, setModalTat] = useState(false);
  const [postura, setPostura] = useState<string>(() => posturaSalva());

  // primeira carga: adota o XI vindo da API
  useEffect(() => {
    if (data?.xi && xi.length === 0) setXi(data.xi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const porId = useMemo(
    () => new Map((data?.jogadores ?? []).map((j) => [j.id, j])),
    [data]
  );

  const lista = useMemo(() => {
    const js = [...(data?.jogadores ?? [])];
    js.sort((a, b) =>
      ordem === "overall"
        ? b.overall - a.overall
        : ORDEM_POS.indexOf(a.posicao) - ORDEM_POS.indexOf(b.posicao) || b.overall - a.overall
    );
    return js;
  }, [data, ordem]);

  if (carregando || !data || xi.length !== 11) return <Loading label="Abrindo o elenco…" />;
  const xiSet = new Set(xi);

  // slot 0 = goleiro; só goleiro entra nele, e goleiro não vai para a linha.
  const slotOk = (pos: string | undefined, slot: number) =>
    slot === 0 ? pos === "GOLEIRO" : pos !== "GOLEIRO";

  function troca(a: string | null, b: string | null) {
    setSel(null);
    if (!a || !b || a === b) return;
    const ax = xi.indexOf(a);
    const bx = xi.indexOf(b);
    if (ax < 0 && bx < 0) return; // ambos no banco — nada a fazer
    const pa = porId.get(a)?.posicao;
    const pb = porId.get(b)?.posicao;
    if ((bx >= 0 && !slotOk(pa, bx)) || (ax >= 0 && !slotOk(pb, ax))) {
      setAviso("Goleiro só joga no gol — e a linha não é lugar de goleiro.");
      setTimeout(() => setAviso(null), 2600);
      return;
    }
    const novo = [...xi];
    if (ax >= 0 && bx >= 0) { novo[ax] = b; novo[bx] = a; }
    else if (ax >= 0) novo[ax] = b;
    else novo[bx] = a;
    setXi(novo);
    api.salvarEscalacao(novo);
  }

  function clicar(id: string) {
    if (sel === id) { setSel(null); return; }
    if (sel == null) { setSel(id); return; }
    troca(sel, id);
  }

  function soltar(destino: string) {
    troca(drag, destino);
    setDrag(null);
    setAlvo(null);
  }

  const dragProps = (id: string) => ({
    draggable: true,
    onDragStart: () => setDrag(id),
    onDragEnd: () => { setDrag(null); setAlvo(null); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setAlvo(id); },
    onDragLeave: () => setAlvo((a) => (a === id ? null : a)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); soltar(id); },
  });

  // linhas do campo a partir do XI
  let i = 0;
  const linhasCampo = data.formacao.map((l) => {
    const ids = xi.slice(i, i + l.n);
    i += l.n;
    return { faixa: l.faixa, ids };
  });

  const mediaXI = xi.length === 11
    ? xi.reduce((s, id) => s + (porId.get(id)?.overall ?? 0), 0) / 11
    : 0;

  const grupoDef = lista.filter((j) => GRUPO_DEF.has(j.posicao));
  const grupoAtq = lista.filter((j) => !GRUPO_DEF.has(j.posicao));

  const linhaJogador = (j: typeof lista[number]) => {
    const noXI = xiSet.has(j.id);
    const on = sel === j.id;
    const over = alvo === j.id && drag && drag !== j.id;
    return (
      <tr
        key={j.id}
        className={"row-j" + (on ? " sel" : "") + (over ? " over" : "") + (noXI ? " no-xi" : "")}
        onClick={() => clicar(j.id)}
        {...dragProps(j.id)}
      >
        <td className="l name">
          <span className="who-mini">
            <i className={"dot" + (noXI ? " on" : "")} />
            <Link
              to={`/jogador/${j.id}`}
              className="pl-link"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            >
              {j.nomeExibido}
            </Link>
            {j.id === data.craqueId && <b className="star">*</b>}
          </span>
        </td>
        <td>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Camiseta cores={data.clube.cores} numero={j.numero} size={22} />
            <PosTag pos={j.posicao} />
          </span>
        </td>
        <td className="tnum" style={{ fontWeight: 700 }}>{j.overall.toFixed(1)}</td>
      </tr>
    );
  };

  // duas colunas dentro do mesmo card
  const secoes: [string, typeof lista][] = [
    ["Defesa", grupoDef],
    ["Meio e ataque", grupoAtq],
  ];

  return (
    <>
      <div className="squad-bar">
        <span className="lgd">{data.jogadores.length} jogadores · <span className="dot on" /> no time · <span className="dot" /> reserva</span>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button
            className="pill"
            style={{ cursor: "pointer", ...(ordem === "posicao" ? ativo : {}) }}
            onClick={() => setOrdem("posicao")}
          >
            por posição
          </button>
          <button
            className="pill"
            style={{ cursor: "pointer", ...(ordem === "overall" ? ativo : {}) }}
            onClick={() => setOrdem("overall")}
          >
            por OVR
          </button>
        </div>
      </div>

      <div className="grid squad-grid" style={{ gap: 16, alignItems: "start" }}>
        <Card title="Jogadores" flush>
          <div className="squad-cols">
            {secoes.map(([titulo, js]) => (
              <div className="squad-col" key={titulo}>
                <div className="col-h">{titulo} <span>{js.length}</span></div>
                <table className="tbl squad-tbl">
                  <thead>
                    <tr><th className="l">Jogador</th><th>Pos</th><th>OVR</th></tr>
                  </thead>
                  <tbody>{js.map(linhaJogador)}</tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title={<span className="esc-title">Escalação<b>4-3-3</b></span>}
          right={
            <button
              className="pill"
              style={{ cursor: "pointer" }}
              onClick={() => { const auto = api.escalacaoAutomatica(); setXi(auto); setSel(null); }}
            >
              escalação automática
            </button>
          }
          flush
        >
          <div className="pitch-actions">
            <button className="btn ghost sm" onClick={() => setModalTat(true)}>⚙ Táticas do time</button>
            <span className="post-atual">postura: <b>{POSTURAS.find((p) => p.v === postura)?.t}</b></span>
          </div>
          <div className="pitch pitch-edit">
            {linhasCampo.slice().reverse().map((l) => (
              <div className="pitch-row" key={l.faixa}>
                {l.ids.map((id) => {
                  const j = porId.get(id);
                  const on = sel === id;
                  const over = alvo === id && drag && drag !== id;
                  return (
                    <div
                      key={id}
                      className={"chip-j slot" + (on ? " sel" : "") + (over ? " over" : "")}
                      title={j ? `${j.nomeExibido} · ${POS_ABREV[j.posicao]} · OVR ${j.overall.toFixed(1)}` : ""}
                      onClick={() => clicar(id)}
                      {...dragProps(id)}
                    >
                      <span className="n tnum">{j ? j.overall.toFixed(0) : "–"}</span>
                      <span className="nm">
                        {j ? (j.apelido || sobren(j.nome)) : "?"}
                        {id === data.craqueId && <b className="star">*</b>}
                      </span>
                      <span className="pp">{j ? POS_ABREV[j.posicao] : ""}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="squad-foot">
            <b>{data.clube.nomeCurto}</b>
            <span style={{ marginLeft: "auto" }}>média OVR {mediaXI.toFixed(1)}</span>
          </div>
        </Card>
      </div>

      {modalTat && (
        <div className="modal-bg" onClick={() => setModalTat(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Táticas do time">
            <div className="modal-h">
              <h3>⚙ Táticas do time</h3>
              <button className="modal-x" onClick={() => setModalTat(false)} aria-label="Fechar">✕</button>
            </div>
            <div className="modal-filtros" style={{ gridTemplateColumns: "1fr" }}>
              <div className="fl">
                <span>Formação</span>
                <div className="chips">
                  {FORMACOES.map((f) => (
                    <button key={f} className={"chip" + (f === "4-3-3" ? " on" : "")} disabled={f !== "4-3-3"} title={f !== "4-3-3" ? "em breve" : ""}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fl">
                <span>Postura de jogo</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {POSTURAS.map((p) => (
                    <button
                      key={p.v}
                      onClick={() => setPostura(p.v)}
                      style={{
                        textAlign: "left", cursor: "pointer", padding: "9px 11px", borderRadius: 8,
                        border: "1px solid " + (postura === p.v ? "var(--brand)" : "var(--line)"),
                        background: postura === p.v ? "var(--brand-wash)" : "transparent",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.t}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{p.d}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-f">
              <span>Definida antes do jogo (Fase 1). Ajuste ao vivo é Fase 3.</span>
              <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => { salvarPostura(postura); setModalTat(false); }}>
                confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div className="toast-wrap">
          <div className="toast" style={{ borderLeftColor: "var(--live)" }}>{aviso}</div>
        </div>
      )}
    </>
  );
}

const ativo: React.CSSProperties = { background: "var(--brand)", color: "#fff", borderColor: "transparent" };
