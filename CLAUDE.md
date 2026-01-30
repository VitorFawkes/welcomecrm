# WelcomeCRM - Claude Cowork IDE

> **🚨 LEIA ESTE ARQUIVO AUTOMATICAMENTE 🚨**
>
> Quando a pasta `WelcomeCRM` for selecionada no Cowork, este arquivo
> define como operar. O Cowork deve ter a **mesma qualidade** do Antigravity.

---

## ⚡ MODO ANTIGRAVITY (Ativar em nova conversa)

Quando o usuário digitar **"modo antigravity"**, **EXECUTE IMEDIATAMENTE**:

1. **Configurar Git:**
```bash
PAT=$(cat .claude/secrets.json 2>/dev/null | grep github_pat | cut -d'"' -f4)
git remote set-url origin "https://${PAT}@github.com/VitorFawkes/welcomecrm.git"
git config user.email "vitor@welcometrips.com.br"
git config user.name "Vitor (via Claude)"
```

2. **Testar Supabase MCP:** `supabase_rpc` → `list_all_tables()`

3. **Confirmar para o usuário:** "✅ IDE configurada - Git e Supabase prontos"

---

## 🧠 Comportamento Automático (SEMPRE)

Ao receber **qualquer tarefa** neste projeto, o Claude Cowork DEVE:

### 1. Identificar o tipo de tarefa e carregar o Agent correto

| Tipo de Tarefa | Agent (LER ANTES de executar) |
|----------------|-------------------------------|
| SQL, banco, migrations, views, triggers | `.agent/agents/database-architect.md` |
| Frontend, React, componentes, UI | `.agent/agents/frontend-specialist.md` |
| Backend, API, Edge Functions | `.agent/agents/backend-specialist.md` |
| Debug, investigar erro, troubleshoot | `.agent/agents/debugger.md` |
| Testes, QA | `.agent/agents/test-engineer.md` |
| Planejar feature, brainstorm | `.agent/agents/project-planner.md` |
| Código legado, refactor | `.agent/agents/code-archaeologist.md` |
| Performance, otimização | `.agent/agents/performance-optimizer.md` |
| Segurança, vulnerabilidades | `.agent/agents/security-auditor.md` |

### 2. Carregar os Skills referenciados pelo Agent

Cada agent tem um campo `skills:` no header. Ler cada skill em:
`.agent/skills/<nome>/SKILL.md`

Exemplo: `database-architect` referencia `database-design`, então ler:
`.agent/skills/database-design/SKILL.md`

### 3. Seguir os checklists e princípios do Agent

Cada agent tem:
- **Philosophy/Mindset** → Como pensar
- **Decision Process** → Passos a seguir
- **Anti-Patterns** → O que NÃO fazer
- **Review Checklist** → Verificar antes de entregar

### 4. Consultar a documentação de negócio

- `.agent/CODEBASE.md` → Entidades, hooks, páginas, regras
- `docs/SYSTEM_CONTEXT.md` → Arquitetura, patterns, decisões
- `.cursorrules` → Iron Dome Protocol (segurança)

---

## ⚡ PROTOCOLO DE ENTRADA (OBRIGATÓRIO - QUALQUER AGENTE)

> ⛔ **BLOQUEIO:** Nenhuma ação de código/banco pode ser executada sem completar este protocolo.

### PASSO 1: Classificar a Tarefa

Identificar o tipo e carregar o agent correspondente (seção acima).

### PASSO 2: Ler Documentação

**ANTES de escrever qualquer código, LER:**
1. O agent correspondente: `.agent/agents/{agent}.md`
2. A seção relevante do `.agent/CODEBASE.md`
3. Se SQL: ler `docs/SQL_SOP.md` e verificar estado LIVE

### PASSO 3: Declarar Contexto

**O agente DEVE declarar antes de executar:**

```
🤖 Contexto Carregado:
- Agent: {nome do agent}
- CODEBASE.md seções: {seções lidas}
- Entidades envolvidas: {tabelas/hooks/pages}
```

⛔ **Se não declarar, o usuário pode cobrar: "Você seguiu o protocolo de entrada?"**

---

## ✅ CHECKLIST DE SAÍDA (BLOQUEANTE)

> ⛔ O agente **NÃO PODE** dizer "concluído" sem verificar:

