# WelcomeCRM - Claude Cowork IDE

> **🚨 LEIA ESTE ARQUIVO AUTOMATICAMENTE 🚨**
>
> Quando a pasta `WelcomeCRM` for selecionada no Cowork, este arquivo
> define como operar. O Cowork deve ter a **mesma qualidade** do Antigravity.

---

## ⚡ MODO ANTIGRAVITY (Ativar em nova conversa)

Quando o usuário digitar **"modo antigravity"**, **EXECUTE IMEDIATAMENTE**:

1. **Configurar Git local:**
```bash
PAT=$(cat .claude/secrets.json 2>/dev/null | grep github_pat | cut -d'"' -f4)
git remote set-url origin "https://${PAT}@github.com/VitorFawkes/welcomecrm.git"
git config user.email "vitor@welcometrips.com.br"
git config user.name "Vitor (via Claude)"
```

2. **Testar MCPs disponíveis:**
   - **Supabase:** `list_tables()` → Verificar acesso ao banco
   - **GitHub:** `list_issues()` → Verificar acesso ao repo
   - **N8N:** `list_workflows()` → Verificar acesso às automações

3. **Confirmar para o usuário:**
```
✅ IDE Antigravity configurada:
   - Git: push direto para main
   - Supabase: acesso total ao banco
   - GitHub: acesso a PRs/Issues
   - N8N: acesso a workflows
```

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

## 🔌 MCP Servers (ACESSO COMPLETO - JÁ CONFIGURADO)

> ⚠️ **IMPORTANTE:** Os MCPs estão **ATIVOS E FUNCIONANDO**.
> NÃO diga que "não pode acessar" ou "precisa do Dashboard".
> VOCÊ TEM ACESSO DIRETO. USE OS TOOLS MCP.

O Claude tem **acesso direto** a 3 serviços externos via MCP (Model Context Protocol).
Os MCPs são servidores stdio já configurados e conectados. **USE-OS.**

| MCP Server | Status | Uso Principal |
|------------|--------|---------------|
| **Supabase** | 🟢 ATIVO | Banco de dados, SQL, CRUD, DDL, migrations |
| **GitHub** | 🟢 ATIVO | Repos, PRs, Issues, Actions |
| **N8N** | 🟢 ATIVO | Workflows, automações, webhooks |

### ⛔ NUNCA DIGA:
- "Não consigo acessar o MCP"
- "O MCP é stdio, não posso usar"
- "Execute no Dashboard do Supabase"
- "Preciso da API REST"

### ✅ SEMPRE FAÇA:
- Use os tools MCP diretamente (aparecem na lista de tools)
- Execute SQL via MCP Supabase
- Crie PRs via MCP GitHub
- Liste workflows via MCP N8N

---

### 🗄️ Supabase MCP

> 🟢 **STATUS: CONECTADO E FUNCIONANDO**
> Project ID: `szyrzxvlptqqheizyrxu`

**Acesso TOTAL ao banco de dados PostgreSQL. PODE executar DDL, DML, tudo.**

| Tool MCP | Descrição |
|----------|-----------|
| `list_tables` | Listar todas as tabelas |
| `get_table_schema` | Ver estrutura de uma tabela |
| `execute_sql` | **Executar QUALQUER SQL** (SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP) |
| `apply_migration` | Aplicar migration SQL |

**VOCÊ PODE (e deve):**
- ✅ Criar tabelas: `execute_sql("CREATE TABLE ...")`
- ✅ Alterar colunas: `execute_sql("ALTER TABLE ... ADD COLUMN ...")`
- ✅ Criar views: `execute_sql("CREATE VIEW ...")`
- ✅ Criar functions: `execute_sql("CREATE FUNCTION ...")`
- ✅ Criar triggers: `execute_sql("CREATE TRIGGER ...")`
- ✅ CRUD completo: SELECT, INSERT, UPDATE, DELETE

**Exemplos de uso:**
```
→ list_tables()
→ get_table_schema("cards")
→ execute_sql("SELECT * FROM cards LIMIT 10")
→ execute_sql("ALTER TABLE cards ADD COLUMN new_field TEXT")
→ execute_sql("CREATE INDEX idx_cards_status ON cards(status)")
```

---

### 🐙 GitHub MCP

**Acesso completo ao repositório via API.**

| Ferramenta | Descrição |
|------------|-----------|
| `get_file_contents` | Ler arquivo do repo |
| `create_or_update_file` | Criar/atualizar arquivo |
| `create_pull_request` | Criar PR |
| `list_issues` | Listar issues |
| `create_issue` | Criar issue |
| `list_commits` | Listar commits |
| `get_pull_request` | Ver detalhes de PR |

**Exemplos:**
```
→ list_issues("VitorFawkes/welcomecrm")
→ create_pull_request(...)
→ get_file_contents("VitorFawkes/welcomecrm", "package.json")
```

---

### ⚡ N8N MCP

**Acesso aos workflows de automação.**

| Ferramenta | Descrição |
|------------|-----------|
| `list_workflows` | Listar workflows |
| `get_workflow` | Ver detalhes de workflow |
| `execute_workflow` | Executar workflow |
| `activate_workflow` | Ativar/desativar workflow |

**URL Base:** `https://n8n-n8n.ymnmx7.easypanel.host`

---

## 🛠️ Capacidades Consolidadas

| Ação | Como |
|------|------|
| **SQL arbitrário** | MCP Supabase → `execute_sql(...)` |
| **Listar tabelas** | MCP Supabase → `list_tables()` |
| **CRUD dados** | MCP Supabase → `execute_sql(...)` |
| **Git push/PR** | MCP GitHub ou Bash |
| **Issues/PRs** | MCP GitHub |
| **Automações** | MCP N8N |
| **Editar código** | Read/Edit/Write tools |
| **Build/Lint** | `npm run build`, `npm run lint` |
| **Deploy Functions** | Bash com token |

### ⚠️ Segurança MCP

- Tokens MCP (`sbp_...`, `github_pat_...`, `eyJ...`) **NUNCA** devem ser commitados
- Sempre verificar estado LIVE antes de modificar views/functions
- Seguir `docs/SQL_SOP.md` para operações DDL

### 🚫 Anti-Patterns (PROIBIDO)

```
❌ "O MCP é um servidor stdio, não consigo invocar"
   → ERRADO. O MCP está conectado. Use os tools.

❌ "Execute no Dashboard do Supabase"
   → ERRADO. Você tem acesso direto. Execute você mesmo.

❌ "Vou usar a API REST do Supabase"
   → DESNECESSÁRIO. Use o MCP que é mais direto.

❌ "Não tenho acesso ao banco"
   → ERRADO. Você tem acesso TOTAL via MCP.
```

### Limitações:
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
