import cron from "node-cron";
import { prisma } from "../config/prisma";
import { simularEPersistirPartida } from "../modules/partida/partida.service";
import { processarSemanaFinanceira } from "../modules/financas/financas.service";
import { tickDiario } from "./tickDiario";

const TIMEZONE = "America/Sao_Paulo"; // 08_RELOGIO_E_SIMULACAO, seção 5 (regra definitiva)

// Dispara todas as partidas agendadas para a janela corrente
// (08, seção 2): quarta/quinta 21h e domingo 15h.
async function dispararRodadaDoDia(): Promise<void> {
  const agora = new Date();
  const inicioDaHora = new Date(agora);
  inicioDaHora.setMinutes(0, 0, 0);
  const fimDaHora = new Date(inicioDaHora);
  fimDaHora.setHours(fimDaHora.getHours() + 1);

  const partidasDoDia = await prisma.partida.findMany({
    where: {
      status: "AGENDADA",
      dataHora: { gte: inicioDaHora, lt: fimDaHora },
    },
  });

  if (partidasDoDia.length === 0) return;

  console.log(`[scheduler] Disparando ${partidasDoDia.length} partida(s)...`);

  // Fase 1: até 10 simulações em paralelo (03_MOTOR_DE_PARTIDAS, seção 11).
  // O calendário do "dia do universo" só avança quando todas concluem
  // com sucesso (08, seção 4) — a virada de dia/temporada completa é um
  // passo seguinte da Fase 1.
  const resultados = await Promise.allSettled(
    partidasDoDia.map((p) => simularEPersistirPartida(p.id))
  );

  resultados.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[scheduler] Falha ao simular partida ${partidasDoDia[i].id}:`, r.reason);
    }
  });
}

/** Ciclo semanal de finanças: patrocínio (+), folha (-), manutenção (-).
 *  Separado do tick diário porque sua periodicidade é semanal (11 §§1-2). */
async function rodarCicloSemanalFinanceiro(): Promise<void> {
  const ligas = await prisma.liga.findMany({ select: { id: true, nome: true } });
  for (const liga of ligas) {
    try {
      const resumo = await processarSemanaFinanceira(liga.id, new Date());
      const emAtraso = resumo.filter((r) => r.folhaEmAtraso).length;
      console.log(
        `[financas] Semana processada (liga "${liga.nome}"): ${resumo.length} clubes, ${emAtraso} com folha em atraso.`
      );
    } catch (err) {
      console.error(`[financas] Falha no ciclo semanal da liga ${liga.id}:`, err);
    }
  }
}

export function iniciarScheduler(): void {
  // Partidas: quarta e quinta às 21:00, domingo às 15:00 (R30).
  cron.schedule("0 21 * * 3,4", dispararRodadaDoDia, { timezone: TIMEZONE });
  cron.schedule("0 15 * * 0", dispararRodadaDoDia, { timezone: TIMEZONE });

  // Tick diário do universo (08 §1): manutenção + mercado + inatividade +
  // finanças diárias, numa rotina só, logo depois da meia-noite.
  cron.schedule("5 0 * * *", () => tickDiario(new Date()), { timezone: TIMEZONE });

  // Ciclo semanal de finanças: segunda 04:00 (após o fim de semana de jogos).
  cron.schedule("0 4 * * 1", rodarCicloSemanalFinanceiro, { timezone: TIMEZONE });

  console.log(
    "[scheduler] Agendamento ativo (partidas qua/qui 21h e dom 15h; tick diário 0h05; finanças semanal seg 4h; America/Sao_Paulo)."
  );
}

// Exportados à parte para disparo manual em testes/dev.
export { dispararRodadaDoDia, rodarCicloSemanalFinanceiro };
