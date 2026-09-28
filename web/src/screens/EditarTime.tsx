import { useMemo, useState } from "react";
import { kitsSalvos, salvarKits, confirmarKitsTemporada, podeEditarKits, TEMPORADA_ATUAL, snapshot } from "../api/client";
import { Card } from "../components/bits";
import { EscudoUploader } from "../components/EscudoUploader";
import { Camisa, Calcao, Meiao, KitFolha } from "../components/Uniforme";
import {
  PADROES_CAMISA, PADROES_CALCAO, PADROES_MEIAO, GOLAS, MANGAS, FONTES, PALETA, PRESETS, TIPOS, PECAS, contraste,
  type Camisa as TCamisa, type Calcao as TCalcao, type Meiao as TMeiao, type Kit, type Kits, type TipoKit, type Peca,
} from "../lib/uniforme";

export default function EditarTime({ embutido }: { embutido?: boolean } = {}) {
  const inicial = useMemo(() => kitsSalvos(), []);
  const [kits, setKits] = useState<Kits>(inicial.kits);
  const [aba, setAba] = useState<TipoKit>("casa");
  const [peca, setPeca] = useState<Peca>("camisa");
  const [confirmando, setConfirmando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const editavel = podeEditarKits();

  const kit = kits[aba];
  const rotuloKit = TIPOS.find((t) => t.v === aba)!.t;
  const rotuloPeca = PECAS.find((p) => p.v === peca)!.t;
  const numeroPreview = aba === "goleiro" ? 1 : 10;

  function aviso(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }
  function gravar(novo: Kits) {
    setKits(novo);
    salvarKits(novo);
  }
  function setCamisa(patch: Partial<TCamisa>) {
    gravar({ ...kits, [aba]: { ...kit, camisa: { ...kit.camisa, ...patch } } });
  }
  function setCalcao(patch: Partial<TCalcao>) {
    gravar({ ...kits, [aba]: { ...kit, calcao: { ...kit.calcao, ...patch } } });
  }
  function setMeiao(patch: Partial<TMeiao>) {
    gravar({ ...kits, [aba]: { ...kit, meiao: { ...kit.meiao, ...patch } } });
  }
  function copiarDaCasa() {
    gravar({ ...kits, [aba]: { ...kit, [peca]: kits.casa[peca] } });
    aviso(`${rotuloPeca} da casa copiada.`);
  }
  function confirmar() {
    confirmarKitsTemporada(kits);
    setConfirmando(false);
    aviso("Uniformes confirmados para a temporada.");
  }

  return (
    <>
      {!embutido && (
        <div className="page-head">
          <div className="eyebrow">Identidade do clube · Temporada {TEMPORADA_ATUAL}</div>
          <h1>Editar time</h1>
          <p>Desenhe camisa, calção e meião — cada peça com padrão e cores próprios. Edição liberada <b>uma vez por temporada</b>, no começo; depois de confirmar, reabre só na próxima. O goleiro sempre veste a <b>camisa 1</b>.</p>
        </div>
      )}

      {!editavel && (
        <div className="kit-lock">
          <span className="pill">🔒 confirmado</span>
          <span>Os uniformes da Temporada {TEMPORADA_ATUAL} já foram confirmados. A edição reabre no início da próxima temporada.</span>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Card title="Escudo do clube" hint="aparece em todo o app">
          <EscudoUploader cores={snapshot.clube.cores} size={104} />
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "12px 0 0" }}>
            Envie a imagem do escudo do seu clube (fictício). Sem imagem, usamos uma marca gerada com as cores.
          </p>
        </Card>
      </div>

      {/* vitrine dos 4 kits */}
      <Card title="Uniformes da temporada" flush>
        <div className="kit-vitrine">
          {TIPOS.map((t) => (
            <button key={t.v} className={"kit-mini" + (aba === t.v ? " on" : "")} onClick={() => setAba(t.v)}>
              <KitFolha kit={kits[t.v]} numero={t.v === "goleiro" ? 1 : 10} tamanho={128} compacto />
              <span>{t.t}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="kit-editor">
        {/* preview grande da peça em edição, com o kit inteiro de contexto */}
        <Card title={`${rotuloKit} — em edição: ${rotuloPeca}`}>
          <div className="kit-preview">
            <div className="kit-stage">
              <KitFolha kit={kit} numero={numeroPreview} ativo={peca} tamanho={300} />
            </div>
            {aba === "goleiro" && <div className="kit-gk-note">🧤 número fixo em <b>1</b> na camisa do goleiro</div>}
            <div className="kit-legend">
              {peca === "camisa" && (<>
                <Swatch c={kit.camisa.cor1} t="Cor 1 · corpo" />
                <Swatch c={kit.camisa.cor2} t="Cor 2 · padrão" />
                <Swatch c={kit.camisa.cor3} t="Cor 3 · acabamento" />
              </>)}
              {peca === "calcao" && (<>
                <Swatch c={kit.calcao.cor1} t="Cor 1 · base" />
                <Swatch c={kit.calcao.cor2} t="Cor 2 · detalhe" />
              </>)}
              {peca === "meiao" && (<>
                <Swatch c={kit.meiao.cor1} t="Cor 1 · base" />
                <Swatch c={kit.meiao.cor2} t="Cor 2 · detalhe" />
              </>)}
            </div>
          </div>
        </Card>

        {/* controles */}
        <Card title="Personalização" right={
          <div className="chips" style={{ marginLeft: "auto" }}>
            {PECAS.map((p) => (
              <button key={p.v} className={"chip" + (peca === p.v ? " on" : "")} onClick={() => setPeca(p.v)}>{p.t}</button>
            ))}
          </div>
        }>
          {!editavel && <div className="kit-disabled-note">Somente leitura — edição travada nesta temporada.</div>}
          <fieldset className="kit-fs" disabled={!editavel}>
            {peca === "camisa" && (
              <>
                <Secao t="Modelos prontos">
                  <div className="chips">
                    {PRESETS.map((p) => (
                      <button key={p.nome} className="chip" title={p.hint} onClick={() => setCamisa(p.aplicar(kit.camisa))}>{p.nome}</button>
                    ))}
                  </div>
                </Secao>
                <Secao t="Padrão da camisa">
                  <div className="kit-padroes">
                    {PADROES_CAMISA.map((p) => (
                      <button key={p.v} className={"kit-padrao" + (kit.camisa.padrao === p.v ? " on" : "")} onClick={() => setCamisa({ padrao: p.v })} title={p.t}>
                        <Camisa camisa={{ ...kit.camisa, padrao: p.v }} tamanho={44} />
                        <span>{p.t}</span>
                      </button>
                    ))}
                  </div>
                </Secao>
                <Secao t="Cores">
                  <CorLinha t="Cor 1 — corpo" v={kit.camisa.cor1} onChange={(c) => setCamisa({ cor1: c, corNumero: contraste(c) })} />
                  <CorLinha t="Cor 2 — padrão / detalhe" v={kit.camisa.cor2} onChange={(c) => setCamisa({ cor2: c })} />
                  <CorLinha t="Cor 3 — acabamento" v={kit.camisa.cor3} onChange={(c) => setCamisa({ cor3: c })} />
                </Secao>
                <Secao t="Mangas">
                  <div className="chips">
                    {MANGAS.map((m) => (
                      <button key={m.v} className={"chip" + (kit.camisa.mangas === m.v ? " on" : "")} onClick={() => setCamisa({ mangas: m.v })}>{m.t}</button>
                    ))}
                  </div>
                </Secao>
                <Secao t="Gola">
                  <div className="chips">
                    {GOLAS.map((g) => (
                      <button key={g.v} className={"chip" + (kit.camisa.gola === g.v ? " on" : "")} onClick={() => setCamisa({ gola: g.v })}>{g.t}</button>
                    ))}
                  </div>
                  {kit.camisa.gola !== "sem" && <CorLinha t="Cor da gola" v={kit.camisa.corGola} onChange={(c) => setCamisa({ corGola: c })} />}
                </Secao>
                <Secao t="Número">
                  <CorLinha t="Cor do número" v={kit.camisa.corNumero} onChange={(c) => setCamisa({ corNumero: c })} />
                  <button className="btn ghost sm" onClick={() => setCamisa({ corNumero: contraste(kit.camisa.cor1) })}>contraste automático</button>
                  <label className="kit-range">
                    <span>Tamanho do número · {Math.round((kit.camisa.numEscala ?? 1) * 100)}%</span>
                    <input
                      type="range" min={0.6} max={1.6} step={0.05}
                      value={kit.camisa.numEscala ?? 1}
                      onChange={(e) => setCamisa({ numEscala: parseFloat(e.target.value) })}
                    />
                  </label>
                </Secao>
                <Secao t="Fonte do nome e número (costas)">
                  <div className="chips">
                    {FONTES.map((f) => (
                      <button
                        key={f.v}
                        className={"chip" + (kit.camisa.fonte === f.v ? " on" : "")}
                        style={{ fontFamily: f.css }}
                        onClick={() => setCamisa({ fonte: f.v })}
                      >
                        {f.t}
                      </button>
                    ))}
                  </div>
                  <input
                    className="kit-nome-input"
                    placeholder="NOME NAS COSTAS (opcional)"
                    maxLength={14}
                    value={kit.camisa.nome}
                    onChange={(e) => setCamisa({ nome: e.target.value.toUpperCase() })}
                  />
                </Secao>
              </>
            )}

            {peca === "calcao" && (
              <>
                <Secao t="Padrão do calção">
                  <div className="kit-padroes">
                    {PADROES_CALCAO.map((p) => (
                      <button key={p.v} className={"kit-padrao" + (kit.calcao.padrao === p.v ? " on" : "")} onClick={() => setCalcao({ padrao: p.v })} title={p.t}>
                        <Calcao calcao={{ ...kit.calcao, padrao: p.v }} tamanho={54} />
                        <span>{p.t}</span>
                      </button>
                    ))}
                  </div>
                </Secao>
                <Secao t="Cores">
                  <CorLinha t="Cor 1 — base" v={kit.calcao.cor1} onChange={(c) => setCalcao({ cor1: c })} />
                  <CorLinha t="Cor 2 — detalhe" v={kit.calcao.cor2} onChange={(c) => setCalcao({ cor2: c })} />
                </Secao>
              </>
            )}

            {peca === "meiao" && (
              <>
                <Secao t="Padrão do meião">
                  <div className="kit-padroes">
                    {PADROES_MEIAO.map((p) => (
                      <button key={p.v} className={"kit-padrao" + (kit.meiao.padrao === p.v ? " on" : "")} onClick={() => setMeiao({ padrao: p.v })} title={p.t}>
                        <Meiao meiao={{ ...kit.meiao, padrao: p.v }} tamanho={54} />
                        <span>{p.t}</span>
                      </button>
                    ))}
                  </div>
                </Secao>
                <Secao t="Cores">
                  <CorLinha t="Cor 1 — base" v={kit.meiao.cor1} onChange={(c) => setMeiao({ cor1: c })} />
                  <CorLinha t="Cor 2 — detalhe" v={kit.meiao.cor2} onChange={(c) => setMeiao({ cor2: c })} />
                </Secao>
              </>
            )}

            {aba !== "casa" && (
              <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={copiarDaCasa}>
                copiar {rotuloPeca.toLowerCase()} da casa
              </button>
            )}
          </fieldset>
        </Card>
      </div>

      {editavel && (
        <div className="kit-actions">
          <span className="kit-autosave">rascunho salvo automaticamente</span>
          <button className="btn" onClick={() => setConfirmando(true)}>Confirmar uniformes da temporada</button>
        </div>
      )}

      {confirmando && (
        <div className="modal-bg" onClick={() => setConfirmando(false)}>
          <div className="modal kit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar uniformes?</h3>
            <p>Você só pode desenhar os uniformes <b>uma vez por temporada</b>. Ao confirmar agora, a edição trava até o início da Temporada {TEMPORADA_ATUAL + 1}.</p>
            <div className="kit-modal-prev">
              {TIPOS.map((t) => (
                <div key={t.v}><KitFolha kit={kits[t.v]} numero={t.v === "goleiro" ? 1 : 10} tamanho={96} compacto /><span>{t.t}</span></div>
              ))}
            </div>
            <div className="kit-modal-acts">
              <button className="btn ghost sm" onClick={() => setConfirmando(false)}>voltar e ajustar</button>
              <button className="btn sm" onClick={confirmar}>confirmar temporada</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}

function Secao({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="kit-secao">
      <div className="mini-lbl">{t}</div>
      {children}
    </div>
  );
}

function Swatch({ c, t }: { c: string; t: string }) {
  return (
    <span className="kit-sw">
      <i style={{ background: c }} />
      <span>{t}</span>
      <code>{c.toUpperCase()}</code>
    </span>
  );
}

function CorLinha({ t, v, onChange }: { t: string; v: string; onChange: (c: string) => void }) {
  return (
    <div className="kit-cor">
      <span className="kit-cor-lbl">{t}</span>
      <span className="kit-cor-ctrl">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000"} onChange={(e) => onChange(e.target.value)} />
        <span className="kit-paleta">
          {PALETA.map((c) => (
            <button key={c} className={"kit-chip" + (v.toLowerCase() === c ? " on" : "")} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
          ))}
        </span>
      </span>
    </div>
  );
}
