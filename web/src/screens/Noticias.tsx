import { useMemo, useState } from "react";
import { api, CAT_NOTICIA, type CatNoticia, type NoticiaItem } from "../api/client";
import { Card, Loading } from "../components/bits";
import { TextoComNomes } from "../components/nomes";
import { useAsync } from "../lib/useAsync";
import { dataCurta } from "../lib/format";

const ORDEM_CAT: CatNoticia[] = [
  "resultado", "tabela", "mercado", "lesao", "disciplina", "torcida",
  "extracampo", "tragedia", "institucional", "selecao", "arbitragem", "bastidores",
];
const GRAV_ROT: Record<NoticiaItem["grav"], string> = { nota: "", quente: "quente", grave: "grave" };

export default function Noticias() {
  const { data, carregando } = useAsync(() => api.noticias(), []);
  const [cat, setCat] = useState<"todas" | CatNoticia>("todas");
  const [soMeu, setSoMeu] = useState(false);

  const lista: NoticiaItem[] = data?.lista ?? [];

  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of lista) if (!soMeu || n.meu) m.set(n.cat, (m.get(n.cat) ?? 0) + 1);
    return m;
  }, [lista, soMeu]);

  const filtrada = useMemo(
    () => lista.filter((n) => (cat === "todas" || n.cat === cat) && (!soMeu || n.meu)),
    [lista, cat, soMeu],
  );

  // agrupa por rodada
  const grupos = useMemo(() => {
    const g: { rodada: number; itens: NoticiaItem[] }[] = [];
    for (const n of filtrada) {
      const ult = g[g.length - 1];
      if (ult && ult.rodada === n.rodada) ult.itens.push(n);
      else g.push({ rodada: n.rodada, itens: [n] });
    }
    return g;
  }, [filtrada]);

  if (carregando || !data) return <Loading label="Puxando as manchetes…" />;

  const catsComItens = ORDEM_CAT.filter((c) => (contagem.get(c) ?? 0) > 0);

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Mundo do futebol</div>
        <h1>Notícias</h1>
        <p>Resultados, mercado, lesões, indisciplina, torcida, casos fora de campo, crises e luto — o noticiário da temporada até a {data.rodada}ª rodada.</p>
      </div>

      <div className="nw-filtros">
        <div className="chips">
          <button className={"chip" + (cat === "todas" ? " on" : "")} onClick={() => setCat("todas")}>
            Todas <span className="nw-n">{filtrada.length}</span>
          </button>
          {catsComItens.map((c) => (
            <button key={c} className={"chip" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>
              <span className="nw-ico">{CAT_NOTICIA[c].ico}</span> {CAT_NOTICIA[c].t}
              <span className="nw-n">{contagem.get(c)}</span>
            </button>
          ))}
        </div>
        <label className="nw-somente">
          <input type="checkbox" checked={soMeu} onChange={(e) => setSoMeu(e.target.checked)} />
          só do meu clube
        </label>
      </div>

      {grupos.length === 0 ? (
        <div className="empty">Nada nesse filtro por enquanto.</div>
      ) : (
        grupos.map((g) => (
          <Card key={g.rodada} title={`${g.rodada}ª rodada`} hint={dataCurta(g.itens[0].data)} flush>
            <div className="nw-lista">
              {g.itens.map((n) => (
                <article key={n.id} className={"nw-item g-" + n.grav + (n.meu ? " meu" : "")}>
                  <div className="nw-top">
                    <span className="nw-cat">{CAT_NOTICIA[n.cat].ico} {CAT_NOTICIA[n.cat].t}</span>
                    {GRAV_ROT[n.grav] && <span className={"nw-tag " + n.grav}>{GRAV_ROT[n.grav]}</span>}
                    {n.meu && <span className="nw-tag meu">seu clube</span>}
                    <span className="nw-fonte">{n.fonte}</span>
                  </div>
                  <h3 className="nw-manch"><TextoComNomes texto={n.manchete} /></h3>
                  <p className="nw-corpo"><TextoComNomes texto={n.corpo} /></p>
                </article>
              ))}
            </div>
          </Card>
        ))
      )}
    </>
  );
}
