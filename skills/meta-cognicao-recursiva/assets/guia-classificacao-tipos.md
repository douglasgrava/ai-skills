# Guia de Classificação de Tipos de Inquérito

Este guia fornece exemplos práticos e critérios de decisão para classificar corretamente o tipo de inquérito antes de iniciar o processo de meta-cognição recursiva.

---

## 1. Inquérito Descritivo

### Características
- Busca por **fatos objetivos**, dados concretos ou informações diretas
- Resposta baseada em conhecimento existente sem necessidade de análise profunda
- Não requer avaliação, comparação ou julgamento
- Foco em "O QUE É" ou "COMO FUNCIONA"

### Profundidade Recomendada
**Nível 1 suficiente** - Monitoramento básico para evitar alucinações e garantir precisão factual.

### Exemplos

#### Exemplo 1: Características de Módulo
**Pergunta:** "Liste as principais características do módulo ERP Fiscal"

**Por que é Descritivo:**
- Solicita listagem de características existentes
- Não requer análise comparativa ou avaliação
- Resposta baseada em documentação/conhecimento direto

**Classificação:**
- Tipo: Descritiva
- Níveis: 1
- Justificativa: Listagem factual de características sem necessidade de análise profunda

#### Exemplo 2: Definição de Conceito
**Pergunta:** "O que é SPED Fiscal e quais são seus principais arquivos?"

**Por que é Descritivo:**
- Busca definição objetiva
- Lista de componentes conhecidos
- Informação factual sem interpretação

**Classificação:**
- Tipo: Descritiva
- Níveis: 1
- Justificativa: Definição e listagem de componentes conhecidos

#### Exemplo 3: Estrutura de Dados
**Pergunta:** "Quais são os campos da entidade NotaFiscal no ERP Models?"

**Por que é Descritivo:**
- Informação objetiva sobre estrutura de código
- Não requer interpretação ou análise
- Resposta direta baseada no código-fonte

**Classificação:**
- Tipo: Descritiva
- Níveis: 1
- Justificativa: Consulta factual à estrutura de dados

---

## 2. Inquérito Analítico

### Características
- Requer **análise, comparação ou avaliação** entre opções/abordagens
- Envolve identificação de padrões, relações ou diferenças
- Necessita de raciocínio crítico além da simples recuperação de fatos
- Foco em "POR QUE" ou "COMO SE COMPARA"

### Profundidade Recomendada
**Níveis 1-2** - Monitoramento + Meta-auditoria para garantir análise isenta de vieses e logicamente consistente.

### Exemplos

#### Exemplo 1: Comparação de Abordagens
**Pergunta:** "Compare as abordagens de validação fiscal entre NFe e NFCe"

**Por que é Analítico:**
- Requer comparação estruturada entre dois sistemas
- Necessita identificar semelhanças e diferenças
- Envolve análise de trade-offs e contextos de uso

**Classificação:**
- Tipo: Analítica
- Níveis: 1-2
- Justificativa: Comparação requer análise crítica e identificação de padrões, com risco de viés de confirmação

#### Exemplo 2: Análise de Impacto
**Pergunta:** "Analise o impacto de mudar a entidade Pessoa no erp-core para outros módulos"

**Por que é Analítico:**
- Requer mapeamento de dependências
- Análise de consequências em cascata
- Avaliação de riscos e impactos

**Classificação:**
- Tipo: Analítica
- Níveis: 1-2
- Justificativa: Análise de impacto requer rastreamento de dependências e avaliação de riscos

#### Exemplo 3: Avaliação de Qualidade
**Pergunta:** "Avalie a qualidade dos testes unitários do módulo erp-financeiro"

**Por que é Analítico:**
- Requer critérios de avaliação
- Análise de cobertura, qualidade e padrões
- Julgamento baseado em boas práticas

**Classificação:**
- Tipo: Analítica
- Níveis: 1-2
- Justificativa: Avaliação requer critérios objetivos e análise crítica para evitar vieses pessoais

---

## 3. Inquérito Estratégico

### Características
- Envolve **planejamento, decisão ou otimização** de alto nível
- Requer consideração de múltiplos fatores, restrições e objetivos
- Impacto significativo em arquitetura, processos ou negócio
- Foco em "COMO DEVEMOS" ou "QUAL A MELHOR FORMA"

### Profundidade Recomendada
**Níveis 1-2-3 (completo)** - Processo completo de auditoria para garantir decisões bem fundamentadas e livres de atalhos mentais.

