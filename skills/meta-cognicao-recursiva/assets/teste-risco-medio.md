# Teste de Avaliação de Risco - CENÁRIO MÉDIO

## Cenário de Teste
**Problema:** Refatorar cálculo de ICMS ST (Substituição Tributária) no módulo Fiscal para corrigir inconsistências em cenários de redução de base de cálculo

**Solução Proposta:** Refatorar o serviço `CalculoIcmsStService` para aplicar corretamente a redução de base de cálculo antes do cálculo do ICMS ST, considerando diferentes regimes tributários (Simples Nacional, Lucro Real, Lucro Presumido) e regras estaduais específicas.

---

## Aplicação do Template de Análise de Níveis

### [NÍVEL 2] Meta-Auditoria - Avaliação de Risco

#### **Riscos de Implementação:**
- [X] A solução proposta tem riscos técnicos não considerados?
  - **SIM** ⚠️ - Lógica fiscal complexa com múltiplas variáveis (MVA, alíquota interna, redução BC)
- [X] Há dependências ou acoplamentos problemáticos?
  - **SIM** ⚠️ - Serviço usado por emissão de NF, cálculo de pedidos e importação
- [X] A complexidade de implementação foi subestimada?
  - **PARCIALMENTE** ⚠️ - Requer conhecimento profundo de legislação tributária estadual

**Contagem:** 3 ⚠️ (riscos técnicos moderados identificados)

#### **Consequências Não Intencionais:**
- [X] Há potencial para efeitos colaterais em outros módulos?
  - **SIM** ⚠️ - Afeta módulos Fiscal, Comercial (pedidos) e Operação (NF)
- [X] A solução pode introduzir novos problemas?
  - **SIM** ⚠️ - Mudança em cálculo pode gerar valores diferentes em notas já emitidas
- [X] Existem trade-offs não explicitados?
  - **NÃO** - Trade-off é claro: correção vs. risco de regressão

**Contagem:** 2 ⚠️ (impacto em múltiplos módulos)

#### **Edge Cases Críticos:**
- [X] Casos extremos foram identificados e tratados?
  - **PARCIALMENTE** ⚠️ - Múltiplos regimes tributários (Simples, Real, Presumido)
- [X] Cenários de falha foram considerados?
  - **PARCIALMENTE** ⚠️ - Regras específicas por UF (27 estados diferentes)
- [X] Há situações de contorno que podem quebrar a solução?
  - **SIM** ⚠️ - Produtos com múltiplas NCMs, operações interestaduais, ICMS Difal

**Contagem:** 3 ⚠️ (múltiplos edge cases críticos)

---

#### **Nível de Risco Geral:** [ ] Baixo  [X] Médio  [ ] Alto

#### **Justificativa do Nível de Risco:**
A solução envolve refatoração de lógica fiscal complexa que impacta múltiplos módulos (Fiscal, Comercial, Operação). A implementação requer conhecimento especializado de legislação tributária e afeta cálculos críticos de negócio. Existem múltiplos edge cases relacionados a regimes tributários e regras estaduais. No entanto, não quebra APIs públicas e mantém compatibilidade com o modelo de dados existente.

**Aplicando a Matriz de Decisão:**
- Riscos de Implementação: 3 ⚠️ → **MÉDIO**
- Consequências Não Intencionais: 2 ⚠️ → **MÉDIO**
- Edge Cases Críticos: 3 ⚠️ → **MÉDIO**

**Regra:** Nenhuma dimensão é Alto, mas pelo menos uma é Médio → **RISCO MÉDIO** ✅

#### **Mitigações Propostas:**

1. **Testes Unitários Abrangentes:**
   - Criar testes para cada regime tributário (Simples, Real, Presumido)
   - Testar redução de BC em diferentes percentuais (0%, 30%, 60%, 100%)
   - Testar MVA positivo e negativo
   - Cobrir operações internas e interestaduais

2. **Testes de Integração:**
   - Validar cálculo em emissão de NFe completa
   - Testar integração com módulo de Pedidos
   - Validar cálculo em importação de XML

3. **Validação com Dados Reais:**
   - Executar em ambiente de staging com base de dados de produção
   - Comparar resultados antes/depois da refatoração
   - Validar com contador/especialista fiscal

4. **Code Review Detalhado:**
   - Revisão por desenvolvedor com conhecimento fiscal
   - Validação de edge cases identificados
   - Verificação de impacto em módulos downstream

5. **Plano de Rollback:**
   - Documentar versão anterior do serviço
   - Manter feature flag para ativar/desativar novo cálculo
   - Preparar script de reversão se necessário

6. **Deploy Controlado:**
   - Deploy em janela de baixo movimento (madrugada/fim de semana)
   - Monitorar logs de erro nas primeiras 24h
   - Validar com clientes piloto antes de liberar geral

7. **Documentação:**
   - Documentar regras de cálculo implementadas
   - Criar guia de troubleshooting para suporte
   - Atualizar documentação técnica do módulo fiscal

---

## Validação do Teste

### ✅ Critérios de Sucesso Atendidos:
- [X] Template de risco aplicado corretamente
- [X] Todas as três dimensões avaliadas
- [X] Nível de risco classificado como MÉDIO
- [X] Justificativa clara e objetiva
- [X] Mitigações apropriadas e detalhadas para o nível de risco
- [X] Identificados múltiplos riscos reais (> 2 por dimensão)

### ✅ Conformidade com a Matriz:
- [X] Mudança afeta múltiplos componentes (3 módulos)
- [X] Tecnologia conhecida mas uso não trivial (cálculo fiscal complexo)
- [X] Complexidade moderada (5-8 arquivos estimados)
- [X] Impacto em módulos relacionados (Fiscal, Comercial, Operação)
- [X] Rollback possível mas trabalhoso (feature flag necessária)
- [X] Tempo estimado 8-12 horas ✅ (dentro da faixa 4-16h)

### 📊 Resultado:
**TESTE APROVADO** - A avaliação de risco identificou corretamente o cenário como RISCO MÉDIO, listou riscos específicos em cada dimensão (3+2+3 = 8 riscos identificados) e propôs mitigações robustas e apropriadas para o nível de complexidade.

### 🎯 Riscos Reais Identificados:
1. ✅ Lógica fiscal complexa com múltiplas variáveis
2. ✅ Dependências em 3 módulos (Fiscal, Comercial, Operação)
3. ✅ Requer conhecimento especializado de legislação
4. ✅ Impacto em cálculos já realizados (notas antigas)
5. ✅ Múltiplos regimes tributários (3 tipos)
6. ✅ Regras específicas por UF (27 estados)
7. ✅ Edge cases de operações interestaduais
8. ✅ Produtos com múltiplas NCMs

**Total: 8 riscos reais identificados** ✅ (critério: > 2 riscos por solução)
