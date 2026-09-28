import { api } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Brasao, PosTag, Loading } from "../components/bits";
import { NomeClube, NomeJogador } from "../components/nomes";

export default function Classificacao({ embutido }: { embutido?: boolean } = {}) {
  const { data, carregando } = useAsync(() => api.classificacao(), []);
  if (carregando || !data) return <Loading label="Calculando a tabela…" />;
  const { linhas, artilharia, liga } = data;

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">{liga.nome}</div>
          <h1>Classificação</h1>
          <p>
            Pontos corridos, ida e volta, 20 clubes fixos — sem rebaixamento.
            O topo vale vaga na futura Copa Continental; a base fica de fora da próxima Copa Nacional.
          </p>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <Card title="Tabela" flush>
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th className="l">#</th>
                  <th className="l">Clube</th>
                  <th>J</th><th>V</th><th>E</th><th>D</th>
                  <th>GP</th><th>GC</th><th>SG</th><th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr
                    key={l.id}
                    className={
                      (l.ehVoce ? "you " : "") +
                      (l.posicao <= 5 ? "zona-top" : l.posicao >= 17 ? "zona-bot" : "")
                    }
                  >
                    <td className="pos l">{l.posicao}</td>
                    <td className="l name">
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Brasao cores={l.cores} size={20} id={l.id} />
                        <NomeClube id={l.id} className="tbl-clube">{l.nomeCurto}</NomeClube>
                      </span>
                    </td>
                    <td className="tnum">{l.jogos}</td>
                    <td className="tnum">{l.vitorias}</td>
                    <td className="tnum">{l.empates}</td>
                    <td className="tnum">{l.derrotas}</td>
                    <td className="tnum">{l.golsPro}</td>
                    <td className="tnum">{l.golsContra}</td>
                    <td className="tnum">{l.saldo > 0 ? "+" : ""}{l.saldo}</td>
                    <td className="tnum" style={{ fontWeight: 700 }}>{l.pontos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 16, padding: "10px 16px", fontSize: 11.5, color: "var(--ink-faint)" }}>
            <span><i style={{ display: "inline-block", width: 8, height: 8, background: "var(--brand)", borderRadius: 2, marginRight: 5 }} />Zona continental (1–5)</span>
            <span><i style={{ display: "inline-block", width: 8, height: 8, background: "var(--loss)", borderRadius: 2, marginRight: 5 }} />Fora da Copa (17–20)</span>
          </div>
        </Card>

        <Card title="Artilharia" hint={`${liga.rodadaAtual - 1} rodadas`} flush>
          <table className="tbl">
            <tbody>
              {artilharia.slice(0, 12).map((a, i) => (
                <tr key={i}>
                  <td className="pos l">{i + 1}</td>
                  <td className="l name">
                    <NomeJogador clubeId={a.clubeId} nome={a.nome} />
                    <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                      <NomeClube id={a.clubeId}>{a.clube}</NomeClube>
                    </div>
                  </td>
                  <td><PosTag pos={a.posicao} /></td>
                  <td className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{a.gols}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
