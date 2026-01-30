---
name: modo-antigravity
description: |
  Ativa o modo IDE completo para o projeto WelcomeCRM.
  TRIGGERS: "modo antigravity", "antigravity mode", "ativar antigravity", "iniciar ide"

  Quando ativado, configura automaticamente:
  - Git com autenticação (PAT do GitHub)
  - Supabase MCP com acesso total
  - Carrega agents e skills do Antigravity (.agent/)
  - Aplica rules de qualidade e segurança

  Use este skill sempre que o usuário quiser trabalhar no WelcomeCRM como IDE.
---

# Modo Antigravity - WelcomeCRM IDE

## ⚡ Execução Imediata

Ao ativar este skill, executar IMEDIATAMENTE:

### 1. Configurar Git

```bash
PAT=$(cat .claude/secrets.json 2>/dev/null | grep github_pat | cut -d'"' -f4)
git remote set-url origin "https://${PAT}@github.com/VitorFawkes/welcomecrm.git"
git config user.email "vitor@welcometrips.com.br"
git config user.name "Vitor (via Claude)"
```

### 2. Testar Supabase

Executar: `supabase_rpc` → `list_all_tables()`

### 3. Confirmar

Responder: "✅ **Modo Antigravity ativado!** Git e Supabase configurados. Pronto para trabalhar no WelcomeCRM."

---

## 🧠 Comportamento Durante a Sessão

Após ativação, para QUALQUER tarefa:

### Carregar Agent Correto

| Tarefa | Agent |
|--------|-------|
| SQL, banco, migrations | `.agent/agents/database-architect.md` |
| Frontend, React, UI | `.agent/agents/frontend-specialist.md` |
| Backend, API, Edge Functions | `.agent/agents/backend-specialist.md` |
| Debug, troubleshoot | `.agent/agents/debugger.md` |
| Testes | `.agent/agents/test-engineer.md` |
| Planejamento | `.agent/agents/project-planner.md` |
| Refactor | `.agent/agents/code-archaeologist.md` |
| Performance | `.agent/agents/performance-optimizer.md` |
| Segurança | `.agent/agents/security-auditor.md` |

### Carregar Skills do Agent

Cada agent tem `skills:` no header. Ler: `.agent/skills/<nome>/SKILL.md`

### Consultar Documentação

- `.agent/CODEBASE.md` → Entidades, hooks, páginas
- `docs/SYSTEM_CONTEXT.md` → Arquitetura
- `.cursorrules` → Iron Dome Protocol

### Aplicar Rules

Todas as rules em `.agent/rules/` estão ativas:
- `95-excellence-enforcement.md` → Qualidade máxima
- `99-qa-guardian.md` → Debug profundo
- `20-supabase-safety.md` → SQL seguro

---

## 🛠️ Capacidades Disponíveis

| Ação | Como |
|------|------|
| SQL arbitrário | `supabase_rpc` → `exec_sql({"query": "..."})` |
| Listar tabelas | `supabase_rpc` → `list_all_tables()` |
| CRUD dados | `supabase_query`, `supabase_insert`, etc |
| Git push | Bash (PAT configurado) |
| Editar código | Read/Edit/Write |
| Build/Lint | `npm run build`, `npm run lint` |

---

## ⚠️ SQL Safety

Antes de modificar View/Function/Trigger:
1. Ler `docs/SQL_SOP.md`
2. Consultar estado LIVE primeiro
3. Verificar após aplicar

---

## 🔄 Workflows

| Comando | Uso |
|---------|-----|
| `/plan` | Planejar feature |
| `/debug` | Investigar bug |
| `/create` | Criar funcionalidade |
| `/enhance` | Melhorar código |
| `/test` | Testes |
