import { useMemo, useReducer, useState } from "react";
import { Link } from "react-router-dom";
import {
  api, proporCompra, pagarContraproposta, encerrarNeg, chamarParaExames,
  realizarExames, assinarContrato, salarioSugerido,
  type Negociacao, type FaseNeg,
} from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Brasao, PosTag, Loading } from "../components/bits";
import { NomeClube, NomeJogador } from "../components/nomes";
import { dinheiro, tracoLabel, POS_ABREV } from "../lib/format";

const POSICOES = ["GOLEIRO", "ZAGUEIRO", "LATERAL", "VOLANTE", "MEIA", "PONTA", "ATACANTE"];
type Ordem = "overall" | "idade" | "valor";
type Alvo = {
  id: string; nome: string; posicao: string; idade: number; overall: number; valor: number;
  tracos: string[]; clube: { id: string; nome: string; nomeCurto: string; cores: string };
};

interface Filtros {
  texto: string; posicoes: string[]; idadeMin: number; idadeMax: number;
  ovrMin: number; valorMax: number; traco: string; ordem: Ordem;
}
const FILTROS_PADRAO: Filtros = { texto: "", posicoes: [], idadeMin: 16, idadeMax: 40, ovrMin: 0, valorMax: 0, traco: "", ordem: "overall" };

const PASSOS: { k: string; t: string }[] = [
  { k: "proposta", t: "Proposta" },
  { k: "acordo", t: "Acordo" },
  { k: "exames", t: "Exames médicos" },
  { k: "assinatura", t: "Assinatura" },
];
function passoAtual(s: FaseNeg): { idx: number; falhou: boolean } {
  if (s === "proposta" || s === "contraproposta") return { idx: 0, falhou: false };
  if (s === "recusada") return { idx: 0, falhou: true };
  if (s === "aceita") return { idx: 2, falhou: false };
  if (s === "exames") return { idx: 2, falhou: false };
  if (s === "reprovado") return { idx: 2, falhou: true };
  if (s === "aprovado") return { idx: 3, falhou: false };
  return { idx: 4, falhou: false }; // assinado
}

