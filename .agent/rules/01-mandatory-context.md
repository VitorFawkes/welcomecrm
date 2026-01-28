---
trigger: always_on
priority: P0
---

# 01 - PROTOCOLO DE CONTEXTO OBRIGATÓRIO

> **Prioridade: MÁXIMA** - Esta regra se aplica a QUALQUER agente (Claude, Gemini, GPT, etc.)
> **Objetivo:** Prevenir alucinações e garantir que decisões sejam baseadas em dados reais.

---

## PROTOCOLO DE ENTRADA (ANTES de qualquer ação)

### PASSO 1: Classificar a Tarefa

| Se a tarefa envolve... | Tipo | Agent Obrigatório |
|------------------------|------|-------------------|
| SQL, banco, migrations, views, triggers | DATABASE | `database-architect.md` |
| React, componentes, UI, páginas | FRONTEND | `frontend-specialist.md` |
| API, Edge Functions, webhooks | BACKEND | `backend-specialist.md` |
| Bug, erro, troubleshoot, investigar | DEBUG | `debugger.md` |
| Planejar feature, brainstorm | PLANNING | `project-planner.md` |
| Segurança, vulnerabilidades | SECURITY | `security-auditor.md` |
| Performance, otimização | PERFORMANCE | `performance-optimizer.md` |

### PASSO 2: Ler Documentação

**ANTES de escrever qualquer código, LER:**

1. O agent correspondente: `.agent/agents/{agent}.md`
2. A seção relevante do CODEBASE.md:
   - Se criando página → Seção 3.3
   - Se criando hook → Seção 2.3
   - Se modificando banco → Seção 1
   - Se trabalhando com proposals → Seção sobre Proposals
3. Se SQL: ler `docs/SQL_SOP.md` e verificar estado LIVE no banco

### PASSO 3: Declarar Contexto

**O agente DEVE declarar antes de executar:**

```markdown
🤖 **Contexto Carregado:**
- Agent: `{nome do agent}`
- CODEBASE.md seções: `{seções lidas}`
- Entidades envolvidas: `{tabelas/hooks/pages afetadas}`
- Verificação LIVE: `{sim/não - o que foi verificado}`
```

⛔ **Se o agente não declarar isso, PARE e exija a declaração.**

---

## PROTOCOLO DE SAÍDA (DEPOIS de completar)

### Checklist Obrigatório

**ANTES de dizer "concluído", verificar:**

| Criei... | Ação Obrigatória | Seção CODEBASE.md |
|----------|------------------|-------------------|
| Nova página | Adicionar à lista com rota | 3.3 Pages |
| Novo hook | Adicionar à lista com descrição | 2.3 Hooks |
| Nova tabela/coluna | Adicionar à lista | 1. Core Entities |
| Novo componente crítico | Documentar comportamento | 9. Componentes Críticos |
| View/Function/Trigger | Verificar estado LIVE | 1.x Satellites |

### Comando de Verificação

```bash
grep "nome_do_item_criado" .agent/CODEBASE.md
# Se não encontrar → ATUALIZAR antes de finalizar
```

### Declaração de Saída

```markdown
✅ **Checklist de Saída:**
- [ ] Criei algo novo? {sim/não}
- [ ] Se sim, atualizei CODEBASE.md? {sim/não}
- [ ] Verifiquei que funciona? {sim/não}
```

---

## CONSEQUÊNCIAS DE VIOLAÇÃO

Se o agente violar este protocolo:

1. **Informação falsa:** O próximo agente vai operar com dados errados
2. **Erros em cascata:** Decisões serão tomadas com base em fantasmas
3. **Retrabalho:** Tempo será desperdiçado redescobindo o que já foi feito
4. **Responsabilização:** O usuário pode cobrar: "Você seguiu o protocolo de entrada/saída?"

---

## EXEMPLOS

### Exemplo 1: Criar novo hook

```markdown
🤖 **Contexto Carregado:**
- Agent: `frontend-specialist.md`
- CODEBASE.md seções: `2.3 Hooks, 5. Pipeline System`
- Entidades envolvidas: `pipeline_stages, cards`
- Verificação LIVE: `sim - consultei estrutura de pipeline_stages via MCP`

[... implementação ...]

✅ **Checklist de Saída:**
- [x] Criei algo novo? sim - useNewHook.ts
- [x] Se sim, atualizei CODEBASE.md? sim - adicionei na seção 2.3
- [x] Verifiquei que funciona? sim - testei com dados reais
```

### Exemplo 2: Modificar view no banco

```markdown
🤖 **Contexto Carregado:**
- Agent: `database-architect.md`
- CODEBASE.md seções: `1. Core Entities`
- Entidades envolvidas: `view_cards_acoes`
- Verificação LIVE: `sim - SELECT definition FROM pg_views WHERE viewname = 'view_cards_acoes'`

[... implementação ...]

✅ **Checklist de Saída:**
- [x] Criei algo novo? não - apenas modifiquei view existente
- [x] Verifiquei estado LIVE após mudança? sim - view atualizada corretamente
```

---

## REGRA DE OURO

> **"Nunca assuma. Sempre verifique. Sempre documente."**

Esta regra não tem exceções.
