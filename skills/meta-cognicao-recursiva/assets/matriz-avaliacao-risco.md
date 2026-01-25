# Matriz de Avaliação de Risco

## Objetivo
Este documento fornece critérios objetivos para classificar o nível de risco de uma solução proposta como **Baixo**, **Médio** ou **Alto**, auxiliando na seção de Avaliação de Risco do Nível 2 da Meta-Auditoria.

---

## Dimensões de Avaliação

A avaliação de risco considera três dimensões principais:

1. **Riscos de Implementação** - Complexidade técnica e viabilidade
2. **Consequências Não Intencionais** - Impacto em outros componentes do sistema
3. **Edge Cases Críticos** - Cobertura de cenários extremos e falhas

---

## Critérios de Classificação

### 🟢 RISCO BAIXO

#### Características Gerais
- Mudança localizada em um único módulo/componente
- Impacto limitado e bem compreendido
- Reversibilidade fácil
- Baixa complexidade técnica

#### Riscos de Implementação
- ✅ Tecnologia/padrão já utilizado no projeto
- ✅ Dependências mínimas ou inexistentes
- ✅ Complexidade de implementação trivial (< 3 arquivos modificados)
- ✅ Não requer mudanças em infraestrutura ou configuração
- ✅ Tempo de implementação estimado < 4 horas

#### Consequências Não Intencionais
- ✅ Sem impacto em outros módulos
- ✅ Não altera contratos de API existentes
- ✅ Não afeta fluxos críticos de negócio
- ✅ Trade-offs são mínimos ou inexistentes
- ✅ Rollback é trivial

#### Edge Cases Críticos
- ✅ Casos extremos são raros ou improváveis
- ✅ Cenários de falha têm impacto mínimo
- ✅ Validações existentes cobrem os casos de borda
- ✅ Não envolve dados críticos ou sensíveis

#### Exemplos
- Adicionar validação de campo em formulário existente
- Corrigir texto de mensagem de erro
- Adicionar log em método existente
- Ajustar formatação de data em relatório
- Adicionar campo opcional em DTO

---

### 🟡 RISCO MÉDIO

#### Características Gerais
- Mudança afeta múltiplos componentes relacionados
- Impacto moderado e parcialmente previsível
- Reversibilidade possível mas trabalhosa
- Complexidade técnica moderada

#### Riscos de Implementação
- ⚠️ Tecnologia conhecida mas uso não trivial
- ⚠️ Dependências entre 2-4 módulos
- ⚠️ Complexidade moderada (3-10 arquivos modificados)
- ⚠️ Pode requerer ajustes em configuração
- ⚠️ Tempo de implementação estimado 4-16 horas

#### Consequências Não Intencionais
- ⚠️ Impacto em 1-3 módulos relacionados
- ⚠️ Altera comportamento de APIs mas mantém compatibilidade
- ⚠️ Afeta fluxos secundários de negócio
- ⚠️ Trade-offs existem mas são aceitáveis
- ⚠️ Rollback requer planejamento

#### Edge Cases Críticos
- ⚠️ Casos extremos são possíveis e devem ser tratados
- ⚠️ Cenários de falha têm impacto moderado
- ⚠️ Requer novas validações ou tratamentos de erro
- ⚠️ Envolve dados importantes mas não críticos

#### Exemplos
- Refatorar lógica de cálculo fiscal em serviço
- Adicionar novo endpoint REST com validações complexas
- Modificar fluxo de aprovação de pedidos
- Implementar cache em operação de leitura frequente
- Migrar consulta SQL para usar novo índice

---

### 🔴 RISCO ALTO

#### Características Gerais
- Mudança estrutural ou arquitetural
- Impacto amplo e difícil de prever completamente
- Reversibilidade complexa ou impossível
- Alta complexidade técnica

#### Riscos de Implementação
- 🚨 Tecnologia nova ou uso não convencional
- 🚨 Dependências em 5+ módulos ou módulos críticos (erp-models, erp-core)
- 🚨 Alta complexidade (10+ arquivos ou mudança arquitetural)
- 🚨 Requer mudanças significativas em infraestrutura/banco de dados
- 🚨 Tempo de implementação estimado > 16 horas

#### Consequências Não Intencionais
- 🚨 Impacto em 4+ módulos ou em módulos críticos
- 🚨 Quebra compatibilidade de APIs ou contratos
- 🚨 Afeta fluxos críticos de negócio (fiscal, financeiro, estoque)
- 🚨 Trade-offs significativos com consequências de longo prazo
- 🚨 Rollback é complexo ou requer migração de dados

#### Edge Cases Críticos
- 🚨 Casos extremos são frequentes ou críticos
- 🚨 Cenários de falha podem causar perda de dados ou inconsistências
- 🚨 Requer tratamento extensivo de edge cases
- 🚨 Envolve dados críticos (fiscal, financeiro, estoque)

#### Exemplos
- Migrar arquitetura de módulo fiscal para nova estrutura
- Implementar nova engine de cálculo tributário (Reforma Tributária)
- Refatorar modelo de dados de entidades core (Pessoa, Produto)
- Implementar sincronização distribuída entre múltiplos módulos
- Migrar de monolito para microserviços

---

## Matriz de Decisão

Use a tabela abaixo para determinar o nível de risco geral:

