import { useEffect, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import {
  api, passarPeriodo, passarDia, definirFocoTreino, definirFocoIndividual,
  agendarJogo, PERIODO_ROT,
  type DicaAux, type EventoDia, type FocoTreino,
} from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Brasao, Loading } from "../components/bits";
import { NomeClube, NomeJogador } from "../components/nomes";
import { dataCurta, dataLonga, POS_ABREV } from "../lib/format";

const PER_ICO = ["☀️", "🌥️", "🌙"];
const URG_ROT: Record<DicaAux["urgencia"], string> = { alta: "prioridade", media: "atenção", baixa: "tranquilo" };

function useTick(bump: () => void) {
  useEffect(() => {
    window.addEventListener("fm:tick", bump);
    return () => window.removeEventListener("fm:tick", bump);
  }, [bump]);
}

export default function Treinos({ embutido }: { embutido?: boolean } = {}) {
  const nav = useNavigate();
  const [tick, bump] = useReducer((x) => x + 1, 0);
  useTick(bump);
  const { data, carregando } = useAsync(() => api.treinos(), [tick]);

  if (carregando || !data) return <Loading label="Chegando ao CT…" />;

  const { data: dia, periodo, diaDeJogo, proximo, eventos, dias, foco, focos, individuais, dicas, elenco } = data;
  const focoSel = focos.find((f: FocoTreino) => f.id === foco) ?? focos[0];
  const nomePorId = new Map(elenco.map((j) => [j.id, j.nome] as const));

  function irParaPartida() {
    if (!proximo) return;
    agendarJogo(new Date().toISOString(), proximo.rodada);
    nav("/ao-vivo");
  }

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">Comissão técnica</div>
          <h1>Treinos &amp; semana</h1>
          <p>
            Viva a semana período a período até o dia do jogo. Escolha o foco dos treinos e ouça o que o
            auxiliar tem a dizer sobre cada jogador.
          </p>
        </div>
      )}

      {/* ---- linha do tempo da semana ---- */}
      <div className="sem-linha">
        {dias.map((d) => (
          <div
            key={d.data}
            className={"sem-dia" + (d.hoje ? " hoje" : "") + (d.jogo ? " jogo" : "") + (d.passado ? " passado" : "")}
          >
            <span className="sd-dow">{new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span>
            <span className="sd-num">{new Date(d.data + "T12:00:00").getDate()}</span>
            {d.jogo
              ? <span className="sd-tag">JOGO</span>
              : d.hoje ? <span className="sd-tag hoje">hoje</span> : <span className="sd-tag vazio">·</span>}
          </div>
        ))}
      </div>

      {/* ---- viver a semana ---- */}
      {diaDeJogo && proximo ? (
        <Card flush>
          <div className="sem-jogo">
            <div className="sj-top">
              <span className="sj-eyebrow">{dataLonga(dia)} · {proximo.rodada}ª rodada</span>
              <h2>Dia de jogo</h2>
            </div>
            <div className="sj-adv">
              <Brasao cores={proximo.adversario.cores} size={40} id={proximo.adversario.id} />
              <div>
                <b>{proximo.casa ? "Em casa contra" : "Fora, contra"}</b>
                <div className="sj-adv-nome"><NomeClube id={proximo.adversario.id}>{proximo.adversario.nomeCurto}</NomeClube></div>
              </div>
            </div>
            <p className="sj-nota">
              A semana travou. Não há mais treinos: o elenco está concentrado. Entre em campo quando quiser.
            </p>
            <button className="btn grande" onClick={irParaPartida}>Ir para a partida →</button>
          </div>
        </Card>
      ) : (
        <Card
          flush
          title={<>Vivendo a semana</>}
          right={proximo && <span className="hint">faltam {proximo.dias} dia(s) para o jogo</span>}
        >
          <div className="sem-agora">
            <div className="sa-cab">
              <div className="sa-data">
                <span className="sa-dia">{dataLonga(dia)}</span>
                <span className="sa-per">{PER_ICO[periodo]} {PERIODO_ROT[periodo]}</span>
              </div>
              <div className="sa-pontos">
                {[0, 1, 2].map((p) => (
                  <span key={p} className={"sap" + (p === periodo ? " on" : p < periodo ? " feito" : "")} />
                ))}
              </div>
            </div>

            <div className="sa-eventos">
              {eventos.length === 0 && <div className="empty">Dia tranquilo, sem novidades.</div>}
              {eventos.map((e: EventoDia) => (
                <div key={e.id} className={"ev-item t-" + e.tom}>
                  <span className="ev-ico">{e.ico}</span>
                  <div className="ev-txt">
                    <b>{e.titulo}</b>
                    <p>{e.texto}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="sa-acoes">
              <button className="btn" onClick={() => passarPeriodo()}>Passar período →</button>
              <button className="btn ghost" onClick={() => passarDia()}>Passar o dia ⏭</button>
            </div>
          </div>
        </Card>
      )}

      {/* ---- foco da semana ---- */}
      <div style={{ marginTop: 16 }}>
        <Card title="Foco dos treinos" flush>
          <div className="foco-chips">
            {focos.map((f: FocoTreino) => (
              <button
                key={f.id}
                className={"foco-chip" + (f.id === foco ? " on" : "")}
                onClick={() => definirFocoTreino(f.id)}
              >
                <span className="fc-ico">{f.ico}</span>
                <span>{f.rot}</span>
              </button>
            ))}
          </div>
          <p className="foco-dica">
            <span className="fd-ico">{focoSel.ico}</span> {focoSel.dica}
          </p>
        </Card>
      </div>

      {/* ---- auxiliar comenta ---- */}
      <div style={{ marginTop: 16 }}>
        <Card
          title="O auxiliar comenta"
          flush
          right={<span className="hint">{dicas.filter((d: DicaAux) => d.urgencia === "alta").length} em prioridade</span>}
        >
          <div className="dica-lista">
            {dicas.map((d: DicaAux) => {
              const ind = individuais[d.id];
              const indRot = ind ? (focos.find((f: FocoTreino) => f.id === ind)?.rot ?? ind) : null;
              return (
                <div key={d.id} className={"dica u-" + d.urgencia}>
                  <div className="dica-cab">
                    <span className={"dica-dot u-" + d.urgencia} title={URG_ROT[d.urgencia]} />
                    <span className="dica-ico">{d.ico}</span>
                    <NomeJogador id={d.id} nome={d.nome} className="dica-nome" />
                    <span className="dica-pos">{POS_ABREV[d.posicao] ?? d.posicao}</span>
                    <span className="dica-ovr">{d.overall.toFixed(1)}</span>
                  </div>
                  <p className="dica-frase">{d.frase}</p>
                  <div className="dica-foco">
                    <button
                      className={"df-btn" + (ind === d.focoSugerido ? " on" : "")}
                      onClick={() => definirFocoIndividual(d.id, d.focoSugerido)}
                    >
                      {ind === d.focoSugerido ? "✓ foco individual: " : "aplicar foco: "}
                      {focos.find((f: FocoTreino) => f.id === d.focoSugerido)?.rot ?? d.focoSugerido}
                    </button>
                    {ind && ind !== d.focoSugerido && (
                      <span className="df-atual">tem foco em {indRot}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ---- foco individual ativo ---- */}
      {Object.keys(individuais).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Card title="Focos individuais ativos" flush>
            <div className="ind-lista">
              {Object.entries(individuais).map(([id, f]) => (
                <div key={id} className="ind-item">
                  <NomeJogador id={id} nome={nomePorId.get(id) ?? id} />
                  <span>{focos.find((x: FocoTreino) => x.id === f)?.rot ?? String(f)}</span>
                  <button className="linkish" onClick={() => definirFocoIndividual(id, "")}>remover</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <p className="sem-rodape">
        Próximo compromisso:{" "}
        {proximo
          ? <>{proximo.casa ? "" : "fora — "}<NomeClube id={proximo.adversario.id}>{proximo.adversario.nomeCurto}</NomeClube>, {dataCurta(proximo.data)}</>
          : "temporada encerrada"}
      </p>
    </>
  );
}
