-- CreateEnum
CREATE TYPE "TipoClube" AS ENUM ('HUMANO', 'IA', 'SAF');

-- CreateEnum
CREATE TYPE "Posicao" AS ENUM ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'PONTA', 'ATACANTE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "consentimentoEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadaEm" TIMESTAMP(3),

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogSeguranca" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuarioId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "detalhe" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogSeguranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liga" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "vagasHumanas" INTEGER NOT NULL DEFAULT 20,
    "calendarioIniciado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Liga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilaDeEspera" (
    "id" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendidaEm" TIMESTAMP(3),
    "clubeAtribuidoId" TEXT,

    CONSTRAINT "FilaDeEspera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clube" (
    "id" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cores" TEXT,
    "escudoUrl" TEXT,
    "tipo" "TipoClube" NOT NULL DEFAULT 'IA',
    "presidenteId" TEXT,
    "perfilAgressividadeMercado" DOUBLE PRECISION,
    "perfilToleranciaRisco" DOUBLE PRECISION,
    "perfilPosturaTatica" DOUBLE PRECISION,
    "perfilValorizaJovens" DOUBLE PRECISION,
    "perfilArquetipo" TEXT,
    "reputacao" INTEGER NOT NULL DEFAULT 50,
    "moralTorcida" INTEGER NOT NULL DEFAULT 50,
    "nivelEstadio" INTEGER NOT NULL DEFAULT 1,
    "nivelCT" INTEGER NOT NULL DEFAULT 1,
    "capacidadeEstadio" INTEGER NOT NULL DEFAULT 20000,
    "precoIngresso" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "saldoCaixa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasCaixaNegativoConsecutivos" INTEGER NOT NULL DEFAULT 0,
    "folhaEmAtraso" BOOLEAN NOT NULL DEFAULT false,
    "relacaoConselho" INTEGER NOT NULL DEFAULT 70,
    "ultimaAcaoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaFinanceiro" (
    "id" TEXT NOT NULL,
    "clubeId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalhe" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" TIMESTAMP(3),

    CONSTRAINT "AlertaFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotoConselho" (
    "id" TEXT NOT NULL,
    "clubeId" TEXT NOT NULL,
    "operacao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "limite" DOUBLE PRECISION NOT NULL,
    "detalhe" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotoConselho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoFinanceira" (
    "id" TEXT NOT NULL,
    "clubeId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "saldoApos" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL,
    "temporadaId" TEXT,
    "partidaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jogador" (
    "id" TEXT NOT NULL,
    "clubeId" TEXT,
    "nome" TEXT NOT NULL,
    "idade" INTEGER NOT NULL,
    "posicao" "Posicao" NOT NULL,
    "finalizacao" INTEGER NOT NULL DEFAULT 10,
    "passe" INTEGER NOT NULL DEFAULT 10,
    "drible" INTEGER NOT NULL DEFAULT 10,
    "cabeceio" INTEGER NOT NULL DEFAULT 10,
    "cruzamento" INTEGER NOT NULL DEFAULT 10,
    "marcacao" INTEGER NOT NULL DEFAULT 10,
    "desarme" INTEGER NOT NULL DEFAULT 10,
    "velocidade" INTEGER NOT NULL DEFAULT 10,
    "resistencia" INTEGER NOT NULL DEFAULT 10,
    "forca" INTEGER NOT NULL DEFAULT 10,
    "visaoDeJogo" INTEGER NOT NULL DEFAULT 10,
    "posicionamento" INTEGER NOT NULL DEFAULT 10,
    "reflexos" INTEGER NOT NULL DEFAULT 10,
    "saidaDeGol" INTEGER NOT NULL DEFAULT 10,
    "potencialOculto" INTEGER NOT NULL DEFAULT 10,
    "moral" INTEGER NOT NULL DEFAULT 60,
    "fadiga" INTEGER NOT NULL DEFAULT 0,
    "formaRecente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tracos" TEXT NOT NULL DEFAULT '',
    "ultimaEvolucaoTemporadaId" TEXT,
    "emprestadoDeClubeId" TEXT,
    "emprestimoFim" TIMESTAMP(3),
    "emprestimoPercSalario" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesao" (
    "id" TEXT NOT NULL,
    "jogadorId" TEXT NOT NULL,
    "gravidade" TEXT NOT NULL,
    "diasTotais" INTEGER NOT NULL,
    "diasRestantes" INTEGER NOT NULL,
    "origem" TEXT NOT NULL,
    "partidaId" TEXT,
    "inicioEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',

    CONSTRAINT "Lesao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "jogadorId" TEXT NOT NULL,
    "salarioSemanal" DOUBLE PRECISION NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "clausulaRescisao" DOUBLE PRECISION,
    "luvas" DOUBLE PRECISION,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusContrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "meta" INTEGER NOT NULL DEFAULT 1,
    "valor" DOUBLE PRECISION NOT NULL,
    "pagoEm" TIMESTAMP(3),
    "temporadaPagaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellOn" (
    "id" TEXT NOT NULL,
    "jogadorId" TEXT NOT NULL,
    "clubeBeneficiarioId" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "origemTransferenciaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Temporada" (
    "id" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fimPrevisto" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',

    CONSTRAINT "Temporada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfrontoCopa" (
    "id" TEXT NOT NULL,
    "temporadaId" TEXT NOT NULL,
    "fase" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "jogoUnico" BOOLEAN NOT NULL DEFAULT false,
    "clubeAId" TEXT,
    "clubeBId" TEXT,
    "mandoVoltaClubeId" TEXT,
    "dataIdaPrevista" TIMESTAMP(3),
    "dataVoltaPrevista" TIMESTAMP(3),
    "partidaIdaId" TEXT,
    "partidaVoltaId" TEXT,
    "golsAgregadoA" INTEGER,
    "golsAgregadoB" INTEGER,
    "penaltisA" INTEGER,
    "penaltisB" INTEGER,
    "vencedorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfrontoCopa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" TEXT NOT NULL,
    "temporadaId" TEXT NOT NULL,
    "competicao" TEXT NOT NULL DEFAULT 'LIGA_NACIONAL',
    "rodada" INTEGER NOT NULL,
    "confrontoCopaId" TEXT,
    "mandanteId" TEXT NOT NULL,
    "visitanteId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "seed" TEXT NOT NULL,
    "golsMandante" INTEGER,
    "golsVisitante" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'AGENDADA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoPartida" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "minuto" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "clubeId" TEXT,
    "jogadorId" TEXT,
    "detalhe" TEXT,

    CONSTRAINT "EventoPartida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferenciaMercado" (
    "id" TEXT NOT NULL,
    "jogadorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clubeProponenteId" TEXT NOT NULL,
    "clubeDetentorId" TEXT,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emprestimoFim" TIMESTAMP(3),
    "emprestimoPercSalarioTomador" DOUBLE PRECISION,
    "salarioSemanal" DOUBLE PRECISION NOT NULL,
    "duracaoAnos" INTEGER NOT NULL,
    "luvas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clausulaRescisao" DOUBLE PRECISION,
    "sellOnPercentual" DOUBLE PRECISION,
    "bonusJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO_DETENTOR',
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "concluidaEm" TIMESTAMP(3),

    CONSTRAINT "TransferenciaMercado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemChat" (
    "id" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "conversaId" TEXT,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removidaEm" TIMESTAMP(3),

    CONSTRAINT "MensagemChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DenunciaChat" (
    "id" TEXT NOT NULL,
    "mensagemId" TEXT NOT NULL,
    "denuncianteId" TEXT NOT NULL,
    "motivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DenunciaChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametroConfiguravel" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "ParametroConfiguravel_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sessao_token_key" ON "Sessao"("token");

-- CreateIndex
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

-- CreateIndex
CREATE INDEX "LogSeguranca_tipo_criadoEm_idx" ON "LogSeguranca"("tipo", "criadoEm");

-- CreateIndex
CREATE INDEX "FilaDeEspera_ligaId_status_criadoEm_idx" ON "FilaDeEspera"("ligaId", "status", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "FilaDeEspera_ligaId_usuarioId_status_key" ON "FilaDeEspera"("ligaId", "usuarioId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Clube_presidenteId_key" ON "Clube"("presidenteId");

-- CreateIndex
CREATE INDEX "AlertaFinanceiro_clubeId_resolvidoEm_idx" ON "AlertaFinanceiro"("clubeId", "resolvidoEm");

-- CreateIndex
CREATE INDEX "VotoConselho_clubeId_criadoEm_idx" ON "VotoConselho"("clubeId", "criadoEm");

-- CreateIndex
CREATE INDEX "MovimentacaoFinanceira_clubeId_criadoEm_idx" ON "MovimentacaoFinanceira"("clubeId", "criadoEm");

-- CreateIndex
CREATE INDEX "Lesao_status_idx" ON "Lesao"("status");

-- CreateIndex
CREATE INDEX "Lesao_jogadorId_status_idx" ON "Lesao"("jogadorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_jogadorId_key" ON "Contrato"("jogadorId");

-- CreateIndex
CREATE INDEX "BonusContrato_contratoId_idx" ON "BonusContrato"("contratoId");

-- CreateIndex
CREATE INDEX "SellOn_jogadorId_idx" ON "SellOn"("jogadorId");

-- CreateIndex
CREATE INDEX "SellOn_clubeBeneficiarioId_idx" ON "SellOn"("clubeBeneficiarioId");

-- CreateIndex
CREATE INDEX "ConfrontoCopa_temporadaId_fase_ordem_idx" ON "ConfrontoCopa"("temporadaId", "fase", "ordem");

-- CreateIndex
CREATE INDEX "ConfrontoCopa_temporadaId_status_idx" ON "ConfrontoCopa"("temporadaId", "status");

-- CreateIndex
CREATE INDEX "TransferenciaMercado_status_expiraEm_idx" ON "TransferenciaMercado"("status", "expiraEm");

-- CreateIndex
CREATE INDEX "TransferenciaMercado_jogadorId_status_idx" ON "TransferenciaMercado"("jogadorId", "status");

-- CreateIndex
CREATE INDEX "TransferenciaMercado_clubeProponenteId_status_idx" ON "TransferenciaMercado"("clubeProponenteId", "status");

-- CreateIndex
CREATE INDEX "MensagemChat_ligaId_canal_criadoEm_idx" ON "MensagemChat"("ligaId", "canal", "criadoEm");

-- CreateIndex
CREATE INDEX "MensagemChat_conversaId_criadoEm_idx" ON "MensagemChat"("conversaId", "criadoEm");

-- CreateIndex
CREATE INDEX "DenunciaChat_status_criadoEm_idx" ON "DenunciaChat"("status", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "DenunciaChat_mensagemId_denuncianteId_key" ON "DenunciaChat"("mensagemId", "denuncianteId");

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaDeEspera" ADD CONSTRAINT "FilaDeEspera_ligaId_fkey" FOREIGN KEY ("ligaId") REFERENCES "Liga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaDeEspera" ADD CONSTRAINT "FilaDeEspera_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clube" ADD CONSTRAINT "Clube_ligaId_fkey" FOREIGN KEY ("ligaId") REFERENCES "Liga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clube" ADD CONSTRAINT "Clube_presidenteId_fkey" FOREIGN KEY ("presidenteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaFinanceiro" ADD CONSTRAINT "AlertaFinanceiro_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoConselho" ADD CONSTRAINT "VotoConselho_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogador" ADD CONSTRAINT "Jogador_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesao" ADD CONSTRAINT "Lesao_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusContrato" ADD CONSTRAINT "BonusContrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Temporada" ADD CONSTRAINT "Temporada_ligaId_fkey" FOREIGN KEY ("ligaId") REFERENCES "Liga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfrontoCopa" ADD CONSTRAINT "ConfrontoCopa_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_mandanteId_fkey" FOREIGN KEY ("mandanteId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_visitanteId_fkey" FOREIGN KEY ("visitanteId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPartida" ADD CONSTRAINT "EventoPartida_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenunciaChat" ADD CONSTRAINT "DenunciaChat_mensagemId_fkey" FOREIGN KEY ("mensagemId") REFERENCES "MensagemChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
