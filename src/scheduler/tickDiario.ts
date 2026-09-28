// Tick diário do universo — 08_RELOGIO_E_SIMULACAO, seção 1.
//
// Roda uma vez por dia, haja ou não partida. Consolida numa rotina só, na
// ordem da seção 3 do documento 08, o que antes eram crons separados:
//   1. Manutenção          — recuperação de fadiga, decaimento de moral,
//                            progressão de lesões (por liga).
//   2. Fechamento de negociações — propostas de mercado vencidas e
//                            empréstimos encerrados (global).
//   3. Inatividade (R40)   — clubes de humanos parados há 14 dias vão para
//                            gestão virtual; a fila de espera é atendida.
//   4. Finanças diárias    — contador de caixa negativo + falência.
//
// (Notícias diárias — 08 §1 — dependem da IA narrativa, que é Fase 4.)
//
// O disparo das PARTIDAS (08 §2, passo 4) continua nos seus próprios horários
// fixos de R30, fora deste tick.

import { prisma } from "../config/prisma";
import { progredirManutencaoDiaria } from "../modules/universo/manutencaoDiaria.service";
import {
  expirarPropostasVencidas,
  encerrarEmprestimosVencidos,
} from "../modules/mercado/mercado.service";
import {
  processarInatividade,
  reconciliarFilaComVagasLivres,
} from "../modules/liga/inatividade.service";
import { processarDiaFinanceiro } from "../modules/financas/financas.service";
import { processarViradaDeTemporada } from "../modules/competicao/viradaDeTemporada.service";

export interface ResumoTickDiario {
  propostasExpiradas: number;
  emprestimosEncerrados: number;
  ligas: {
    ligaId: string;
    jogadoresAtualizados: number;
    lesoesRecuperadas: number;
    clubesEmGestaoVirtual: number;
    falencias: number;
    viradaDeTemporada: boolean;
  }[];
}

export async function tickDiario(referencia: Date = new Date()): Promise<ResumoTickDiario> {
  // Passo 2 (global): fechamento de negociações.
  const propostasExpiradas = await expirarPropostasVencidas(referencia);
  const emprestimosEncerrados = await encerrarEmprestimosVencidos(referencia);

  const ligas = await prisma.liga.findMany({ select: { id: true, nome: true } });
  const resumoLigas: ResumoTickDiario["ligas"] = [];

  for (const liga of ligas) {
    try {
      // Passo 1: manutenção física/moral/lesões.
      const manut = await progredirManutencaoDiaria(liga.id, referencia, 1);

      // Passo 3: inatividade → gestão virtual + fila (R40 / 07 §2).
      const movidos = await processarInatividade(liga.id, referencia);
      await reconciliarFilaComVagasLivres(liga.id, referencia);

      // Passo 4: contador de caixa negativo + falência (11 §6).
      const falencias = await processarDiaFinanceiro(liga.id, referencia, 1);

      // Passo 5: virada de temporada, se a Liga Nacional terminou (08 §6).
      // No-op quando a temporada ainda está em disputa.
      const virada = await processarViradaDeTemporada(liga.id, referencia);
      if (virada.virou) {
        console.log(
          `[tick] Virada de temporada na liga "${liga.nome}": ` +
            `${virada.jogadoresEvoluidos ?? 0} jogadores evoluídos, ` +
            `${virada.contratosRenovados ?? 0} contratos renovados, ` +
            `${virada.contratosEncerrados ?? 0} encerrados. ` +
            `Nova temporada: ${virada.novaTemporadaId ?? "(pendente)"}.`
        );
      }

      resumoLigas.push({
        ligaId: liga.id,
        jogadoresAtualizados: manut.jogadoresAtualizados,
        lesoesRecuperadas: manut.lesoesRecuperadas,
        clubesEmGestaoVirtual: movidos.length,
        falencias: falencias.length,
        viradaDeTemporada: virada.virou,
      });
    } catch (err) {
      console.error(`[tick] Falha no tick diário da liga ${liga.id}:`, err);
    }
  }

  const totalFalencias = resumoLigas.reduce((s, l) => s + l.falencias, 0);
  const totalGV = resumoLigas.reduce((s, l) => s + l.clubesEmGestaoVirtual, 0);
  console.log(
    `[tick] Tick diário: ${propostasExpiradas} proposta(s) expirada(s), ` +
      `${emprestimosEncerrados} empréstimo(s) encerrado(s), ${totalGV} clube(s) ` +
      `em gestão virtual, ${totalFalencias} falência(s).`
  );

  return { propostasExpiradas, emprestimosEncerrados, ligas: resumoLigas };
}
