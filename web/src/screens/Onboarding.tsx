import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { perfilPadrao, salvarPerfil, type Perfil } from "../api/client";
import { Camiseta } from "../components/bits";
import { EstadioArte } from "../components/EstadioArte";
import { LogoLiga } from "../components/LogoLiga";
import { EscudoUploader } from "../components/EscudoUploader";

const CORES_SUGERIDAS = ["#7f1d1d", "#000000", "#1e3a8a", "#0f766e", "#166534", "#a16207", "#6d28d9", "#be123c", "#0369a1", "#ffffff"];

export default function Onboarding() {
  const nav = useNavigate();
  const base = perfilPadrao();
  const [p, setP] = useState<Perfil>(base);
  const [nCores, setNCores] = useState(2);

  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setP((s) => ({ ...s, [k]: v }));
  const setCor = (i: number, v: string) => setP((s) => ({ ...s, cores: s.cores.map((c, j) => (j === i ? v : c)) }));

  function comecar() {
    const cores = p.cores.slice(0, nCores).filter(Boolean);
    if (cores.length < 2) cores.push("#ffffff");
    salvarPerfil({
      manager: p.manager.trim() || "Você",
      clube: p.clube.trim() || base.clube,
      clubeCurto: (p.clubeCurto.trim() || p.clube.trim() || base.clubeCurto).slice(0, 28),
      cores,
      estadio: p.estadio.trim() || base.estadio,
      cidade: p.cidade.trim() || base.cidade,
    });
    nav("/patrocinios", { replace: true });
  }

  const preview = p.cores.slice(0, 2).join("/");

  return (
    <div className="onb">
      <EstadioArte className="entrada-cena" />
      <div className="entrada-veu" />
      <div className="onb-box">
        <div className="onb-head">
          <LogoLiga size={38} />
          <div>
            <h1>Antes de começar</h1>
            <p>Você assumiu um clube da Liga Nacional. Ajuste o que quiser — dá pra mudar depois.</p>
          </div>
        </div>

        <div className="onb-grid">
          <label className="fl">
            <span>Seu nome (manager)</span>
            <input value={p.manager} onChange={(e) => set("manager", e.target.value)} placeholder="ex.: Renato Portaluppi" />
          </label>

          <label className="fl">
            <span>Nome do clube</span>
            <input value={p.clube} onChange={(e) => set("clube", e.target.value)} />
          </label>
          <label className="fl">
            <span>Nome curto (tabelas)</span>
            <input value={p.clubeCurto} onChange={(e) => set("clubeCurto", e.target.value)} maxLength={28} />
          </label>
          <label className="fl">
            <span>Cidade</span>
            <input value={p.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </label>

          <div className="fl full">
            <span>Quantas cores</span>
            <div className="chips">
              {[2, 3].map((n) => (
                <button key={n} className={"chip" + (nCores === n ? " on" : "")} onClick={() => setNCores(n)}>
                  {n} cores
                </button>
              ))}
            </div>
          </div>

          <div className="fl full">
            <span>Quais cores</span>
            <div className="onb-cores">
              {Array.from({ length: nCores }).map((_, i) => (
                <div key={i} className="cor-pick">
                  <input type="color" value={p.cores[i] || "#ffffff"} onChange={(e) => setCor(i, e.target.value)} />
                  <div className="paleta">
                    {CORES_SUGERIDAS.map((c) => (
                      <button key={c} style={{ background: c }} onClick={() => setCor(i, c)} title={c} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="onb-preview">
                <Camiseta cores={preview} numero={10} size={64} />
                <div
                  className="club-banner"
                  style={{ ["--c1" as string]: p.cores[0], ["--c2" as string]: p.cores[1] } as React.CSSProperties}
                >
                  <span>{p.clubeCurto || p.clube}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="fl full">
            <span>Escudo do clube (opcional)</span>
            <EscudoUploader cores={p.cores.slice(0, 2).join("/")} size={80} />
          </div>

          <label className="fl full">
            <span>Nome do estádio</span>
            <input value={p.estadio} onChange={(e) => set("estadio", e.target.value)} placeholder="ex.: Arena das Dunas" />
          </label>
        </div>

        <div className="onb-foot">
          <button className="btn" onClick={comecar}>Escolher patrocinadores →</button>
        </div>
      </div>
    </div>
  );
}