### Exemplos

#### Exemplo 1: Arquitetura de Novo Módulo
**Pergunta:** "Proponha arquitetura para novo módulo de tributação da Reforma Tributária (IBS/CBS)"

**Por que é Estratégico:**
- Decisão arquitetural de longo prazo
- Múltiplas alternativas possíveis
- Impacto em todo o sistema
- Requer balanceamento de trade-offs (performance, manutenibilidade, extensibilidade)

**Classificação:**
- Tipo: Estratégica
- Níveis: 1-2-3
- Justificativa: Decisão arquitetural crítica requer auditoria completa para evitar heurísticas preguiçosas e garantir análise de todas as alternativas

#### Exemplo 2: Plano de Refatoração
**Pergunta:** "Crie um plano para migrar código legado do erp-legacy para módulos específicos"

**Por que é Estratégico:**
- Planejamento de longo prazo
- Múltiplas etapas e dependências
- Riscos significativos
- Requer priorização e sequenciamento

**Classificação:**
- Tipo: Estratégica
- Níveis: 1-2-3
- Justificativa: Planejamento complexo com alto impacto requer processo completo de auditoria para identificar riscos ocultos

#### Exemplo 3: Otimização de Performance
**Pergunta:** "Proponha estratégia para otimizar performance do cálculo de impostos em lote"

**Por que é Estratégico:**
- Decisão de otimização com múltiplas abordagens
- Trade-offs entre complexidade e ganho
- Impacto em operações críticas
- Requer análise de custo-benefício

**Classificação:**
- Tipo: Estratégica
- Níveis: 1-2-3
- Justificativa: Otimização crítica requer análise profunda de alternativas e validação de premissas

---

## 4. Inquérito Ontológico

### Características
- Questiona **conceitos fundamentais, definições ou frameworks**
- Busca compreensão profunda de "por que as coisas são como são"
- Pode desafiar premissas básicas ou paradigmas existentes
- Foco em "O QUE REALMENTE SIGNIFICA" ou "QUAL É A NATUREZA DE"

### Profundidade Recomendada
**Níveis 1-2-3 + validação externa** - Processo completo com validação adicional, pois respostas podem redefinir conceitos fundamentais.

### Exemplos

#### Exemplo 1: Definição de Conceito Fundamental
**Pergunta:** "O que realmente significa 'tributação' no contexto do ERP e como isso difere de 'fiscalização'?"

**Por que é Ontológico:**
- Questiona definições fundamentais
- Busca distinções conceituais profundas
- Pode impactar como todo o sistema é estruturado

**Classificação:**
- Tipo: Ontológica
- Níveis: 1-2-3 + validação externa
- Justificativa: Definição de conceitos fundamentais requer máximo rigor e validação com especialistas de domínio

#### Exemplo 2: Framework Conceitual
**Pergunta:** "Qual deveria ser o framework conceitual para modelar 'Pessoa' considerando LGPD, multi-tenancy e contextos fiscal/comercial/financeiro?"

**Por que é Ontológico:**
- Questiona modelo conceitual fundamental
- Múltiplas dimensões e contextos
- Impacto em toda a arquitetura de dados
- Requer reconciliação de diferentes perspectivas

**Classificação:**
- Tipo: Ontológica
- Níveis: 1-2-3 + validação externa
- Justificativa: Modelagem conceitual fundamental requer auditoria completa e validação com especialistas de domínio e compliance

#### Exemplo 3: Paradigma de Design
**Pergunta:** "Devemos adotar DDD (Domain-Driven Design) no ERP? O que isso realmente significa para nossa arquitetura?"

**Por que é Ontológico:**
- Questiona paradigma arquitetural
- Redefine como pensamos sobre estrutura do código
- Impacto filosófico e prático profundo

**Classificação:**
- Tipo: Ontológica
- Níveis: 1-2-3 + validação externa
- Justificativa: Mudança de paradigma requer máxima profundidade de análise e validação com comunidade/especialistas

---

## 5. Casos Ambíguos e Critérios de Desempate

### Quando a Classificação Não é Óbvia

#### Regra 1: Em caso de dúvida entre dois tipos, escolha o mais profundo
- Descritivo vs Analítico → Analítico
- Analítico vs Estratégico → Estratégico
- Estratégico vs Ontológico → Ontológico

#### Regra 2: Perguntas compostas devem ser classificadas pelo componente mais complexo
**Exemplo:** "Liste os módulos do ERP (descritivo) e proponha uma nova arquitetura de integração (estratégico)"
- **Classificação:** Estratégica (componente mais complexo)

