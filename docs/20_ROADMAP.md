# 20_ROADMAP

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** todos os documentos `00` a `19`

---

## Estratégia geral

**MVP enxuto primeiro.** A arquitetura e as regras documentadas em `00` a `19` continuam sendo a meta final do produto — este roadmap organiza a **ordem de entrega**, não uma redução permanente de escopo. Fases posteriores implementam partes já documentadas que foram conscientemente adiadas na primeira entrega.

---

## Fase 0 — Fundação técnica

- Infraestrutura básica (`19`): API server, banco de dados (`16`), autenticação (`07`/`18`).
- Scaffold de API (`17`) e scheduler diário mínimo (`08`).

## Fase 1 — MVP jogável (núcleo mínimo)

- 1 liga, 20 clubes, Liga Nacional completa (pontos corridos, ida e volta) — `00`, `06` seção 1.
- Jogadores com atributos, idade e evolução básica (`04`), **sem traços de personalidade** (adiado à Fase 2).
- **Motor de partida simplificado**: resolução estatística de eventos (gols, cartões, lesões) **sem visualização 2D e sem interação ao vivo** — versão reduzida de `03`, mantendo 100% a garantia de resultado justo/não-manipulável (R2/R21), mas adiando as seções 1, 3 e 7 do `03` para a Fase 3.
- Tática definida **antes da partida** (formação + instruções gerais), sem ajustes ao vivo nesta fase.
- Calendário e simulação automática via scheduler (`08`).
- Mercado básico: compra/venda/empréstimo simples (`09`, seções 1-3), sem bônus de desempenho nem sell-on fee (adiados à Fase 2).
- Finanças básicas: receita/despesa, falência pelo critério de caixa (`11`, seção 6), sem o sistema completo de alertas multi-nível nem voto do Conselho (adiados à Fase 2).
- Clubes de IA com lógica funcional simples, **sem perfis de personalidade** (adiado à Fase 2).
- Regra de inatividade (14 dias → gestão virtual, `00` R40) e reatribuição por falência (`05`, seção 7) — mecanismos simples, essenciais à experiência multiplayer.
- Interface mínima viável (`15`): dashboard, elenco, mercado, finanças, calendário — sem tela de partida 2D (substituída por tela de resultado/súmula).
- **Sem** chat, espectador público, Copa Nacional, Copa Continental, base/juniores e IA narrativa nesta fase.

## Fase 2 — Profundidade de gestão e multiplayer social

- Copa Nacional (`06`, seção 2).
- Chat da liga + chat particular (`07`, seção 4).
- Modo espectador público (`07`, seção 5).
- Sistema de base e evolução completo (`14`).
- Perfis de personalidade de clubes de IA (`12`, seção 1).
- Traços de personalidade de jogadores (`04`, seção 10).
- Bônus de desempenho e sell-on fee no mercado (`09`, seção 4).
- Sistema completo de alertas financeiros multi-nível e voto do Conselho (`11`, seções 4-5).
- Personalização de nome/escudo de clube (`05`, seção 1).

## Fase 3 — Motor avançado (2D e tempo real)

- Implementação completa do motor híbrido com posicionamento 2D (`03`, seções 1 e 3).
- Interação ao vivo durante a partida: substituições, tática e funções individuais em tempo real (`03`, seção 7; `10`, seção 7).
- Transmissão ao vivo via WebSocket (`03`, seção 9; `17`, seção 3).
- VAR, regra anti-perda-de-tempo, lesões detalhadas em partida (`03`, seção 6).
- Tela de partida ao vivo completa com visualização 2D (`15`, seção 3).

## Fase 4 — Escala internacional e narrativa

- Copa Continental completa, com fase de grupos e cotas por país (`06`, seção 3).
- IA Narrativa e sistema de notícias (`13`).

## Fase 5 — Polimento e expansão futura

- Suporte a múltiplas ligas simultâneas (revisão de `00`, R32).
- Implementação de modelo de monetização (`01`, seção 6).
- Ajustes de balanceamento orientados por dados reais de uso (parâmetros configuráveis de `11`, seção 8, e equivalentes em outros documentos).