| Dimensão | Baixo | Médio | Alto |
|----------|-------|-------|------|
| **Riscos de Implementação** | 0-1 ⚠️ | 2-3 ⚠️ | 4+ ⚠️ |
| **Consequências Não Intencionais** | 0-1 ⚠️ | 2-3 ⚠️ | 4+ ⚠️ |
| **Edge Cases Críticos** | 0-1 ⚠️ | 2-3 ⚠️ | 4+ ⚠️ |

### Regra de Classificação Final

1. **Conte os sinais de alerta (⚠️ ou 🚨)** em cada dimensão
2. **Classifique cada dimensão** usando a tabela acima
3. **Determine o risco geral:**
   - Se **todas** as dimensões são Baixo → **RISCO BAIXO**
   - Se **qualquer** dimensão é Alto → **RISCO ALTO**
   - Caso contrário → **RISCO MÉDIO**

### Regra do Pior Caso
**IMPORTANTE:** Se houver **qualquer** indicador de risco alto (🚨) em qualquer dimensão, o risco geral deve ser classificado como **ALTO**, independentemente das outras dimensões.

---

## Estratégias de Mitigação por Nível de Risco

### Para Risco Baixo
- ✅ Testes unitários básicos
- ✅ Code review padrão
- ✅ Deploy em horário normal

### Para Risco Médio
- ⚠️ Testes unitários + testes de integração
- ⚠️ Code review detalhado com foco em edge cases
- ⚠️ Testes em ambiente de staging
- ⚠️ Plano de rollback documentado
- ⚠️ Deploy em janela de baixo tráfego

### Para Risco Alto
- 🚨 Testes unitários + integração + aceitação (E2E)
- 🚨 Code review com múltiplos revisores
- 🚨 Testes extensivos em staging com dados reais
- 🚨 Plano de rollback testado e validado
- 🚨 Deploy em janela de manutenção programada
- 🚨 Monitoramento ativo pós-deploy
- 🚨 Feature flag para ativação gradual (quando aplicável)
- 🚨 Backup completo antes do deploy

---

## Checklist de Avaliação Rápida

Use este checklist para uma avaliação rápida:

- [ ] A mudança afeta módulos críticos (erp-models, erp-core, erp-fiscal)?
- [ ] A mudança requer migração de banco de dados?
- [ ] A mudança afeta cálculos fiscais, financeiros ou de estoque?
- [ ] A mudança quebra compatibilidade com APIs existentes?
- [ ] A mudança envolve tecnologia não utilizada no projeto?
- [ ] O rollback requer mais do que reverter código?
- [ ] A implementação levará mais de 2 dias?
- [ ] Há dependências externas (serviços de terceiros, integrações)?

**Se respondeu SIM a 3+ perguntas → RISCO ALTO**  
**Se respondeu SIM a 1-2 perguntas → RISCO MÉDIO**  
**Se respondeu NÃO a todas → RISCO BAIXO**

---

## Exemplos Práticos do ERP Bluesoft

### Exemplo 1: RISCO BAIXO
**Cenário:** Adicionar validação de CPF em campo de cadastro de pessoa

**Análise:**
- Riscos de Implementação: 0 ⚠️ (validação já existe em outros lugares)
- Consequências Não Intencionais: 0 ⚠️ (apenas frontend)
- Edge Cases: 1 ⚠️ (CPF inválido, mas tratável)

**Classificação:** BAIXO

**Mitigações:**
- Testes unitários para validação
- Mensagem de erro clara para usuário

---

### Exemplo 2: RISCO MÉDIO
**Cenário:** Refatorar cálculo de ICMS ST em serviço fiscal

**Análise:**
- Riscos de Implementação: 2 ⚠️ (lógica complexa, múltiplos cenários)
- Consequências Não Intencionais: 2 ⚠️ (afeta emissão de NF, mas não quebra API)
- Edge Cases: 3 ⚠️ (múltiplos regimes tributários, casos especiais)

**Classificação:** MÉDIO

**Mitigações:**
- Testes unitários cobrindo todos os regimes
- Testes de integração com emissão de NF
- Validação em staging com notas reais
- Deploy em horário de baixo movimento

---

### Exemplo 3: RISCO ALTO
**Cenário:** Migrar modelo de Produto para suportar Reforma Tributária (IBS/CBS)

**Análise:**
- Riscos de Implementação: 5 🚨 (mudança em erp-models, migração BD, 20+ arquivos)
- Consequências Não Intencionais: 4 🚨 (afeta fiscal, comercial, estoque, financeiro)
- Edge Cases: 4 🚨 (produtos existentes, transição de regimes, cálculos complexos)

**Classificação:** ALTO

**Mitigações:**
- Suite completa de testes (unitários, integração, E2E)
- Code review com especialistas fiscais
- Migração de dados testada em staging
- Feature flag para ativação gradual
- Rollback plan com script de reversão de BD
- Deploy em janela de manutenção
- Monitoramento 24h pós-deploy
- Backup completo antes da migração

---

## Notas Finais

- **Sempre documente a justificativa** do nível de risco escolhido
- **Liste mitigações específicas** para os riscos identificados
- **Reavalie o risco** se o escopo da solução mudar durante a implementação
- **Em caso de dúvida, escolha o nível mais alto** (princípio da precaução)