#### Regra 3: Contexto de impacto importa
Uma pergunta aparentemente descritiva pode ser estratégica se o contexto indicar decisão crítica.

**Exemplo:** "Quais são as dependências do erp-core?"
- **Contexto 1 (Curiosidade):** Descritiva
- **Contexto 2 (Planejando refatoração crítica):** Estratégica

### Exemplos de Casos Ambíguos

#### Caso 1: "Como funciona o cálculo de ICMS no ERP?"
**Análise:**
- Pode ser Descritivo (explicação do fluxo atual)
- Pode ser Analítico (análise de como e por que funciona assim)

**Decisão:** Verificar intenção
- Se busca apenas entender o fluxo → **Descritivo (Nível 1)**
- Se busca entender para avaliar/melhorar → **Analítico (Níveis 1-2)**

#### Caso 2: "Qual a melhor forma de implementar cache no módulo fiscal?"
**Análise:**
- Pode ser Analítico (comparação de opções de cache)
- Pode ser Estratégico (decisão arquitetural com impacto amplo)

**Decisão:** Avaliar escopo de impacto
- Se impacto localizado em um serviço → **Analítico (Níveis 1-2)**
- Se impacto em toda a arquitetura → **Estratégico (Níveis 1-2-3)**

---

## 6. Checklist de Classificação

Use este checklist para classificar qualquer inquérito:

### Passo 1: Identificar o Verbo Principal
- [ ] Listar, Descrever, Definir → **Descritivo**
- [ ] Comparar, Analisar, Avaliar → **Analítico**
- [ ] Planejar, Propor, Otimizar, Decidir → **Estratégico**
- [ ] Questionar, Redefinir, Fundamentar → **Ontológico**

### Passo 2: Avaliar Complexidade da Resposta
- [ ] Resposta direta baseada em fatos → **Descritivo**
- [ ] Resposta requer análise e comparação → **Analítico**
- [ ] Resposta requer planejamento e decisão → **Estratégico**
- [ ] Resposta redefine conceitos fundamentais → **Ontológico**

### Passo 3: Medir Impacto
- [ ] Impacto mínimo (informação) → **Descritivo**
- [ ] Impacto médio (compreensão) → **Analítico**
- [ ] Impacto alto (decisão/ação) → **Estratégico**
- [ ] Impacto fundamental (paradigma) → **Ontológico**

### Passo 4: Determinar Profundidade
- Descritivo → **Nível 1**
- Analítico → **Níveis 1-2**
- Estratégico → **Níveis 1-2-3**
- Ontológico → **Níveis 1-2-3 + validação externa**

---

## 7. Exemplos de Classificação Rápida

| Pergunta | Tipo | Níveis | Justificativa Resumida |
|----------|------|--------|------------------------|
| "Quais são os campos da tabela nota_fiscal?" | Descritiva | 1 | Consulta factual direta |
| "Por que usamos BigDecimal para valores monetários?" | Analítica | 1-2 | Análise de decisão técnica |
| "Como devemos estruturar o novo módulo de BI?" | Estratégica | 1-2-3 | Decisão arquitetural crítica |
| "O que é 'domínio' no contexto de DDD?" | Ontológica | 1-2-3+ | Conceito fundamental de paradigma |
| "Liste os módulos que dependem do erp-core" | Descritiva | 1 | Listagem de dependências |
| "Compare Spring Boot vs Quarkus para nosso contexto" | Analítica | 1-2 | Comparação técnica contextual |
| "Proponha migração do monolito para microserviços" | Estratégica | 1-2-3 | Transformação arquitetural |
| "Devemos repensar nossa definição de 'transação'?" | Ontológica | 1-2-3+ | Questionamento de conceito base |

---

## 8. Notas Finais

### Quando Pular o Processo Recursivo
Se a pergunta for **trivial** (ex: "quanto é 2+2", "qual a versão do Java"), responda diretamente sem classificação.

### Quando Usar Validação Externa (Ontológico)
- Consultar documentação oficial
- Verificar com especialistas de domínio
- Validar com comunidade técnica
- Revisar literatura acadêmica/profissional

### Adaptação Dinâmica
Durante o processo, se perceber que a classificação inicial estava incorreta:
1. Documente a reclassificação
2. Ajuste a profundidade de auditoria
3. Continue o processo com a nova classificação
