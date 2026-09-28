# 04_SISTEMA_DE_JOGADORES

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `02_GAME_DESIGN_DOCUMENT`, `03_MOTOR_DE_PARTIDAS`

---

## 1. Escala e categorias de atributos

Todos os atributos usam **escala 1-20** (1-5 fraco, 6-10 mediano, 11-15 bom, 16-20 elite).

**Técnicos**: Finalização, Passe, Drible, Cabeceio, Cruzamento, Marcação, Desarme, Controle de bola, Chute de longa distância, Cobrança de bola parada (falta/pênalti).

**Físicos**: Velocidade, Aceleração, Resistência (fôlego), Força, Salto, Agilidade.

**Mentais**: Visão de jogo, Posicionamento tático, Liderança, Compostura, Agressividade, Consistência, Concentração, Trabalho em equipe.

**Específicos de goleiro**: Reflexos, Posicionamento de goleiro, Saída de gol, Distribuição, Jogo com os pés, Defesa de pênalti.

## 2. Atributos-chave por posição

Cada posição (goleiro, zagueiro, lateral, volante, meia, ponta, atacante) tem um conjunto de atributos de maior peso na fórmula de resolução de disputas (`03`), mas isso é **ponderação, não trava** — um jogador "fora do padrão" para sua posição deve poder existir e ser valioso. Tabela exata de pesos por posição é um anexo técnico deste documento, produzido na fase de implementação.

## 3. Idade e curva de desenvolvimento

Fases recomendadas (ajustáveis por potencial individual, não são paredes rígidas):

- **Formação**: 15-20 anos — crescimento rápido de atributos.
- **Ascensão**: 21-24 anos — crescimento moderado, aproximando do potencial.
- **Pico**: 25-29 anos — atributos estáveis, próximos do máximo do potencial.
- **Declínio**: 30+ anos — queda gradual, mais acentuada em atributos físicos que técnicos/mentais.

Velocidade de evolução depende de: distância entre atributo atual e potencial, minutos jogados, foco de treino, moral.

## 4. Potencial

- Cada jogador tem um **potencial oculto** (mesma escala 1-20) representando o teto de desenvolvimento.
- **Scouting revela uma faixa aproximada** do potencial (ex.: "potencial médio-alto"), não o valor exato — quanto mais investimento em scouting sobre aquele jogador, mais precisa a estimativa.

## 5. Moral e forma recente

- **Moral**: afetada por resultados, tempo de jogo, satisfação contratual, rumores de transferência, ambiente do elenco. Impacta performance e desenvolvimento.
- **Forma recente**: nota de desempenho de curto prazo, atualizada partida a partida, que modula temporariamente a performance do jogador na fórmula de disputa (`03`), sem alterar os atributos-base.

## 6. Fadiga e condição física

- Fadiga acumula com minutos jogados (partida e treino) e se recupera com descanso entre partidas.
- Fadiga alta reduz atributos efetivos temporariamente e **aumenta risco de lesão** (link direto com `03`, seção 6.2).

## 7. Lesões — tiers de gravidade

| Gravidade | Faixa de recuperação recomendada |
|---|---|
| Leve | 3–7 dias |
| Moderada | 2–6 semanas |
| Grave | 2–6+ meses |

Faixas exatas dentro de cada tier calculadas por sorteio ponderado (não fixo), influenciado por idade e histórico de lesões do jogador.

## 8. Suspensões

- **Cartão vermelho direto**: suspensão automática (mínimo 1 partida, podendo ser mais em casos graves).
- **Dois cartões amarelos na partida**: equivale a vermelho, mesma regra de suspensão mínima.
- **Acúmulo de amarelos**: suspensão automática **a cada 3 cartões amarelos acumulados**.
- **Contagem separada por competição**: Liga Nacional, Copa Nacional e Copa Continental mantêm contagens de cartões acumulados **independentes** entre si.

## 9. Geração de jogadores

- **População inicial do mundo**: gerada algoritmicamente no início do universo (nomes fictícios, atributos distribuídos conforme a curva de idade e o nível/reputação de cada clube).
- **Geração contínua (base/juniores)**: novos jogadores jovens são gerados periodicamente para as categorias de base dos clubes, com qualidade influenciada pela infraestrutura do clube (centro de treinamento) — detalhamento completo em `14_BASE_E_EVOLUCAO`.

## 10. Traços de personalidade

**Incluído já na v1.** Cada jogador pode ter um ou mais traços que modulam comportamento e desenvolvimento — exemplos: "referência no vestiário" (bônus de moral ao elenco), "propenso a lesão" (aumenta risco na fórmula de lesões), "frio na hora de decidir" (bônus em pênaltis/momentos de pressão), "inconsistente" (aumenta variância de forma recente). Lista completa de traços, efeitos numéricos e regras de atribuição (aleatória no nascimento do jogador vs. desenvolvida ao longo da carreira) ficam para detalhamento técnico na fase de implementação — este documento define apenas a existência e o conceito do sistema.
