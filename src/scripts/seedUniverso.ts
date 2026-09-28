// Bootstrap do UNIVERSO: 1 Liga + 20 clubes de IA (elenco de 25 cada) +
// parâmetros de configuração. NÃO cria o calendário — as vagas humanas
// ficam abertas (`/assumir`) até o "início oficial do calendário"
// (07_MULTIPLAYER_ONLINE §2), feito por `npm run iniciar` ou
// `POST /v1/liga/:id/iniciar`, que aí sim cria a Temporada 1 (liga + Copa).
//
// Uso:
//   npm run seed
//   npm run seed -- --seed=meu-seed --liga="Liga Nacional" --clubes=20 --force
//
// Flags:
//   --seed=<string>    seed determinístico do universo (padrão: "universo-fase1-v1")
//   --liga=<string>    nome da liga (padrão: "Liga Nacional")
//   --clubes=<par>     nº de clubes, par (padrão: 20 — R9)
//   --force            cria mesmo se já houver liga(s) no banco
//
// O nome fictício DEFINITIVO da Liga Nacional ainda é PENDENTE DE DECISÃO
// (02_GAME_DESIGN_DOCUMENT §7) — "Liga Nacional" é um rótulo provisório.

import "dotenv/config";
import { prisma } from "../config/prisma";
import { criarUniverso } from "../modules/liga/universo.service";
import { semearParametros } from "../modules/financas/config.service";

function lerFlag(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  const arg = process.argv.find((a) => a.startsWith(prefixo));
  return arg ? arg.slice(prefixo.length) : undefined;
}
function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

async function main() {
  const seed = lerFlag("seed") ?? "universo-fase1-v1";
  const nomeLiga = lerFlag("liga") ?? "Liga Nacional";
  const qtdeClubes = lerFlag("clubes") ? Number(lerFlag("clubes")) : 20;
  const force = temFlag("force");

  const ligasExistentes = await prisma.liga.count();
  if (ligasExistentes > 0 && !force) {
    console.error(
      `[seed] Já existe(m) ${ligasExistentes} liga(s) no banco. Use --force para criar mais uma mesmo assim.`
    );
    process.exit(1);
  }

  const params = await semearParametros();
  console.log(`[seed] Parâmetros de configuração semeados (${params} chaves).`);

  console.log(`[seed] Gerando universo (seed="${seed}", clubes=${qtdeClubes})...`);
  const universo = await criarUniverso({
    nomeLiga,
    seed,
    qtdeClubes,
    dataInicioContratos: new Date(),
  });
  console.log(
    `[seed] Liga ${universo.ligaId} criada: ${universo.qtdeClubes} clubes, ${universo.qtdeJogadores} jogadores.`
  );
  console.log(
    `[seed] Universo pronto. Próximo passo: humanos assumem clubes (POST /v1/liga/${universo.ligaId}/assumir) ` +
      `e então "npm run iniciar" cria a Temporada 1.`
  );
}

main()
  .catch((err) => {
    console.error("[seed] Erro:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
