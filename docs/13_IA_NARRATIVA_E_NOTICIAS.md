# 13_IA_NARRATIVA_E_NOTICIAS

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `02_GAME_DESIGN_DOCUMENT`, `03_MOTOR_DE_PARTIDAS`, `08_RELOGIO_E_SIMULACAO`, `11_FINANCAS`

---

## 1. Fontes de dados da IA narrativa

A IA narrativa tem acesso **somente leitura** a tudo que já foi decidido por outros sistemas:
- Resultados de partidas (`03`)
- Transferências concluídas (`09`)
- Lesões, cartões e suspensões (`04`)
- Votos do Conselho (`11`, seção 4)
- Marcos de carreira (estreia, gol de número X, aniversário)
- Classificação em competições (`06`)
- Situação financeira pública do clube (`11`)

A IA narrativa **nunca tem acesso de escrita** a nenhum sistema de jogo.

## 2. Tipos de conteúdo gerado

- Notícia de resultado (crônica da partida, baseada nos eventos reais gerados pelo motor `03`).
- Perfil de jogador em ascensão/declínio.
- Rumor de mercado (especulação explicitamente rotulada como não-confirmada — nunca afirmada como fato).
- Rivalidade entre clubes (narrativa construída sobre histórico real de confrontos).
- Crônica de temporada (retrospectivas, recordes do universo).

## 3. Tom e voz editorial

Equilíbrio "sério vs. dramático" definido no `01_VISAO_DO_PROJETO`: notícias de resultado/dados são factuais e diretas; perfis e crônicas de temporada podem ter tom mais narrativo/dramático, sem nunca contradizer os fatos do jogo.

## 4. Gatilhos de geração

- **Notícias pós-jogo**: geradas automaticamente após cada rodada (`08`, seção 3).
- **Notícias de mercado/lesão/suspensão**: geradas no momento em que o evento ocorre.
- **Crônicas de temporada**: geradas nos marcos de virada de temporada (`08`, seção 6).

## 5. Barreira de segurança (guardrail técnico)

- A IA narrativa opera em um **pipeline estritamente somente-leitura**: recebe um resumo estruturado dos eventos já decididos e gera texto a partir disso. **Não existe caminho técnico** pelo qual sua saída possa alimentar de volta o motor de partidas, o mercado ou qualquer sistema de decisão de jogo — R21 é garantido por **arquitetura**, não apenas por instrução.
- Toda saída da IA narrativa é armazenada como conteúdo de **notícia/texto**, isolada das tabelas de estado de jogo.
- Rumores especulativos são **sempre rotulados como especulação** na interface (ex.: selo "rumor não confirmado"), nunca apresentados com a mesma autoridade visual de um fato consumado.

## 6. Personalização por clube/jogador

Modelo **híbrido**:
- **Feed global**: manchetes do universo inteiro, visíveis a todos os jogadores (grandes resultados, marcos de competição, notícias de peso).
- **Seção específica do clube**: conteúdo focado no clube do próprio jogador (notícias sobre seu elenco, seu mercado, sua situação financeira, sua trajetória na temporada).

## 7. Arquivo histórico

Toda notícia gerada fica permanentemente registrada como parte da memória do universo (R3), consultável no histórico do clube, do jogador ou da competição correspondente.
