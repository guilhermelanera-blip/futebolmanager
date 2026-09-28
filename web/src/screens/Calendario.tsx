import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Brasao, Loading } from "../components/bits";
import { NomeClube } from "../components/nomes";
import { dataCurta } from "../lib/format";

export default function Calendario({ embutido }: { embutido?: boolean } = {}) {
  const nav = useNavigate();
  const { data, carregando } = useAsync(() => api.calendario(), []);
  const rodadas = useMemo(() => {
    if (!data) return [];
    const map = new Map<number, typeof data.todos>();
    for (const p of data.todos) {
      if (!map.has(p.rodada)) map.set(p.rodada, []);
      map.get(p.rodada)!.push(p);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);
  const [rodadaSel, setRodadaSel] = useState<number | null>(null);

  if (carregando || !data) return <Loading label="Abrindo o calendário…" />;
  const proxRodada = data.liga.rodadaAtual;
  const sel = rodadaSel ?? proxRodada;
  const jogosDaRodada = rodadas.find(([r]) => r === sel)?.[1] ?? [];

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">{data.liga.nome}</div>
          <h1>Calendário</h1>
          <p>38 rodadas. As partidas são resolvidas pelo servidor no dia marcado — você jogando ou não.</p>
        </div>
      )}

      <div className="grid cal-grid" style={{ gap: 16 }}>
        <Card title="Seus jogos" flush>
          <table className="tbl">
            <tbody>
              {data.ultimos.concat(data.proximos).map((p, i) => {
                const jogado = p.resultado != null;
                return (
                  <tr key={i} onClick={() => nav(`/partida/${p.rodada}`)} style={{ cursor: "pointer" }}>
                    <td className="pos l">R{p.rodada}</td>
                    <td className="l tnum" style={{ color: "var(--ink-faint)", whiteSpace: "nowrap", width: 62 }}>{dataCurta(p.data)}</td>
                    <td className="l name">
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Brasao cores={p.adversario.cores} size={18} id={p.adversario.id} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
                          {p.casa ? "" : "@ "}
                          <NomeClube id={p.adversario.id} isolar>{p.adversario.nomeCurto}</NomeClube>
                        </span>
                      </span>
                    </td>
                    <td className="tnum" style={{ fontWeight: 600 }}>
                      {jogado ? `${p.golsPro}–${p.golsContra}` : "—"}
                    </td>
                    <td style={{ width: 26 }}>
                      {jogado && (
                        <span className={"pill " + (p.resultado === "V" ? "win" : p.resultado === "D" ? "loss" : "draw")}>
                          {p.resultado}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card
          title={`Rodada ${sel}`}
          right={
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn ghost sm" disabled={sel <= 1} onClick={() => setRodadaSel(sel - 1)}>‹</button>
              <button className="btn ghost sm" disabled={sel >= 38} onClick={() => setRodadaSel(sel + 1)}>›</button>
            </div>
          }
          flush
        >
          <table className="tbl">
            <tbody>
              {jogosDaRodada.map((p, i) => {
                const jogado = p.golsMandante != null;
                return (
                  <tr
                    key={i}
                    className={p.envolveVoce ? "you" : ""}
                    onClick={p.envolveVoce ? () => nav(`/partida/${p.rodada}`) : undefined}
                    style={p.envolveVoce ? { cursor: "pointer" } : undefined}
                  >
                    <td className="l name" style={{ textAlign: "right", width: "42%" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <NomeClube id={p.mandante.id} isolar>{p.mandante.nomeCurto}</NomeClube>
                        </span>
                        <Brasao cores={p.mandante.cores} size={16} id={p.mandante.id} />
                      </span>
                    </td>
                    <td className="tnum" style={{ fontWeight: 700, width: 52, textAlign: "center" }}>
                      {jogado ? `${p.golsMandante}–${p.golsVisitante}` : "×"}
                    </td>
                    <td className="l name" style={{ width: "42%" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Brasao cores={p.visitante.cores} size={16} id={p.visitante.id} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <NomeClube id={p.visitante.id} isolar>{p.visitante.nomeCurto}</NomeClube>
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "10px 16px", fontSize: 11.5, color: "var(--ink-faint)" }}>
            {sel >= proxRodada ? "Rodada ainda não disputada." : "Rodada encerrada."}
          </div>
        </Card>
      </div>
    </>
  );
}
