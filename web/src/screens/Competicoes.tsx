import { useNavigate } from "react-router-dom";
import Classificacao from "./Classificacao";
import Calendario from "./Calendario";

type Aba = "tabela" | "calendario";

const ABAS: { v: Aba; t: string; to: string }[] = [
  { v: "tabela", t: "Tabela", to: "/classificacao" },
  { v: "calendario", t: "Calendário", to: "/calendario" },
];

export default function Competicoes({ aba = "tabela" }: { aba?: Aba }) {
  const nav = useNavigate();
  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Liga Nacional · Temporada 1</div>
        <h1>Competições</h1>
        <p>Classificação e calendário da Liga Nacional — pontos corridos, ida e volta, 20 clubes.</p>
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

      {aba === "tabela" ? <Classificacao embutido /> : <Calendario embutido />}
    </>
  );
}
