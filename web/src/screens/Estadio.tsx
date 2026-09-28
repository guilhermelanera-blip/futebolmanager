import { useReducer, useState } from "react";
import {
  estadioAtual, renomearEstadio, definirEstiloEstadio, definirFormaEstadio, expandirEstadio,
  definirCorArquibancada, definirCorCobertura, definirCorAcesso, definirGramado,
  aplicarNaming, encerrarNaming, NAMING_OFERTAS, ESTADIO_ESTILOS,
} from "../api/client";
import { Card } from "../components/bits";
import { dinheiro, coresDoClube, numero as fmtN } from "../lib/format";
import EstadioMaquete, { GRAMADOS } from "../components/EstadioMaquete";

const EXPANSOES = [
  { lugares: 3000, custo: 9_000_000 },
  { lugares: 8000, custo: 22_000_000 },
  { lugares: 15000, custo: 40_000_000 },
];
const PALETA_EST = [
  "#c81e28", "#b91c1c", "#7f1d1d", "#ea580c", "#f59e0b", "#facc15",
  "#16a34a", "#166534", "#0f766e", "#0ea5e9", "#1d4ed8", "#1e3a8a",
  "#4c1d95", "#6d28d9", "#be123c", "#ffffff", "#c9ced5", "#8b909a",
  "#4b5058", "#27272a", "#0a0a0a",
];

function CorEst({ label, v, onChange }: { label: string; v: string; onChange: (c: string) => void }) {
  return (
    <div className="kit-cor">
      <span className="kit-cor-lbl">{label}</span>
      <span className="kit-cor-ctrl">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#888888"} onChange={(ev) => onChange(ev.target.value)} />
        <span className="kit-paleta">
          {PALETA_EST.map((c) => (
            <button key={c} className={"kit-chip" + (v.toLowerCase() === c ? " on" : "")} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
          ))}
        </span>
      </span>
    </div>
  );
}

