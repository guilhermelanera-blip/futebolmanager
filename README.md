# Futebol Manager — Backend

Implementação do simulador de gestão de futebol multiplayer descrito na
documentação completa em `/docs` (22 documentos, `00` a `21`). Este README
reflete o estado da implementação **agora**, seguindo a ordem de fases do
`20_ROADMAP`.

## Status atual: Fase 1 completa; Fase 2 quase completa

Fase 2 pronto: Copa Nacional, início oficial do calendário, chat da liga +
particular, modo espectador público, personalização de clube, alertas
financeiros multi-nível + Conselho, bônus de desempenho + sell-on fee,
perfis de personalidade de IA (`12` §1) e traços de jogador (`04` §10).
**Falta**: sistema de base/juniores (`14`).

**Cliente web** (`15_INTERFACE_E_UX`) — protótipo clicável em `web/`
(React + Vite + TypeScript). Telas: **login**, **painel** (próximo jogo,
ações pendentes, notícias, situação na tabela), **elenco** (nome/posição/OVR
em duas colunas — Defesa | Meio e ataque — com `*` no craque e uma
camisa/número ao lado da posição, ordenável por posição ou OVR, ao lado de
uma prancheta 4-3-3 fina editável (clique/arrastar, XI persistido) com um
modal **"Táticas do time"** (formação + postura, `10` §1); **ficha do
jogador** (`/jogador/:id`, aberta pelo nome no elenco: camisa do clube com
o número, os 14 atributos da Fase 1 em barras por setor com os
atributos-chave da posição destacados — `04` §2 — valor, salário,
contrato, moral/fadiga, traços, e campos para **apelido**, **número** e um
modal **"Táticas do jogador"** com a instrução individual por posição),
**calendário**, **tabela** + artilharia, **súmula da partida** (`03`:
placar, lance a lance com jogador e minuto, números da partida),
**partida ao vivo** (`/ao-vivo`): placar grande estilo CM 03/04 com as
cores dos times em degradê, **narração lance a lance em texto** colorida
pela cor do time com a bola (roteiro determinístico com modelo de fluxo
posse/zona + os eventos reais da súmula), e a **cena em 2D só nos lances
decisivos** — gol, trave, grande chance, defesaça, falta dura, cartão
vermelho — por ~5 s; entre eles, uma barra de posse/território. A partida
agendada pelo painel para um horário real roda ~7 min e ao terminar revela
a rodada. **mercado**
(propostas enviadas/recebidas + busca de jogadores num modal com filtros),
**estádio** (nome, desenho, capacidade, naming rights) e **finanças**
(valores mensais). Responsivo, tema claro/escuro/automático. Barra lateral
de navegação recolhida em ícones, abre no hover; cabeçalho com o nome do
clube (ou do jogador, na ficha) em todas as telas.

Ainda **não** fala com a API HTTP: consome `web/src/mock/estado.json`,
gerado por `src/scripts/gerarMockWeb.ts` (`npm run mock:web`) — roda os
módulos puros do backend, resolve as 38 rodadas da Temporada 1 (a tela
mostra até a 12ª) e monta as súmulas dos 38 jogos do clube do jogador.
`web/src/api/client.ts` deriva tabela, artilharia, forma e calendário
para a rodada corrente a partir dessa simulação.
Próximo passo do front: trocar `web/src/api/client.ts` (camada mock) por
chamadas `fetch` em `/v1/...`, tela a tela. Rodar:
`cd web && npm install && npm run dev` (porta 5173).

O que já existe e funciona:

- **Schema de banco de dados** (`prisma/schema.prisma`) cobrindo o escopo da
  Fase 1: Usuário, Liga, Clube, Jogador, Contrato, Temporada, Partida,
  Evento de Partida, Transferência de Mercado, Parâmetro Configurável.
  (Base/juniores, Copa Nacional/Continental, chat e notícias ficam para
  fases seguintes, conforme `20_ROADMAP`.)
- **Motor de partida simplificado** (`src/modules/partida/engine/simulateMatch.ts`):
  versão estatística pura da Fase 1, **sem** posicionamento 2D e **sem**
  interação ao vivo (isso é Fase 3, ver `03_MOTOR_DE_PARTIDAS`). Já cumpre
  a garantia mais importante do projeto: **resultado 100% determinado pelo
  servidor, com seed determinístico e totalmente auditável (R21)**.
  Testado em `simulateMatch.test.ts`.
- **Geração inicial do universo** (`src/modules/liga/`, `04` seção 9 /
  `16` seção 6): gera 1 liga + 20 clubes de IA (nomes 100% fictícios,
  R6/R7) com elenco profissional de 25 jogadores cada, atributos
  distribuídos por curva de idade (`04` seção 3) e nível do clube.
  Determinístico por seed. Nomes fictícios em `src/utils/nomesFicticios.ts`
  (com blocklist anti-colisão com marcas reais).
- **Calendário da Liga Nacional** (`src/modules/competicao/`, `06` seção 1):
  round-robin ida e volta pelo método do círculo (38 rodadas), sorteio
  inicial de confrontos com seed, agendado nos slots fixos de R30
  (quarta 21h / domingo 15h, `America/Sao_Paulo`).
- **Classificação** (`src/modules/competicao/classificacao.service.ts`):
  pontos corridos (3/1/0), sempre recalculada a partir das partidas
  encerradas — nunca persistida (`16` seção 3).
- **Autenticação real** (`src/modules/conta/`, `07` seção 1 / `18` seções 1,
  4-6): cadastro e login por e-mail/senha (hash bcrypt), sessão por token
  opaco com expiração (revogável), consentimento LGPD no cadastro, exclusão
  de conta (LGPD art. 18), log de segurança separado dos logs de jogo.
  Middleware `autenticar` (`src/middleware/autenticar.ts`) protege as rotas
  de escrita; `PATCH /v1/clube/:id` agora valida o presidente pelo token
  (R2), sem mais o placeholder `x-usuario-id`.
- **Entrada em liga** (`src/modules/liga/liga.service.ts`, `07` seção 2):
  `POST /v1/liga/:ligaId/assumir` — um humano assume um clube de IA livre
  (escolhido ou sorteado), `tipo` vira `HUMANO`. Respeita R10 (um clube por
  humano/liga), o fechamento das inscrições após o início do calendário e a
  regra de que clube-SAF não volta ao pool humano (`05` seção 8).
- **Finanças básicas** (`src/modules/financas/`, `11` — Fase 1):
  - Razão financeiro append-only (`MovimentacaoFinanceira`); `saldoCaixa` é
    a projeção derivada (`16` §§3-4).
  - Receitas: **bilheteria** do mandante a cada jogo em casa (público =
    capacidade × ocupação, modulada por moral da torcida, reputação e
    elasticidade do preço do ingresso) e **patrocínio** semanal (~reputação).
    Premiação da Liga por colocação: calculador pronto, ligado à virada de
    temporada (ainda não implementada).
  - Despesas semanais: **folha salarial** e **manutenção** de estádio/CT.
  - **Falência pelo critério de caixa** (`11` §6): caixa negativo por N dias
    consecutivos (padrão 30) **e** folha do mês em atraso → clube vira SAF
    (`05` §7, `12` §4); se havia humano, ele é reatribuído a um clube de IA
    livre — ou, se não houver, à válvula de segurança do pior clube-SAF
    (`05` §8.1).
  - Todos os números são `ParametroConfiguravel` central (`11` §0),
    semeados por `npm run seed`. Alertas multi-nível e voto do Conselho
    ficam para a Fase 2 (`20_ROADMAP`), mas as chaves já são semeadas.
  - Ciclos rodam no scheduler: semanal (segunda 4h) e diário (0h05) —
    fatia financeira do tick de `08` §1, a ser absorvida pelo tick diário
    completo depois.
  - API: `GET /v1/financas/clube/:id` (painel, só o presidente) e
    `PATCH /v1/financas/clube/:id/preco-ingresso`.
- **Mercado de transferências** (`src/modules/mercado/`, `09` §§1-3 — Fase 1):
  - Três tipos: **COMPRA** definitiva (à vista), **LIVRE** (agente sem
    contrato, a qualquer momento) e **EMPRESTIMO** simples (com divisão de
    salário; jogador volta ao dono no fim).
  - Fluxo `09` §2: proponente → detentor (aceita/recusa/**contrapropõe**) →
    negociação com o **jogador** (decisão da IA por salário/ambição/valor de
    mercado). Clube e jogador de IA respondem automaticamente; humanos via
    endpoints. Proposta expira no prazo (`mercado.prazoPropostaDias`, 4).
  - **Valor de mercado** (`09` §7): overall por posição, potencial, idade,
    forma, tempo de contrato, escassez por posição na liga.
  - **Janelas** (`09` §6): principal (4 semanas antes do início da
    temporada) e intermediária (3 semanas no meio); fora delas, só LIVRE.
  - Efetivação move o dinheiro pelo razão financeiro (taxa + luvas do
    proponente; taxa para o detentor) e troca o contrato.
  - API: `POST /v1/mercado/propostas`, `.../:id/detentor`,
    `.../:id/proponente`, `.../:id/cancelar`,
    `GET /v1/mercado/clube/:id/propostas`,
    `GET /v1/mercado/jogador/:id/valor`.
- **Inatividade → gestão virtual** (`src/modules/liga/inatividade.*`, R40 /
  `07` §2): clube de humano sem **nenhuma ação de gestão** por 14 dias
  corridos (alterar clube, preço de ingresso, propor/responder no mercado,
  assumir) volta a ser clube de IA comum (`tipo IA`, sem presidente — **não**
  vira SAF). A vaga é oferecida na hora ao primeiro da **fila de espera**
  (`FilaDeEspera`, `16` §1). API: `GET/POST/DELETE /v1/liga/:id/fila`.
  Após o início do calendário, a fila é o único caminho de entrada e um
  passo de reconciliação diário garante que vagas livres sejam preenchidas.
- **Tick diário do universo** (`src/scheduler/tickDiario.ts`, `08` §1, na
  ordem da §3): uma rotina única que roda todo dia e consolida o que antes
  eram crons soltos —
  1. **Manutenção** (`src/modules/universo/manutencaoDiaria.service.ts`):
     recuperação de fadiga, decaimento de moral (jogador → 60, torcida →
     50) e **progressão de lesões** (contagem regressiva; alta ao chegar a
     0). Fadiga/moral em massa via SQL.
  2. **Fechamento de negociações**: propostas de mercado vencidas + fim de
     empréstimos.
  3. **Inatividade** (R40): gestão virtual + fila de espera.
  4. **Finanças diárias**: contador de caixa negativo + falência.
  - A cada partida, os eventos (gol/cartão/lesão) passam a ser **atribuídos
    a jogadores** de forma determinística pelo seed (`03` §10); cada `LESAO`
    vira um registro `Lesao` com gravidade e janela de recuperação sorteadas
    (`04` §7); os dois elencos acumulam fadiga (`04` §6).
- **Virada de temporada** (`src/modules/competicao/viradaDeTemporada.service.ts`,
  `08` §6): disparo **automático** quando toda a Liga Nacional da temporada
  corrente terminou (rodado no tick diário, no-op enquanto está em disputa).
  Faz: premiação da Liga por colocação final (`calcularPremiacaoLiga`);
  avanço de idade (+1) e **evolução/declínio anual de atributos**
  (`src/modules/jogador/evolucao.regras.ts`, `04` §3 — formação/ascensão/
  pico/declínio, físico cai mais rápido, potencial é teto, moral modula);
  vencimento/renovação de contratos (IA renova 2 anos ou libera veterano
  excedente; clube humano renova 1 ano no automático); encerra a temporada e
  cria a próxima após **4 semanas de entressafra** (`08` §7) — o que reabre a
  janela principal de transferências (`09` §6). Idempotente
  (`Jogador.ultimaEvolucaoTemporadaId`, checagem de premiação já paga). A
  virada só ocorre quando **Liga e Copa** terminaram (`08` §6).

### Fase 2 (em andamento)

- **Copa Nacional** (`src/modules/competicao/copa.*`, `00` R34/R36, `06` §2):
  - **Seleção de participantes** (`copa.participantes.ts`): T2+ = 16 melhores
    da Liga da temporada anterior, seeding pela classificação (os 4 últimos
    ficam de fora, R35); T1 = clubes humanos + sorteio de IA até 16 (R36).
  - **Bracket** (`copa.bracket.ts`): mata-mata a partir das oitavas, ida e
    volta, sorteio define quem joga a volta em casa (R34); empate no
    agregado → pênaltis determinísticos. Chaveamento por seed (cabeças de
    chave só se cruzam no fim).
  - **Calendário interleaved** (`calendario.plano.ts`): uma rodada de Copa
    **substitui** o slot de meio de semana da liga naquela semana (R31); as
    rodadas de liga deslocadas empurram o fim da temporada (T2+ ≈ 23
    semanas). Domingo é sempre liga.
  - **Avanço automático** (`copa.service.ts`): ao encerrar a partida de
    volta de um confronto, apura o agregado, define o vencedor, e — quando
    toda a fase termina — monta a fase seguinte (com datas já reservadas) e
    paga a premiação por fase alcançada (`11` §1).
  - API: `GET /v1/competicao/temporada/:id/copa` (chaveamento).
- **API REST** (`src/modules/*/*.routes.ts`): Conta, Liga (+ fila), Clube,
  Jogador, Partida, Competição (+ Copa), Finanças e Mercado.
- **Scheduler** (`src/scheduler/matchDispatcher.ts`): partidas nos horários
  de R30; **tick diário** às 0h05 (manutenção → mercado → inatividade →
  finanças → virada de temporada); ciclo semanal de finanças (segunda 4h).
- **Script de bootstrap** (`npm run seed`): semeia parâmetros + cria universo
  + Temporada 1 com calendário de liga **e Copa Nacional** (sorteio de 16
    clubes de IA — ver pendência abaixo).

## Próximos passos

**Copa Nacional — verificada ponta a ponta**
Rodada contra um Postgres efêmero: T1 com 380 jogos de liga + 30 de Copa
(15 confrontos), bracket avançando por todas as fases, pênaltis no empate do
agregado, premiação por fase, virada de temporada disparando só após Liga +
Copa, e a T2 criada com a Copa a partir do top-16. Dois bugs achados e
corrigidos nessa rodada: a idempotência da premiação da Liga colidia com a
da Copa (mesma temporada), e a query de evolução anual excluía jogadores com
`ultimaEvolucaoTemporadaId` nulo.

- **Início oficial do calendário** (`07` §2) — **feito**:
  `src/modules/liga/inicioTemporada.service.ts`. `npm run seed` só cria o
  universo; `npm run iniciar` / `POST /v1/liga/:id/iniciar` fecha as
  inscrições (`Liga.calendarioIniciado`), monta a Copa com os clubes
  humanos inscritos (R36) e cria a T1. Verificado ponta a ponta: os clubes
  humanos entram na Copa mesmo sendo fracos; `/assumir` trava depois.

O que ainda falta na Copa:
- **Bracket expandido da T1 com 17-20 humanos** (R38): não suportado —
  `selecionarParticipantesCopa` lança erro. Precisa de rodada preliminar
  sobre o excedente (o esqueleto de 32 em `copa.bracket.ts` /
  `calendario.plano.ts` fica para isso).

**Resto da Fase 2** (`20_ROADMAP`)
- ~~Chat da liga + chat particular (`07` §4)~~ — **feito**
  (`src/modules/chat/`): canal de grupo da liga + conversas 1:1 entre
  presidentes, com **filtro de conteúdo** (`18` §3, lista editável em
  `ParametroConfiguravel`) e **denúncia** de mensagem. Transporte REST com
  paginação por cursor de tempo (`?antesDe=`); autor pode remover a própria
  mensagem (soft-delete). Entrega instantânea via WebSocket (`17` §3) fica
  para quando o gateway de tempo real existir. API: `POST/GET
  /v1/chat/liga/:ligaId`, `POST /v1/chat/particular/:ligaId/:destId`,
  `GET /v1/chat/particular/:outroId`, `GET /v1/chat/conversas`,
  `POST /v1/chat/mensagens/:id/denuncia`, `DELETE /v1/chat/mensagens/:id`.
- ~~Modo espectador público (`07` §5)~~ — **feito**: os endpoints de
  leitura já eram públicos; adicionados `GET /v1/partida/ao-vivo` (central
  de jogos: em andamento / próximos 48h / encerrados nas últimas 24h),
  súmula pública enriquecida em `GET /v1/partida/:id` (nomes de clube e
  jogador nos eventos, agregado da Copa) e
  `GET /v1/competicao/temporada/:id/artilharia` (gols por jogador, agora
  que os eventos são atribuídos). Transmissão 2D ao vivo continua Fase 3.
- ~~Personalização de nome/escudo de clube (`05` §1)~~ — **feito**:
  `PATCH /v1/clube/:id` (nome/cores/escudoUrl) agora passa por moderação
  (`src/modules/clube/identidade.regras.ts`): filtro de linguagem (`18` §3,
  mesma lista do chat) + bloqueio de nome que remeta a marca real (R6/R7),
  formato de cores `#rrggbb[/#rrggbb]`, escudo só `https`.
- Sistema de base e evolução (`14`).
- ~~Perfis de personalidade de clubes de IA (`12` §1)~~ — **feito**
  (`src/modules/clube/perfilIA.ts`): cada clube de IA tem um **arquétipo**
  (`GASTADOR`, `FORMADOR`, `CONSERVADOR`, `AMBICIOSO`, `EQUILIBRADO`) que
  define os 4 eixos (agressividade de mercado, tolerância a risco, postura
  tática, valorização de jovens). Ligado a: **postura do time no motor de
  partida** (clube de IA joga def/eq/ofe conforme o perfil), **preço de
  venda** de jovem vs. veterano na resposta a propostas, **idade de corte
  para dispensa** na renovação de contratos da virada.
- ~~Traços de personalidade de jogadores (`04` §10)~~ — **feito**
  (`src/modules/jogador/tracos.ts`): catálogo de 10 traços com efeitos
  numéricos (`GOLEADOR`/`MURALHA`/`MOTOR`/`MAESTRO`/`XERIFE` → bônus de
  atributo aplicados antes do motor; `REFERENCIA_VESTIARIO`/`LIDER` → +moral
  do elenco no tick diário; `PROPENSO_LESAO` → mais chance de se lesionar e
  recuperação mais lenta; `FRIO_NOS_PENALTIS` → bônus em disputa de
  pênaltis da Copa; `INCONSISTENTE` → hook para a variância de forma, ainda
  sem sistema de forma para ligar). Atribuídos na geração (a maioria dos
  jogadores sem nenhum, ~31% com 1, ~7% com 2), por posição. `npm run
  backtest` já reflete traços + posturas — as metas do Brasileirão seguem
  batendo.
- ~~Bônus de desempenho e sell-on fee no mercado (`09` §4)~~ — **feito**:
  - Proposta de **COMPRA/LIVRE** aceita `bonus: [{tipo, meta, valor}]`
    (`GOLS_NA_TEMPORADA`, `TITULO_LIGA`, `TITULO_COPA`) → viram
    `BonusContrato` no contrato novo, **pagos na virada de temporada** se a
    meta foi batida (recorrente: um bônus de gols pode pagar toda temporada).
  - Proposta de **COMPRA** aceita `sellOnPercentual` (0..0,4) → o clube
    vendedor retém esse % de uma **revenda futura** (`SellOn`); numa venda
    definitiva com taxa, o vendedor repassa `% × taxa` aos beneficiários
    (`RECEITA_MAIS_VALIA` / `DESPESA_MAIS_VALIA`) e as cláusulas se encerram.
    Sell-on morre se o jogador sai de graça.
  - `GET /v1/jogador/:id` passou a incluir `contrato.bonus` e `sellOns`.
  - "Jogos disputados" como meta de bônus fica para quando o motor escalar
    um XI (não há registro de quem entrou em campo na Fase 2).
- ~~Alertas financeiros multi-nível + voto do Conselho (`11` §§4-5)~~ —
  **feito**:
  - **Alertas** (`src/modules/financas/alertas.calc.ts`): N1 (projeção de
    caixa fica negativa em X dias), N2 (dívida > Y× receita anual), N3
    (caixa negativo há Z dias e/ou folha do mês em atraso). Reconciliados no
    tick diário — um alerta fica aberto enquanto a condição persiste e é
    resolvido quando some. `GET /v1/financas/clube/:id/alertas`.
  - **Critério de dívida para falência** (`11` §6): agora além do critério
    de caixa, `dívida > 2× receita anual estimada` também declara falência.
  - **Voto do Conselho** (`11` §4): um gasto único acima de 40% da receita
    anual estimada gera um **voto formal contra** — registrado, com queda de
    ~6 pontos na `relacaoConselho` (recupera devagar) — mas **não bloqueia**
    a operação (Conselho nunca tem veto, `02` §4). Disparado na efetivação
    de compras no mercado. `GET /v1/financas/clube/:id/conselho`.
  - "Dívida" = quanto o caixa está negativo (não há empréstimo bancário no
    modelo); "receita anual" é anualizada do histórico (0 com < 7 dias de
    dados). O painel financeiro passou a incluir `alertas`, `conselho` e
    `receitaAnualEstimada`.

**Pendências herdadas da Fase 1**
- Enforcement de suspensão por cartões (`04` §8) — depende do motor escalar
  um XI (Fase 3).
- Calibração das **finanças** e do **valor de mercado** — ainda por fazer
  (o motor de partida já foi calibrado, ver abaixo).

## Calibração do motor de partida (`02` §6)

O motor (`src/modules/partida/engine/simulateMatch.ts`, bloco `PARAMS`) foi
ajustado por backtesting para reproduzir o Campeonato Brasileiro Série A
recente. `npm run backtest [n_temporadas] [seed]` roda N temporadas só com
IA e compara com as metas:

| Indicador | Meta (Série A) | Backtest (média, 40 temporadas) |
|---|---|---|
| Gols por jogo | 2,3–2,7 | ~2,5 |
| Vitória do mandante | 44–52% | ~49% |
| Empate | 24–30% | ~24–25% |
| Vitória do visitante | 22–28% | ~27% |
| Pontos do campeão | 70–84 | ~74–76 |
| Pontos da lanterna | 26–36 | ~30–32 |
| Cartões amarelos por jogo | 4,2–6,0 | ~5,0 |
| Cartão vermelho por jogo | 0,18–0,42 | ~0,30 |

Campeões distintos: 8–10 clubes em 40 temporadas (a concentração varia com
o universo sorteado — alguns têm um clube claramente mais forte, outros
não). ~8% dos jogos terminam 0-0.

## Pendências de detalhe resolvidas com valores provisórios (a validar)

Seguindo `21_PROMPT_MESTRE_CLAUDE` seção 4 — resolvidas no código, comentadas
e listadas aqui para validação do responsável:

- **Nome fictício da Liga Nacional** (`02` §7): usando o rótulo descritivo
  "Liga Nacional". Falta o nome de marca definitivo.
- **Algoritmo de geração de calendário** (`06` §6, PT10): método do círculo
  para a liga; para o interleave com a Copa, cada fase ocupa 2 semanas de
  quarta consecutivas com ~5 semanas entre o início de fases seguidas
  (`calendario.plano.ts`). T2+ ≈ 23 semanas.
- **Copa Nacional — chaveamento e desempate** (`06` §2 fixa só o sorteio de
  mando): pareamento por seed (classificação na T2+, sorteio na T1);
  empate no agregado → pênaltis determinísticos (sem regra de gol fora).
- **Copa Nacional — premiação por fase** (`11` §1 não dá valores): campeão
  20M, vice 8M, semi 4M, quartas 2M, oitavas 1M, preliminar 300k — em
  `parametros.ts`. Cada clube recebe exatamente um prêmio de Copa por
  temporada (na eliminação, ou campeão/vice na final).
- **Distribuição mínima por posição no elenco** (`05` §2): 3 GOL / 5 ZAG /
  4 LAT / 4 VOL / 4 MEI / 2 PON / 3 ATA = 25 (`TEMPLATE_ELENCO`).
- **Critérios de desempate da classificação** (`06` não fixa): pontos →
  vitórias → saldo → gols pró → nome.
- **Distribuição de perfis de IA entre clubes** (`12` §1): sorteados por
  clube (faixa 0..1) no seed do universo.
- **Parâmetros do motor de partida** (`03`/`04` não dão números): calibrados
  por backtesting contra o Brasileirão recente — ver a seção "Calibração do
  motor de partida" acima. Bloco `PARAMS` em `simulateMatch.ts`.
- **Lista de termos bloqueados no chat** (`18` §3 não a define): lista
  inicial curta em `ParametroConfiguravel` (`chat.termosBloqueados`),
  comparação por palavra/expressão normalizada. Denúncias são acumuladas em
  `DenunciaChat`; a fila de moderação humana e sanções (`18` §3) ficam para
  depois.
- **Transporte do chat** (`17` §3 pede WebSocket): Fase 2 usa REST com
  paginação por cursor de tempo; o mesmo modelo de persistência serve para o
  WebSocket quando o gateway de tempo real for montado.
- **Moderação de identidade de clube** (`05` §1 / `18` §3): reusa a lista de
  termos do chat + a blocklist de marcas reais de `nomesFicticios.ts`. A
  blocklist é um começo (clubes Brasil/CONMEBOL + jogadores famosos), não
  exaustiva — variações estrangeiras ("Real Madryd") passam.
- **Espectador "ao vivo"** (`07` §5): na Fase 2 o motor resolve a partida na
  hora, então `ao-vivo` mostra a rodada corrente (em andamento / próximos /
  recém-encerrados). A transmissão 2D em tempo real é Fase 3.
- **"Dívida" e "receita anual" nos alertas/falência** (`11` §§5-6): sem
  empréstimo bancário nem parcelamento no modelo, dívida = caixa negativo;
  receita anual é extrapolada do histórico recente (0 se < 7 dias de dados,
  o que deixa N2 e a falência por dívida inertes no começo).
- **Conselho como número único** (`05` §4 fala em 3-5 conselheiros): a
  relação com o Conselho é um inteiro 0-100 no clube, não conselheiros
  individuais.
- **Escala de salários e caixa inicial dos clubes**: placeholders de
  balanceamento. Com os parâmetros atuais, todo clube fecha a semana no
  azul (+142k a +338k) — falta calibrar para existirem clubes deficitários.
  Caixa inicial ≈ 10 semanas de folha + R$3M.
- **Parâmetros financeiros operacionais** (`11` §8 só fixa falência/alertas):
  patrocínio base, ocupação-base do estádio, elasticidade de preço,
  manutenção por nível, premiação da Liga. Valores em
  `src/modules/financas/parametros.ts`, todos na tabela `ParametroConfiguravel`.
  A bilheteria domina fortemente a receita (≈1,7M/jogo vs ≈90k/sem de
  patrocínio) — o preço do ingresso acaba sendo quase a única alavanca
  financeira relevante; a calibrar.
- **Folha "do mês corrente" (`11` §6)**: aproximada como "folha da semana
  não coberta pelo caixa"; o contador de dias de caixa negativo avança 1/dia
  no tick diário.
- **TTL da sessão de autenticação** (`18` §1 exige "expiração definida", sem
  fixar valor): 30 dias, configurável por `SESSAO_TTL_DIAS`.
- **Exclusão de conta com clube ativo** (LGPD art. 18, não coberto pelos
  docs): o clube volta a ser IA. Não conflita com "não há demissão de
  presidente" (`02` §5) — o jogador está saindo do produto, não sendo
  destituído.
- **Escolha do clube na entrada em liga** (`07` §2 não detalha): o jogador
  pode escolher um clube de IA livre ou receber um por sorteio.
- **Mercado — decisões de IA** (`09` §2.3 / `12` §3 não dão fórmula): clube
  detentor aceita/contrapropõe/recusa por um múltiplo do valor de mercado
  (ajustado por idade, sobra na posição e tolerância a risco do perfil); o
  jogador aceita por salário ≥ ~90% do "justo" (função do valor de mercado)
  + ambição (reputação do clube de destino ≥ atual − 8, salvo se joga
  pouco). "Joga pouco" é aproximado pela moral < 45 (não há dados de
  minutos na Fase 1). Prazo da proposta: 4 dias.
- **Mercado — parcelamento** (`09` §1 cita "à vista ou parcelado"): só à
  vista na Fase 1; parcelamento exige agenda de parcelas (adiado).
- **Mercado — escassez por posição** (`09` §7): fator simples baseado na
  contagem de jogadores por posição na liga vs. o esperado pelo template.
- **Inatividade — o que conta como "ação de gestão"** (R40 não enumera):
  alterar clube/identidade, definir preço de ingresso, propor ou responder
  no mercado, assumir o clube. Logar na conta e visualizar telas não contam
  (o Auxiliar Técnico cobrindo partida também não — `05` §3). Cada ação
  dessas atualiza `Clube.ultimaAcaoEm`.
- **Fila de espera — ordenação e reconciliação** (`07` §2 diz "lista de
  espera" sem detalhar): ordem de chegada (`criadoEm`); após o início do
  calendário, um passo diário atribui automaticamente qualquer clube de IA
  livre ao próximo da fila.
- **Precedência inatividade × falência no mesmo dia** (docs não dizem): a
  inatividade (R40) roda antes das finanças diárias — um clube de humano
  inativo E quebrado vira IA por inatividade (some para a fila), não SAF por
  falência.
- **Tick diário — parâmetros** (`08` §1 não dá números): recuperação de
  fadiga 10/dia, ganho de fadiga 18/partida (proxy, sem minutos em campo),
  moral neutra jogador 60 / torcida 50, passo de moral 1/dia. Faixas de
  recuperação de lesão do `04` §7 (leve 3-7d, moderada 14-42d, grave
  60-180d) e pesos de gravidade (0,66 / 0,27 / 0,07) — tudo em
  `parametros.ts`.
- **Lesão sem XI** (`03` §6.2): o motor da Fase 1 não escala time, então a
  lesão é atribuída a um jogador qualquer do elenco do clube do evento.
- **Virada de temporada — renovação de contratos** (`08` §6 diz "renovações e
  vencimentos" sem detalhar): IA renova por 2 anos, ou libera se o jogador
  tem 33+ anos E sobra na posição; clube humano renova 1 ano no automático
  (o presidente ainda pode negociar/vender na pré-temporada). Renovação com
  negociação de termos é Fase 2.
- **Evolução anual de atributos** (`04` §3 dá as fases, não os números): sem
  dados de minutos jogados nem foco de treino na Fase 1, a evolução usa
  distância ao potencial + fase de idade + moral. Constantes em
  `evolucao.regras.ts`.
- **Reset de cartões na virada** (`08` §6): sem sistema de suspensão ainda,
  é no-op.

## Rodando localmente

```bash
npm install
cp .env.example .env   # ajuste a DATABASE_URL para seu Postgres local
npm run prisma:migrate
npm run seed           # cria a liga + os 20 clubes de IA + parâmetros (SEM calendário)
# ... humanos assumem clubes via POST /v1/liga/:id/assumir ...
npm run iniciar        # fecha as inscrições e cria a Temporada 1 (liga + Copa)
npm run dev
```

`npm run seed` só monta o universo — as vagas humanas ficam abertas até o
**início oficial do calendário** (`07` §2). `npm run iniciar` (ou
`POST /v1/liga/:id/iniciar`) fecha as inscrições, monta a Copa Nacional com
os clubes humanos inscritos + sorteio de IA até 16 (R36) e cria o calendário
completo da T1. Depois disso, entrar na liga só pela fila de espera.

Rodar os testes (lógica pura: motor de partida, geração de universo,
calendário, Copa, classificação, finanças, mercado, regras de conta):

```bash
npx vitest run
```

Backtest do motor de partida (sem banco — 02 §6):

```bash
npm run backtest        # 30 temporadas; aceita "npm run backtest -- 50 seed"
```

### Fluxo de API mínimo (após `npm run seed` e `npm run dev`)

```bash
# 1. cadastro (devolve { usuario, token })
curl -sX POST localhost:3000/v1/conta/registro \
  -H 'content-type: application/json' \
  -d '{"email":"ana@exemplo.com","nome":"Ana","senha":"senhaforte1","consentimentoLGPD":true}'

# 2. clubes livres numa liga
curl -s localhost:3000/v1/liga
curl -s localhost:3000/v1/liga/<LIGA_ID>/clubes-disponiveis

# 3. assumir um clube (autenticado)
curl -sX POST localhost:3000/v1/liga/<LIGA_ID>/assumir \
  -H "authorization: Bearer <TOKEN>" \
  -H 'content-type: application/json' \
  -d '{"clubeId":"<CLUBE_ID>"}'   # ou corpo vazio para sorteio

# 4. personalizar o clube (só o presidente, validado pelo token — R2)
curl -sX PATCH localhost:3000/v1/clube/<CLUBE_ID> \
  -H "authorization: Bearer <TOKEN>" \
  -H 'content-type: application/json' \
  -d '{"nome":"Meu Clube","cores":"#123456/#ffffff"}'
```

## Como este código se relaciona com a documentação

Cada arquivo relevante tem comentários apontando para o documento e seção
correspondente (ex.: `// 03_MOTOR_DE_PARTIDAS, seção 4`). Antes de alterar
qualquer regra aqui, **consulte o documento correspondente primeiro** — a
documentação é a fonte de verdade (ver `21_PROMPT_MESTRE_CLAUDE`).
