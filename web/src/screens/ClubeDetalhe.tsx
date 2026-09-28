import { useParams, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Brasao, Forma, Loading } from "../components/bits";
import { NomeClube, NomeJogador } from "../components/nomes";
import { POS_ABREV, numero, dataCurta } from "../lib/format";

const ORDEM = ["GOLEIRO", "ZAGUEIRO", "LATERAL", "VOLANTE", "MEIA", "PONTA", "ATACANTE"];
type Clube = Awaited<ReturnType<typeof api.clube>>;
type Jg = Clube["ultimos"][number];

function JogoLinha({ j }: { j: Jg }) {
  const fin = j.golsPro != null;
  return (
    <div className={"cj-row" + (j.resultado ? " r-" + j.resultado : "")}>
      <span className="cj-rod">R{j.rodada}</span>
      <span className="cj-loc">{j.casa ? "casa" : "fora"}</span>
      <Brasao cores={j.adversario.cores} size={16} id={j.adversario.id} />
      <NomeClube id={j.adversario.id} className="cj-adv">{j.adversario.nomeCurto}</NomeClube>
      <span className="cj-pl tnum">{fin ? `${j.golsPro}–${j.golsContra}` : dataCurta(j.data)}</span>
    </div>
  );
}

export default function ClubeDetalhe() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data, erro, carregando } = useAsync(() => api.clube(id), [id]);

  if (data?.ehMeu) return <Navigate to="/elenco" replace />;
  if (carregando) return <Loading label="Abrindo o clube…" />;
  if (erro || !data) return <div className="empty">{erro ?? "Clube não encontrado."}</div>;

  const d = data;
  const grupos = ORDEM
    .map((p) => ({ pos: p, js: d.elenco.filter((j) => j.posicao === p) }))
    .filter((g) => g.js.length > 0);

  return (
    <>
      <div className="clube-cab">
        <Brasao cores={d.cores} size={44} id={d.id} />
        <div className="clube-cab-id">
          <h1>{d.nomeCurto}</h1>
          <span>{d.cidade} · {d.nome}</span>
        </div>
        <button className="linkish" onClick={() => nav(-1)}>voltar</button>
      </div>

      <div className="clube-stats">
        <div className="cs"><b>{d.posicao ? d.posicao + "º" : "—"}</b><span>na tabela</span></div>
        <div className="cs"><b>{d.pontos}</b><span>pontos</span></div>
        <div className="cs"><b>{d.vitorias}-{d.empates}-{d.derrotas}</b><span>V-E-D</span></div>
        <div className="cs"><b>{d.saldo > 0 ? "+" + d.saldo : d.saldo}</b><span>saldo de gols</span></div>
        <div className="cs"><Forma s={d.forma} /><span>últimos 5</span></div>
        <div className="cs"><b>{numero(d.capacidadeEstadio)}</b><span>lugares</span></div>
      </div>

      <div className="clube-grid">
        <Card title="Elenco" flush hint={`${d.elenco.length} jogadores`}>
          <div className="clube-elenco">
            {grupos.map((g) => (
              <div key={g.pos} className="ce-grupo">
                <div className="ce-h">{g.pos.toLowerCase()}</div>
                {g.js.map((j) => (
                  <div key={(j.id ?? j.nome) + "-" + j.numero} className="ce-row">
                    <span className="ce-num tnum">{j.numero}</span>
                    <NomeJogador id={j.id} clubeId={d.id} nome={j.nome} className="ce-nome" />
                    <span className="ce-pos">{POS_ABREV[j.posicao] ?? j.posicao}</span>
                    {j.gols > 0 && <span className="ce-gols">{j.gols}⚽</span>}
                    <span className="ce-ovr tnum">{j.overall.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <div className="clube-lado">
          <Card title="Jogos" flush>
            <div className="clube-jogos">
              {d.ultimos.map((j) => <JogoLinha key={"u" + j.rodada} j={j} />)}
              {d.ultimos.length > 0 && d.proximos.length > 0 && <div className="cj-sep">próximos</div>}
              {d.proximos.map((j) => <JogoLinha key={"p" + j.rodada} j={j} />)}
              {d.ultimos.length === 0 && d.proximos.length === 0 && <div className="empty">Sem jogos.</div>}
            </div>
          </Card>

          {d.artilheiros.length > 0 && (
            <Card title="Artilheiros" flush>
              <div className="clube-elenco">
                <div className="ce-grupo">
                  {d.artilheiros.map((j) => (
                    <div key={j.nome} className="ce-row">
                      <NomeJogador id={j.id} clubeId={d.id} nome={j.nome} className="ce-nome" />
                      <span className="ce-gols" style={{ marginLeft: "auto" }}>{j.gols} gols</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
