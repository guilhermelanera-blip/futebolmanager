# 19_INFRAESTRUTURA_E_DEPLOY

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `03_MOTOR_DE_PARTIDAS`, `08_RELOGIO_E_SIMULACAO`, `13_IA_NARRATIVA_E_NOTICIAS`, `16_BANCO_DE_DADOS`, `17_API`

---

## 1. Componentes de infraestrutura

- **API Server** (REST + gateway WebSocket) — stateless, escalável horizontalmente.
- **Match Workers** — processos dedicados à simulação de partidas ao vivo, suportando até 10 simultâneos (`03`, seção 11).
- **Banco de dados relacional (PostgreSQL)** — fonte de verdade do sistema (`16`).
- **Camada de cache/stream (Redis ou similar)** — dados de posição da partida ao vivo e filas de comando.
- **Scheduler** — processo responsável pelo tick diário e pelo disparo das partidas nos horários fixos (`08`).
- **Serviço de IA Narrativa** — consome eventos de jogo já decididos e gera notícias, mantido isolado do fluxo de decisão de jogo (`13`, seção 5).

## 2. Ambiente de hospedagem

Recomenda-se um provedor de nuvem genérico (AWS, GCP ou Azure), sem travar a escolha em um específico neste documento. Requisitos-chave: suporte a containers, banco de dados gerenciado, escalabilidade horizontal e suporte nativo a conexões WebSocket persistentes.

## 3. Estratégia de deploy

- Containerização via Docker.
- Orquestração leve para o estágio de MVP (ex.: serviço de container gerenciado), sem necessidade de uma solução completa de orquestração (tipo Kubernetes) neste momento — evolução possível conforme o sistema crescer.
- Pipeline de CI/CD básico: build → testes automatizados → deploy, disparado a cada mudança aprovada no código.

## 4. Monitoramento e observabilidade

- Logs de aplicação centralizados.
- Métricas de performance: latência de API, tempo de execução da simulação de partidas, saúde dos match workers.
- **Alertas de operação** (distintos dos alertas de jogo definidos em `11`): ex.: scheduler não disparou as partidas no horário previsto, worker de partida travado ou com erro.
- Recomenda-se uma stack de observabilidade padrão (ex.: Grafana/Prometheus ou solução gerenciada equivalente).

## 5. Backup e recuperação de desastres

- Backups automáticos diários do banco de dados, com retenção configurável.
- Testes periódicos de restauração de backup, para garantir que o processo funciona de fato quando necessário.
- Dado que o universo é persistente e seu histórico acumulado é parte central do valor do produto (R3, `00_REGRAS_IMUTAVEIS`), recomenda-se retenção de backup de longo prazo e replicação geográfica básica quando viável financeiramente.

## 6. Custo estimado inicial

Para a operação inicial (1 liga, 20 usuários humanos, até 10 partidas simultâneas de curta duração — 3 a 5 minutos reais — duas vezes por semana), a carga computacional é modesta. Uma infraestrutura enxuta (servidor de porte pequeno + banco de dados gerenciado pequeno + cache pequeno) deve ser suficiente para atender ao MVP com custo mensal baixo. Esta é uma **estimativa de calibração de expectativa**, não um orçamento formal — deve ser refinada quando a stack técnica definitiva for escolhida na fase de implementação.
