# Guia de Detecção de Drift Semântico

## Objetivo

Este guia fornece exemplos práticos de drift semântico comum e técnicas para detectá-los durante a auditoria cognitiva de Nível 1.

---

## 1. Drift de Foco

### Definição
Quando a solução aborda um problema diferente do originalmente solicitado, desviando o foco principal.

### Exemplo 1: Problema de Validação → Solução de Performance

**Problema Original:**
> "Como validar se os campos obrigatórios da NFe estão preenchidos antes de transmitir?"

**Solução com Drift:**
> "Para melhorar a performance da transmissão de NFe, devemos implementar um sistema de cache distribuído com Redis, processamento assíncrono com filas RabbitMQ e otimizar as queries do banco de dados..."

**Detecção:**
- ✗ Problema pede **validação de campos**
- ✗ Solução foca em **performance e infraestrutura**
- ✗ Validação de campos não é mencionada ou é secundária

**Severidade:** Alta

### Exemplo 2: Problema Específico → Solução Genérica

**Problema Original:**
> "Como calcular o ICMS-ST para produtos da substituição tributária no estado de São Paulo?"

**Solução com Drift:**
> "O sistema tributário brasileiro é complexo e envolve múltiplos impostos. Vamos criar um framework genérico de cálculo tributário que suporte todos os impostos (ICMS, IPI, PIS, COFINS, ISS) em todos os estados..."

**Detecção:**
- ✗ Problema pede cálculo **específico de ICMS-ST em SP**
- ✗ Solução propõe framework **genérico para todos os impostos**
- ✗ Over-engineering: complexidade desproporcional ao problema

**Severidade:** Alta

---

## 2. Mudança de Escopo

### Definição
Quando a solução resolve mais (ou menos) do que foi solicitado, expandindo ou reduzindo o escopo sem justificativa.

### Exemplo 3: Escopo Expandido Não Solicitado

**Problema Original:**
> "Adicionar validação para impedir que o usuário salve uma NFe sem informar o CFOP."

**Solução com Drift:**
> "Vamos implementar um sistema completo de validação de NFe que inclui: validação de CFOP, validação de NCM, validação de CST, validação de alíquotas, validação de destinatário, validação de produtos, validação de totais, e também criar uma tela de configuração de regras de validação personalizadas..."

**Detecção:**
- ✗ Problema pede validação de **1 campo (CFOP)**
- ✗ Solução adiciona validação de **7+ campos não solicitados**
- ✗ Adiciona funcionalidade extra (tela de configuração) não pedida

**Severidade:** Média

### Exemplo 4: Escopo Reduzido (Solução Incompleta)

**Problema Original:**
> "Implementar cálculo de ICMS para operações interestaduais considerando alíquota interna, alíquota interestadual e diferencial de alíquota (DIFAL)."

**Solução com Drift:**
> "Para calcular o ICMS interestadual, basta aplicar a alíquota interestadual sobre a base de cálculo."

**Detecção:**
- ✗ Problema pede cálculo de **3 componentes** (interna, interestadual, DIFAL)
- ✗ Solução aborda apenas **1 componente** (interestadual)
- ✗ Ignora aspectos críticos do problema (DIFAL)

**Severidade:** Alta

---

## 3. Inconsistência Terminológica

### Definição
Quando termos técnicos são usados de forma inconsistente ou ambígua, causando confusão semântica.

### Exemplo 5: Alternância de Termos Sem Definição

**Problema Original:**
> "Como registrar uma nota fiscal de entrada no sistema?"

**Solução com Drift:**
> "Primeiro, crie um documento fiscal no módulo de recebimento. Em seguida, lance a NF-e no sistema. Depois, registre o comprovante de compra na contabilidade. Por fim, salve a nota de aquisição no estoque..."

**Detecção:**
- ✗ Usa 5 termos diferentes: "nota fiscal", "documento fiscal", "NF-e", "comprovante de compra", "nota de aquisição"
- ✗ Não fica claro se são sinônimos ou conceitos diferentes
- ✗ Gera ambiguidade sobre o que exatamente deve ser feito

**Severidade:** Média

### Exemplo 6: Mudança de Definição Durante a Resposta

**Problema Original:**
> "Qual a diferença entre 'loja' e 'filial' no sistema?"

