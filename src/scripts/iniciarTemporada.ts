// Início oficial do calendário (07_MULTIPLAYER_ONLINE §2): fecha as
// inscrições humanas e cria a Temporada 1 (Liga Nacional + Copa Nacional)
// com o elenco de clubes atual.
//
// Uso:
//   npm run iniciar                       # usa a única liga do banco
//   npm run iniciar -- --liga=<ligaId>    # liga específica
//   npm run iniciar -- --inicio=2026-01-14

import "dotenv/config";
import { prisma } from "../config/prisma";
import { iniciarTemporadaOficial } from "../modules/liga/inicioTemporada.service";

function lerFlag(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  const arg = process.argv.find((a) => a.startsWith(prefixo));
  return arg ? arg.slice(prefixo.length) : undefined;
}

async function main() {
  let ligaId = lerFlag("liga");
  if (!ligaId) {
    const ligas = await prisma.liga.findMany({ select: { id: true, nome: true } });
    if (ligas.length === 0) throw new Error("Nenhuma liga no banco. Rode `npm run seed` primeiro.");
    if (ligas.length > 1) {
      throw new Error(
        `Há ${ligas.length} ligas — informe qual: npm run iniciar -- --liga=<id>\n` +
          ligas.map((l) => `  ${l.id}  ${l.nome}`).join("\n")
      );
    }
    ligaId = ligas[0].id;
  }

  const inicioStr = lerFlag("inicio");
  const dataInicio = inicioStr ? new Date(inicioStr) : undefined;
  if (dataInicio && Number.isNaN(dataInicio.getTime())) {
    throw new Error(`--inicio inválido: "${inicioStr}" (use YYYY-MM-DD)`);
  }

  const r = await iniciarTemporadaOficial({ ligaId, dataInicio });
  console.log(
    `[iniciar] Temporada ${r.numero} criada (${r.clubesHumanos} clubes humanos): ` +
      `${r.qtdePartidas} partidas de liga + ${r.qtdeConfrontosCopa} confrontos de Copa.`
  );
  console.log(
    `[iniciar]   início: ${r.inicio.toISOString()} | fim previsto: ${r.fimPrevisto.toISOString()}`
  );
  console.log("[iniciar] Inscrições humanas fechadas — daqui em diante, só via fila de espera.");
}

main()
  .catch((err) => {
    console.error("[iniciar] Erro:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
