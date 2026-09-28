# 14_BASE_E_EVOLUCAO

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `04_SISTEMA_DE_JOGADORES`, `05_SISTEMA_DE_CLUBES`, `09_TRANSFERENCIAS_E_MERCADO`

---

## 1. Categoria de base

- Existe **uma única categoria de base** por clube (sem subdivisões sub-15/sub-17/sub-20).
- Jogadores de base têm entre **16 e 19 anos**.
- A base tem **15 vagas fixas** por clube.
- O elenco profissional tem **25 vagas fixas** por clube (este número substitui a faixa recomendada de 18-30 definida anteriormente em `05`, seção 2 — ver atualização abaixo).

## 2. Geração de novos talentos

- Uma vaga na base só é preenchida com um **novo jogador gerado (16 anos)** quando uma vaga se abre — o que só ocorre quando um jogador de base sai por um dos três caminhos da seção 3 (promoção, negociação/venda ou dispensa).
- A qualidade do jogador gerado (distribuição de atributos e potencial) é influenciada pelo **nível do centro de treinamento** do clube (`05`, seção 6) — centros melhores tendem a gerar talentos com maior potencial médio.

## 3. Ciclo de vida de um jogador da base

- Enquanto tem entre 16 e 19 anos, o jogador permanece na base, se desenvolvendo via treino (`10`) e eventuais empréstimos (seção 5).
- **Ao completar 20 anos**, o jogador **precisa ser resolvido** por uma das três ações do presidente:
  1. **Promover** ao elenco profissional (ocupando uma das 25 vagas profissionais, se houver espaço).
  2. **Negociar/vender** o jogador para outro clube, seguindo as regras normais de mercado (`09`).
  3. **Dispensar** o jogador (ele se torna agente livre, sem custo de negociação).
- A vaga na base **só se abre quando uma dessas três ações efetivamente ocorre** — não há saída automática só por completar 20 anos; o presidente deve tomar uma decisão ativa.

## 4. Promoção ao time principal

A promoção de um jogador da base ao elenco profissional é sempre uma **decisão ativa do presidente**, nunca automática por idade — o presidente escolhe o momento com base no desenvolvimento do jogador e nas necessidades do elenco.

## 5. Scouting de base (própria e de outros clubes)

- O **Scout** (`05`, seção 3) gera relatórios/notícias periódicas sobre:
  - A própria base do clube (acompanhamento de desenvolvimento dos jovens sob contrato).
  - As bases de **outros clubes** — permitindo ao presidente identificar talentos promissores em times rivais antes que se destaquem no profissional.
- Jogadores de base de outros clubes podem ser **negociados normalmente pelo mercado de transferências** (`09`), possibilitando a "caça" a jovens talentos alheios.

## 6. Empréstimos de jovens

Jogadores promovidos ao profissional (ou mesmo ainda na base, conforme regras de competição a definir na implementação) podem ser **emprestados a outros clubes** para ganhar experiência e minutos em campo, seguindo as regras gerais de empréstimo definidas em `09`, seção 1.

## 7. Infraestrutura e qualidade da base

O nível do **centro de treinamento** (`05`, seção 6) influencia diretamente:
- A qualidade média (potencial) dos jogadores gerados para a base.
- A velocidade de desenvolvimento de jogadores jovens durante o treino (`10`, seção 6).
