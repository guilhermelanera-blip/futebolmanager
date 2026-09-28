import { useEffect, useReducer, useState } from "react";
import { api, fazerAcaoTorcida, BANDAS_TORCIDA, type AcaoTorcida } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Loading } from "../components/bits";

type Vw = Awaited<ReturnType<typeof api.torcida>>;

function useTick(bump: () => void) {
  useEffect(() => {
    window.addEventListener("fm:tick", bump);
    return () => window.removeEventListener("fm:tick", bump);
  }, [bump]);
}

const GRAV_ROT: Record<string, string> = { apoio: "apoio", aviso: "atenção", grave: "grave" };
function corPressao(p: number) {
  return p >= 66 ? "var(--loss)" : p >= 46 ? "var(--live)" : "var(--win)";
}
function corHumor(v: number) {
  return v >= 64 ? "#2f8f52" : v >= 46 ? "#8a8578" : v >= 30 ? "#c77c1e" : "#c0392b";
}

export default function Torcida({ embutido }: { embutido?: boolean } = {}) {
  const [tick, bump] = useReducer((x) => x + 1, 0);
  useTick(bump);
  const { data, carregando } = useAsync(() => api.torcida(), [tick]);
  const [msg, setMsg] = useState<string | null>(null);

  if (carregando || !data) return <Loading label="Sentindo o clima da arquibancada…" />;
  const d = data as Vw;

  function agir(id: AcaoTorcida) {
    const r = fazerAcaoTorcida(id);
    setMsg(r.msg);
    setTimeout(() => setMsg(null), 4000);
    bump();
  }

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">Bastidores</div>
          <h1>Torcida &amp; pressão</h1>
          <p>A relação com as organizadas move a temperatura do clube. Quanto mais estremecida, mais a sua cadeira balança — e mais a arquibancada cobra.</p>
        </div>
      )}

      {/* régua da relação */}
      <Card title="Relação com a torcida" right={<span className="hint">tendência {d.tendencia}</span>}>
        <div className="tor-regua">
          <div className="tor-bar">
            {BANDAS_TORCIDA.map((b, i) => {
              const fim = BANDAS_TORCIDA[i + 1]?.min ?? 100;
              return <span key={b.id} className="tor-seg" style={{ flexGrow: fim - b.min, background: b.cor }} title={b.rot} />;
            })}
            <span className="tor-marca" style={{ left: `${d.valor}%` }}>
              <b>{d.valor}</b>
            </span>
          </div>
          <div className="tor-escala">
            <span>guerra</span><span>revolta</span><span>desconfiança</span><span>cautela</span><span>apoio</span><span>idolatria</span>
          </div>
          <div className="tor-banda" style={{ color: d.banda.cor }}>
            <b>{d.banda.rot}</b>
            <span>{d.posicao}º na tabela · a diretoria projetava ~{d.posEsperada}º{d.semVencer >= 2 ? ` · ${d.semVencer} sem vencer` : ""}</span>
          </div>
        </div>
      </Card>

      <div className="grid" style={{ gap: 16, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", alignItems: "start", marginTop: 16 }}>
        {/* pressão sobre o treinador */}
        <Card title="Pressão sobre o treinador">
          <div className="tor-press">
            <div className="tor-gauge">
              <div className="tor-gauge-fill" style={{ width: `${d.pressao}%`, background: corPressao(d.pressao) }} />
            </div>
            <div className="tor-press-num" style={{ color: corPressao(d.pressao) }}>{d.pressao}<i>/100</i></div>
          </div>
          <div className="tor-cadeira">
            <b style={{ color: corPressao(d.pressao) }}>{d.cadeira.rot}</b>
            <p>{d.cadeira.nota}</p>
            {d.cadeira.jogos > 0 && (
              <p className="tor-prazo">A diretoria fala, nos bastidores, em <b>{d.cadeira.jogos} jogos</b> para uma reação.</p>
            )}
          </div>
        </Card>

        {/* o que pesa */}
        <Card title="O que pesa agora">
          <div className="tor-fatores">
            {d.fatores.length === 0 && <div className="empty">Ambiente equilibrado.</div>}
            {d.fatores.map((f, i) => (
              <div key={i} className="tor-fator">
                <span className="tor-fator-t">{f.rot}</span>
                <span className={"tor-fator-d " + (f.delta > 0 ? "pos" : "neg")}>{f.delta > 0 ? "+" : ""}{f.delta}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* organizadas */}
      <div style={{ marginTop: 16 }}>
        <Card title="Organizadas" flush hint={`${d.organizadas.length} grupos`}>
          <div className="tor-orgs">
            {d.organizadas.map((o) => (
              <div key={o.nome} className="tor-org">
                <div className="tor-org-id">
                  <b>{o.nome}</b>
                  {o.radical && <span className="tor-org-tag">linha dura</span>}
                  <span className="tor-org-sub">~{Math.round(o.membros / 1000)} mil membros</span>
                </div>
                <div className="tor-org-bar">
                  <span style={{ width: `${o.humor}%`, background: corHumor(o.humor) }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* movimentação */}
      <div style={{ marginTop: 16 }}>
        <Card title="Movimentação da torcida" flush>
          <div className="tor-feed">
            {d.eventos.map((e, i) => (
              <div key={i} className={"tor-evt g-" + e.grav}>
                <span className="tor-evt-ico">{e.ico}</span>
                <span className="tor-evt-txt">{e.texto}</span>
                <span className={"tor-evt-tag " + e.grav}>{GRAV_ROT[e.grav]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* cartas do treinador */}
      <div style={{ marginTop: 16 }}>
        <Card title="Como você responde" flush hint="uma jogada some a cada rodada">
          <div className="tor-acoes">
            {d.acoes.map((a) => {
              const usada = d.acoesFeitas.includes(a.id);
              return (
                <button
                  key={a.id}
                  className={"tor-acao" + (a.delta < 0 ? " risco" : "")}
                  disabled={usada}
                  onClick={() => agir(a.id as AcaoTorcida)}
                >
                  <span className="tor-acao-t">{a.rot}</span>
                  <span className="tor-acao-d">{usada ? "usada nesta rodada" : `${a.delta > 0 ? "+" : ""}${a.delta} na relação`}</span>
                </button>
              );
            })}
          </div>
          {msg && <div className="tor-msg">{msg}</div>}
        </Card>
      </div>
    </>
  );
}
