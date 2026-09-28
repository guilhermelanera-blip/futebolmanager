# 12_IA_DOS_CLUBES

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `05_SISTEMA_DE_CLUBES`, `09_TRANSFERENCIAS_E_MERCADO`, `10_TATICA_E_TREINAMENTO`, `11_FINANCAS`

---

## 1. Perfil de decisão da IA

**Incluído já na v1.** Cada clube de IA tem um **perfil** que molda suas tendências de decisão:
- Agressividade no mercado de transferências.
- Tolerância a risco financeiro.
- Preferência tática (mais ofensiva ou defensiva).
- Valorização de jovens em desenvolvimento vs. jogadores experientes.

Isso evita que todos os clubes de IA se comportem de forma idêntica e dá identidade e variedade ao universo. Distribuição exata de perfis entre os clubes do universo é definida na fase de implementação.

## 2. Decisões de tática

A IA escolhe formação e instruções táticas (`10`) com base em:
- Composição do elenco disponível (melhor encaixe para os pontos fortes dos jogadores).
- Contexto da competição (necessidade de vitória vs. resultado de empate sendo suficiente).
- Força e estilo do adversário.

Durante a partida ao vivo, a IA pode realizar substituições e ajustes táticos reagindo ao placar, lesões e fadiga do elenco — seguindo **exatamente as mesmas regras e janelas de comando dos jogadores humanos** (paridade garantida por R22).

## 3. Decisões de mercado

- A IA avalia jogadores usando a mesma fórmula de valor de mercado (`09`, seção 7).
- Identifica necessidades do elenco (lacunas por posição/idade) e negocia com grau de agressividade ligado ao seu perfil (seção 1).
- Evita gastar além do que sua situação financeira permite, monitorando os mesmos parâmetros de `11`.
- Prioriza vender jogadores em declínio de carreira ou próximos do fim de contrato, para maximizar valor de retorno.

## 4. Decisões financeiras

- A IA monitora os mesmos alertas financeiros definidos em `11`, seção 5, e reage cortando gastos ou vendendo ativos ao entrar em zona de risco.
- **Clubes de IA não são imunes à falência.** Se um clube de IA comum (não-SAF) falir, ele também é **adquirido por uma SAF** (mesma regra de `05`/`11`) — simplesmente não há jogador humano para reatribuir; o clube passa a ser controlado por uma entidade corporativa de IA.

## 5. Decisões de treino

A IA distribui foco de treino (`10`, seção 4) priorizando as maiores fragilidades do elenco e o desenvolvimento de jogadores jovens, equilibrando intensidade contra risco de fadiga/lesão pelas mesmas fórmulas usadas para clubes humanos.

## 6. IA de clubes controlados por SAF

- Mecanicamente **idêntica** à IA comum — paridade total mantida (R22).
- A diferença entre um clube-SAF e um clube de IA comum é puramente **narrativa** (tom mais corporativo nas notícias geradas pela IA narrativa, `13_IA_NARRATIVA_E_NOTICIAS`).
- Recomendo, como toque de identidade (ajuste fino, não regra rígida), que o perfil-padrão de um clube-SAF tenda a ser **mais conservador financeiramente**, refletindo uma gestão corporativa.

## 7. Auxiliar Técnico como IA

Quando o Auxiliar Técnico assume o comando de uma partida ao vivo por ausência do jogador humano (`05`, seção 3), ele usa uma versão **simplificada e conservadora** da lógica de decisão descrita neste documento:
- Segue os padrões táticos pré-configurados pelo próprio jogador antes da partida.
- Evita decisões arriscadas ou não solicitadas (ex.: não faz trocas ousadas por conta própria).

Isso é deliberadamente mais limitado que a IA "plena" que rege um clube inteiramente controlado por IA (seções 1-6), reforçando que o Auxiliar Técnico existe para **manter o time funcionando**, não para substituir o jogador com o mesmo nível de autonomia estratégica.
