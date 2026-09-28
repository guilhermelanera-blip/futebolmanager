# 07_MULTIPLAYER_ONLINE

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `05_SISTEMA_DE_CLUBES`, `06_COMPETICOES_E_CALENDARIO`

---

## 1. Contas e sessões

- Um usuário = uma conta = controla **no máximo um clube por vez**, dentro da liga ativa.
- Autenticação padrão (e-mail/senha ou provedor externo) — detalhe técnico em `17_API`/`19_INFRAESTRUTURA_E_DEPLOY`.
- *Consideração futura*: hoje existe apenas 1 liga (R32), o que torna essa regra simples. Se o sistema evoluir para múltiplas ligas simultâneas, será necessário revisar se um usuário pode controlar um clube por liga.

## 2. Entrada em liga

- As **20 vagas humanas ficam abertas para inscrição até o início do calendário oficial** da temporada.
- Após o início do calendário, as vagas se fecham para novos ingressos; vagas remanescentes (se sobrarem menos de 20 humanos no início) são preenchidas por IA.
- Quando um clube entra em **gestão virtual por inatividade** (14 dias, R40), a vaga **reabre imediatamente** para um novo humano assumir, via **lista de espera** de interessados.

## 3. Visibilidade de informação entre jogadores

- Jogadores que já disputaram **ao menos uma partida oficial** têm atributos observáveis (sem potencial oculto) visíveis a **todos** os presidentes da liga.
- Jogadores que nunca estrearam permanecem com informação limitada.
- Qualquer presidente pode acionar seu **Scout** (`05`, seção 3) para:
  - **(a)** analisar um jogador específico (revela estimativa de potencial e atributos ocultos com mais precisão);
  - **(b)** buscar por critérios específicos (ex.: "zagueiros com desarme > 15 e idade < 23"), retornando uma lista de candidatos.
- Scouting tem custo/tempo associado — detalhado em `09_TRANSFERENCIAS_E_MERCADO`.

## 4. Comunicação entre jogadores

- **Canal da liga**: chat em grupo aberto, visível a todos os presidentes.
- **Chat particular**: conversa direta 1:1 entre dois presidentes (ex.: para negociar transferências).
- Moderação de conteúdo (filtros, denúncia) detalhada em `18_SEGURANCA`.

## 5. Espectador ao vivo

- Qualquer partida oficial pode ser assistida ao vivo por qualquer jogador da liga, mesmo sem envolver o clube dele.
- **Modo espectador público**: pessoas fora da liga (sem conta de presidente) também podem assistir às partidas ao vivo.

## 6. Notificações

Padrão recomendado: alertas de partida (a começar/ao vivo/encerrada), alertas de mercado (proposta recebida, resultado de scouting), alertas financeiros, alertas de lesão/suspensão do próprio elenco. Canal de entrega (push, e-mail, in-app) e granularidade de configuração ficam para `15_INTERFACE_E_UX`.
