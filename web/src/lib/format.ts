export function dinheiro(v: number, curto = false): string {
  const s = v < 0 ? "−" : "";
  const a = Math.abs(v);
  if (curto || a >= 100_000) {
    if (a >= 1_000_000) return `${s}R$ ${(a / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
    if (a >= 1_000) return `${s}R$ ${(a / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return `${s}R$ ${a.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function numero(v: number): string {
  return v.toLocaleString("pt-BR");
}

export function dataCurta(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "")
    .replace(" de ", " ");
}

export function dataLonga(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" });
}

export function coresDoClube(cores: string): [string, string] {
  const [a, b] = (cores || "#1c6b45/#ffffff").split("/");
  return [a || "#1c6b45", b || "#ffffff"];
}

export const POS_ABREV: Record<string, string> = {
  GOLEIRO: "GOL", ZAGUEIRO: "ZAG", LATERAL: "LAT", VOLANTE: "VOL",
  MEIA: "MEI", PONTA: "PON", ATACANTE: "ATA",
};

export const TRACO_LABEL: Record<string, string> = {
  GOLEADOR: "Goleador", MAESTRO: "Maestro", MOTOR: "Motor", MURALHA: "Muralha",
  XERIFE: "Xerife", LIDER: "Líder", REFERENCIA_VESTIARIO: "Referência de vestiário",
  FRIO_NOS_PENALTIS: "Frio nos pênaltis", PROPENSO_LESAO: "Propenso a lesão",
  INCONSISTENTE: "Inconsistente", CABECA_QUENTE: "Cabeça quente",
  PANELA: "Panela", GEMA: "Joia", VETERANO_INFLUENTE: "Veterano influente",
};

export function tracoLabel(t: string): string {
  return TRACO_LABEL[t] ?? t.toLowerCase().replace(/_/g, " ");
}
