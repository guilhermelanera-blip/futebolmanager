// Manutenção diária de jogadores/clubes — 08_RELOGIO_E_SIMULACAO, seção 1
// (passo 1 da ordem da seção 3):
//   - Recuperação de fadiga (sem jogo no dia).
//   - Decaimento natural de moral do jogador e da torcida em direção ao neutro.
//   - Progressão de lesões (contagem regressiva de dias; alta ao chegar a 0).
//
// Fadiga e moral são atualizadas em massa via SQL (uma liga tem centenas de
// jogadores); lesões ativas são poucas e tratadas uma a uma.

import { prisma } from "../../config/prisma";
import { getVarios } from "../financas/config.service";
import { P } from "../financas/parametros";

export interface ResumoManutencao {
  jogadoresAtualizados: number;
  lesoesProgredidas: number;
  lesoesRecuperadas: number;
}

export async function progredirManutencaoDiaria(
  ligaId: string,
  _referencia: Date = new Date(),
  diasDecorridos = 1
): Promise<ResumoManutencao> {
  const cfg = await getVarios([
    P.TICK_FADIGA_RECUPERACAO_DIA,
    P.TICK_MORAL_JOGADOR_NEUTRO,
    P.TICK_MORAL_TORCIDA_NEUTRO,
    P.TICK_MORAL_PASSO_DIA,
  ]);
  const recFadiga = Math.round(cfg[P.TICK_FADIGA_RECUPERACAO_DIA] * diasDecorridos);
  const neutroJog = Math.round(cfg[P.TICK_MORAL_JOGADOR_NEUTRO]);
  const neutroTor = Math.round(cfg[P.TICK_MORAL_TORCIDA_NEUTRO]);
  const passoMoral = Math.round(cfg[P.TICK_MORAL_PASSO_DIA] * diasDecorridos);

  // Fadiga: recupera, nunca abaixo de 0.
  const jogadoresAtualizados = await prisma.$executeRaw`
    UPDATE "Jogador" SET fadiga = GREATEST(0, fadiga - ${recFadiga})
    WHERE "clubeId" IN (SELECT id FROM "Clube" WHERE "ligaId" = ${ligaId})
      AND fadiga > 0
  `;

  // Moral do jogador: tende ao neutro sem ultrapassar.
  await prisma.$executeRaw`
    UPDATE "Jogador" SET moral =
      CASE WHEN moral > ${neutroJog} THEN GREATEST(${neutroJog}, moral - ${passoMoral})
           WHEN moral < ${neutroJog} THEN LEAST(${neutroJog}, moral + ${passoMoral})
           ELSE moral END
    WHERE "clubeId" IN (SELECT id FROM "Clube" WHERE "ligaId" = ${ligaId})
  `;

  // Moral da torcida: idem, no clube.
  await prisma.$executeRaw`
    UPDATE "Clube" SET "moralTorcida" =
      CASE WHEN "moralTorcida" > ${neutroTor} THEN GREATEST(${neutroTor}, "moralTorcida" - ${passoMoral})
           WHEN "moralTorcida" < ${neutroTor} THEN LEAST(${neutroTor}, "moralTorcida" + ${passoMoral})
           ELSE "moralTorcida" END
    WHERE "ligaId" = ${ligaId}
  `;

  // Traço "referência no vestiário" / "líder" (04 §10): +1 de moral/dia aos
  // jogadores de um clube que tem pelo menos um desses jogadores — amortece
  // o decaimento e mantém o elenco mais animado.
  const clubesComLider = await prisma.jogador.findMany({
    where: {
      clube: { ligaId },
      OR: [{ tracos: { contains: "REFERENCIA_VESTIARIO" } }, { tracos: { contains: "LIDER" } }],
    },
    select: { clubeId: true },
    distinct: ["clubeId"],
  });
  const idsComLider = clubesComLider.map((c) => c.clubeId).filter((x): x is string => !!x);
  if (idsComLider.length > 0) {
    // moral < 100 + increment 1 => nunca passa de 100.
    await prisma.jogador.updateMany({
      where: { clubeId: { in: idsComLider }, moral: { lt: 100 } },
      data: { moral: { increment: 1 } },
    });
  }

  // Lesões ativas: conta regressiva; alta quando chega a 0.
  const ativas = await prisma.lesao.findMany({
    where: { status: "ATIVA", jogador: { clube: { ligaId } } },
    select: { id: true, diasRestantes: true },
  });
  let recuperadas = 0;
  for (const l of ativas) {
    const restantes = l.diasRestantes - diasDecorridos;
    if (restantes <= 0) {
      await prisma.lesao.update({
        where: { id: l.id },
        data: { diasRestantes: 0, status: "RECUPERADO" },
      });
      recuperadas++;
    } else {
      await prisma.lesao.update({ where: { id: l.id }, data: { diasRestantes: restantes } });
    }
  }

  return {
    jogadoresAtualizados: Number(jogadoresAtualizados),
    lesoesProgredidas: ativas.length,
    lesoesRecuperadas: recuperadas,
  };
}
