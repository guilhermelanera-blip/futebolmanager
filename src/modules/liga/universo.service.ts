// Persistência do universo gerado (universo.generator.ts) no banco.
// Cria: 1 Liga + N Clubes (tipo IA por padrão — humanos assumem depois,
// 07_MULTIPLAYER_ONLINE seção 2) + elenco profissional de 25 jogadores por
// clube, cada um com Contrato ativo.
//
// Todos os clubes nascem como IA e recebem um perfil de decisão
// (12_IA_DOS_CLUBES, seção 1). Quando um jogador humano assume um clube, o
// tipo passa a HUMANO (fluxo de entrada em liga — a implementar no módulo
// de conta/auth).

import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import { gerarUniverso } from "./universo.generator";

function addAnos(data: Date, anos: number): Date {
  const d = new Date(data);
  d.setFullYear(d.getFullYear() + anos);
  return d;
}

export interface CriarUniversoParams {
  nomeLiga: string;
  seed: string;
  qtdeClubes?: number;
  /** Data base dos contratos gerados (padrão: agora). */
  dataInicioContratos?: Date;
}

export interface CriarUniversoResultado {
  ligaId: string;
  qtdeClubes: number;
  qtdeJogadores: number;
}

export async function criarUniverso(
  params: CriarUniversoParams
): Promise<CriarUniversoResultado> {
  const universo = gerarUniverso({
    nomeLiga: params.nomeLiga,
    seed: params.seed,
    qtdeClubes: params.qtdeClubes,
  });
  const inicioContratos = params.dataInicioContratos ?? new Date();

  // timeout maior que o padrão (5s): a transação cria ~20 clubes + ~500
  // jogadores + ~500 contratos, e o padrão estoura fácil assim que o banco
  // deixa de ser local (latência de rede até o Postgres na nuvem).
  return prisma.$transaction(async (tx) => {
    const liga = await tx.liga.create({
      data: { nome: universo.nomeLiga },
    });

    const jogadoresData: any[] = [];
    const contratosData: any[] = [];

    for (const clubeUniverso of universo.clubes) {
      const folhaSemanal = clubeUniverso.elenco.reduce(
        (s, j) => s + j.salarioSemanal,
        0
      );

      const clube = await tx.clube.create({
        data: {
          ligaId: liga.id,
          nome: clubeUniverso.nome,
          cores: clubeUniverso.cores,
          tipo: "IA",
          perfilAgressividadeMercado: clubeUniverso.perfilIA.agressividadeMercado,
          perfilToleranciaRisco: clubeUniverso.perfilIA.toleranciaRisco,
          perfilPosturaTatica: clubeUniverso.perfilIA.posturaTatica,
          perfilValorizaJovens: clubeUniverso.perfilIA.valorizaJovens,
          perfilArquetipo: clubeUniverso.perfilIA.arquetipo,
          reputacao: clubeUniverso.reputacao,
          capacidadeEstadio: clubeUniverso.capacidadeEstadio,
          // Caixa inicial = ~10 semanas de folha + base fixa, para o clube
          // não falir antes do primeiro ciclo de receita. Placeholder de
          // balanceamento (11) — a calibrar por backtesting (02, seção 6)
          // junto da escala de salários e das receitas.
          saldoCaixa: Math.round(folhaSemanal * 10 + 3_000_000),
        },
      });

      for (const jog of clubeUniverso.elenco) {
        const jogadorId = randomUUID();
        jogadoresData.push({
          id: jogadorId,
          clubeId: clube.id,
          nome: jog.nome,
          idade: jog.idade,
          posicao: jog.posicao,
          ...jog.atributos,
          potencialOculto: jog.potencialOculto,
          moral: jog.moral,
          fadiga: jog.fadiga,
          formaRecente: jog.formaRecente,
          tracos: jog.tracos.join(","),
        });
        contratosData.push({
          id: randomUUID(),
          jogadorId,
          salarioSemanal: jog.salarioSemanal,
          inicio: inicioContratos,
          fim: addAnos(inicioContratos, jog.duracaoContratoAnos),
        });
      }
    }

    await tx.jogador.createMany({ data: jogadoresData });
    await tx.contrato.createMany({ data: contratosData });

    return {
      ligaId: liga.id,
      qtdeClubes: universo.clubes.length,
      qtdeJogadores: jogadoresData.length,
    };
  }, { timeout: 60_000, maxWait: 15_000 });
}
