import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PATROCINADORES, PATROCINIO_SLOTS, CAT_PATRO, iniciaisMarca,
  patrociniosSalvos, salvarPatrocinios,
  type Patrocinador, type SlotPatro, type PatrociniosStore,
} from "../api/client";
import { dinheiro } from "../lib/format";
import { EstadioArte } from "../components/EstadioArte";

function Logo({ p, size = 46 }: { p: Patrocinador; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" aria-hidden style={{ flex: "none" }}>
      <rect x="1" y="1" width="44" height="44" rx="10" fill={p.cor1} />
      <rect x="1" y="1" width="44" height="44" rx="10" fill="none" stroke="rgba(255,255,255,.14)" />
      <text x="23" y="27" textAnchor="middle" fontSize="17" fontWeight="800" fill={p.cor2}
        fontFamily="Archivo, system-ui, sans-serif" letterSpacing="-.5">{iniciaisMarca(p.nome)}</text>
      <rect x="14" y="33" width="18" height="3" rx="1.5" fill={p.cor2} opacity="0.85" />
    </svg>
  );
}

export default function EscolherPatrocinios() {
  const nav = useNavigate();
  const [sel, setSel] = useState<PatrociniosStore>(() => patrociniosSalvos());
  const [aba, setAba] = useState<SlotPatro>("camisa");

  const slot = PATROCINIO_SLOTS.find((s) => s.v === aba)!;
  const usados = useMemo(() => {
    const m = new Map<string, SlotPatro>();
    (Object.keys(sel) as SlotPatro[]).forEach((k) => { if (sel[k]) m.set(sel[k]!, k); });
    return m;
  }, [sel]);

  const completo = PATROCINIO_SLOTS.every((s) => sel[s.v]);
  const totalAno = PATROCINIO_SLOTS.reduce((t, s) => {
    const p = PATROCINADORES.find((x) => x.id === sel[s.v]);
    return t + (p ? Math.round(p.valorAno * s.mult) : 0);
  }, 0);

  function escolher(id: string) {
    setSel((s) => {
      const next = { ...s };
      // se a marca já está em outro espaço, tira de lá (não pode repetir)
      (Object.keys(next) as SlotPatro[]).forEach((k) => { if (next[k] === id && k !== aba) next[k] = null; });
      next[aba] = next[aba] === id ? null : id;
      return next;
    });
  }

  function fechar() {
    if (!completo) return;
    salvarPatrocinios(sel);
    nav("/", { replace: true });
  }

  return (
    <div className="onb">
      <EstadioArte className="entrada-cena" />
      <div className="entrada-veu" />
      <div className="onb-box pat-box">
        <div className="onb-head">
          <span className="mark">$</span>
          <div>
            <h1>Acordos de patrocínio</h1>
            <p>Feche uma marca para cada espaço do uniforme. As cotas entram como receita mensal.</p>
          </div>
        </div>

        {/* resumo dos 4 espaços */}
        <div className="pat-resumo">
          {PATROCINIO_SLOTS.map((s) => {
            const p = PATROCINADORES.find((x) => x.id === sel[s.v]) || null;
            return (
              <button
                key={s.v}
                className={"pat-slot" + (aba === s.v ? " on" : "") + (p ? " ok" : "")}
                onClick={() => setAba(s.v)}
              >
                <span className="pat-slot-t">{s.t}</span>
                {p ? (
                  <span className="pat-slot-p"><Logo p={p} size={22} />{p.nome}</span>
                ) : (
                  <span className="pat-slot-vazio">escolher…</span>
                )}
              </button>
            );
          })}
        </div>

        {/* grade de marcas para o espaço ativo */}
        <div className="pat-grid">
          {PATROCINADORES.map((p) => {
            const emOutro = usados.get(p.id);
            const bloqueado = !!emOutro && emOutro !== aba;
            const ativo = sel[aba] === p.id;
            return (
              <button
                key={p.id}
                className={"pat-card" + (ativo ? " on" : "") + (bloqueado ? " off" : "")}
                onClick={() => !bloqueado && escolher(p.id)}
                disabled={bloqueado}
                title={bloqueado ? `Já usada em ${PATROCINIO_SLOTS.find((s) => s.v === emOutro)!.t}` : p.slogan}
              >
                <Logo p={p} />
                <span className="pat-card-info">
                  <span className="pat-card-nome">{p.nome}</span>
                  <span className="pat-card-cat">{CAT_PATRO[p.cat]}</span>
                  <span className="pat-card-val">{dinheiro(Math.round(p.valorAno * slot.mult), true)}/ano</span>
                </span>
                {bloqueado && <span className="pat-card-flag">em {PATROCINIO_SLOTS.find((s) => s.v === emOutro)!.t}</span>}
                {ativo && <span className="pat-card-check">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="onb-foot pat-foot">
          <div className="pat-total">
            Receita anual em patrocínios<b>{dinheiro(totalAno, true)}</b>
          </div>
          <button className="btn" disabled={!completo} onClick={fechar}>
            {completo ? "Fechar acordos →" : `Falta escolher ${PATROCINIO_SLOTS.filter((s) => !sel[s.v]).length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
