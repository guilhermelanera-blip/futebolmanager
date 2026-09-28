# 05_SISTEMA_DE_CLUBES

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `02_GAME_DESIGN_DOCUMENT`, `04_SISTEMA_DE_JOGADORES`

---

## 1. Identidade do clube

- Nome, cores e escudo fictícios, gerados dentro das regras de `00_REGRAS_IMUTAVEIS` (R6/R7 — nenhuma reprodução de identidade real).
- **Personalização limitada permitida**: o jogador humano pode personalizar nome e escudo do clube que assume, dentro de limites de moderação (a definir regras de conteúdo aceitável na fase de implementação — ex.: filtro contra nomes ofensivos ou tentativas de replicar marcas reais).

## 2. Elenco

- Elenco profissional: **25 vagas fixas**.
- Base (jogadores de 16 a 19 anos): **15 vagas fixas** — detalhamento completo do ciclo de vida da base em `14_BASE_E_EVOLUCAO`.
- Distribuição mínima recomendada por posição dentro do elenco profissional (ex.: mínimo 2-3 goleiros) para evitar elencos inviáveis. Números exatos ajustáveis na fase de implementação.

## 3. Comissão técnica

Apenas dois cargos de apoio, além do papel de Manager exercido pelo próprio jogador:

- **Manager (Técnico)**: papel preenchido pelo **jogador humano** (o presidente atuando como técnico) — define tática, escalação, treino e decisões ao vivo durante as partidas. Em clubes de IA ou controlados por SAF, uma entidade de IA equivalente ocupa esse papel, seguindo as mesmas regras (R22).
- **Auxiliar Técnico**: assume o comando do time **apenas durante uma partida ao vivo em que o jogador humano não está presente/conectado**. Toma decisões conservadoras baseadas em padrões pré-definidos pelo próprio jogador, sem tentar otimizar além disso. **Não conta para o prazo de inatividade de 14 dias (R40)** — é cobertura pontual por partida, não substituição de gestão geral do clube.
- **Scout**: analista único responsável pela observação de jogadores no mercado, gerando relatórios e estimativas de potencial (liga com `04`, seção 4, e `09_TRANSFERENCIAS_E_MERCADO`).

## 4. Conselho

Grupo fictício (recomendo 3-5 conselheiros) que opina sobre decisões grandes (contratações caras, venda de ídolos, investimento em infraestrutura) e gera notícias/pressão narrativa — **sem poder de veto** sobre as decisões do presidente humano (conforme `02_GAME_DESIGN_DOCUMENT`).

## 5. Torcida e reputação

- **Moral da torcida**: métrica afetada por resultados, contratações, preço de ingresso e desempenho recente.
- **Reputação do clube**: cresce com títulos e performance sustentada; afeta atração de jogadores e receita de patrocínio (liga com `11_FINANCAS`).

## 6. Infraestrutura

- **Estádio**: capacidade e qualidade, melhorável mediante investimento; afeta renda de bilheteria.
- **Centro de treinamento**: níveis que afetam velocidade de desenvolvimento de jovens, qualidade da geração de base (liga com `14_BASE_E_EVOLUCAO`) e possivelmente redução de risco de lesão.
- Melhorias exigem tempo e investimento financeiro (detalhado em `11_FINANCAS`).

## 7. Ciclo de vida após falência

- Ao falir, o clube do jogador é **comprado por uma SAF** (conforme `02`).
- O jogador humano recebe um **novo clube por atribuição totalmente aleatória**, entre os clubes atualmente sem gestão humana disponíveis no universo.

## 8. Clubes de IA vs. clubes controlados por SAF

- Mecanicamente **idênticos** entre si e em relação a clubes humanos — mesmas regras de simulação, mercado, finanças e desenvolvimento (R22). A diferença é puramente **narrativa** (a IA narrativa pode tratar clubes-SAF com um tom mais "corporativo" nas notícias).
- **Uma vez que um clube se torna controlado por SAF, ele permanece permanentemente corporativo** — não volta a ser disponibilizado para gestão de um jogador humano no futuro.
- **Falência é uma consequência com peso real e permanente**: o pool de clubes disponíveis para gestão humana **encolhe ao longo do tempo** conforme falências acontecem. Isso é intencional — reforça que o jogador precisa gerir as finanças com cuidado real, sem rede de segurança "de graça".

### 8.1 Válvula de segurança: quando não há clube disponível

Se, no momento de uma falência, **não houver nenhum clube livre** (sem gestão humana) para reatribuir ao jogador, o sistema aplica a seguinte regra: **o pior clube-SAF em desempenho** (critério: colocação na Liga Nacional, ou outro critério de desempenho a definir na implementação) é tratado como se **também tivesse falido**, liberando essa vaga de volta ao pool humano — efetivamente "reciclando" o clube-SAF de pior desempenho para reabrir espaço. Isso garante que sempre exista um clube disponível para reatribuição, sem violar a regra de que um clube-SAF nunca volta *voluntariamente* ao controle humano — aqui ele só retorna por necessidade estrutural do sistema.
