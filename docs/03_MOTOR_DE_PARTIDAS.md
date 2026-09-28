# 03_MOTOR_DE_PARTIDAS

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `02_GAME_DESIGN_DOCUMENT`

---

## 1. Arquitetura geral

O motor de partidas usa um modelo **híbrido**:

- **Camada de posicionamento**: jogadores e bola se movem em campo de forma simplificada (não é física complexa de colisão), guiados por zonas táticas.
- **Camada de resolução estatística**: toda disputa relevante (passe, desarme, chute, etc.) é decidida por fórmula baseada em atributos + tática + variância controlada — nunca por física de precisão milimétrica nem por decisão arbitrária.

A simulação roda **ao vivo, de forma síncrona, no servidor**, durante toda a duração da partida — **não é pré-calculada e reproduzida depois**. Isso é necessário porque o jogador pode interferir na partida em tempo real (ver seção 7).

## 2. Ciclo de simulação

- Uma partida representa **~90-100 minutos de tempo de jogo simulado**, comprimidos em **3-5 minutos de tempo real** de transmissão.
- **Proporção recomendada de calibração inicial**: ~2,5-3 segundos reais por minuto simulado, ajustável via playtesting (não é regra fixa, é parâmetro de configuração do motor).
- Dois níveis de tick:
  - **Micro-tick**: recalcula posição de jogadores e bola em alta frequência.
  - **Evento de disputa**: disparado contextualmente sempre que jogadores disputam a bola (passe, desarme, finalização, etc.), resolvido pela camada estatística.
- Comandos do jogador (substituição, mudança tática) entram em fila e são aplicados na próxima janela válida de simulação — aplicação quase instantânea, dado o ritmo acelerado da partida.

## 3. Modelo de posicionamento

- Cada jogador tem uma **zona-alvo** em campo, definida pela formação e instruções táticas vigentes.
- A cada micro-tick, o jogador se move em direção à sua zona-alvo e/ou à bola, dependendo do contexto da jogada (fase ofensiva/defensiva/transição).
- A velocidade de deslocamento é influenciada por atributos físicos (velocidade, aceleração) e pela fadiga acumulada durante a partida.
- Este modelo é **deliberadamente simplificado**: não há colisão física real nem cálculo de trajetória milimétrica — o objetivo é gerar posicionamento plausível o suficiente para a visualização 2D e para determinar quem participa de cada disputa.

## 4. Resolução de disputas

Fórmula conceitual (números e pesos exatos definidos em `04_SISTEMA_DE_JOGADORES`):

```
P(sucesso da ação) = f(
  atributo_relevante_do_agente,
  atributo_relevante_do_oponente,
  modificadores_taticos,
  contexto [mando de campo, moral, fadiga, forma recente]
)
```

O resultado de `P(sucesso)` é então submetido à camada de variância controlada (seção 5) para determinar o desfecho real da disputa.

## 5. Variância controlada

- O motor usa uma distribuição de probabilidade **limitada** (nem puramente determinística, nem caótica).
- Times/jogadores com atributos e tática superiores devem **vencer disputas com mais frequência estatística**, mas resultados "zebra" continuam possíveis — essencial para manter o jogo interessante e realista.
- Nenhuma disputa tem resultado 100% garantido, mesmo com vantagem esmagadora de atributos.

## 6. Eventos derivados

### 6.1 Eventos padrão
Gols, faltas, cartões amarelos/vermelhos, escanteios, laterais, impedimentos — resolvidos via camada de disputa (seção 4).

### 6.2 Lesões
- Probabilidade de lesão ligada a: intensidade da disputa, fadiga acumulada, atributos físicos do jogador e agressividade da ação (própria ou do oponente).
- Severidade em **níveis** (leve / moderada / grave), cada um associado a uma janela de tempo de recuperação (detalhamento de dias/atributos afetados no `04_SISTEMA_DE_JOGADORES`).
- Durante a partida, uma lesão força decisão imediata do jogador humano (ou da IA, no caso de clubes de IA): substituir o atleta ou seguir jogando com ele em condição reduzida (se não houver substituições disponíveis).

### 6.3 VAR (revisão de vídeo)
- Categorias de revisão: **gol, pênalti, cartão vermelho direto, confusão de identidade de jogador** (padrão IFAB).
- Ao ser acionado, gera uma pausa real perceptível na transmissão da partida.
- A decisão pós-revisão tem **menor margem de erro/variância** do que a decisão original em campo (reflete a natureza de "segunda checagem" do VAR).

### 6.4 Regra anti-perda-de-tempo
- **Goleiro tem limite de 8 segundos** com a bola nas mãos antes de precisar se desfazer dela; se exceder, o adversário recebe um escanteio.
- **Acréscimos de tempo são calculados dinamicamente**, somando o tempo real perdido em paralisações da partida (comemorações de gol, atendimentos a lesões, revisões de VAR, substituições) — nunca um número fixo ou aleatório desconectado dos eventos da partida.

## 7. Interação ao vivo

- O jogador humano **pode enviar comandos durante a partida em andamento**: substituições (até o limite definido na seção 8), mudança de formação, ajuste de instruções táticas (ex.: postura mais ofensiva/defensiva, pressão).
- Clubes controlados por IA tomam decisões equivalentes através do motor de decisão de IA (`12_IA_DOS_CLUBES`), na mesma janela de tempo e com as mesmas regras — garantindo paridade total entre humano e IA (R22).

## 8. Regras-padrão do esporte adotadas

- **Limite de substituições por partida: 5** (regra atual do futebol real, adotada como regra genérica do esporte dentro do universo fictício).
- **Limite de posse do goleiro: 8 segundos** (ver seção 6.4).

## 9. Transmissão ao vivo

- O servidor emite continuamente o estado da partida (posições resumidas de jogadores/bola + eventos discretos) via stream para todos os espectadores conectados.
- Protocolo técnico de transmissão (formato de mensagens, frequência de atualização, tecnologia de transporte) é detalhado em `07_MULTIPLAYER_ONLINE` e `17_API`.

## 10. Garantias de integridade e auditabilidade

- Cada partida roda com um **seed determinístico**, permitindo replay e auditoria posterior de qualquer disputa.
- Todo comando recebido do jogador (substituição, mudança tática) é registrado em log completo, com autor e timestamp.
- Nenhum comando do frontend jamais define um resultado diretamente — comandos apenas ajustam os parâmetros de entrada que alimentam a mesma fórmula de resolução usada para os clubes de IA. Isso garante o cumprimento estrito de R2/R21 (`00_REGRAS_IMUTAVEIS`).

## 11. Performance e escalabilidade

- Até **10 partidas simultâneas** (20 clubes / 2, cenário de operação inicial) rodam ao mesmo tempo, cada uma como uma sessão de simulação isolada com duração real de ~3-5 minutos.
- Cada sessão de partida deve suportar múltiplos espectadores conectados simultaneamente via stream, sem degradar a performance da simulação em si.
- Arquitetura de infraestrutura detalhada (workers, isolamento de processos, escalabilidade horizontal) fica em `19_INFRAESTRUTURA_E_DEPLOY`.

---

## Pendências técnicas transferidas

- **PT6** (`04`): tiers exatos de gravidade de lesão e faixas de dias de recuperação.
- **PT7** (`07`/`17`): latência máxima aceitável entre comando do jogador e aplicação no jogo, dado o ritmo acelerado da partida.
- **PT8** (`19`): dimensionamento exato de infraestrutura para rodar múltiplas simulações ao vivo simultâneas com múltiplos espectadores.
