# 18_SEGURANCA

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `03_MOTOR_DE_PARTIDAS`, `05_SISTEMA_DE_CLUBES`, `07_MULTIPLAYER_ONLINE`, `16_BANCO_DE_DADOS`, `17_API`

---

## 1. Autenticação e sessão

- Senhas armazenadas com hash seguro (ex.: bcrypt/argon2).
- Tokens de sessão com expiração definida.
- Comunicação sempre via HTTPS.
- Autenticação multifator recomendada como opção disponível ao usuário, não obrigatória no MVP.

## 2. Proteção contra manipulação de partidas (checklist consolidado)

- Toda simulação roda exclusivamente no servidor, nunca no cliente (R2, `00_REGRAS_IMUTAVEIS`).
- Cada partida usa seed determinístico e gera log de eventos imutável (`03`, seção 10; `16`, seções 3-4).
- Nenhum comando do cliente define resultado diretamente — comandos apenas ajustam parâmetros de entrada processados pela mesma fórmula usada para IA (`03`, seção 10).
- Toda operação de escrita valida autorização no servidor (`17`, seção 4).
- Rate limiting protege contra spam de comandos durante a partida ao vivo (`17`, seção 5).
- Toda partida e disputa entre jogadores é reconstruível via auditoria completa (`16`, seção 4).

## 3. Moderação de conteúdo

- Filtro automático de linguagem ofensiva/discriminatória aplicado ao chat (`07`, seção 4) e a nomes/escudos personalizados de clube (`05`, seção 1).
- Sistema de denúncia disponível para usuários reportarem mensagens ou conteúdo impróprio.
- Verificação adicional para impedir que personalizações de clube reproduzam marcas, nomes ou identidades reais, reforçando R6/R7.
- Processo de moderação humana (advertência, banimento temporário ou permanente) detalhado na fase de implementação.

## 4. Proteção de dados pessoais (LGPD)

- Coleta mínima de dados pessoais necessários ao funcionamento do produto (e-mail, nome de usuário).
- Consentimento claro no momento do cadastro e política de privacidade acessível.
- Direito de exclusão de conta e dos dados pessoais associados (direito ao esquecimento, LGPD art. 18).
- Dados pessoais sensíveis armazenados com criptografia em repouso.

## 5. Prevenção de abuso multi-conta

- Verificação de e-mail único por conta.
- Monitoramento de padrões suspeitos (múltiplas contas controlando clubes distintos na mesma liga, mesmo IP/dispositivo, comportamento coordenado) — mitigação da violação de R10 (`00_REGRAS_IMUTAVEIS`), sem garantia de bloqueio tecnológico 100% definitivo.
- Contas identificadas em violação estão sujeitas a banimento e perda do controle sobre o(s) clube(s) indevidamente administrado(s).

## 6. Auditoria e resposta a incidentes

- Logs de segurança (tentativas de login, alterações de permissão) mantidos separados dos logs de jogo.
- Processo formal de resposta a incidentes, incluindo capacidade de rollback usando os logs imutáveis (`16`, seção 3) em caso de qualquer falha que permita manipulação indevida de resultados ou dados.
- Revisão periódica de segurança recomendada antes de grandes atualizações do sistema.