**Solução com Drift:**
> "No início: 'Loja é o ponto de venda físico onde ocorrem as operações comerciais.'
> 
> No meio: 'A filial (ou loja) é responsável por gerenciar o estoque local.'
> 
> No fim: 'Cada estabelecimento (loja, filial ou unidade) possui seu próprio CNPJ.'"

**Detecção:**
- ✗ Primeiro define "loja" como conceito específico
- ✗ Depois trata "loja" e "filial" como sinônimos
- ✗ Por fim adiciona "unidade" como terceiro termo
- ✗ Não responde claramente a diferença entre os conceitos

**Severidade:** Alta

---

## 4. Complexidade Desproporcional

### Definição
Quando a complexidade da solução não é proporcional à complexidade do problema (over-engineering ou simplificação excessiva).

### Exemplo 7: Over-Engineering

**Problema Original:**
> "Adicionar um campo 'observação' na tela de cadastro de produto."

**Solução com Drift:**
> "Vamos implementar um sistema de anotações multi-camadas com:
> - Microserviço dedicado de gerenciamento de observações
> - Banco de dados NoSQL para armazenar observações versionadas
> - Sistema de busca full-text com Elasticsearch
> - API GraphQL para consultas flexíveis
> - Sistema de notificações quando observações são alteradas
> - Auditoria completa com rastreamento de mudanças
> - Interface de edição rich-text com Markdown e LaTeX"

**Detecção:**
- ✗ Problema simples: adicionar **1 campo de texto**
- ✗ Solução complexa: **7 componentes de infraestrutura**
- ✗ Desproporcionalidade extrema

**Severidade:** Alta

### Exemplo 8: Simplificação Excessiva

**Problema Original:**
> "Implementar integração com SEFAZ para transmissão de NFe, incluindo assinatura digital, validação de schema XML, tratamento de rejeições, consulta de status, cancelamento e inutilização de numeração."

**Solução com Drift:**
> "Basta fazer um POST HTTP para o webservice da SEFAZ com o XML da nota."

**Detecção:**
- ✗ Problema complexo: **6 funcionalidades** (transmissão, assinatura, validação, rejeições, consulta, cancelamento)
- ✗ Solução simplista: apenas **1 ação** (POST HTTP)
- ✗ Ignora 80% dos requisitos

**Severidade:** Alta

---

## 5. Progressão Ilógica

### Definição
Quando a argumentação contém saltos lógicos, lacunas de raciocínio ou conclusões que não derivam das premissas.

### Exemplo 9: Salto Lógico

**Problema Original:**
> "Por que o cálculo de ICMS está retornando valor zero?"

**Solução com Drift:**
> "O ICMS está zero porque o sistema está lento. Precisamos otimizar as queries do banco de dados."

**Detecção:**
- ✗ Premissa: "sistema está lento"
- ✗ Conclusão: "ICMS está zero"
- ✗ Não há relação lógica entre performance e resultado de cálculo
- ✗ Salto lógico não justificado

**Severidade:** Alta

### Exemplo 10: Conclusão Não Derivada das Premissas

**Problema Original:**
> "Como melhorar a performance do relatório de vendas?"

**Solução com Drift:**
> "Premissa 1: O relatório consulta 5 tabelas diferentes.
> Premissa 2: Existem índices em todas as colunas de filtro.
> Premissa 3: O banco de dados tem 16GB de RAM.
> 
> Conclusão: Devemos migrar para arquitetura de microserviços."

**Detecção:**
- ✗ Premissas falam sobre **estrutura de dados e recursos**
- ✗ Conclusão propõe **mudança arquitetural**
- ✗ Não há análise que conecte as premissas à conclusão
- ✗ Conclusão não deriva logicamente das premissas apresentadas

**Severidade:** Alta

---

## Checklist de Detecção Rápida

Use este checklist durante a Análise Semântica (Nível 1):

### Coerência Semântica
- [ ] O problema original é sobre **[TÓPICO X]**?
- [ ] A solução proposta aborda **[TÓPICO X]** ou desviou para **[TÓPICO Y]**?
- [ ] Se houve mudança de tópico, ela foi **justificada explicitamente**?

### Proporcionalidade de Complexidade
- [ ] O problema é **[Simples/Médio/Complexo]**?
- [ ] A solução tem complexidade **[Simples/Média/Complexa]**?
- [ ] A complexidade da solução é **proporcional** ao problema?

