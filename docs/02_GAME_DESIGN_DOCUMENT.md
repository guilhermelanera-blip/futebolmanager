# 02_GAME_DESIGN_DOCUMENT

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `01_VISAO_DO_PROJETO`

---

## 1. Visão geral dos sistemas

Entidades centrais do universo e como se conectam:

```
Jogador Humano (Presidente) ──controla──> Clube ──possui──> Elenco (Jogadores/Atletas)
                                              │
                                              ├──> Comissão Técnica (staff, scouts)
                                              ├──> Conselho (consultivo, sem poder de veto)
                                              ├──> Torcida (moral, expectativa, público)
                                              ├──> Finanças (receitas, folha salarial, patrocínio)
                                              └──> Infraestrutura (estádio, centro de treinamento)

Clube ──participa de──> Competição (Liga Nacional / Copa Nacional / Copa Continental)
Competição ──gera──> Partidas (simuladas pelo Motor de Partidas, servidor)
Clube ──atua no──> Mercado de Transferências (compra/venda/empréstimo)
Clube ──realiza──> Treinamento (evolui Jogadores)
IA Narrativa ──observa tudo acima──> gera Notícias e Eventos (nunca decide resultados)
```

Todo sistema do jogo (03 a 14) é uma "lente de zoom" sobre uma dessas entidades ou relações.

## 2. Loop de jogo

- **Loop diário**: o jogador acessa o clube, revisa notícias/lesões/moral/alertas financeiros, ajusta treino e tática, acompanha o mercado, e — nos dias de jogo — acompanha a partida ao vivo ou vê o resultado depois.
- **Loop semanal**: 2 janelas de partida oficial (quarta/quinta 21h e domingo 15h, conforme `00_REGRAS_IMUTAVEIS` R30), intercaladas com gestão contínua (treino, scouting, negociações).
- **Loop de temporada**: pré-temporada (montagem de elenco, planejamento tático, contratações, janela principal de transferências) → temporada regular (liga + copas, com uma janela menor de transferências no meio) → pós-temporada (avaliação de resultados, renovações de contrato, preparação para a próxima janela).

**Janelas de transferência (definido):** uma janela principal na pré-temporada + uma janela menor no meio da temporada. Datas exatas em dias reais a definir em `09_TRANSFERENCIAS_E_MERCADO`.

## 3. Atributos de jogador (visão conceitual — números exatos em `04`)

- **Categoria Técnica**: finalização, passe, drible, cabeceio, cruzamento, marcação, etc.
- **Categoria Física**: velocidade, resistência, força, aceleração, condição física (fadiga).
- **Categoria Mental**: posicionamento, visão de jogo, liderança, compostura, agressividade, consistência.
- **Atributos específicos de goleiro**: reflexos, posicionamento, saída de gol, distribuição.
- **Metadados do atleta**: idade, potencial (oculto/parcialmente visível via scouting), moral, forma física recente, histórico de lesões, situação contratual.

Posições seguem nomenclatura genérica e universal do futebol (goleiro, zagueiro, lateral, volante, meia, atacante etc.) — termos técnicos genéricos, não identidades protegidas.

## 4. Estrutura de clube

- **Papel do jogador**: o jogador humano é o **Presidente do clube** — autoridade máxima sobre decisões esportivas, financeiras e institucionais (tática, escalação, contratações, finanças, infraestrutura).
- **Conselho**: existe um conselho consultivo que opina, sugere e pode gerar pressão narrativa (via sistema de notícias), mas **não tem poder de veto ou destituição** sobre o presidente humano.
- **Comissão técnica**: staff de apoio (treinador, preparador físico, chefe de scouts) — profundidade exata em `05` e `12`.
- **Torcida**: moral e expectativa da torcida, reage a resultados e contratações, influencia pressão e público/renda (ligação com `11`).
- **Finanças**: orçamento, folha salarial, receitas (bilheteria, patrocínio, premiação), risco de falência — detalhado em `11`.
- **Infraestrutura do clube**: sistema de melhoria de estádio e centro de treinamento **incluído já na primeira versão** (v1). Impacto em receita, capacidade de desenvolvimento de jovens e atração de jogadores — detalhado em `05`/`11`.

## 5. Progressão, metas e falência

- **Progressão do clube**: posição na liga, avanço em copas, crescimento financeiro, reputação, infraestrutura, histórico acumulado ao longo de temporadas.
- **Progressão do jogador (atleta)**: evolução de atributos por idade/potencial/foco de treino/minutos jogados/moral; declínio natural após pico de carreira.
- **Não existe demissão de presidentes humanos.** A única forma de um jogador humano perder o controle do clube é por **falência**.
- **Falência**: se a gestão financeira do clube colapsar, o clube é **comprado por uma SAF** (Sociedade Anônima do Futebol, entidade corporativa fictícia controlada por lógica de IA) e o jogador humano deve **assumir outro clube** para continuar participando.
- **Sistema de alertas**: deve haver avisos financeiros claros e antecipados antes da falência ocorrer, para dar ao jogador chance de reagir (ex.: cortar folha salarial, vender ativos). Regras detalhadas de gatilho de alerta em `11_FINANCAS`.

**Pendências técnicas transferidas:**
- **PT4** (`05`/`11`): critério de qual clube o jogador assume após falência (aleatório, menor colocado disponível, escolha entre opções, etc.).
- **PT5** (`11`): se um clube controlado por SAF pode voltar a ser assumido por outro humano no futuro, ou permanece permanentemente corporativo.

## 6. Dificuldade e balanceamento

- Clubes de IA (incluindo os controlados por SAF após falência) usam **exatamente os mesmos atributos, regras e motor de decisão de tática/mercado** que clubes humanos (R22) — nenhuma vantagem oculta de números.
- Balanceamento é responsabilidade do **motor de decisão da IA** (`12`), não de manipulação de resultados.
- Recomendado: processo de **backtesting** — simular temporadas inteiras só com IA antes do lançamento, para calibrar plausibilidade dos resultados (distribuição de gols, campeões variados, etc.).

## 7. Glossário (inicial)

Temporada, Rodada, Mando de Campo, Janela de Transferências, Moral, Forma Física, Reputação, Presidente (papel do jogador humano), Conselho, SAF (entidade de aquisição por falência), Scouting, Potencial.

**PENDENTE DE DECISÃO (baixa prioridade):** nomes fictícios definitivos da Liga Nacional, Copa Nacional e Copa Continental — a resolver em documento de branding/identidade, sem bloquear o restante da documentação.