export default function Mercado({ embutido }: { embutido?: boolean } = {}) {
  const [tick, bump] = useReducer((x) => x + 1, 0);
  const { data, carregando } = useAsync(() => api.mercado(), [tick]);
  const [toasts, setToasts] = useState<string[]>([]);
  const [tratadas, setTratadas] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState<Filtros>(FILTROS_PADRAO);
  const [propAlvo, setPropAlvo] = useState<Alvo | null>(null);

  const tracosDisponiveis = useMemo(() => {
    const s = new Set<string>();
    for (const a of (data?.alvos ?? []) as Alvo[]) for (const t of a.tracos) s.add(t);
    return [...s].sort();
  }, [data]);

  const resultados = useMemo(() => {
    if (!data) return [] as Alvo[];
    const q = f.texto.trim().toLowerCase();
    let r = (data.alvos as Alvo[]).filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q) && !a.clube.nomeCurto.toLowerCase().includes(q)) return false;
      if (f.posicoes.length && !f.posicoes.includes(a.posicao)) return false;
      if (a.idade < f.idadeMin || a.idade > f.idadeMax) return false;
      if (a.overall < f.ovrMin) return false;
      if (f.valorMax > 0 && a.valor > f.valorMax * 1_000_000) return false;
      if (f.traco && !a.tracos.includes(f.traco)) return false;
      return true;
    });
    r = r.slice().sort((a, b) =>
      f.ordem === "idade" ? a.idade - b.idade : f.ordem === "valor" ? b.valor - a.valor : b.overall - a.overall);
    return r;
  }, [data, f]);

  if (carregando || !data) return <Loading label="Consultando o mercado…" />;

  const saldo: number = data.saldoCaixa;
  const negs: Negociacao[] = data.negociacoes ?? [];
  const alvoEmNeg = (id: string) => negs.some((n) => n.alvoId === id && !["recusada", "reprovado"].includes(n.status));

  function toast(msg: string) {
    setToasts((t) => [...t, msg]);
    setTimeout(() => setToasts((t) => t.slice(1)), 3800);
  }
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setF((s) => ({ ...s, [k]: v }));
  const togglePos = (p: string) =>
    setF((s) => ({ ...s, posicoes: s.posicoes.includes(p) ? s.posicoes.filter((x) => x !== p) : [...s.posicoes, p] }));
  const nFiltros =
    (f.texto ? 1 : 0) + (f.posicoes.length ? 1 : 0) + (f.idadeMin !== 16 || f.idadeMax !== 40 ? 1 : 0) +
    (f.ovrMin ? 1 : 0) + (f.valorMax ? 1 : 0) + (f.traco ? 1 : 0);

  function acao<T extends { ok: boolean; msg: string }>(r: T) { toast(r.msg); bump(); }

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">Transferências</div>
          <h1>Mercado</h1>
          <p>
            Janela {data.janelaAberta ? "aberta" : "fechada"}
            {data.janelaAberta && <> · fecha em {new Date(data.fecha + "T00:00:00").toLocaleDateString("pt-BR")}</>}.
            {" "}Faça a proposta; se o clube aceitar, o jogador vem fazer exames médicos e assinar.
          </p>
        </div>
      )}

      <div className="mkt-topo">
        <div className="mkt-caixa">
          <span className="mkt-caixa-k">Caixa para negociar</span>
          <span className={"mkt-caixa-v " + (saldo >= 0 ? "money-pos" : "money-neg")}>{dinheiro(saldo, true)}</span>
        </div>
        <button className="btn" onClick={() => setAberto(true)}><span aria-hidden>🔍</span> Buscar jogadores</button>
      </div>

      {/* NEGOCIAÇÕES em andamento */}
      <Card title="Negociações" hint={`${negs.length}`} flush>
        {negs.length === 0 ? (
          <div className="empty">Nenhuma negociação. Use “Buscar jogadores” e faça uma proposta.</div>
        ) : (
          <div className="neg-lista">
            {negs.map((n) => {
              const { idx, falhou } = passoAtual(n.status);
              return (
                <div key={n.id} className={"neg-item" + (n.status === "assinado" ? " ok" : falhou ? " ruim" : "")}>
                  <div className="neg-cab">
                    <div className="neg-jog">
                      <NomeJogador clubeId={n.clube.id} nome={n.jogador.nome} /> <PosTag pos={n.jogador.posicao} />
                      <span className="neg-sub">
                        <Brasao cores={n.clube.cores} size={14} /> <NomeClube id={n.clube.id}>{n.clube.nomeCurto}</NomeClube> · {n.jogador.idade} anos · OVR {n.jogador.overall.toFixed(1)}
                      </span>
                    </div>
                    <div className="neg-num">
                      <div>{dinheiro(n.valor, true)}</div>
                      <div className="neg-num-s">{dinheiro(n.salarioSemanal)}/sem · {n.anos} anos</div>
                    </div>
                  </div>

                  <div className="neg-passos">
                    {PASSOS.map((p, i) => {
                      const done = i < idx || n.status === "assinado";
                      const cur = i === idx && !falhou && n.status !== "assinado";
                      const err = i === idx && falhou;
                      return (
                        <div key={p.k} className={"np" + (done ? " done" : "") + (cur ? " cur" : "") + (err ? " err" : "")}>
                          <span className="np-dot">{done ? "✓" : err ? "✕" : i + 1}</span>
                          <span className="np-t">{p.t}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* estado + ações */}
                  {n.status === "proposta" && <p className="neg-msg">Proposta enviada. Aguardando o <NomeClube id={n.clube.id}>{n.clube.nomeCurto}</NomeClube>…</p>}
                  {n.status === "contraproposta" && (
                    <div className="neg-acao">
                      <p className="neg-msg">O <NomeClube id={n.clube.id}>{n.clube.nomeCurto}</NomeClube> pede <b>{dinheiro(n.contra!, true)}</b> pelo jogador.</p>
                      <button className="btn sm" disabled={(n.contra ?? 0) > saldo} onClick={() => acao(pagarContraproposta(n.id))}>
                        Pagar {dinheiro(n.contra!, true)}
                      </button>
                      <button className="btn ghost sm" onClick={() => { encerrarNeg(n.id); bump(); toast("Negociação encerrada."); }}>Desistir</button>
                    </div>
                  )}
                  {n.status === "recusada" && <p className="neg-msg ruim">{n.motivo || "Proposta recusada."}</p>}
                  {n.status === "aceita" && (
                    <div className="neg-acao">
                      <p className="neg-msg boa">Acordo fechado! Traga <NomeJogador clubeId={n.clube.id} nome={n.jogador.nome} /> ao CT para os exames.</p>
                      <button className="btn sm" onClick={() => { chamarParaExames(n.id); bump(); toast(`${n.jogador.nome} a caminho do CT.`); }}>
                        🩺 Chamar para exames médicos
                      </button>
                    </div>
                  )}
                  {n.status === "exames" && (
                    <div className="neg-acao">
                      <p className="neg-msg"><NomeJogador clubeId={n.clube.id} nome={n.jogador.nome} /> está no CT para a bateria de exames.</p>
                      <button className="btn sm" onClick={() => { const e = realizarExames(n.id); bump(); toast(e.ok ? `${n.jogador.nome} passou nos exames.` : `${n.jogador.nome} reprovado nos exames.`); }}>
                        Realizar exames
                      </button>
                    </div>
                  )}
                  {(n.status === "aprovado" || n.status === "reprovado") && n.exame && (
                    <div className={"neg-exame " + (n.exame.ok ? "ok" : "ruim")}>
                      {n.exame.ok ? (
                        <>
                          <div className="ne-grid">
                            <span>Físico</span><b>{n.exame.fisico}/10</b>
                            <span>% gordura</span><b>{n.exame.gordura}</b>
                            <span>Cardio</span><b>{n.exame.cardio}</b>
                            <span>Imagem</span><b>{n.exame.imagem}</b>
                          </div>
                          <p className="neg-msg boa">{n.exame.nota}</p>
                          <button className="btn sm" disabled={n.valor > saldo} onClick={() => acao(assinarContrato(n.id))}>
                            ✍️ Assinar contrato — {dinheiro(n.valor, true)}
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="neg-msg ruim">{n.exame.motivo}</p>
                          <p className="neg-msg">Negócio cancelado. O jogador não assinará.</p>
                        </>
                      )}
                    </div>
                  )}
                  {n.status === "assinado" && (
                    <p className="neg-msg boa">
                      ✅ <NomeJogador nome={n.jogador.nome} /> assinou por {n.anos} anos e já faz parte do elenco. <Link to="/elenco" className="linkish">ver elenco →</Link>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Propostas recebidas" hint="clubes atrás dos seus jogadores" flush>
        {data.propostasRecebidas.length === 0 ? (
          <div className="empty">Nenhuma proposta na sua mesa.</div>
        ) : data.propostasRecebidas.map((p) => (
          <div key={p.id} className="mkt-prop">
            <div>
              <div style={{ fontWeight: 600 }}><NomeJogador nome={p.jogador.nome} /> <PosTag pos={p.jogador.posicao} /></div>
              <div className="mkt-prop-s">
                <Brasao cores={p.clube.cores} size={15} /> <NomeClube id={p.clube.id}>{p.clube.nomeCurto}</NomeClube> oferece <b className="tnum">{dinheiro(p.valor, true)}</b>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {tratadas[p.id] ? <span className="pill">{tratadas[p.id]}</span> : (
                <>
                  <button className="btn sm" onClick={() => { setTratadas((t) => ({ ...t, [p.id]: "aceita" })); toast(`Proposta por ${p.jogador.nome} aceita.`); }}>Aceitar</button>
                  <button className="btn ghost sm" onClick={() => { setTratadas((t) => ({ ...t, [p.id]: "recusada" })); toast(`Proposta por ${p.jogador.nome} recusada.`); }}>Recusar</button>
                </>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* MODAL — busca */}
      {aberto && (
        <div className="modal-bg" onClick={() => setAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Buscar jogadores">
            <div className="modal-h">
              <h3>🔍 Buscar jogadores</h3>
              <button className="modal-x" onClick={() => setAberto(false)} aria-label="Fechar">✕</button>
            </div>
            <div className="modal-filtros">
              <label className="fl full"><span>Nome ou clube</span>
                <input value={f.texto} onChange={(e) => set("texto", e.target.value)} placeholder="digite para filtrar…" /></label>
              <div className="fl full"><span>Posição</span>
                <div className="chips">
                  {POSICOES.map((p) => (
                    <button key={p} className={"chip" + (f.posicoes.includes(p) ? " on" : "")} onClick={() => togglePos(p)}>{POS_ABREV[p]}</button>
                  ))}
                </div>
              </div>
              <label className="fl"><span>Idade</span>
                <div className="dois">
                  <input type="number" min={16} max={40} value={f.idadeMin} onChange={(e) => set("idadeMin", +e.target.value || 16)} />
                  <em>até</em>
                  <input type="number" min={16} max={40} value={f.idadeMax} onChange={(e) => set("idadeMax", +e.target.value || 40)} />
                </div>
              </label>
              <label className="fl"><span>OVR mínimo</span>
                <input type="number" min={0} max={20} step={0.5} value={f.ovrMin} onChange={(e) => set("ovrMin", +e.target.value || 0)} /></label>
              <label className="fl"><span>Valor máx. (R$ mi)</span>
                <input type="number" min={0} step={0.5} value={f.valorMax || ""} placeholder="sem teto" onChange={(e) => set("valorMax", +e.target.value || 0)} /></label>
              <label className="fl"><span>Traço</span>
                <select value={f.traco} onChange={(e) => set("traco", e.target.value)}>
                  <option value="">qualquer</option>
                  {tracosDisponiveis.map((t) => <option key={t} value={t}>{tracoLabel(t)}</option>)}
                </select>
              </label>
              <label className="fl"><span>Ordenar por</span>
                <select value={f.ordem} onChange={(e) => set("ordem", e.target.value as Ordem)}>
                  <option value="overall">OVR (maior)</option>
                  <option value="valor">Valor (maior)</option>
                  <option value="idade">Idade (menor)</option>
                </select>
              </label>
            </div>
            <div className="modal-res">
              {resultados.length === 0 ? <div className="empty">Nenhum jogador com esses filtros.</div> : (
                <table className="tbl">
                  <thead>
                    <tr><th className="l">Jogador</th><th>Pos</th><th>Idade</th><th>OVR</th><th className="l">Clube</th><th>Valor</th><th></th></tr>
                  </thead>
                  <tbody>
                    {resultados.map((a) => (
                      <tr key={a.id}>
                        <td className="l name">
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <NomeJogador clubeId={a.clube.id} nome={a.nome} />{a.tracos.map((t) => <span key={t} className="pill">{tracoLabel(t)}</span>)}
                          </span>
                        </td>
                        <td><PosTag pos={a.posicao} /></td>
                        <td className="tnum">{a.idade}</td>
                        <td className="tnum" style={{ fontWeight: 700 }}>{a.overall.toFixed(1)}</td>
                        <td className="l" style={{ color: "var(--ink-soft)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Brasao cores={a.clube.cores} size={16} /> <NomeClube id={a.clube.id}>{a.clube.nomeCurto}</NomeClube></span>
                        </td>
                        <td className="tnum">{dinheiro(a.valor, true)}</td>
                        <td>
                          <button className="btn ghost sm" disabled={alvoEmNeg(a.id)}
                            onClick={() => { setPropAlvo(a); setAberto(false); }}>
                            {alvoEmNeg(a.id) ? "em negociação" : "Propor"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-f">
              <span>{resultados.length} jogador(es){nFiltros > 0 && ` · ${nFiltros} filtro(s)`}</span>
              <button className="linkish" onClick={() => setF(FILTROS_PADRAO)}>limpar filtros</button>
              <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => setAberto(false)}>fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — proposta */}
      {propAlvo && (
        <ModalProposta
          alvo={propAlvo} saldo={saldo}
          onFechar={() => setPropAlvo(null)}
          onEnviar={(v, sal, anos) => { acao(proporCompra(propAlvo.id, v, sal, anos)); setPropAlvo(null); }}
        />
      )}

      <div className="toast-wrap">{toasts.map((t, i) => <div className="toast" key={i}>{t}</div>)}</div>
    </>
  );
}

function ModalProposta({
  alvo, saldo, onFechar, onEnviar,
}: { alvo: Alvo; saldo: number; onFechar: () => void; onEnviar: (v: number, sal: number, anos: number) => void }) {
  const [valor, setValor] = useState(Math.round(alvo.valor));
  const [salMexeu, setSalMexeu] = useState(false);
  const [sal, setSal] = useState(salarioSugerido(alvo.valor));
  const [anos, setAnos] = useState(3);
  const salFinal = salMexeu ? sal : salarioSugerido(valor);
  const acima = valor > saldo;

  return (
    <div className="modal-bg" onClick={onFechar}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Nova proposta">
        <div className="modal-h">
          <h3>Proposta por <NomeJogador clubeId={alvo.clube.id} nome={alvo.nome} isolar /></h3>
          <button className="modal-x" onClick={onFechar} aria-label="Fechar">✕</button>
        </div>
        <div className="prop-alvo">
          <PosTag pos={alvo.posicao} />
          <span><Brasao cores={alvo.clube.cores} size={15} /> <NomeClube id={alvo.clube.id} isolar>{alvo.clube.nomeCurto}</NomeClube></span>
          <span>{alvo.idade} anos</span>
          <span>OVR <b>{alvo.overall.toFixed(1)}</b></span>
          <span>valor de mercado <b>{dinheiro(alvo.valor, true)}</b></span>
        </div>
        <div className="modal-filtros">
          <label className="fl full">
            <span>Valor da proposta (R$)</span>
            <input type="number" min={0} step={100000} value={valor}
              onChange={(e) => setValor(Math.max(0, +e.target.value || 0))} />
          </label>
          <label className="fl">
            <span>Salário semanal (R$)</span>
            <input type="number" min={0} step={500} value={Math.round(salFinal)}
              onChange={(e) => { setSalMexeu(true); setSal(Math.max(0, +e.target.value || 0)); }} />
          </label>
          <label className="fl">
            <span>Contrato</span>
            <select value={anos} onChange={(e) => setAnos(+e.target.value)}>
              {[1, 2, 3, 4, 5].map((a) => <option key={a} value={a}>{a} {a === 1 ? "ano" : "anos"}</option>)}
            </select>
          </label>
        </div>
        <p className={"prop-caixa" + (acima ? " ruim" : "")}>
          Caixa disponível: <b>{dinheiro(saldo, true)}</b>. {acima && "A proposta passa do seu caixa."}
        </p>
        <div className="modal-f">
          <button className="linkish" onClick={() => setValor(Math.round(alvo.valor))}>usar valor de mercado</button>
          <button className="btn sm" style={{ marginLeft: "auto" }} disabled={acima || valor <= 0}
            onClick={() => onEnviar(valor, salFinal, anos)}>
            Enviar proposta
          </button>
        </div>
      </div>
    </div>
  );
}
