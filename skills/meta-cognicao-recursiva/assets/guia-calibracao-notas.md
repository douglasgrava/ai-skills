# Guia de Calibração de Notas - Rubrica Multi-Dimensional

Este guia fornece exemplos concretos para calibrar a avaliação em cada dimensão da rubrica de validação final.

---

## 1. Rigor Lógico

### Faixa 1-3: Falhas lógicas graves, raciocínio circular
**Exemplo:**
- **Problema:** "Como validar CPF em Java?"
- **Resposta:** "Para validar CPF, você precisa garantir que o CPF seja válido. Um CPF válido é aquele que passa na validação. Portanto, valide o CPF para garantir que ele seja válido."
- **Falha:** Raciocínio circular, não explica o algoritmo de validação.

### Faixa 4-6: Lógica básica presente, algumas lacunas
**Exemplo:**
- **Problema:** "Como calcular ICMS com substituição tributária?"
- **Resposta:** "Calcule a base de cálculo do ICMS ST multiplicando o valor do produto pela MVA. Depois aplique a alíquota."
- **Lacuna:** Não menciona dedução do ICMS próprio, não trata casos de redução de base.

### Faixa 7-8: Raciocínio sólido, poucas falhas
**Exemplo:**
- **Problema:** "Como implementar cache de consultas fiscais?"
- **Resposta:** "Use cache em memória com TTL de 1 hora. Invalide o cache quando houver alteração nas regras fiscais. Implemente fallback para consulta direta ao banco se o cache falhar."
- **Pequena falha:** Não menciona estratégia de warm-up do cache ou tratamento de cache distribuído.

### Faixa 9-10: Lógica impecável, sem falhas identificáveis
**Exemplo:**
- **Problema:** "Como garantir consistência em transferência entre contas?"
- **Resposta:** "Implemente transação ACID: 1) Inicie transação, 2) Valide saldo suficiente, 3) Debite conta origem, 4) Credite conta destino, 5) Registre auditoria, 6) Commit. Em caso de falha em qualquer etapa, execute rollback. Use lock pessimista para evitar race conditions. Implemente idempotência usando chave de deduplicação."

---

## 2. Completude

### Faixa 1-3: Solução incompleta, aspectos críticos faltando
**Exemplo:**
- **Problema:** "Como implementar autenticação JWT no sistema?"
- **Resposta:** "Crie um endpoint /login que retorna um token JWT."
- **Faltando:** Validação de credenciais, geração do token, validação do token, refresh token, tratamento de expiração.

### Faixa 4-6: Cobre aspectos principais, alguns detalhes faltando
**Exemplo:**
- **Problema:** "Como implementar exportação de relatório fiscal?"
- **Resposta:** "Crie um serviço que busca os dados fiscais do período, formata em XML conforme layout SPED, e retorna o arquivo para download."
- **Faltando:** Validação do período, tratamento de grandes volumes, compressão, registro de auditoria.

### Faixa 7-8: Solução completa, poucos detalhes menores faltando
**Exemplo:**
- **Problema:** "Como implementar cálculo de comissão de vendedores?"
- **Resposta:** "Crie tabela de regras de comissão (percentual por produto/categoria). Ao finalizar venda, calcule comissão baseada nas regras vigentes. Registre em tabela de comissões a pagar. Implemente relatório de comissões. Permita ajustes manuais com justificativa. Integre com folha de pagamento."
- **Detalhe menor faltando:** Tratamento de devoluções/cancelamentos que afetam comissões já pagas.

### Faixa 9-10: Solução exaustiva, todos os aspectos cobertos
**Exemplo:**
- **Problema:** "Como implementar controle de estoque com múltiplos depósitos?"
- **Resposta completa cobrindo:** Estrutura de dados (produto, depósito, lote, localização), movimentações (entrada, saída, transferência), reservas, inventário, rastreabilidade, integração com compras/vendas, regras de FIFO/FEFO, alertas de estoque mínimo, bloqueio de estoque, auditoria completa, relatórios gerenciais, tratamento de concorrência, performance para grandes volumes.

---

## 3. Clareza

### Faixa 1-3: Confuso, difícil de entender
**Exemplo:**
- **Resposta:** "O sistema faz a coisa do negócio fiscal que tem que calcular aquele troço da substituição que vai na base e depois aplica o percentual mas tem que ver se tem redução ou não dependendo do estado e do produto."
- **Problema:** Terminologia vaga, estrutura confusa, sem organização lógica.

### Faixa 4-6: Compreensível mas com ambiguidades
**Exemplo:**
- **Resposta:** "Para calcular o imposto, pegue o valor e multiplique pela alíquota. Se tiver desconto, aplique antes ou depois dependendo do caso."
- **Ambiguidade:** Não especifica qual valor (bruto/líquido), não define "dependendo do caso".

### Faixa 7-8: Claro, poucas ambiguidades
**Exemplo:**
- **Resposta:** "Calcule o ICMS em 3 etapas: 1) Base de cálculo = valor dos produtos - descontos incondicionais, 2) ICMS = base × alíquota do estado, 3) Valor total = base + ICMS. Nota: descontos condicionais não reduzem a base."
- **Pequena ambiguidade:** Não especifica se frete compõe a base.

### Faixa 9-10: Cristalino, sem ambiguidades
**Exemplo:**
- **Resposta estruturada com:** Definições precisas de termos, passo a passo numerado, exemplos concretos com valores, fórmulas matemáticas explícitas, casos especiais claramente identificados, referências a legislação quando aplicável.

---

## 4. Tratamento de Edge Cases

