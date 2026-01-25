# Matriz de Decisão Crítica - Checkpoint de Validação Humana

## 1. Matriz de Impacto × Reversibilidade

| Impacto / Reversibilidade | Fácil | Moderada | Difícil | Irreversível |
|---------------------------|-------|----------|---------|--------------|
| **Baixo**                 | 🟢 Auto | 🟢 Auto | 🟡 Auto | 🟡 Auto |
| **Médio**                 | 🟢 Auto | 🟡 Auto | 🟠 Checkpoint | 🟠 Checkpoint |
| **Alto**                  | 🟡 Auto | 🟠 Checkpoint | 🔴 Checkpoint | 🔴 Checkpoint |
| **Crítico**               | 🟠 Checkpoint | 🔴 Checkpoint | 🔴 Checkpoint | 🔴 Checkpoint |

### Legenda
- 🟢 **Auto**: Decisão autônoma do agente (sem checkpoint)
- 🟡 **Auto**: Decisão autônoma com registro detalhado nos logs
- 🟠 **Checkpoint**: Ativar checkpoint de validação humana
- 🔴 **Checkpoint**: Ativar checkpoint obrigatório (não pode ser ignorado)

## 2. Threshold de Ativação

### Regra de Ativação do Checkpoint
O checkpoint é ativado quando **qualquer** das condições abaixo é verdadeira:

1. **Score de Risco ≥ 6** (calculado pela fórmula abaixo)
2. **Impacto = Crítico** (independente da reversibilidade)
3. **Reversibilidade = Irreversível** E **Impacto ≥ Médio**
4. **Tipo de Decisão** está na lista de decisões obrigatórias (ver seção 3)

### Cálculo do Score de Risco
```
Score = (Impacto × 3) + (Reversibilidade × 2)

Onde:
Impacto: Baixo=1, Médio=2, Alto=3, Crítico=4
Reversibilidade: Fácil=1, Moderada=2, Difícil=3, Irreversível=4
```

**Exemplos:**
- Baixo + Fácil = (1×3) + (1×2) = 5 → Auto
- Médio + Difícil = (2×3) + (3×2) = 12 → Checkpoint
- Alto + Moderada = (3×3) + (2×2) = 13 → Checkpoint
- Crítico + Fácil = (4×3) + (1×2) = 14 → Checkpoint

## 3. Tipos de Decisão que Sempre Requerem Validação

### 3.1 Decisões Arquiteturais
- [ ] Mudança de padrão arquitetural (ex: monolito → microserviços)
- [ ] Alteração de framework principal (ex: Spring → Quarkus)
- [ ] Mudança de estratégia de persistência (ex: JPA → NoSQL)
- [ ] Modificação de protocolo de comunicação (ex: REST → gRPC)
- [ ] Alteração de estratégia de autenticação/autorização

### 3.2 Decisões de Segurança
- [ ] Mudança em mecanismo de criptografia
- [ ] Alteração de política de acesso a dados sensíveis
- [ ] Modificação de fluxo de autenticação
- [ ] Exposição de novos endpoints públicos com dados sensíveis
- [ ] Alteração de configuração de CORS ou CSP

### 3.3 Decisões de Dados
- [ ] Alteração de schema de banco de dados em produção
- [ ] Migração de dados entre sistemas
- [ ] Mudança de estratégia de backup/recovery
- [ ] Alteração de política de retenção de dados
- [ ] Modificação de estrutura de dados sensíveis (LGPD)

### 3.4 Decisões de Processo
- [ ] Mudança em fluxo de negócio crítico (ex: faturamento, pagamento)
- [ ] Alteração de regra fiscal ou contábil
- [ ] Modificação de cálculo de impostos
- [ ] Mudança em processo de integração com órgãos governamentais
- [ ] Alteração de fluxo de aprovação ou auditoria

### 3.5 Decisões de Infraestrutura
- [ ] Mudança de versão major de dependência crítica (ex: Java 11 → 17)
- [ ] Alteração de estratégia de deploy
- [ ] Modificação de configuração de cluster/alta disponibilidade
- [ ] Mudança de provedor de serviço crítico (ex: banco de dados)

## 4. Exceções e Casos Especiais

### 4.1 Decisões que NÃO Requerem Checkpoint
Mesmo com score alto, as seguintes decisões podem ser autônomas:
- Refatoração interna sem mudança de API pública
- Otimização de performance sem mudança de comportamento
- Correção de bug com teste de regressão claro
- Atualização de documentação ou comentários
- Mudança de nomenclatura (variáveis, métodos privados)

### 4.2 Contexto de Emergência
Em situações de emergência (ex: correção de vulnerabilidade crítica em produção):
- Checkpoint pode ser ativado de forma assíncrona
- Decisão pode ser tomada pelo agente com registro detalhado
- Validação humana ocorre post-mortem

## 5. Fluxo de Decisão

```
┌─────────────────────────┐
│ Decisão Identificada    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Caracterizar Decisão    │
│ (Tipo, Impacto, Revers.)│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Calcular Score de Risco │
└───────────┬─────────────┘
            │
            ▼
      ┌─────────┐
      │Score ≥ 6│ ──Não──► Decisão Autônoma
      │   OU    │          (registrar nos logs)
      │Obrigatória?│
      └────┬────┘
           │Sim
           ▼
┌─────────────────────────┐
│ Ativar Checkpoint       │
│ (template-checkpoint-   │
│  humano.md)             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ PAUSAR EXECUÇÃO         │
│ Aguardar Input Humano   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Processar Resposta      │
│ (Aprovar/Modificar/     │
│  Rejeitar/Adiar)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Continuar Execução      │
│ (Nível 3)               │
└─────────────────────────┘
```

## 6. Exemplos Práticos

### Exemplo 1: Renomear Variável Local
- **Tipo:** Refatoração
- **Impacto:** Baixo (1)
- **Reversibilidade:** Fácil (1)
- **Score:** (1×3) + (1×2) = 5
- **Decisão:** 🟢 Auto (sem checkpoint)

### Exemplo 2: Refatorar Método Público
- **Tipo:** Arquitetural
- **Impacto:** Médio (2)
- **Reversibilidade:** Moderada (2)
- **Score:** (2×3) + (2×2) = 10
- **Decisão:** 🟠 Checkpoint (score ≥ 6)

### Exemplo 3: Mudar Schema de Banco de Dados
- **Tipo:** Dados
- **Impacto:** Alto (3)
- **Reversibilidade:** Difícil (3)
- **Score:** (3×3) + (3×2) = 15
- **Decisão:** 🔴 Checkpoint Obrigatório (tipo de decisão + score alto)

### Exemplo 4: Migrar Arquitetura de Autenticação
- **Tipo:** Segurança + Arquitetural
- **Impacto:** Crítico (4)
- **Reversibilidade:** Irreversível (4)
- **Score:** (4×3) + (4×2) = 20
- **Decisão:** 🔴 Checkpoint Obrigatório (impacto crítico + tipo obrigatório)

## 7. Registro e Auditoria

Todas as decisões (com ou sem checkpoint) devem ser registradas com:
- Timestamp
- Tipo de decisão
- Score de risco calculado
- Checkpoint ativado? (Sim/Não)
- Se ativado: resposta humana recebida
- Justificativa da decisão final
- Impacto observado (post-implementação)
