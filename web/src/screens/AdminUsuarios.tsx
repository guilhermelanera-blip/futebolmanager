import { useEffect, useReducer, useState } from "react";
import {
  api,
  adminToggleInscricoes, adminGerarConvite, adminRevogarConvite, adminUsarConvite,
  adminEntrarNaFila, adminSairDaFila, adminAtribuirClube, adminLiberarClube,
  adminRemoverJogador, adminDefinirStatus, adminResetPainel,
  type StatusJogadorLiga,
} from "../api/client";
import { useAsync } from "../lib/useAsync";
import { Card, Brasao, Loading } from "../components/bits";
import { NomeClube } from "../components/nomes";
import { dataCurta } from "../lib/format";

type Vw = Awaited<ReturnType<typeof api.adminUsuarios>>;
type Slot = Vw["slots"][number];

const STATUS_ROT: Record<StatusJogadorLiga, string> = { ativo: "Ativo", inativo: "Inativo", ia: "Gestão IA" };

function useTick() {
  const [, bump] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    window.addEventListener("fm:tick", bump);
    return () => window.removeEventListener("fm:tick", bump);
  }, []);
}

export default function AdminUsuarios() {
  useTick();
  const [tick, force] = useReducer((x) => x + 1, 0);
  const { data, carregando } = useAsync(() => api.adminUsuarios(), [tick]);
  const [modal, setModal] = useState<{ clubeId: string; atual: string | null } | null>(null);
  const [novoConvite, setNovoConvite] = useState<string | null>(null);

  if (carregando || !data) return <Loading label="Abrindo o painel do master…" />;
  if (!data.ehMaster) return <div className="empty">Só o master da liga acessa este painel.</div>;

  const d = data as Vw;
  const recarrega = () => force();

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Painel do master</div>
        <h1>Usuários da liga</h1>
        <p>As 20 vagas de presidente, os convites e a fila de espera. Clube sem presidente humano roda no automático (IA).</p>
      </div>

      {/* resumo */}
      <div className="adm-resumo">
        <div className="adm-tile"><span className="adm-num">{d.resumo.humanos}<i>/20</i></span><span className="adm-lbl">presidentes</span></div>
        <div className="adm-tile"><span className="adm-num">{d.resumo.vagas}</span><span className="adm-lbl">vagas (IA)</span></div>
        <div className="adm-tile"><span className="adm-num">{d.resumo.inativos}</span><span className="adm-lbl">inativos</span></div>
        <div className="adm-tile"><span className="adm-num">{d.resumo.fila}</span><span className="adm-lbl">na fila</span></div>
        <div className="adm-tile wide">
          <span className="adm-lbl">Inscrições</span>
          <button
            className={"adm-toggle" + (d.inscricoesAbertas ? " on" : "")}
            onClick={() => { adminToggleInscricoes(); recarrega(); }}
          >
            {d.inscricoesAbertas ? "abertas" : "fechadas"}
          </button>
          <span className="adm-hint">{d.calendarioComecou ? `calendário começou (rodada ${d.rodada})` : "calendário não começou"}</span>
        </div>
      </div>

      {/* convites */}
      <div style={{ marginTop: 16 }}>
        <Card
          title="Convites"
          flush
          right={
            <button className="btn sm" onClick={() => setNovoConvite(adminGerarConvite())}>
              Gerar convite
            </button>
          }
        >
          {novoConvite && (
            <div className="adm-novo">
              Novo código: <code>{novoConvite}</code> — mande pro amigo junto com o link do jogo.
            </div>
          )}
          <div className="adm-lista">
            {d.convites.length === 0 && <div className="empty">Nenhum convite ativo.</div>}
            {d.convites.map((c) => (
              <div key={c.codigo} className={"adm-conv" + (c.usadoPor ? " usado" : "")}>
                <code className="adm-cod">{c.codigo}</code>
                <span className="adm-conv-meio">
                  {c.usadoPor ? <>usado por <b>{c.usadoPor}</b></> : "livre"}
                  {c.clubeAlvo && <span className="adm-conv-alvo">→ {c.clubeAlvo}</span>}
                  <span className="adm-conv-data">{dataCurta(c.criadoEm)}</span>
                </span>
                <span className="adm-conv-acoes">
                  <button className="linkish" onClick={() => navigator.clipboard?.writeText(c.codigo)}>copiar</button>
                  <button className="linkish" onClick={() => { adminRevogarConvite(c.codigo); recarrega(); }}>revogar</button>
                </span>
              </div>
            ))}
          </div>
          <SimularEntrada onFeito={recarrega} />
        </Card>
      </div>

      {/* fila de espera */}
      <div style={{ marginTop: 16 }}>
        <Card title="Fila de espera" flush hint={`${d.fila.length} aguardando`}>
          <div className="adm-lista">
            {d.fila.length === 0 && <div className="empty">Ninguém na fila.</div>}
            {d.fila.map((f) => (
              <div key={f.email} className="adm-fila">
                <div>
                  <b>{f.nome}</b>
                  <span className="adm-sub">{f.email || "sem e-mail"} · desde {dataCurta(f.desde)}</span>
                </div>
                <span className="adm-fila-acoes">
                  <button
                    className="btn sm"
                    disabled={d.clubesLivres.length === 0}
                    onClick={() => setModal({ clubeId: d.clubesLivres[0]?.id ?? "", atual: null })}
                  >
                    dar um clube
                  </button>
                  <button className="linkish" onClick={() => { adminSairDaFila(f.email); recarrega(); }}>remover</button>
                </span>
              </div>
            ))}
          </div>
          <AdicionarNaFila onFeito={recarrega} />
        </Card>
      </div>

      {/* os 20 clubes */}
      <div style={{ marginTop: 16 }}>
        <Card title="Os 20 clubes" flush hint="presidente e situação de cada vaga">
          <div className="adm-slots">
            {d.slots.map((s) => (
              <SlotLinha key={s.clubeId} s={s} onModal={(atual) => setModal({ clubeId: s.clubeId, atual })} onFeito={recarrega} />
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="linkish" onClick={() => { if (confirm("Recriar o painel do zero (dados de exemplo)?")) { adminResetPainel(); recarrega(); } }}>
          recriar painel de exemplo
        </button>
      </div>

      {modal && (
        <ModalAtribuir
          clubeIdInicial={modal.clubeId}
          jogadorAtual={modal.atual}
          livres={modal.atual ? [...d.clubesLivres, { id: modal.clubeId, nome: nomeDoClube(d, modal.clubeId) }] : d.clubesLivres}
          fila={d.fila}
          semClube={d.semClube}
          onFechar={() => setModal(null)}
          onConfirmar={(quem, clubeId) => {
            const r = adminAtribuirClube(quem, clubeId);
            if (!r.ok) { alert(r.msg); return; }
            setModal(null);
            recarrega();
          }}
        />
      )}
    </>
  );
}

function nomeDoClube(d: Vw, clubeId: string) {
  return d.slots.find((s) => s.clubeId === clubeId)?.nome ?? clubeId;
}

function SlotLinha({ s, onModal, onFeito }: { s: Slot; onModal: (atual: string | null) => void; onFeito: () => void }) {
  const dono = s.dono;
  const chip =
    s.gestao === "humano" ? <span className="adm-chip ok">Ativo</span>
      : s.gestao === "inativo" ? <span className="adm-chip warn">Inativo · {dono?.diasInativo}d</span>
        : <span className="adm-chip ia">{dono ? "Gestão IA · inatividade" : "IA · sem presidente"}</span>;

  return (
    <div className={"adm-slot" + (s.ehMeu ? " meu" : "")}>
      <Brasao cores={s.cores} size={26} id={s.clubeId} />
      <div className="adm-slot-id">
        {s.ehMeu ? <b>{s.nome}</b> : <NomeClube id={s.clubeId}>{s.nome}</NomeClube>}
        <span className="adm-sub">{s.cidade}</span>
      </div>
      <div className="adm-slot-dono">
        {dono ? (
          <>
            <b>{dono.nome}{dono.ehMaster && <span className="adm-tag-master">master</span>}</b>
            <span className="adm-sub">{dono.email}</span>
          </>
        ) : (
          <span className="adm-sub">sem presidente humano</span>
        )}
      </div>
      {chip}
      <div className="adm-slot-acoes">
        {dono?.ehMaster ? (
          <span className="adm-sub">você</span>
        ) : dono ? (
          <>
            {s.gestao !== "humano" && (
              <button className="linkish" onClick={() => { adminDefinirStatus(dono.id, "ativo"); onFeito(); }}>reativar</button>
            )}
            {s.gestao === "humano" && (
              <button className="linkish" onClick={() => { adminDefinirStatus(dono.id, "ia" as StatusJogadorLiga); onFeito(); }}>passar p/ IA</button>
            )}
            <button className="linkish" onClick={() => onModal(dono.id)}>trocar clube</button>
            <button className="linkish danger" onClick={() => { if (confirm(`Tirar ${dono.nome} de ${s.nome}? O clube volta pra IA.`)) { adminLiberarClube(dono.id); onFeito(); } }}>tirar</button>
            <button className="linkish danger" onClick={() => { if (confirm(`Remover ${dono.nome} da liga?`)) { adminRemoverJogador(dono.id); onFeito(); } }}>remover</button>
          </>
        ) : (
          <button className="btn sm" onClick={() => onModal(null)}>atribuir presidente</button>
        )}
      </div>
    </div>
  );
}

function SimularEntrada({ onFeito }: { onFeito: () => void }) {
  const [cod, setCod] = useState("");
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="adm-mini"
      onSubmit={(e) => {
        e.preventDefault();
        const r = adminUsarConvite(cod, nome, "");
        setMsg(r.msg);
        if (r.ok) { setCod(""); setNome(""); onFeito(); }
      }}
    >
      <span className="adm-mini-t">Testar convite</span>
      <input placeholder="código" value={cod} onChange={(e) => setCod(e.target.value)} />
      <input placeholder="nome do amigo" value={nome} onChange={(e) => setNome(e.target.value)} />
      <button className="btn sm" disabled={!cod.trim() || !nome.trim()}>entrar</button>
      {msg && <span className="adm-mini-msg">{msg}</span>}
    </form>
  );
}

function AdicionarNaFila({ onFeito }: { onFeito: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form
      className="adm-mini"
      onSubmit={(e) => {
        e.preventDefault();
        adminEntrarNaFila(nome, email);
        setNome(""); setEmail("");
        onFeito();
      }}
    >
      <span className="adm-mini-t">Adicionar à fila</span>
      <input placeholder="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <input placeholder="e-mail (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn sm" disabled={!nome.trim()}>adicionar</button>
    </form>
  );
}

function ModalAtribuir({
  clubeIdInicial, jogadorAtual, livres, fila, semClube, onFechar, onConfirmar,
}: {
  clubeIdInicial: string;
  jogadorAtual: string | null;
  livres: { id: string; nome: string }[];
  fila: { nome: string; email: string }[];
  semClube: { id: string; nome: string; email: string }[];
  onFechar: () => void;
  onConfirmar: (quem: { jogadorId?: string; nome?: string; email?: string }, clubeId: string) => void;
}) {
  const [clubeId, setClubeId] = useState(clubeIdInicial);
  const trocando = !!jogadorAtual;
  const candidatos = [
    ...semClube.map((p) => ({ tipo: "j" as const, id: p.id, nome: p.nome, email: p.email })),
    ...fila.map((p) => ({ tipo: "f" as const, id: p.email, nome: p.nome, email: p.email })),
  ];
  const [quemSel, setQuemSel] = useState<string>(trocando ? "atual" : candidatos[0] ? candidatos[0].tipo + ":" + candidatos[0].id : "novo");
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

  function confirmar() {
    if (!clubeId) return;
    if (trocando && quemSel === "atual") { onConfirmar({ jogadorId: jogadorAtual! }, clubeId); return; }
    if (quemSel === "novo") { onConfirmar({ nome: novoNome, email: novoEmail }, clubeId); return; }
    const [tipo, id] = quemSel.split(/:(.*)/);
    if (tipo === "j") onConfirmar({ jogadorId: id }, clubeId);
    else onConfirmar({ email: id, nome: fila.find((f) => f.email === id)?.nome }, clubeId);
  }

  return (
    <div className="modal-bg" onClick={onFechar}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <h3>{trocando ? "Trocar de clube" : "Atribuir presidente"}</h3>

        <label className="adm-campo">
          <span>Clube</span>
          <select value={clubeId} onChange={(e) => setClubeId(e.target.value)}>
            {livres.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>

        <label className="adm-campo">
          <span>Quem assume</span>
          <select value={quemSel} onChange={(e) => setQuemSel(e.target.value)}>
            {trocando && <option value="atual">manter o presidente atual (só muda o clube)</option>}
            {candidatos.map((c) => (
              <option key={c.tipo + ":" + c.id} value={c.tipo + ":" + c.id}>
                {c.nome} {c.tipo === "f" ? "(fila)" : "(sem clube)"}
              </option>
            ))}
            <option value="novo">novo presidente…</option>
          </select>
        </label>

        {quemSel === "novo" && (
          <div className="adm-campo-dois">
            <input placeholder="nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            <input placeholder="e-mail" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
          </div>
        )}

        <div className="modal-acoes">
          <button className="btn ghost" onClick={onFechar}>cancelar</button>
          <button className="btn" onClick={confirmar} disabled={quemSel === "novo" && !novoNome.trim()}>confirmar</button>
        </div>
      </div>
    </div>
  );
}
