import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, salvarApelido, taticaJogador, salvarTaticaJogador, salvarNumero, numeroManual } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Camiseta, PosTag, Loading } from "../components/bits";
import { dinheiro, tracoLabel, POS_ABREV } from "../lib/format";
import { ATRIBUTO_LABEL, GRUPOS_ATRIBUTO, ENFASE_POSICAO, faixaAtributo } from "../lib/atributos";
import { funcaoDaPosicao } from "../lib/taticas";

export default function JogadorDetalhe() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [nonce, setNonce] = useState(0);
  const [apelido, setApelido] = useState("");
  const [numero, setNumero] = useState("");
  const [modalTat, setModalTat] = useState(false);
  const { data, erro, carregando } = useAsync(() => api.jogador(id), [id, nonce]);

  useEffect(() => {
    if (data) {
      setApelido(data.jogador.apelido);
      setNumero(String(data.jogador.numero || ""));
    }
  }, [data]);

  function aplicarNumero() {
    salvarNumero(id, Number(numero) || 0);
    setNonce((n) => n + 1);
  }

  function aplicarApelido() {
    salvarApelido(id, apelido);
    setNonce((n) => n + 1);
  }

  if (carregando) return <Loading label="Abrindo a ficha…" />;
  if (erro || !data) return <div className="empty">{erro ?? "Jogador não encontrado."}</div>;

  const { jogador: j, clube, craque, noXI, rankOVR, totalElenco, naPosicao } = data;
  const func = funcaoDaPosicao(j.posicao);
  const taticaAtual = taticaJogador(id) || func.opcoes[0];
  const enfase = new Set(ENFASE_POSICAO[j.posicao] ?? []);
  const media = Object.values(j.atributos).reduce((s, v) => s + v, 0) / Object.values(j.atributos).length;

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn ghost sm" onClick={() => nav(-1)}>‹ voltar ao elenco</button>
        <button className="btn ghost sm" onClick={() => setModalTat(true)}>⚙ Táticas do jogador</button>
      </div>

      <Card flush>
        <div className="ficha-head">
          <Camiseta cores={clube.cores} numero={j.numero} size={62} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{j.nomeExibido}</h1>
            {j.apelido && <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>nome: {j.nome}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
              <PosTag pos={j.posicao} />
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{j.idade} anos</span>
              {craque && <span className="pill" style={{ background: "var(--live)", color: "#fff", borderColor: "transparent" }}>★ craque do elenco</span>}
              <span className={"pill " + (noXI ? "win" : "")}>{noXI ? "titular" : "reserva"}</span>
              {j.lesionado && <span className="pill loss">✚ lesão · {j.diasLesao}d</span>}
              <button className="pill" style={{ cursor: "pointer" }} onClick={() => setModalTat(true)} title="Táticas do jogador">
                ⚙ {taticaAtual}
              </button>
            </div>
          </div>
        </div>

        <div className="ficha-tiles">
          <Tile k="Overall" v={j.overall.toFixed(1)} sub={`${rankOVR}º de ${totalElenco} no elenco`} />
          <Tile k="Potencial" v={String(j.potencial)} sub={j.potencial > j.overall ? `+${(j.potencial - j.overall).toFixed(1)} a evoluir` : "no teto"} />
          <Tile k="Valor de mercado" v={dinheiro(j.valor, true)} />
          <Tile k="Salário / mês" v={dinheiro(Math.round(j.salarioSemanal * (30 / 7)), true)} sub={`contrato ${j.contratoAnos} ano(s)`} />
          <Tile k="Gols na temporada" v={String(j.golsNaTemporada)} />
          <Tile k={`${POS_ABREV[j.posicao]} no elenco`} v={`${naPosicao}º`} />
        </div>

        <div className="ficha-bars">
          <BarLinha lbl="Moral" v={j.moral} />
          <BarLinha lbl="Fadiga" v={j.fadiga} invertido />
        </div>

        <div className="ficha-apelido">
          <span className="lbl">Número</span>
          <input
            type="number" min={1} max={99}
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aplicarNumero()}
            style={{ maxWidth: 80 }}
          />
          <button className="btn sm" onClick={aplicarNumero} disabled={(Number(numero) || 0) === j.numero}>
            salvar
          </button>
          {numeroManual(id) > 0 && (
            <button className="linkish" onClick={() => { salvarNumero(id, 0); setNonce((n) => n + 1); }}>
              voltar ao padrão
            </button>
          )}
        </div>

        <div className="ficha-apelido">
          <span className="lbl">Apelido</span>
          <input
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aplicarApelido()}
            placeholder={`ex.: como você chama ${j.nome.split(" ")[0]}`}
            maxLength={24}
          />
          <button className="btn sm" onClick={aplicarApelido} disabled={apelido.trim() === j.apelido}>
            salvar
          </button>
          {j.apelido && (
            <button className="linkish" onClick={() => { setApelido(""); salvarApelido(id, ""); setNonce((n) => n + 1); }}>
              remover
            </button>
          )}
        </div>

        {j.tracos.length > 0 && (
          <div style={{ padding: "0 18px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {j.tracos.map((t) => (
              <span key={t} className="pill" title="Traço de personalidade (04 §10)">{tracoLabel(t)}</span>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Atributos"
        hint={`média ${media.toFixed(1)} / 20`}
        right={<span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>● chave para {POS_ABREV[j.posicao]}</span>}
      >
        <div className="attr-grid">
          {GRUPOS_ATRIBUTO.map((g) => (
            <div className="attr-group" key={g.titulo}>
              <h4>{g.titulo}</h4>
              {g.campos.map((campo) => {
                const v = j.atributos[campo] ?? 0;
                const key = enfase.has(campo);
                return (
                  <div className={"attr-row" + (key ? " key" : "")} key={campo}>
                    <span className="a-lbl">
                      {key && <i className="a-key" />}
                      {ATRIBUTO_LABEL[campo] ?? campo}
                    </span>
                    <span className="a-bar">
                      <i className={"f " + faixaAtributo(v)} style={{ width: `${(v / 20) * 100}%` }} />
                    </span>
                    <span className={"a-val tnum " + faixaAtributo(v)}>{v.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {modalTat && (
        <div className="modal-bg" onClick={() => setModalTat(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Táticas do jogador">
            <div className="modal-h">
              <h3>⚙ {j.nomeExibido}</h3>
              <button className="modal-x" onClick={() => setModalTat(false)} aria-label="Fechar">✕</button>
            </div>
            <div className="modal-filtros" style={{ gridTemplateColumns: "1fr" }}>
              <div className="fl">
                <span>{func.titulo} <em style={{ fontWeight: 400, color: "var(--ink-faint)", fontStyle: "normal" }}>· {POS_ABREV[j.posicao]}</em></span>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {func.opcoes.map((op) => (
                    <button
                      key={op}
                      onClick={() => { salvarTaticaJogador(id, op); setNonce((n) => n + 1); }}
                      style={{
                        textAlign: "left", cursor: "pointer", padding: "9px 11px", borderRadius: 8, fontSize: 13,
                        border: "1px solid " + (taticaAtual === op ? "var(--brand)" : "var(--line)"),
                        background: taticaAtual === op ? "var(--brand-wash)" : "transparent",
                        fontWeight: taticaAtual === op ? 700 : 500,
                      }}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-f">
              <span>Instrução individual, aplicada antes do jogo.</span>
              <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => setModalTat(false)}>fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="v" style={{ fontSize: 19 }}>{v}</span>
      <span className="k">{k}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{sub}</span>}
    </div>
  );
}

function BarLinha({ lbl, v, invertido }: { lbl: string; v: number; invertido?: boolean }) {
  const ruim = invertido ? v > 65 : v < 45;
  const meio = invertido ? v > 40 : v < 60;
  const tone = ruim ? "bad" : meio ? "warn" : "";
  return (
    <div className="row">
      <span className="lbl" style={{ width: 64 }}>{lbl}</span>
      <span className={"bar " + tone} style={{ flex: 1 }}><i style={{ width: `${v}%` }} /></span>
      <span className="val tnum" style={{ width: 34, textAlign: "right" }}>{v}</span>
    </div>
  );
}
