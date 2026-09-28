// Início oficial do calendário da Temporada 1 — 07_MULTIPLAYER_ONLINE §2.
//
// As 20 vagas humanas ficam abertas para inscrição (`/assumir`) até este
// evento. Ao iniciar:
//   - as inscrições fecham (`Liga.calendarioIniciado = true`); daqui em
//     diante só a fila de espera dá acesso a um clube;
//   - a Copa Nacional é montada com o elenco de clubes de AGORA — todos os
//     clubes humanos inscritos + sorteio de IA até 16 (R36);
//   - o calendário completo da T1 (liga + Copa) é criado.
//
// O universo (clubes + jogadores + parâmetros) já deve existir — é criado
// por `npm run seed`, que NÃO cria mais o calendário.

import { prisma } from "../../config/prisma";
import { criarTemporadaComCalendario } from "../competicao/calendario.service";
import { selecionarParticipantesCopa } from "../competicao/copa.participantes";

export class ErroInicio extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

export interface EstadoInicio {
  ligaExiste: boolean;
  calendarioIniciado: boolean;
  temTemporadaAtiva: boolean;
  qtdeClubes: number;
}

export function validarInicioTemporada(e: EstadoInicio): { ok: boolean; status: number; erro?: string } {
  if (!e.ligaExiste) return { ok: false, status: 404, erro: "Liga não encontrada." };
  if (e.calendarioIniciado) {
    return { ok: false, status: 409, erro: "O calendário oficial desta liga já foi iniciado." };
  }
  if (e.temTemporadaAtiva) {
    return { ok: false, status: 409, erro: "Já existe uma temporada em andamento nesta liga." };
  }
  if (e.qtdeClubes < 16 || e.qtdeClubes % 2 !== 0) {
    return {
      ok: false,
      status: 409,
      erro: `A liga tem ${e.qtdeClubes} clubes; são necessários um número par ≥ 16 (esperado 20).`,
    };
  }
  return { ok: true, status: 200 };
}

export interface IniciarTemporadaResultado {
  temporadaId: string;
  numero: number;
  qtdePartidas: number;
  qtdeConfrontosCopa: number;
  clubesHumanos: number;
  inicio: Date;
  fimPrevisto: Date;
}

export async function iniciarTemporadaOficial(params: {
  ligaId: string;
  /** A partir de quando agendar (o gerador acha a 1ª quarta ≥ esta data). */
  dataInicio?: Date;
}): Promise<IniciarTemporadaResultado> {
  const liga = await prisma.liga.findUnique({ where: { id: params.ligaId } });
  const temporadaAtiva = await prisma.temporada.findFirst({
    where: { ligaId: params.ligaId, status: "EM_ANDAMENTO" },
    select: { id: true },
  });
  const clubes = await prisma.clube.findMany({
    where: { ligaId: params.ligaId },
    select: { id: true, tipo: true },
    orderBy: { criadoEm: "asc" },
  });

  const v = validarInicioTemporada({
    ligaExiste: !!liga,
    calendarioIniciado: liga?.calendarioIniciado ?? false,
    temTemporadaAtiva: !!temporadaAtiva,
    qtdeClubes: clubes.length,
  });
  if (!v.ok) throw new ErroInicio(v.status, v.erro as string);

  const humanos = clubes.filter((c) => c.tipo === "HUMANO").map((c) => c.id);

  // Copa Nacional da T1: humanos inscritos + sorteio de IA até 16 (R36).
  const copa = selecionarParticipantesCopa({
    todosClubesIds: clubes.map((c) => c.id),
    clubesHumanosIds: humanos,
    classificacaoAnteriorIds: null,
    seed: `${params.ligaId}:copa:t1`,
  });

  const dataInicio = params.dataInicio ?? new Date();
  const criada = await criarTemporadaComCalendario({
    ligaId: params.ligaId,
    numero: 1,
    dataInicio,
    seedSorteio: `${params.ligaId}:sorteio:t1`,
    copa,
  });

  await prisma.liga.update({
    where: { id: params.ligaId },
    data: { calendarioIniciado: true },
  });

  return {
    temporadaId: criada.temporadaId,
    numero: 1,
    qtdePartidas: criada.qtdePartidas,
    qtdeConfrontosCopa: criada.qtdeConfrontosCopa,
    clubesHumanos: humanos.length,
    inicio: criada.inicio,
    fimPrevisto: criada.fimPrevisto,
  };
}