| Criei... | Ação Obrigatória | Seção CODEBASE.md |
|----------|------------------|-------------------|
| Nova página | Adicionar à lista | 3.3 Pages |
| Novo hook | Adicionar à lista | 2.3 Hooks |
| Nova tabela/coluna | Adicionar à lista | 1. Core Entities |
| Novo componente crítico | Documentar | 9. Componentes Críticos |

**Comando de verificação:**
```bash
grep "nome_do_item_criado" .agent/CODEBASE.md
# Se não encontrar → ATUALIZAR antes de finalizar
```

---

## 🔐 Rules Globais (SEMPRE ATIVAS)

Ler e seguir TODAS as rules em `.agent/rules/`:

| Rule | Propósito |
|------|-----------|
| `01-mandatory-context.md` | **⚡ Protocolo de entrada/saída** |
| `00-project-context.md` | IDs do Supabase, stack |
| `10-secrets-protection.md` | **🚨 NUNCA hardcodar tokens/keys** |
| `20-supabase-safety.md` | Segurança SQL |
| `90-project-architecture.md` | Arquitetura |
| `91-project-design.md` | Design system |
| `95-excellence-enforcement.md` | Padrões de qualidade |
| `99-qa-guardian.md` | QA obrigatório |

---

## 🔑 Secrets (`.claude/secrets.json`)

```json
{
  "github_pat": "ghp_...",
  "supabase_service_role": "eyJ...",
  "supabase_management_key": "sb_secret_..."
}
```

### ⛔ REGRA CRÍTICA DE SECRETS

**NUNCA** escrever tokens, keys ou senhas diretamente em código.

```typescript
// ❌ PROIBIDO
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ✅ CORRETO
const KEY = process.env.SUPABASE_KEY;
```

**Antes de criar qualquer arquivo**, verificar:
1. Contém strings que parecem tokens? → Usar `process.env`
2. É arquivo de debug/teste? → Verificar se está no `.gitignore`

**Ler obrigatoriamente:** `.agent/rules/10-secrets-protection.md`

---

## 🛠️ Capacidades

| Ação | Como |
|------|------|
| **SQL arbitrário** | `supabase_rpc` → `exec_sql({"query": "..."})` |
| **Listar tabelas** | `supabase_rpc` → `list_all_tables()` |
| **CRUD dados** | `supabase_query`, `supabase_insert`, etc |
| **Git push** | Bash (após configurar PAT) |
| **Editar código** | Read/Edit/Write tools |
| **Build/Lint** | `npm run build`, `npm run lint` |

### Limitações:
- ❌ Deploy Edge Functions → usuário roda `supabase functions deploy`
- ❌ Rodar app local → usuário roda `npm run dev`

---

## ⚠️ SQL Safety (OBRIGATÓRIO)

Antes de modificar View/Function/Trigger:

1. Ler `docs/SQL_SOP.md`
2. Consultar estado LIVE: `SELECT definition FROM pg_views WHERE viewname = '...'`
3. Verificar após aplicar que nada foi perdido

**Violação = Critical Engineering Failure**

---

## 🔄 Workflows Disponíveis

Comandos estruturados para tarefas complexas (ler em `.agent/workflows/`):

| Comando | Workflow | Quando usar |
|---------|----------|-------------|
| `/plan` | `plan.md` | Planejar feature antes de implementar |
| `/create` | `create.md` | Criar nova funcionalidade |
| `/debug` | `debug.md` | Investigar e corrigir bug |
| `/enhance` | `enhance.md` | Melhorar código existente |
| `/test` | `test.md` | Criar ou rodar testes |
| `/deploy` | `deploy.md` | Preparar para deploy |
| `/status` | `status.md` | Verificar estado do projeto |
| `/brainstorm` | `brainstorm.md` | Explorar ideias (Socratic) |
| `/new-module` | `new-module.md` | Criar módulo completo |
| `/sync` | `sync.md` | **Sincronizar CODEBASE.md com código** |

---

## 🔄 Commits

- Mensagens em português
- Co-author: `Co-Authored-By: Claude <noreply@anthropic.com>`
- Branch: `main`
- Lint antes: `npm run lint`

---

## 🔧 Após Mudanças no Banco

Sempre regenerar types após alterar schema:

```bash
npx supabase gen types typescript --project-id szyrzxvlptqqheizyrxu > src/database.types.ts
```

E atualizar `.agent/CODEBASE.md` se criou nova entidade/hook/page.
