import { useEffect, useState } from "react";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    setData(null);
    setErro(null);
    fn()
      .then((d) => vivo && setData(d))
      .catch((e) => vivo && setErro(e?.message ?? "Falha ao carregar."));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, erro, carregando: !data && !erro };
}
