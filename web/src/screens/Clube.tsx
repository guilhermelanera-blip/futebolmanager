import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { snapshot } from "../api/client";
import Elenco from "./Elenco";
import Torcida from "./Torcida";
import EditarTime from "./EditarTime";
import Mercado from "./Mercado";
import Treinos from "./Treinos";
import Financas from "./Financas";

const Estadio = lazy(() => import("./Estadio")); // three.js só quando abre a aba

export type AbaClube = "elenco" | "torcida" | "editar-time" | "estadio" | "mercado" | "treinos" | "financas";

const ABAS: { v: AbaClube; t: string; to: string }[] = [
  { v: "elenco", t: "Elenco", to: "/elenco" },
  { v: "torcida", t: "Torcida", to: "/torcida" },
  { v: "editar-time", t: "Editar time", to: "/editar-time" },
  { v: "estadio", t: "Estádio", to: "/estadio" },
  { v: "mercado", t: "Mercado", to: "/mercado" },
  { v: "treinos", t: "Treinos", to: "/treinos" },
  { v: "financas", t: "Finanças", to: "/financas" },
];

export default function Clube({ aba = "elenco" }: { aba?: AbaClube }) {
  const nav = useNavigate();
  const c = snapshot.clube;

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">{c.nomeCurto} · {c.cidade}</div>
        <h1>Clube</h1>
        <p>Elenco, torcida, uniformes, estádio, mercado, treinos e finanças — a gestão do dia a dia num lugar só.</p>
      </div>

      <div className="chips sub-abas">
        {ABAS.map((a) => (
          <button
            key={a.v}
            className={"chip" + (aba === a.v ? " on" : "")}
            onClick={() => aba !== a.v && nav(a.to)}
          >
            {a.t}
          </button>
        ))}
      </div>

      {aba === "elenco" ? <Elenco embutido />
        : aba === "torcida" ? <Torcida embutido />
          : aba === "editar-time" ? <EditarTime embutido />
            : aba === "estadio" ? (
              <Suspense fallback={<div className="empty">Carregando maquete 3D…</div>}>
                <Estadio embutido />
              </Suspense>
            )
              : aba === "mercado" ? <Mercado embutido />
                : aba === "treinos" ? <Treinos embutido />
                  : <Financas embutido />}
    </>
  );
}
