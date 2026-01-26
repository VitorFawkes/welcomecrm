---
trigger: always_on
---

# 🏆 EXCELLENCE ENFORCEMENT PROTOCOL

> **Activation:** ALWAYS ON. This is the highest priority rule.
> **Purpose:** Garantir que TODA resposta atinge padrão de excelência desde a PRIMEIRA interação.

---

## 🚫 THE "GOOD ENOUGH" TRAP - FORBIDDEN BEHAVIORS

| Comportamento Proibido | O Que Fazer Ao Invés |
|------------------------|----------------------|
| ❌ Resposta superficial na primeira tentativa | ✅ Análise profunda IMEDIATA |
| ❌ "Vou verificar isso" sem verificar de verdade | ✅ Execute grep, query, file read ANTES de responder |
| ❌ Mencionar agentes sem aplicar suas regras | ✅ Ler e APLICAR o .md do agente |
| ❌ Dizer "provavelmente" ou "talvez" | ✅ Verificar no código/banco e dar resposta concreta |
| ❌ Análise baseada em suposições | ✅ Sempre usar MCP, grep, find para dados reais |

---

## 🔴 MANDATORY DEPTH CHECKS

**ANTES de responder qualquer pedido de análise/auditoria/verificação:**

1. **Query Real Data:**
   - Database: `mcp2_list_tables`, `mcp2_execute_sql`
   - Codebase: `find`, `grep`, `view_file`
   
2. **Compare Documentation vs Reality:**
   - O que está documentado em CODEBASE.md?
   - O que realmente existe no projeto?
   - Qual é o GAP?

3. **Multi-Agent Application:**
   - Identifique TODOS os domínios do request
   - Aplique o mindset de CADA agente relevante
   - Não basta mencionar - EXECUTE como especialista

---

## 📏 QUALITY GATE - SELF-CHECK

**ANTES de enviar qualquer resposta, pergunte-se:**

| Pergunta | Se "Não" → PARE |
|----------|-----------------|
| Usei dados REAIS (MCP/grep/find)? | Volte e busque dados reais |
| Comparei documentação vs realidade? | Execute a comparação agora |
| Apliquei mindset de especialista? | Releia o agent.md e aplique |
| Esta resposta passaria em code review do Google? | Refaça com mais profundidade |
| O usuário precisaria perguntar de novo? | Antecipe e inclua mais detalhes |

---

## 🎯 THE FIRST-TIME-RIGHT PRINCIPLE

> **"A primeira resposta deve ser tão completa que o usuário NÃO precise pedir clarificação."**

**Implementação:**
1. Overdeliver informação, não underdeliver
2. Mostre o "trabalho" (queries, greps, comparações)
3. Antecipe follow-up questions e responda-as
4. Se em dúvida, vá MAIS profundo, nunca mais superficial

---

## 📊 ENFORCEMENT METRICS

Após cada interação, auto-avalie:

| Métrica | Target |
|---------|--------|
| Tools usadas para verificação | ≥3 |
| Dados de fonte real (não suposição) | 100% |
| Agentes aplicados (não mencionados) | ≥2 para tarefas complexas |
| Follow-up necessário do usuário | 0 |

---

## 🔒 VIOLATION CONSEQUENCES

Se você perceber que está:
- Simplificando para "economizar tempo"
- Dando resposta genérica
- Não verificando dados reais

**PARE IMEDIATAMENTE.**

Releia este arquivo e recomece a análise do zero, fazendo corretamente.

---

## 📚 KNOWLEDGE SYNC PROTOCOL (CODEBASE.md)

> **Regra:** O conhecimento documentado DEVE refletir a realidade do código.

### Trigger: Após QUALQUER mudança estrutural

| Se você criou... | Atualize em CODEBASE.md... |
|------------------|---------------------------|
| Nova tabela/coluna | Seção 1 (Core Entities ou Satellites) |
| Novo hook | Seção 2.3 (Frontend Hooks) |
| Nova page | Seção 3.3 (Pages) |
| Novo componente UI | Seção 4 (UI Components) |
| Nova section | Seção 2.2 (Active Sections) |

### Verificação Obrigatória

```bash
grep "nome_do_item" .agent/CODEBASE.md
# Se não encontrar → ATUALIZE antes de finalizar
```

### Consequência de Violação

- Próximo agent (ou nova sessão) operará com **informação falsa**
- Decisões serão tomadas com base em **fantasmas**
- Tempo será desperdiçado redescobindo o que já foi documentado

> 🔴 **NÃO diga "concluído" sem verificar que CODEBASE.md está atualizado.**
