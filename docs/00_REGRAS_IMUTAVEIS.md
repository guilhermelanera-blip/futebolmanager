# 00_REGRAS_IMUTAVEIS

**Versão:** 1.0
**Status:** Aprovado
**Propósito:** Este documento define as regras fundamentais e inegociáveis do projeto. Nenhum outro documento pode contradizê-lo. Qualquer alteração aqui exige aprovação explícita do responsável pelo projeto.

---

## 1. Natureza do produto

- **R1.** O jogo é um **Web App online**, multiplayer, persistente. Não é um jogo local/offline nem single-player isolado.
- **R2.** O servidor é **autoritativo**: toda simulação de partidas, avanço de calendário e resultados oficiais ocorrem no backend. O frontend apenas exibe informações e envia decisões do usuário — **nunca calcula nem pode manipular resultados**.
- **R3.** O universo é **persistente**: o tempo avança mesmo com o usuário offline, e evolui temporada após temporada sem "reset" implícito.

## 2. Geografia e licenciamento

- **R4.** O cenário geográfico é **real**: Brasil (Liga Nacional e Copa Nacional) e os 10 países da CONMEBOL (Copa Continental) — Brasil, Argentina, Uruguai, Paraguai, Chile, Bolívia, Peru, Equador, Colômbia, Venezuela.
- **R5.** Cidades e estados reais do Brasil podem ser usados como sede de clubes fictícios.
- **R6.** Todas as **entidades esportivas são 100% fictícias**: nomes de clubes, escudos, uniformes, jogadores, dirigentes, patrocinadores, nomes de competições, mascotes, apelidos. Nenhuma reprodução de marcas, nomes ou identidades reais existentes, nem variações óbvias/paródicas delas.
- **R7.** Nenhum jogador, técnico ou personalidade real (viva ou falecida) pode ser representado.

## 3. Multiplayer e escopo

- **R8.** Cada liga comporta **até 20 jogadores humanos simultâneos**, um clube por jogador.
- **R9.** Cada Liga Nacional tem **20 clubes na primeira divisão**. Clubes não controlados por humanos são geridos por IA.
- **R10.** Um jogador humano controla **exatamente um clube** por liga.
- **R32.** A arquitetura é desenhada para ser **multi-liga (escalável)**, mas a operação inicial roda **apenas 1 liga, com 20 clubes**.

## 4. Competições

- **R11.** Existe uma **Liga Nacional**.
- **R33.** Formato da Liga Nacional: pontos corridos, todos contra todos, **ida e volta**.
- **R37.** **Não há rebaixamento nem divisões inferiores** nesta primeira versão. A Liga Nacional é fechada, com 20 clubes fixos.
- **R12.** Existe uma **Copa Nacional**.
- **R34.** A Copa Nacional tem **16 clubes**, formato **mata-mata direto a partir das oitavas de final**, jogos de **ida e volta**, com **sorteio definindo o mando de campo** (qual clube joga o jogo de volta em casa) em cada confronto.
- **R35.** A partir da **Temporada 2**, os **4 últimos colocados da Liga Nacional na temporada anterior ficam de fora** da Copa Nacional (16 = 20 − 4).
- **R36.** Na **Temporada 1** (sem histórico anterior), participam **todos os clubes controlados por jogadores humanos** + um **sorteio de clubes de IA** para completar 16 vagas, quando o número de humanos for menor que 16.
- **R38 (revisada).** Se o número de clubes humanos ultrapassar 16, a Copa Nacional da Temporada 1 é **expandida** para comportar todos os clubes humanos (formato de bracket ajustado — detalhamento em `06_COMPETICOES_E_CALENDARIO`). A partir da T2, volta ao padrão fixo de 16.
- **R13.** A partir da **2ª temporada**, existe uma **Copa Continental** com **32 clubes**.
- **R14.** Os **5 melhores clubes** da Liga Nacional (temporada anterior) se classificam para a Copa Continental.
- **R15/R39 (revisada).** As demais **27 vagas** vêm dos outros 9 países da CONMEBOL, cada um com sua própria **liga fictícia simulada de 10 clubes**. Os **5 melhores** de cada liga estrangeira são pré-selecionados; a redução para as 27 vagas finais segue **cotas desiguais por país**, à semelhança do sistema de ranking de país usado na Libertadores real (tabela exata de cotas a ser definida em `06_COMPETICOES_E_CALENDARIO`).

## 5. Calendário e simulação

- **R16.** O calendário é **controlado pelo servidor** e acompanha o **tempo real** (dias reais = dias do jogo).
- **R17/R30.** Partidas da Liga Nacional ocorrem em dois dias fixos por semana: **quarta ou quinta às 21:00** (rodada de meio de semana) e **domingo às 15:00**.
- **R31.** Quando há rodada de Copa Nacional ou Copa Continental, ela **substitui a rodada de meio de semana** da liga (não há acúmulo de jogos no mesmo slot).
- **R18.** Usuários podem estar **online ou offline** no momento das partidas; o jogo ocorre de qualquer forma.
- **R19.** Partidas podem ser **acompanhadas em tempo real** pela internet (ao vivo, enquanto simuladas).

## 6. Papel da Inteligência Artificial

- **R20.** A IA pode **gerar narrativas, notícias e eventos de contexto**.
- **R21.** A IA **não pode decidir arbitrariamente resultados de partidas**. Resultados emergem exclusivamente do motor de simulação do servidor.
- **R22.** A IA também controla o comportamento de **clubes não-humanos** (tática, mercado, escalação), dentro das mesmas regras e motor que regem os clubes humanos — sem vantagens ocultas.
- **R40 (revisada).** Um jogador humano inativo por **14 dias corridos**, sem nenhuma ação de gestão, tem seu clube transferido para **gestão virtual de IA**, com poder irrestrito sobre o clube (tática, elenco, finanças etc.).

## 7. Profundidade de simulação

- **R23.** O jogo deve cobrir, no mínimo: jogadores (atributos e evolução), clubes, transferências, contratos, finanças, treinamento, tática, scouting, lesões, suspensões, moral, diretoria, torcida, notícias e histórico persistente.

## 8. Processo de documentação (meta-regras)

- **R24.** Nenhuma regra fundamental é alterada sem aprovação explícita.
- **R25.** Decisões de design ainda não fechadas são marcadas como **PENDENTE DE DECISÃO** — nunca assumidas silenciosamente.
- **R26.** Nenhum código é escrito na fase de documentação, exceto pequenos trechos ilustrativos quando necessários para explicar uma decisão técnica.
- **R27.** Todo documento distingue explicitamente: **Regras Definidas**, **Decisões Recomendadas** e **Pendente de Decisão**.
- **R28.** Toda mecânica relevante deve ser especificada de forma implementável sem ambiguidade.
- **R29.** A arquitetura deve permitir **começar pequeno e escalar** (ex.: 1 liga → múltiplas ligas; poucos usuários → até 20 simultâneos por liga).

---

## Pendências técnicas transferidas para `06_COMPETICOES_E_CALENDARIO`

Estas não são decisões de design em aberto, mas **detalhamentos numéricos** que decorrem das regras acima:

- **PT1.** Tabela exata de cotas por país da Copa Continental (27 vagas distribuídas de forma desigual entre 9 países).
- **PT2.** Formato exato do bracket expandido da Copa Nacional na T1, quando há mais de 16 clubes humanos.
- **PT3.** Duração exata da temporada em semanas/meses reais (calculável a partir de: 38 rodadas de liga + rodadas de copa/continental que substituem rodadas de meio de semana).
