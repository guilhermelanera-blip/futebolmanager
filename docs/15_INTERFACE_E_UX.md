# 15_INTERFACE_E_UX

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `01_VISAO_DO_PROJETO`, `03_MOTOR_DE_PARTIDAS`, `05_SISTEMA_DE_CLUBES`, `09_TRANSFERENCIAS_E_MERCADO`, `11_FINANCAS`, `13_IA_NARRATIVA_E_NOTICIAS`, `14_BASE_E_EVOLUCAO`

---

## 1. Mapa de telas principais

Dashboard, Elenco, Base, Tática, Mercado/Transferências, Finanças, Notícias, Partida ao Vivo, Calendário/Competições, Clube (identidade/infraestrutura), Conselho, Perfil da conta.

## 2. Dashboard do clube

Tela inicial ao logar. Exibe:
- Próximo jogo (data/horário/adversário).
- Alertas em destaque: financeiros (`11`), lesões e suspensões (`04`), moral do elenco/torcida (`05`).
- Resumo de posição na tabela e nas copas em disputa.
- Notícias recentes do clube.
- **Ações pendentes** em destaque: propostas de mercado aguardando resposta, decisões de jogadores da base completando 20 anos (`14`, seção 3), votos recentes do Conselho (`11`, seção 4).

## 3. Tela de partida ao vivo

- Visualização 2D central (campo com posicionamento simplificado, conforme motor híbrido do `03`).
- Placar e cronômetro comprimido (~3-5 minutos reais por partida).
- Painel lateral de eventos em tempo real (gols, cartões, substituições, lesões).
- Controles de ajuste ao vivo com **acesso rápido** (poucos cliques/toques): substituições, formação, instruções táticas gerais e funções individuais (`03`, seção 7; `10`, seção 7) — essencial dado o ritmo acelerado da partida.

## 4. Tela de elenco/base

- Lista de jogadores do elenco profissional com atributos visíveis, filtros por posição, indicadores de moral/fadiga/lesão/suspensão.
- Seção separada para a base (15 vagas, `14`), com **destaque visual** para jogadores completando 20 anos e decisão pendente (promover/negociar/dispensar).

## 5. Tela de mercado/transferências

- Busca de jogadores (do próprio elenco/base e de outros clubes, via scouting).
- Propostas ativas (enviadas e recebidas), histórico de negociações concluídas.
- Acesso direto ao Scout para análises específicas e buscas por critério (`09`, seção 5).

## 6. Tela de finanças

- Painel de fluxo de caixa, receitas e despesas detalhadas (`11`, seções 1-2).
- Alertas financeiros por nível (`11`, seção 5).
- Histórico financeiro completo.
- Gestão de investimento em infraestrutura (estádio/centro de treinamento, `05`, seção 6).

## 7. Tela de notícias

Feed híbrido: manchetes globais do universo + seção específica do clube do jogador (`13`, seção 6), incluindo rumores de mercado claramente rotulados como especulação.

## 8. Identidade visual geral

- **Tom visual**: equilíbrio 50/50 entre "planilha profissional" (dados claros, tabelas e números bem legíveis) e "editorial esportivo" (manchetes estilizadas, cores vivas destacando eventos importantes como gols e títulos) — refletindo o pilar de equilíbrio sério/dramático definido em `01_VISAO_DO_PROJETO`.
- **Responsividade**: como o produto é web, acessível via desktop e mobile (`01`, seção 7), toda a interface — especialmente a tela de partida ao vivo — deve funcionar bem em telas pequenas e com interação touch.