### Consistência Terminológica
- [ ] Listar todos os termos técnicos usados: **[TERMO1, TERMO2, ...]**
- [ ] Cada termo tem **definição clara e consistente**?
- [ ] Há **alternância de termos** sem explicação?

### Progressão Lógica
- [ ] Listar premissas: **[P1, P2, P3, ...]**
- [ ] Listar conclusões: **[C1, C2, C3, ...]**
- [ ] Cada conclusão **deriva logicamente** das premissas?
- [ ] Há **saltos lógicos** ou lacunas de raciocínio?

---

## Matriz de Severidade

| Tipo de Drift | Severidade Baixa | Severidade Média | Severidade Alta |
|---------------|------------------|------------------|-----------------|
| **Drift de Foco** | Desvio mínimo, foco principal mantido | Desvio parcial, foco dividido | Foco completamente perdido |
| **Mudança de Escopo** | Escopo expandido/reduzido em <20% | Escopo expandido/reduzido em 20-50% | Escopo expandido/reduzido em >50% |
| **Inconsistência Terminológica** | 1-2 termos ambíguos | 3-4 termos ambíguos ou 1 mudança de definição | 5+ termos ambíguos ou múltiplas mudanças de definição |
| **Complexidade Desproporcional** | Complexidade 1 nível acima/abaixo | Complexidade 2 níveis acima/abaixo | Complexidade 3+ níveis acima/abaixo |
| **Progressão Ilógica** | 1 pequena lacuna de raciocínio | 2-3 lacunas ou 1 salto lógico | Múltiplos saltos lógicos ou conclusões não derivadas |

---

## Ações Recomendadas por Severidade

### Severidade Baixa
- **Ação:** Documentar no campo "Problemas Semânticos Identificados"
- **Impacto:** Mínimo, pode prosseguir com pequenos ajustes

### Severidade Média
- **Ação:** Revisar a solução no Nível 2 (Meta-Auditoria)
- **Impacto:** Moderado, requer correções antes de finalizar

### Severidade Alta
- **Ação:** Reescrever a solução no Nível 3 (Síntese Final)
- **Impacto:** Crítico, solução atual não é adequada

---

## Casos de Teste para Validação

Use estes casos para testar a detecção de drift semântico:

### Caso 1: Drift de Foco (Alta Severidade)
- **Problema:** "Como validar CPF antes de salvar cliente?"
- **Solução com Drift:** "Vamos implementar autenticação OAuth2 com JWT..."
- **Esperado:** Detectar drift de validação → autenticação

### Caso 2: Mudança de Escopo (Média Severidade)
- **Problema:** "Adicionar campo 'email' no cadastro de fornecedor."
- **Solução com Drift:** "Vamos adicionar email, telefone, celular, WhatsApp e criar integração com API de envio de SMS..."
- **Esperado:** Detectar expansão de escopo não solicitada

### Caso 3: Inconsistência Terminológica (Média Severidade)
- **Problema:** "Explicar o fluxo de aprovação de pedido."
- **Solução com Drift:** "O pedido é criado, depois a ordem é aprovada, em seguida a requisição é processada, e por fim a solicitação é finalizada."
- **Esperado:** Detectar uso de 4 termos diferentes (pedido/ordem/requisição/solicitação)

### Caso 4: Complexidade Desproporcional (Alta Severidade)
- **Problema:** "Adicionar validação para campo não pode ser vazio."
- **Solução com Drift:** "Vamos criar um framework de validação baseado em regras com DSL customizada, engine de execução de regras, cache de validações e sistema de plugins..."
- **Esperado:** Detectar over-engineering extremo

### Caso 5: Progressão Ilógica (Alta Severidade)
- **Problema:** "Por que o relatório não está mostrando dados?"
- **Solução com Drift:** "O servidor tem pouca memória, então devemos mudar a cor do botão de 'Gerar Relatório'."
- **Esperado:** Detectar conclusão não derivada da premissa

---

## Referências

- **Template de Análise de Níveis:** `template-analise-niveis.md`
- **Guia de Classificação de Tipos:** `guia-classificacao-tipos.md`
- **Matriz de Avaliação de Risco:** `matriz-avaliacao-risco.md`

---

**Versão:** 1.0  
**Data:** 2026-01-20  
**Parte de:** R2 - Monitoramento Semântico Expandido (Fase 2)