### Faixa 1-3: Edge cases ignorados
**Exemplo:**
- **Problema:** "Como calcular desconto percentual?"
- **Resposta:** "Multiplique o valor pelo percentual de desconto."
- **Edge cases ignorados:** Percentual > 100%, percentual negativo, valor zero, arredondamento.

### Faixa 4-6: Alguns edge cases identificados
**Exemplo:**
- **Problema:** "Como validar data de vencimento?"
- **Resposta:** "Valide se a data é futura. Se for passada, rejeite."
- **Edge cases identificados:** Data passada
- **Edge cases ignorados:** Data muito distante no futuro, 29 de fevereiro em ano não bissexto, fusos horários.

### Faixa 7-8: Maioria dos edge cases tratados
**Exemplo:**
- **Problema:** "Como processar pagamento com cartão?"
- **Resposta tratando:** Valor zero, valor negativo, timeout da operadora, cartão expirado, saldo insuficiente, duplicação de requisição.
- **Edge case não tratado:** Reversão parcial, chargeback.

### Faixa 9-10: Todos os edge cases identificados e tratados
**Exemplo:**
- **Problema:** "Como calcular prazo de entrega?"
- **Resposta cobrindo:** Dias úteis vs corridos, feriados nacionais/estaduais/municipais, finais de semana, greves, desastres naturais, produtos em backorder, múltiplos fornecedores, regiões de difícil acesso, prazos mínimos/máximos, SLA por tipo de cliente.

---

## 5. Coerência Semântica

### Faixa 1-3: Drift significativo, foco perdido
**Exemplo:**
- **Problema:** "Como corrigir erro de validação de CPF na tela de cadastro?"
- **Resposta:** "O sistema de cadastro foi desenvolvido em 2015 usando AngularJS. A arquitetura do sistema é baseada em microserviços. Para melhorar a performance, considere migrar para React e implementar cache Redis. Também seria interessante adicionar autenticação OAuth2."
- **Drift:** Perdeu completamente o foco do problema específico (validação de CPF).

### Faixa 4-6: Coerência básica, alguns desvios
**Exemplo:**
- **Problema:** "Como calcular ICMS de produto importado?"
- **Resposta:** "Calcule o ICMS aplicando a alíquota sobre o valor aduaneiro. Lembre-se de validar o CNPJ do fornecedor e verificar se ele está ativo na Receita Federal."
- **Desvio:** Validação de CNPJ não é diretamente relacionada ao cálculo de ICMS de importação.

### Faixa 7-8: Coerente, desvios mínimos
**Exemplo:**
- **Problema:** "Como implementar filtro de produtos por categoria?"
- **Resposta:** "Adicione parâmetro 'categoriaId' no endpoint. Modifique a query para incluir JOIN com tabela de categorias. Adicione índice na coluna categoria_id para performance."
- **Desvio mínimo:** Menção a índice é relevante mas não era o foco principal.

### Faixa 9-10: Perfeitamente coerente, foco mantido
**Exemplo:**
- **Resposta:** Mantém foco absoluto no problema apresentado, cada parágrafo contribui diretamente para a solução, não há digressões, terminologia consistente do início ao fim, progressão lógica clara do problema à solução.

---

## 6. Mitigação de Riscos

### Faixa 1-3: Riscos não identificados
**Exemplo:**
- **Problema:** "Como implementar exclusão de notas fiscais?"
- **Resposta:** "Crie um endpoint DELETE /notas-fiscais/{id} que remove o registro do banco."
- **Riscos não identificados:** Integridade referencial, auditoria fiscal, obrigações legais, dados relacionados órfãos.

### Faixa 4-6: Riscos identificados mas não mitigados
**Exemplo:**
- **Problema:** "Como implementar importação de planilha de produtos?"
- **Resposta:** "Leia o arquivo Excel e insira os produtos no banco. Atenção: arquivos grandes podem causar timeout."
- **Risco identificado:** Timeout
- **Não mitigado:** Não propõe solução (processamento assíncrono, batch, etc.)

### Faixa 7-8: Riscos identificados e parcialmente mitigados
**Exemplo:**
- **Problema:** "Como implementar integração com API externa de cotação?"
- **Resposta:** "Implemente retry com backoff exponencial para falhas temporárias. Use circuit breaker para evitar sobrecarga. Configure timeout de 5 segundos."
- **Mitigado:** Falhas temporárias, sobrecarga, timeout
- **Não mitigado:** Validação de dados retornados, versionamento da API, rate limiting.

### Faixa 9-10: Riscos identificados e completamente mitigados
**Exemplo:**
- **Problema:** "Como implementar processamento de pagamentos?"
- **Resposta cobrindo:**
  - **Risco:** Duplicação → **Mitigação:** Chave de idempotência
  - **Risco:** Falha de rede → **Mitigação:** Retry + reconciliação
  - **Risco:** Dados sensíveis → **Mitigação:** Tokenização + PCI compliance
  - **Risco:** Fraude → **Mitigação:** Análise de risco + 3DS
  - **Risco:** Concorrência → **Mitigação:** Lock otimista + versionamento
  - **Risco:** Auditoria → **Mitigação:** Log completo + imutabilidade

---

## Uso do Guia

1. **Antes da avaliação:** Leia os exemplos de cada faixa para calibrar seu julgamento
2. **Durante a avaliação:** Compare a resposta sendo avaliada com os exemplos
3. **Após a avaliação:** Revise se as notas atribuídas são consistentes com os exemplos
4. **Calibração em equipe:** Use este guia para alinhar critérios entre múltiplos avaliadores
