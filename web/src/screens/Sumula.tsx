import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Brasao, Loading } from "../components/bits";
import { NomeClube, NomeJogador } from "../components/nomes";
import { dataLonga } from "../lib/format";

const ICONE: Record<string, string> = {
  GOL: "⚽", CARTAO_AMARELO: "🟨", CARTAO_VERMELHO: "🟥", LESAO: "✚",
};
const ROTULO: Record<string, string> = {
  GOL: "Gol", CARTAO_AMARELO: "Amarelo", CARTAO_VERMELHO: "Vermelho", LESAO: "Lesão",
};

export default function Sumula() {
  const { rodada } = useParams();
  const nav = useNavigate();
  const r = Number(rodada);
  const { data, erro, carregando } = useAsync(() => api.partida(r), [r]);

  if (carregando) return <Loading label="Buscando a súmula…" />;
  if (erro || !data) return <div className="empty">{erro ?? "Partida não encontrada."}</div>;

  if (!data.jogada) {
    return (
      <>
        <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>‹ voltar</button>
        <Card title={`Rodada ${data.rodada}`}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, padding: "20px 0" }}>
            <Time c={data.mandante} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--ink-faint)" }}>×</span>
            <Time c={data.visitante} dir="right" />
          </div>
          <div className="empty">Partida ainda não disputada — marcada para {dataLonga(data.data)}.</div>
        </Card>
      </>
    );
  }

  const st = data.estatisticas!;
  const gols = data.eventos.filter((e) => e.tipo === "GOL");

  return (
    <>
      <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>‹ voltar</button>

      <Card flush>
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--line-soft)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-faint)" }}>
          Liga Nacional · Rodada {data.rodada} · {dataLonga(data.data)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 14, padding: "20px 16px" }}>
          <Time c={data.mandante} />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 34, letterSpacing: "-0.02em" }}>
            <span style={{ color: lado(data.golsMandante!, data.golsVisitante!) }}>{data.golsMandante}</span>
            <span style={{ color: "var(--ink-faint)", margin: "0 10px" }}>–</span>
            <span style={{ color: lado(data.golsVisitante!, data.golsMandante!) }}>{data.golsVisitante}</span>
          </div>
          <Time c={data.visitante} dir="right" />
        </div>
        {gols.length > 0 && (
          <div style={{ padding: "0 16px 14px", fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center" }}>
            {gols.map((g, i) => (
              <span key={i}>
                <NomeJogador chave={g.jogador} clubeId={g.lado === "visitante" ? data.visitante.id : data.mandante.id} nome={g.jogador.split(" ").slice(-1)[0]} /> {g.minuto}'{i < gols.length - 1 ? " · " : ""}
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <Card title="Lance a lance" flush>
          <ul style={{ listStyle: "none", margin: 0, padding: "6px 0" }}>
            {data.eventos.map((e, i) => (
              <li key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                flexDirection: e.lado === "visitante" ? "row-reverse" : "row",
                textAlign: e.lado === "visitante" ? "right" : "left",
              }}>
                <span className="tnum" style={{ width: 34, color: "var(--ink-faint)", textAlign: "center" }}>{e.minuto}'</span>
                <span style={{ fontSize: 15 }}>{ICONE[e.tipo]}</span>
                <span style={{ flex: 1 }}>
                  <NomeJogador chave={e.jogador} clubeId={e.lado === "visitante" ? data.visitante.id : data.mandante.id} nome={e.jogador} />
                  <span style={{ color: "var(--ink-faint)", fontSize: 12 }}> · {ROTULO[e.tipo]}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Números da partida">
          <div className="trend">
            <LinhaStat lbl="Gols" a={st.golsMandante} b={st.golsVisitante} />
            <LinhaStat lbl="Cartões amarelos" a={st.amarelosMandante} b={st.amarelosVisitante} />
            <LinhaStat lbl="Cartões vermelhos" a={st.vermelhosMandante} b={st.vermelhosVisitante} />
            <LinhaStat lbl="Lesões" a={st.lesoesMandante} b={st.lesoesVisitante} />
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 12, marginBottom: 0 }}>
            Eventos gerados pelo motor a partir de um seed determinístico e atribuídos aos jogadores — reproduzível (R21).
          </p>
        </Card>
      </div>
    </>
  );
}

function Time({ c, dir }: { c: { id: string; nomeCurto: string; cores: string; cidade: string }; dir?: "right" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: dir === "right" ? "row-reverse" : "row", textAlign: dir === "right" ? "right" : "left" }}>
      <Brasao cores={c.cores} size={34} id={c.id} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
          <NomeClube id={c.id}>{c.nomeCurto}</NomeClube>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{c.cidade}</div>
      </div>
    </div>
  );
}

function LinhaStat({ lbl, a, b }: { lbl: string; a: number; b: number }) {
  return (
    <div className="row">
      <span className="val" style={{ fontWeight: 700 }}>{a}</span>
      <span className="lbl" style={{ flex: 1, textAlign: "center" }}>{lbl}</span>
      <span className="val" style={{ fontWeight: 700 }}>{b}</span>
    </div>
  );
}

function lado(x: number, y: number) {
  return x >= y ? "var(--ink)" : "var(--ink-faint)";
}
