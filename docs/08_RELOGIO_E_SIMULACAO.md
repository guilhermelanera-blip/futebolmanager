# 08_RELOGIO_E_SIMULACAO

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `03_MOTOR_DE_PARTIDAS`, `06_COMPETICOES_E_CALENDARIO`

---

## 1. O "tick" diário do universo

O servidor roda um processo agendado que dispara **uma vez por dia**, independentemente de haver partida naquele dia. Esse tick processa:

- Recuperação/evolução de fadiga dos jogadores.
- Progressão de lesões (contagem de dias restantes de recuperação).
- Decaimento natural de moral em direção à neutralidade.
- Resolução de propostas de mercado com prazo vencendo no dia.
- Geração de notícias diárias, mesmo sem partida.

## 2. Disparo das partidas às 21h/15h

- O scheduler dispara **todas as partidas da rodada do dia simultaneamente**, no horário fixo definido em `00_REGRAS_IMUTAVEIS` (R30): quarta ou quinta às 21:00, domingo às 15:00.
- Cada partida se torna uma tarefa independente processada por um **match worker dedicado**, permitindo até 10 simulações paralelas ativas (liga com `03`, seção 11).

## 3. Ordem de processamento dentro de um dia

1. **Manutenção** — recuperação física, moral, fadiga.
2. **Fechamento de negociações** — propostas de mercado com prazo vencendo naquele dia.
3. **Notícias pré-jogo** — expectativas e escalações prováveis, se houver partida no dia.
4. **Disparo e execução das partidas agendadas.**
5. **Pós-jogo** — atualização de tabela, moral pós-resultado, lesões ocorridas, cartões acumulados, premiação.
6. **Notícias pós-jogo** — resultados, destaques, repercussão.

## 4. Resiliência

- Cada partida usa **seed determinístico** (`03`, seção 10) e grava **checkpoints periódicos de estado** durante a simulação, permitindo recuperação sem recomeçar do zero em caso de queda do servidor.
- O avanço do "dia do universo" (calendário) só é **confirmado/commitado após todas as partidas da rodada concluírem com sucesso** e seus resultados serem persistidos — isso evita estado inconsistente entre o calendário e os resultados reais das partidas.

## 5. Fuso horário

**America/Sao_Paulo (Horário de Brasília)** é o fuso horário oficial do servidor para todo o cálculo de calendário e disparo de eventos — regra definitiva.

## 6. Avanço de temporada

- A transição de temporada é **automática**, disparada quando todas as competições da temporada corrente (Liga Nacional, Copa Nacional, e Copa Continental quando aplicável) tiverem sido concluídas.
- O processo de virada de temporada inclui:
  - Cálculo de classificação final de todas as competições.
  - Definição dos clubes classificados para a próxima Copa Continental (R14/R15).
  - Evolução/declínio anual de atributos dos jogadores (`04`, seção 3).
  - Renovações e vencimentos de contrato.
  - Avanço de idade de todos os jogadores do universo.
  - Geração de nova leva de jovens nas categorias de base (`14_BASE_E_EVOLUCAO`).
  - Reabertura da janela principal de transferências de pré-temporada.
  - Reset das contagens de cartões acumulados por competição (`04`, seção 8).

## 7. Período de entressafra (pré-temporada)

- Duração fixa de **4 semanas** entre o fim de uma temporada e o início da próxima.
- Esse período concentra a **janela principal de transferências** (`02`, seção 2) e as atividades de preparação (ajuste de tática, pré-temporada de treinos, planejamento de elenco) antes do novo calendário oficial começar.
