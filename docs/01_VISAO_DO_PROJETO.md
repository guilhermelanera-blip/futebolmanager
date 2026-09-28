# 01_VISAO_DO_PROJETO

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`

---

## 1. Elevator pitch

Um simulador de gestão de futebol multiplayer persistente, ambientado num universo fictício sobre a geografia real do Brasil e da América do Sul, onde até 20 pessoas administram clubes rivais no mesmo mundo vivo, com o tempo passando em paralelo à vida real.

## 2. Inspiração declarada

Profundidade dos clássicos gerenciadores de futebol (gestão de elenco, tática, finanças, scouting, evolução de longo prazo) — resolvendo o problema clássico desses jogos (serem solitários) através de um **universo multiplayer compartilhado e persistente**.

## 3. Pilares de design

*(o que não pode ser sacrificado em decisões futuras de design)*

- **Justiça algorítmica** — resultado de partida é sempre fruto do motor de simulação, nunca de decisão discricionária (humana ou de IA).
- **Persistência viva** — o mundo continua existindo e evoluindo com ou sem o jogador logado.
- **Profundidade real de gestão** — não é um jogo casual; decisões têm peso e consequência de longo prazo.
- **Paridade entre humano e IA** — clubes de IA seguem as mesmas regras dos clubes humanos, sem trapaça estrutural.

## 4. Público-alvo

Jogadores que gostavam de gerenciadores de futebol clássicos e sentem falta de uma camada social/multiplayer persistente — grupos de amigos e comunidades de fãs de simulação esportiva.

## 5. Experiência-alvo do jogador

**Tom emocional: equilíbrio entre simulação séria e narrativa/drama.**
O jogo deve entregar profundidade e credibilidade estatística (como uma planilha viva, confiável e justa), mas também gerar momentos narrativos memoráveis (rivalidades, reviravoltas, temporadas históricas) através do sistema de notícias e eventos gerados por IA (ver `13_IA_NARRATIVA_E_NOTICIAS`). Nenhum dos dois lados deve dominar a ponto de comprometer o outro: a narrativa nunca inventa fatos que contradigam a simulação, e a simulação nunca é tão fria a ponto de não gerar boas histórias para contar.

## 6. Modelo de negócio

- Haverá **monetização no futuro**, com **modelo específico ainda não definido** (assinatura, taxa por liga, cosméticos, etc. — PENDENTE DE DECISÃO, a detalhar quando o projeto tiver tração inicial).
- Para esta fase de documentação e para o MVP, a monetização não impõe restrições de arquitetura além de: manter separação clara entre lógica de jogo e camada de contas/pagamento, para permitir inserir cobrança futuramente sem refatoração estrutural.

## 7. Plataformas-alvo

- **Web exclusivamente** (desktop e mobile via navegador). Não há plano de app nativo — decisão definitiva, não pendente.

## 8. O que o jogo NÃO é (escopo negativo)

- Não é um jogo de ação/arcade (sem controle direto de partida em tempo real, tipo FIFA).
- Não é single-player — multiplayer é parte do núcleo da experiência.
- Não usa licenças, nomes ou identidades reais de futebol (ver `00_REGRAS_IMUTAVEIS`, R4–R7).
- Não terá app nativo.
