# 16_BANCO_DE_DADOS

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `03_MOTOR_DE_PARTIDAS`, `08_RELOGIO_E_SIMULACAO`, `11_FINANCAS`, `13_IA_NARRATIVA_E_NOTICIAS`

---

## 1. Entidades principais

- **Usuário** — conta, autenticação.
- **Liga** — universo/instância de jogo (suporta multi-liga futura, `00` R32).
- **Clube** — nome, escudo, cores, reputação, moral da torcida, infraestrutura (estádio/CT), saldo de caixa, tipo (humano/IA/SAF).
- **Jogador** — atributos, potencial, idade, moral, fadiga, histórico de lesões, categoria (profissional/base).
- **Comissão Técnica** — registros de Auxiliar Técnico e Scout, vinculados a um clube.
- **Conselho** — membros fictícios vinculados a um clube.
- **Competição** — Liga Nacional, Copa Nacional, Copa Continental, por temporada.
- **Temporada** — metadados (datas, status, fase atual).
- **Partida** — times, data/hora, resultado, seed determinístico, referência ao log de eventos.
- **Evento de Partida** — gols, cartões, lesões, substituições, VAR — granular, vinculado a uma Partida.
- **Comando de Partida** — log de ajustes ao vivo enviados por um jogador humano ou IA durante a simulação.
- **Transferência de Mercado** — proposta, status, valores, cláusulas.
- **Contrato** — vínculo jogador-clube, salário, duração, cláusulas, bônus, sell-on fee.
- **Notícia** — conteúdo gerado pela IA narrativa, tipo, timestamp, escopo (global ou de clube).
- **Alerta Financeiro** — histórico de alertas por nível (`11`, seção 5).
- **Parâmetro Configurável** — tabela central de valores ajustáveis (`11`, seção 8).
- **Fila de Espera** — candidatos a assumir vagas de clube abertas por inatividade (`07`).
- **Mensagem de Chat** — canal da liga e chats particulares (`07`, seção 4).

## 2. Relacionamentos-chave

- Clube → N Jogadores.
- Clube → N registros de Comissão Técnica / Conselho.
- Competição ↔ N Clubes (participação por temporada).
- Partida → 1 Competição, → 2 Clubes (mandante/visitante).
- Evento de Partida → 1 Partida.
- Transferência de Mercado → 1 Jogador + 2 Clubes (origem/destino).
- Contrato → 1 Jogador ativo.
- Notícia → 1 Clube (nulo para notícias de escopo global).

## 3. Dados históricos/imutáveis vs. estado atual

- **Imutável (append-only)**: resultados de partidas concluídas, eventos de partida, notícias publicadas, log de comandos ao vivo, histórico de transferências concluídas, classificações finais de temporadas passadas.
- **Estado atual (mutável)**: saldo de caixa, atributos de jogador (evoluem com o tempo), moral, fadiga, posição corrente na tabela, propostas de mercado em aberto.
- Modelo recomendado: **event sourcing parcial** — eventos de partida e transações são sempre logados de forma imutável; o "estado atual" é uma projeção derivada desses eventos. Isso reforça diretamente a garantia de auditabilidade exigida por R21 (`00_REGRAS_IMUTAVEIS`).

## 4. Estratégia de auditoria/log

- Toda partida grava um log completo de eventos e comandos recebidos (`03`, seção 10), vinculado ao seu seed determinístico.
- Toda transação financeira e de mercado gera um registro imutável no histórico do clube.
- Recomenda-se uma tabela dedicada de **auditoria** para decisões sensíveis (falência, votos do Conselho, propostas de mercado), permitindo reconstrução completa de qualquer disputa entre jogadores.

## 5. Escolha de tipo de banco de dados

- **Banco relacional (PostgreSQL)** como fonte de verdade para dados estruturados e transacionais (clubes, jogadores, contratos, finanças, competições) — integridade referencial e transações ACID são críticas (ex.: uma transferência de jogador não pode ficar em estado inconsistente).
- **Camada complementar rápida/efêmera** (ex.: Redis ou similar) para o stream de posições da partida ao vivo (`03`, seção 9) — esses dados de posição não precisam ser retidos permanentemente em detalhe total, apenas os eventos discretos resultantes.
- Armazenamento NoSQL para logs/notícias em grande volume é uma opção futura caso a escala exija, mas não é necessário para o MVP.

## 6. Considerações de escala

- **MVP**: 1 liga, 20 clubes, ~40 jogadores por clube (25 profissionais + 15 base) ≈ 800 jogadores no universo — volume de dados pequeno/moderado.
- A arquitetura deve permitir **particionamento por liga** no futuro, para suportar múltiplas ligas simultâneas sem necessidade de redesenho estrutural (`00_REGRAS_IMUTAVEIS`, R29/R32).
