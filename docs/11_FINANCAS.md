# 11_FINANCAS

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `02_GAME_DESIGN_DOCUMENT`, `05_SISTEMA_DE_CLUBES`, `09_TRANSFERENCIAS_E_MERCADO`

---

## 0. Princípio de design desta seção

Todos os valores numéricos deste documento (percentuais, prazos, limites) são **parâmetros de configuração** centralizados (seção 8), não regras fixas embutidas na lógica do sistema. Isso permite balancear o jogo livremente no futuro sem reescrever regras nem alterar código estrutural.

## 1. Fontes de receita

- Bilheteria (público × preço do ingresso × capacidade/qualidade do estádio)
- Patrocínio (contrato periódico, valor influenciado pela reputação do clube)
- Premiação de competições (por colocação/fase alcançada em Liga Nacional, Copa Nacional, Copa Continental)
- Venda de jogadores, luvas recebidas em empréstimos e mais-valia em revenda (`09`)

## 2. Fontes de despesa

- Folha salarial (elenco + comissão técnica)
- Manutenção de infraestrutura (custo periódico proporcional ao nível de estádio/centro de treinamento)
- Compra de jogadores, luvas pagas, bônus por desempenho pagos (`09`)
- Custos de scouting

## 3. Orçamento e fluxo de caixa

Painel com saldo atual, projeção de receita/despesa dos próximos períodos e histórico financeiro. Detalhe de interface em `15_INTERFACE_E_UX`.

## 4. Fair play financeiro — voto do Conselho

- **Não existe teto rígido de gastos.** O jogador (presidente) pode gastar livremente, respeitando apenas o caixa disponível.
- Quando uma decisão de gasto ultrapassa um **limite configurável** (ex.: percentual do orçamento anual, ou proporção folha salarial/receita), o **Conselho** (`05`, seção 4) emite um **voto formal contra** a operação.
- Esse voto **não bloqueia a decisão** — o presidente pode seguir em frente mesmo contra a recomendação — mas gera: registro público no histórico do clube, possível impacto em notícias (`13_IA_NARRATIVA_E_NOTICIAS`) e um leve efeito de médio prazo na relação com o Conselho (a definir exatamente na implementação).
- Isso mantém consistência com a regra de que o Conselho **nunca tem poder de veto** sobre o presidente (`02`, seção 4), mas dá peso institucional real a gastos exagerados.

## 5. Sistema de alertas financeiros

Alertas em níveis crescentes de severidade, disparados por parâmetros configuráveis (seção 8):

- **Nível 1 (atenção)**: projeção de caixa ficará negativa dentro de X dias.
- **Nível 2 (risco)**: dívida total ultrapassa um múltiplo Y da receita anual.
- **Nível 3 (crítico)**: caixa já está negativo há Z dias consecutivos e/ou folha salarial do mês corrente não pôde ser paga integralmente.

## 6. Falência

A falência é declarada quando **qualquer um** dos critérios abaixo é atingido (gatilhos independentes, não é necessário que ambos ocorram ao mesmo tempo):

- **Critério de caixa**: saldo de caixa negativo por **N dias consecutivos** combinado com **incapacidade de pagar a folha salarial do mês corrente**.
- **Critério de dívida**: dívida total ultrapassa um **múltiplo configurável da receita anual** (ex.: 2x, ajustável).

Ao ser declarada, aplica-se o processo definido em `05`, seção 7 (aquisição por SAF, reatribuição aleatória de novo clube ao jogador).

## 7. Investimento em infraestrutura

Melhorias de estádio e centro de treinamento (`05`, seção 6) têm **custo financeiro** e **prazo de conclusão em dias**, ambos configuráveis por nível de melhoria (seção 8).

## 8. Tabela de parâmetros configuráveis (valores iniciais recomendados)

| Parâmetro | Valor inicial recomendado | Ajustável? |
|---|---|---|
| Limite de gasto que aciona voto do Conselho | % do orçamento anual (ex.: 40%) | Sim |
| Alerta Nível 1 — dias até caixa negativo projetado | 30 dias | Sim |
| Alerta Nível 2 — múltiplo dívida/receita anual | 1,5x | Sim |
| Alerta Nível 3 — dias de caixa negativo consecutivo | 15 dias | Sim |
| Falência — dias de caixa negativo (critério de caixa) | 30 dias | Sim |
| Falência — múltiplo dívida/receita anual (critério de dívida) | 2x | Sim |
| Custo/prazo de melhoria de estádio (por nível) | A definir na implementação | Sim |
| Custo/prazo de melhoria de centro de treinamento (por nível) | A definir na implementação | Sim |

Esta tabela deve viver como **configuração central do sistema** (banco de dados ou arquivo de configuração — ver `16_BANCO_DE_DADOS`), nunca como valores fixos no código do motor de regras.
