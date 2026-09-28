# 06_COMPETICOES_E_CALENDARIO

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `02_GAME_DESIGN_DOCUMENT`, `05_SISTEMA_DE_CLUBES`

---

## 1. Liga Nacional

- 20 clubes, pontos corridos, todos contra todos, **ida e volta** = **38 rodadas**.
- Sem rebaixamento nem divisões inferiores (R37).
- Calendário gerado por método padrão de round-robin (método do círculo), com sorteio inicial de confrontos.

## 2. Copa Nacional

- **Padrão (a partir da T2)**: 16 clubes (top 16 da Liga Nacional da temporada anterior, excluindo os 4 últimos — R35). Mata-mata a partir das oitavas de final, **ida e volta**, com sorteio de mando de campo no jogo de volta. Estrutura: Oitavas → Quartas → Semis → Final = **8 rodadas** (4 confrontos × 2 jogos).
- **Temporada 1**: participam todos os clubes humanos + sorteio de clubes de IA até completar 16 (R36). **Se houver mais de 16 clubes humanos (17-20)**, o chaveamento se expande para **32 clubes**, com uma **rodada preliminar única (jogo único, sem volta)** para reduzir a 16 — a partir daí segue o padrão normal (ida e volta). Estrutura nesse cenário: Preliminar (1 jogo) → Oitavas → Quartas → Semis → Final = **9 rodadas**.

## 3. Copa Continental

- A partir da **Temporada 2** (R13), com **32 clubes**: 5 do Brasil (melhores colocados da Liga Nacional, R14) + 27 de outros 9 países da CONMEBOL fictícios.

### 3.1 Cotas por país (27 vagas estrangeiras)

| País (fictício, geografia real) | Vagas |
|---|---|
| Argentina | 5 |
| Uruguai | 4 |
| Colômbia | 4 |
| Equador | 3 |
| Paraguai | 3 |
| Chile | 3 |
| Peru | 2 |
| Bolívia | 2 |
| Venezuela | 1 |
| **Total** | **27** |

Cada país estrangeiro simula uma **liga fictícia interna de 10 clubes** (R38); os 5 melhores de cada uma são pré-selecionados como candidatos (R39), e a cota da tabela acima define quantos desses 5 efetivamente avançam à Copa Continental (por critério de classificação dentro do próprio país).

### 3.2 Formato da competição

- **Fase de grupos**: 8 grupos de 4 clubes, todos contra todos dentro do grupo (turno único ou ida e volta — recomendo ida e volta para consistência com o resto do sistema, **6 jogos por clube**). Os 2 primeiros de cada grupo avançam.
- **Fase eliminatória**: Oitavas → Quartas → Semis, todas **ida e volta**.
- **Final**: **jogo único, em sede neutra**.
- Estrutura completa: Grupos (6 rodadas) → Oitavas (2) → Quartas (2) → Semis (2) → Final (1) = **13 rodadas**.

**Regra recomendada de sorteio dos grupos**: clubes do mesmo país não devem cair no mesmo grupo (pote de sorteio por país/força), para preservar a lógica de confronto internacional. A definir detalhamento exato do sistema de potes na implementação.

## 4. Calendário semanal

- Partidas oficiais ocorrem em dois slots fixos por semana: **quarta ou quinta às 21:00** e **domingo às 15:00** (R30).
- O slot de **domingo é reservado à Liga Nacional**.
- O slot de **quarta/quinta é usado pela Liga Nacional por padrão**, mas é **substituído** por uma rodada de Copa Nacional ou Copa Continental quando há jogo dessas competições naquela semana (R31) — a rodada de liga que seria jogada naquele slot é reagendada para uma semana seguinte, estendendo o calendário da temporada.

## 5. Duração estimada da temporada (cálculo, não regra fixa)

Com base na estrutura acima, uma temporada "normal" (a partir da T2, com todas as competições ativas) consome:

- Liga Nacional: 38 rodadas
- Copa Nacional: 8 rodadas
- Copa Continental: 13 rodadas
- **Total: 59 rodadas**

Como o slot de domingo é sempre liga, e o slot de meio de semana alterna entre liga/copas, a temporada tem **duração aproximada de 40 semanas** (~9 a 9,5 meses corridos), considerando 38 rodadas de liga distribuídas ao longo de 40 semanas (2 delas usando só o slot de domingo por conta de rodadas de copa no meio de semana... o cálculo exato final de distribuição semana a semana é responsabilidade do gerador de calendário na implementação, este número é uma estimativa de planejamento).

Na **Temporada 1** (sem Copa Continental ainda), a duração estimada cai para:
- Liga (38) + Copa Nacional (8 ou 9, dependendo do número de humanos) = **46-47 rodadas**, aproximadamente **27-28 semanas** (~6,5 meses corridos).

Esses números são **estimativas de planejamento**, não regras travadas — o gerador de calendário real (implementação) deve produzir o cronograma exato respeitando as regras de slots (seção 4) e as competições ativas em cada temporada.

## 6. Pendências técnicas transferidas

- **PT9** (implementação): sistema exato de potes de sorteio da fase de grupos da Copa Continental (separação por país/força).
- **PT10** (implementação): algoritmo exato de geração do calendário semana a semana, incluindo tratamento de folgas/semanas sem jogo se necessário para alinhamento de datas.
