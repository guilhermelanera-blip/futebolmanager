# 10_TATICA_E_TREINAMENTO

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `03_MOTOR_DE_PARTIDAS`, `04_SISTEMA_DE_JOGADORES`, `05_SISTEMA_DE_CLUBES`

---

## 1. Formações e esquema tático

- Conjunto de formações táticas genéricas e universais do futebol (ex.: 4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2) — **8-10 formações padrão** disponíveis na v1.
- Cada formação define as **zonas-alvo** de cada posição em campo, alimentando diretamente o modelo de posicionamento do motor (`03`, seção 3).
- Formações totalmente customizáveis (editor livre de posicionamento) ficam como possibilidade futura, fora do escopo da v1.

## 2. Instruções táticas gerais

Parâmetros que modulam a fórmula de disputa (`03`, seção 4) e o modelo de posicionamento:
- **Postura**: defensiva / equilibrada / ofensiva
- **Pressão**: baixa / média / alta
- **Largura**: estreito / normal / aberto
- **Ritmo de jogo**: lento / normal / rápido

## 3. Papéis/funções por jogador

Cada posição na formação pode receber uma **função** que ajusta o comportamento dentro da zona-alvo (ex.: lateral ofensivo sobe mais ao ataque; volante de contenção prioriza marcação sobre construção). Lista completa de funções por posição é detalhada na fase de implementação.

## 4. Treinamento entre partidas

- Tipos de treino por categoria: técnico, físico, tático, específico de goleiro.
- Intensidade: leve / normal / intensa — afeta velocidade de ganho de atributo vs. acúmulo de fadiga.
- O presidente define o foco de treino e a intensidade geral da semana.

## 5. Risco de overtraining

- Intensidade alta sustentada por muitos dias aumenta a fadiga acumulada e, por consequência, o risco de lesão (mesma fórmula de risco definida em `03`/`04`).
- Sistema de alerta (análogo ao alerta financeiro do `05`) notifica o presidente quando a fadiga média do elenco ultrapassa um limiar seguro, sugerindo redução de intensidade.

## 6. Desenvolvimento de jovens via treino

- Jogadores na fase de Formação (`04`, seção 3) se beneficiam mais de treino focado e de minutos em campo.
- O nível do centro de treinamento (`05`, seção 6) modula a velocidade/eficácia desse desenvolvimento.

## 7. Ajustes ao vivo durante a partida

Durante uma partida em andamento, o jogador humano (ou IA equivalente) pode ajustar:
- Substituições (até 5, `03` seção 8).
- Formação.
- Instruções táticas gerais (postura, pressão, largura, ritmo).
- **Funções individuais de jogadores específicos** (ex.: transformar um lateral em modo mais ofensivo durante o jogo).

Todos esses ajustes entram na fila de comandos e são aplicados na próxima janela válida de simulação, conforme `03`, seção 2 e 7.
