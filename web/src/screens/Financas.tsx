import { api, iniciaisMarca } from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Loading } from "../components/bits";
import { dinheiro, dataCurta } from "../lib/format";

const LABEL_TIPO: Record<string, string> = {
  RECEITA_BILHETERIA: "Bilheteria",
  RECEITA_PATROCINIO: "Patrocínios",
  RECEITA_NAMING: "Naming rights",
  RECEITA_PREMIACAO: "Premiação",
  DESPESA_FOLHA: "Folha salarial",
  DESPESA_MANUTENCAO: "Manutenção",
  DESPESA_TRANSFERENCIA: "Transferência",
};

export default function Financas({ embutido }: { embutido?: boolean } = {}) {
  const { data, carregando } = useAsync(() => api.financas(), []);
  if (carregando || !data) return <Loading label="Fechando o caixa…" />;

  const pm = data.projecaoMensal;
  const uniforme = pm.uniforme ?? 0;
  const patrocinios = pm.patrocinio + uniforme + pm.naming;
  const liquidoMensal = patrocinios + pm.bilheteria - pm.folha - pm.manutencao;

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">Gestão financeira</div>
          <h1>Finanças</h1>
          <p>Fluxo mensal projetado, alertas do Conselho e histórico de movimentações. Razão contábil append-only (11).</p>
        </div>
      )}

      {data.alertas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {data.alertas.map((a, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px",
              background: a.nivel >= 2 ? "var(--loss-wash)" : "var(--draw-wash)",
              border: "1px solid var(--line)", borderRadius: "var(--radius)",
              borderLeft: `3px solid ${a.nivel >= 2 ? "var(--loss)" : "var(--live)"}`,
            }}>
              <b style={{ color: a.nivel >= 2 ? "var(--loss)" : "var(--live)" }}>Nível {a.nivel}</b>
              <span style={{ fontSize: 13.5 }}>{a.mensagem}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Card>
          <div className="stat">
            <span className={"v " + (data.saldoCaixa >= 0 ? "money-pos" : "money-neg")}>{dinheiro(data.saldoCaixa, true)}</span>
            <span className="k">Caixa atual</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className={"v " + (liquidoMensal >= 0 ? "money-pos" : "money-neg")}>{dinheiro(liquidoMensal, true)}</span>
            <span className="k">Resultado mensal projetado</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="v">{dinheiro(data.receitaAnualEstimada, true)}</span>
            <span className="k">Receita anual estimada</span>
          </div>
        </Card>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <Card title="Projeção mensal">
          <div className="trend">
            <Row lbl="Patrocínios" v={pm.patrocinio} />
            {uniforme > 0 && <Row lbl="Patrocínios de uniforme" v={uniforme} />}
            {pm.naming > 0 && <Row lbl={`Naming rights${data.naming ? ` (${data.naming.patrocinador})` : ""}`} v={pm.naming} />}
            <Row lbl="Bilheteria (est.)" v={pm.bilheteria} />
            <Row lbl="Folha salarial" v={-pm.folha} />
            <Row lbl="Manutenção (estádio + CT)" v={-pm.manutencao} />
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 2 }}>
              <Row lbl="Líquido" v={liquidoMensal} forte />
            </div>
          </div>
        </Card>

        <Card title="Estádio & Conselho">
          <div className="trend">
            {data.emObras && data.mandoProvisorio && (
              <div className="row"><span className="lbl">Mando de campo</span><span className="val" style={{ color: "var(--warn, #d97706)" }}>{data.mandoProvisorio} 🏗️</span></div>
            )}
            <div className="row"><span className="lbl">Capacidade</span><span className="val">{data.capacidadeEstadio.toLocaleString("pt-BR")}</span></div>
            <div className="row"><span className="lbl">Público médio</span><span className="val">{data.publicoMedio.toLocaleString("pt-BR")}</span></div>
            <div className="row"><span className="lbl">Preço do ingresso</span><span className="val">{dinheiro(data.precoIngresso)}</span></div>
            <div className="row"><span className="lbl">Relação com o Conselho</span><span className="val">{data.conselho.relacao}/100</span></div>
            <div className="row"><span className="lbl">Premiação projetada (posição atual)</span><span className="val money-pos">{dinheiro(data.premiacaoProjetada, true)}</span></div>
          </div>
        </Card>
      </div>

      {data.patrociniosUniforme && data.patrociniosUniforme.some((p) => p.patrocinador) && (
        <div style={{ marginBottom: 16 }}>
        <Card title="Patrocínios de uniforme" hint={`${dinheiro(uniforme, true)} / mês`}>
          <div className="pat-fin">
            {data.patrociniosUniforme.map((p) => (
              <div key={p.slot} className="pat-fin-row">
                <span className="pat-fin-slot">{p.slotT}</span>
                {p.patrocinador ? (
                  <>
                    <span className="pat-fin-marca">
                      <span className="pat-fin-dot" style={{ background: p.patrocinador.cor1, color: p.patrocinador.cor2 }}>
                        {iniciaisMarca(p.patrocinador.nome)}
                      </span>
                      {p.patrocinador.nome}
                    </span>
                    <span className="pat-fin-val money-pos">{dinheiro(p.valorAno, true)}/ano</span>
                  </>
                ) : (
                  <span className="pat-fin-marca" style={{ color: "var(--ink-faint)" }}>sem acordo</span>
                )}
              </div>
            ))}
          </div>
        </Card>
        </div>
      )}

      <Card title="Movimentações recentes" flush>
        <div className="scroll-x">
          <table className="tbl" style={{ minWidth: 520 }}>
            <thead>
              <tr><th className="l">Data</th><th className="l">Tipo</th><th className="l">Descrição</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {data.historico.map((m, i) => (
                <tr key={i}>
                  <td className="l tnum" style={{ color: "var(--ink-faint)" }}>{dataCurta(m.data)}</td>
                  <td className="l">{LABEL_TIPO[m.tipo] ?? m.tipo}</td>
                  <td className="l" style={{ color: "var(--ink-soft)" }}>{m.descricao}</td>
                  <td className={"tnum " + (m.valor >= 0 ? "money-pos" : "money-neg")}>
                    {m.valor >= 0 ? "+" : "−"}{dinheiro(Math.abs(m.valor), true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Row({ lbl, v, forte }: { lbl: string; v: number; forte?: boolean }) {
  return (
    <div className="row">
      <span className="lbl" style={forte ? { fontWeight: 700, color: "var(--ink)" } : undefined}>{lbl}</span>
      <span className={"val " + (v >= 0 ? "money-pos" : "money-neg")} style={forte ? { fontSize: 15 } : undefined}>
        {v >= 0 ? "+" : "−"}{dinheiro(Math.abs(v), true)}
      </span>
    </div>
  );
}
