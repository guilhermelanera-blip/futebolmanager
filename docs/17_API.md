# 17_API

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `03_MOTOR_DE_PARTIDAS`, `07_MULTIPLAYER_ONLINE`, `09_TRANSFERENCIAS_E_MERCADO`, `16_BANCO_DE_DADOS`

---

## 1. Estilo geral da API

- **REST** para operações de gestão: CRUD de clube, elenco, mercado, finanças, tática pré-jogo, notícias, competições.
- **WebSocket** para tudo que é tempo real: partida ao vivo, chat, notificações instantâneas.

## 2. Domínios de endpoints

- `/conta` — autenticação, perfil, fila de espera de vagas (`07`, seção 2).
- `/clube` — dados do clube, infraestrutura, Conselho (`05`).
- `/jogador` — elenco, base, decisões de jogadores completando 20 anos (`14`).
- `/mercado` — propostas, buscas, scouting (`09`).
- `/financas` — fluxo de caixa, alertas, investimentos em infraestrutura (`11`).
- `/competicao` — calendário, classificação, histórico (`06`).
- `/noticias` — feed global e feed do clube (`13`).
- `/partida` — agendamento e histórico via REST; canal ao vivo via WebSocket (`03`).
- `/chat` — canal da liga e chats particulares (`07`, seção 4).

## 3. Protocolo de tempo real (WebSocket)

- **Canal por partida**: o servidor emite posição resumida de jogadores/bola em intervalos curtos, além de eventos discretos tipados (gol, cartão, lesão, substituição, VAR) — conforme `03`, seções 2 e 9.
- **Cliente → servidor**: comandos tipados (substituição, mudança de tática, ajuste de função individual), validados no servidor e enfileirados para aplicação na próxima janela válida de simulação (`03`, seção 2).
- O canal da liga e os chats particulares também trafegam por WebSocket, garantindo entrega instantânea de mensagens.

## 4. Autorização e permissões

- Todo endpoint de escrita (POST/PUT/DELETE) valida, no servidor, que o usuário autenticado é de fato o **presidente do clube afetado** — o servidor nunca confia em qualquer identificação de clube enviada pelo cliente além do que está vinculado ao token de sessão autenticado. Isso aplica diretamente a garantia de servidor autoritativo (R2, `00_REGRAS_IMUTAVEIS`).
- Comandos de partida ao vivo só são aceitos se o clube pertencer ao usuário conectado naquele momento, ou ao **Auxiliar Técnico** assumindo em sua ausência (`05`, seção 3).
- Endpoints de leitura pública (espectador, notícias, classificação) não exigem autenticação plena, dado o **modo espectador público** (`07`, seção 5).

## 5. Rate limiting e abuso

- Limite de comandos por partida/por minuto, evitando spam de ajustes durante a transmissão ao vivo.
- Limite de chamadas de scouting/buscas de mercado por período, ligado ao custo definido em `09`, seção 5.
- Rate limiting padrão aplicado por usuário autenticado, a nível de gateway de API.

## 6. Versionamento

A API é versionada por prefixo de rota (ex.: `/v1/...`), permitindo evolução futura de contratos de API sem quebrar integrações e clientes já existentes.
