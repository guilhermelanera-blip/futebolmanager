import { useRef, useState } from "react";
import { escudoSalvo, salvarEscudo } from "../api/client";
import { arquivoParaEscudo } from "../lib/escudo";

/** Envia/troca/remove o escudo do clube (imagem PNG ou JPEG). */
export function EscudoUploader({ cores, size = 96 }: { cores?: string; size?: number }) {
  const [atual, setAtual] = useState<string>(() => escudoSalvo());
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [a, b] = (cores || "#1c6b45/#ffffff").split("/");

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null);
    setCarregando(true);
    try {
      const url = await arquivoParaEscudo(file);
      salvarEscudo(url);
      setAtual(url);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  function remover() {
    salvarEscudo(null);
    setAtual("");
    setErro(null);
  }

  return (
    <div className="esc-up">
      <div
        className="esc-up-prev"
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
      >
        {atual ? (
          <img src={atual} alt="Escudo do clube" />
        ) : (
          <span
            className="esc-up-fallback"
            style={{ background: `linear-gradient(120deg, ${a} 0 46%, ${b} 54% 100%)` }}
          />
        )}
      </div>
      <div className="esc-up-acoes">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={aoEscolher}
          hidden
        />
        <button type="button" className="btn ghost sm" disabled={carregando} onClick={() => inputRef.current?.click()}>
          {carregando ? "processando…" : atual ? "trocar imagem" : "enviar imagem"}
        </button>
        {atual && (
          <button type="button" className="linkish" onClick={remover}>usar escudo das cores</button>
        )}
        <span className="esc-up-dica">PNG ou JPEG. Fica quadrado, 256×256.</span>
        {erro && <span className="esc-up-erro">{erro}</span>}
      </div>
    </div>
  );
}