export default function Estadio({ embutido }: { embutido?: boolean } = {}) {
  const [, bump] = useReducer((x) => x + 1, 0);
  const e = estadioAtual();
  const [nome, setNome] = useState(e.nomeProprio);
  const [toast, setToast] = useState<string | null>(null);
  const [a, b] = coresDoClube(e.clubeCores);

  function aviso(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">Infraestrutura · `05` §1/§6</div>
          <h1>{e.nome}</h1>
          <p>Capacidade atual de <b>{fmtN(e.capacidade)}</b> lugares. {e.naming ? `Naming rights com ${e.naming.patrocinador}.` : "Sem contrato de naming rights."}</p>
        </div>
      )}

      {e.emObras && (
        <div className="obra-aviso">
          <span className="obra-ico">🏗️</span>
          <div>
            <b>Estádio em obras.</b> O time manda seus jogos no <b>{e.mandoProvisorio}</b> até a
            conclusão. {e.obras.length} obra{e.obras.length > 1 ? "s" : ""} em andamento — cada uma
            leva cerca de 1 mês.
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "start" }}>
        <Card title="Maquete" hint="visão 3D · arraste p/ girar">
          <EstadioMaquete
            a={a} b={b} capacidade={e.capacidade} estilo={e.estilo} forma={e.forma}
            corArq={e.corArq} corTeto={e.corTeto} corAcesso={e.corAcesso} gramado={e.gramado}
            climaCond={e.clima.cond} climaPeriodo={e.clima.periodo}
          />
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="mini-lbl">Formato</div>
              <div className="chips">
                {(["retangular", "oval"] as const).map((f) => (
                  <button key={f} className={"chip" + (e.forma === f ? " on" : "")} onClick={() => { definirFormaEstadio(f); bump(); }}>
                    {f === "retangular" ? "Retangular" : "Oval"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mini-lbl">Cobertura / setores</div>
              <div className="chips">
                {ESTADIO_ESTILOS.map((s) => (
                  <button key={s.v} className={"chip" + (e.estilo === s.v ? " on" : "")} onClick={() => { definirEstiloEstadio(s.v); bump(); }}>
                    {s.t}{s.cap ? ` (+${fmtN(s.cap)})` : ""}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mini-lbl">Desenho do gramado</div>
              <div className="chips">
                {GRAMADOS.map((g) => (
                  <button key={g.v} className={"chip" + (e.gramado === g.v ? " on" : "")} onClick={() => { definirGramado(g.v); bump(); }}>
                    {g.t}
                  </button>
                ))}
              </div>
            </div>
            <CorEst label="Cor da arquibancada" v={e.corArq} onChange={(c) => { definirCorArquibancada(c); bump(); }} />
            {(e.estilo === "coberto" || e.estilo === "anel") && (
              <CorEst label="Cor da cobertura" v={e.corTeto} onChange={(c) => { definirCorCobertura(c); bump(); }} />
            )}
            <CorEst label="Cor dos acessos (entradas/saídas)" v={e.corAcesso} onChange={(c) => { definirCorAcesso(c); bump(); }} />
          </div>
        </Card>

        <div className="grid" style={{ gap: 16 }}>
          <Card title="Nome do estádio">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={nome}
                onChange={(ev) => setNome(ev.target.value)}
                maxLength={48}
                disabled={!!e.naming}
                style={{ flex: 1, minWidth: 180, font: "inherit", fontSize: 13, padding: "8px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              />
              <button className="btn sm" disabled={!!e.naming || nome.trim() === e.nomeProprio} onClick={() => { renomearEstadio(nome); bump(); aviso("Estádio renomeado."); }}>
                salvar
              </button>
            </div>
            {e.naming && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-soft)" }}>
                Nome definido pelo contrato de naming rights. Nome próprio: <b>{e.nomeProprio}</b>.
              </div>
            )}
          </Card>

          <Card title="Clima" hint="varia a cada rodada">
            <div className="clima-agora">
              <span className="clima-ico">{e.clima.icone}</span>
              <div className="clima-txt">
                <div className="clima-linha1">
                  {e.clima.rotulo} · <b>{e.clima.tempC}°C</b> <span className="clima-tag">{e.clima.sensacao}</span>
                  {e.clima.periodo === "noite" && <span className="clima-tag noite">noite</span>}
                </div>
                <div className="clima-linha2">
                  Vento {e.clima.ventoKmh} km/h · gramado {e.clima.gramado} · próximo jogo em casa (rodada {e.clima.rodada})
                </div>
                <div className="clima-nota">{e.clima.nota}</div>
              </div>
            </div>
            {e.previsao.length > 1 && (
              <div className="clima-prev">
                {e.previsao.map((c) => (
                  <div key={c.rodada} className="clima-prev-item">
                    <span className="cp-r">R{c.rodada}</span>
                    <span className="cp-i">{c.icone}</span>
                    <span className="cp-t">{c.tempC}°</span>
                    <span className="cp-c">{c.rotulo}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Capacidade">
            <div className="stat" style={{ marginBottom: 12 }}>
              <span className="v">{fmtN(e.capacidade)}</span>
              <span className="k">
                lugares — base {fmtN(e.capacidadeBase)}{e.bonusEstilo ? ` · +${fmtN(e.bonusEstilo)} setores` : ""}{e.extra ? ` · +${fmtN(e.extra)} obras` : ""} · máx {fmtN(e.capacidadeMax)}
                {e.emObras ? ` · ${fmtN(e.capacidadeComObras)} após as obras` : ""}
              </span>
            </div>

            {e.obras.length > 0 && (
              <div className="obra-lista">
                {e.obras.map((o, i) => (
                  <div key={i} className="obra-item">
                    <span>🏗️ +{fmtN(o.lugares)} lugares</span>
                    <span className="obra-prazo">
                      conclui em ~1 mês ({new Date(o.prazo + "T00:00:00").toLocaleDateString("pt-BR")}) · {o.faltamRodadas} rodada{o.faltamRodadas === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EXPANSOES.map((x) => {
                const semEspaco = e.comprometido >= e.extraMax;
                return (
                  <button
                    key={x.lugares}
                    className="btn ghost sm"
                    style={{ justifyContent: "space-between" }}
                    disabled={semEspaco}
                    onClick={() => {
                      expandirEstadio(x.lugares, x.custo); bump();
                      aviso(`Obra iniciada: +${fmtN(Math.min(x.lugares, e.extraMax - e.comprometido))} lugares. Prazo ~1 mês — jogos no Estádio Municipal até lá.`);
                    }}
                  >
                    <span>+{fmtN(x.lugares)} lugares</span>
                    <span className="money-neg">{dinheiro(x.custo, true)}</span>
                  </button>
                );
              })}
              {e.comprometido >= e.extraMax && (
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Capacidade máxima de {fmtN(e.capacidadeMax)} lugares atingida.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Naming rights" hint="ofertas na mesa" flush>
        <table className="tbl">
          <thead>
            <tr><th className="l">Patrocinador</th><th className="l">Nome proposto</th><th>Valor / ano</th><th></th></tr>
          </thead>
          <tbody>
            {NAMING_OFERTAS.map((o) => {
              const ativo = e.naming?.patrocinador === o.patrocinador;
              return (
                <tr key={o.patrocinador}>
                  <td className="l name">{o.patrocinador}</td>
                  <td className="l" style={{ color: "var(--ink-soft)" }}>{o.sufixo}</td>
                  <td className="tnum money-pos">{dinheiro(o.valorAno, true)}</td>
                  <td>
                    {ativo ? (
                      <button className="btn ghost sm" onClick={() => { encerrarNaming(); bump(); aviso("Contrato de naming rights encerrado."); }}>encerrar</button>
                    ) : (
                      <button className="btn sm" disabled={!!e.naming} onClick={() => { aplicarNaming(o); bump(); aviso(`Contrato fechado com ${o.patrocinador}.`); }}>aceitar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}

