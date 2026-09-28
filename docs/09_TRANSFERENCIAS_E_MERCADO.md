# 09_TRANSFERENCIAS_E_MERCADO

**Versão:** 1.0
**Status:** Aprovado
**Depende de:** `00_REGRAS_IMUTAVEIS`, `04_SISTEMA_DE_JOGADORES`, `05_SISTEMA_DE_CLUBES`, `07_MULTIPLAYER_ONLINE`, `08_RELOGIO_E_SIMULACAO`

---

## 1. Tipos de transação

- **Compra definitiva**: transferência com pagamento (à vista ou parcelado).
- **Empréstimo**: temporário, com ou sem opção/obrigação de compra ao final; divisão negociável do salário entre clube cedente e tomador.
- **Jogador livre**: sem contrato ativo, pode ser contratado a qualquer momento (inclusive fora das janelas), sem custo de transferência — apenas negociação salarial/luvas.
- **Empréstimo de base**: jovens da própria base emprestados para ganhar experiência — detalhado em `14_BASE_E_EVOLUCAO`.

## 2. Fluxo de negociação

1. Clube A propõe valor/condições ao Clube B pelo jogador.
2. Clube B aceita, recusa ou contrapropõe.
3. Se os clubes chegam a acordo, inicia-se a negociação de termos com o **jogador** (salário, duração, luvas, bônus) — a resposta do jogador é decidida pela IA, com base em atributos, ambição e comparação entre oferta e valor de mercado.
4. Propostas têm **prazo de validade** (recomendo 3-5 dias corridos) antes de expirar automaticamente.

## 3. Negociação humano vs. IA

- Mesma mecânica formal de proposta/contraproposta em ambos os casos — clubes de IA respondem via lógica do `12_IA_DOS_CLUBES`.
- Negociação entre dois clubes humanos pode ser precedida por conversa informal no **chat particular** (`07`, seção 4) para alinhar termos antes de formalizar a proposta oficial no sistema (que fica registrada/auditável).

## 4. Cláusulas contratuais

- **Salário** (periodicidade recomendada: semanal, padrão do futebol real).
- **Duração do contrato** (em anos).
- **Cláusula de rescisão**: valor mínimo que qualquer clube pode pagar para tirar o jogador sem negociar com o clube atual — opcional, definida na assinatura do contrato.
- **Luvas**: bônus de assinatura pago ao jogador.
- **Bônus por desempenho** (incluído na v1): valores adicionais pagos ao jogador vinculados a metas de desempenho (ex.: número de gols, jogos disputados, títulos). Estrutura exata de metas e valores definida na implementação.
- **Mais-valia em revenda / sell-on fee** (incluído na v1): percentual do valor de uma futura venda do jogador retido pelo clube vendedor original, aplicável quando o jogador é revendido para um terceiro clube. Regras de cálculo e limite percentual máximo definidos na implementação.

## 5. Papel do Scout no mercado

- Antes de propor contratação, o Scout pode analisar o jogador-alvo, revelando estimativa de potencial/atributos ocultos (liga com `07`, seção 3).
- Sem análise do Scout, o presidente só vê atributos observados em partidas já disputadas pelo jogador.
- O Scout tem capacidade limitada de análises por período — detalhe de "quantas por semana/mês" fica para a fase de implementação.

## 6. Janelas de transferência

- **Janela principal**: durante toda a entressafra de 4 semanas (`08`, seção 7) — todos os tipos de transação permitidos.
- **Janela intermediária**: **3 semanas**, no meio da temporada — mesmas regras da janela principal, aplicadas num período mais curto.
- **Fora das janelas**: apenas jogadores livres podem ser contratados (não exige negociação entre clubes, já que não há clube vendedor envolvido).

## 7. Valor de mercado

Calculado por fórmula considerando: atributos atuais, potencial, idade, forma recente, tempo restante de contrato, escassez por posição e desempenho recente (incluindo estatísticas ligadas a bônus de desempenho). É uma **referência de mercado**, não trava o valor real de negociação — clubes podem pagar mais ou menos, sujeito à barganha entre as partes.
