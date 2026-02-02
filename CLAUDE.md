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

2. **Verificar acessos disponíveis:**
   - **MCP tools:** Checar se `list_tables`, `execute_sql` estão na lista de tools
   - **GitHub CLI:** `gh auth status` para verificar se está autenticado
   - **Supabase CLI:** `npx supabase projects list` para verificar acesso

3. **Confirmar para o usuário:**
```
✅ IDE Antigravity configurada:
   - Git: [status]
   - Supabase: [MCP ativo / CLI disponível / Dashboard]
   - GitHub: [MCP ativo / gh CLI]
   - N8N: [MCP ativo / API REST]
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

## 🔌 MCP Servers (CONFIGURADOS)

O usuário configurou 3 servidores MCP. **VERIFIQUE SE ESTÃO ATIVOS antes de usar.**

| MCP Server | Uso Principal |
|------------|---------------|
| **Supabase** | Banco de dados, SQL, CRUD, DDL, migrations |
| **GitHub** | Repos, PRs, Issues, Actions |
| **N8N** | Workflows, automações, webhooks |

### 🔍 VERIFICAR CONEXÃO MCP

**PASSO 1:** Verifique se os tools MCP estão na sua lista de ferramentas.
Se você tem tools como `list_tables`, `execute_sql`, `list_workflows` → MCP está ativo.
Se não tem → MCP não está conectado nesta sessão.

**PASSO 2:** Se MCP não estiver conectado, use alternativas:
- **Supabase:** Edge Function ou Dashboard
- **GitHub:** `gh` CLI via Bash
- **N8N:** API REST direta

### ⚠️ Configuração MCP (referência)

Os MCPs são configurados em `~/.gemini/antigravity/mcp_config.json`:
```json
{
  "mcpServers": {
    "supabase-mcp-server": { ... },
    "github-mcp-server": { ... },
    "n8n-mcp": { ... }
  }
}
```

Para ativar, o Claude Code precisa ser iniciado com os MCPs conectados.

---

### 🗄️ Supabase

> Project ID: `szyrzxvlptqqheizyrxu`
> Dashboard: https://supabase.com/dashboard/project/szyrzxvlptqqheizyrxu

**Se MCP ativo** (tools `list_tables`, `execute_sql` disponíveis):
```
→ list_tables()
→ execute_sql("SELECT * FROM cards LIMIT 10")
→ execute_sql("ALTER TABLE cards ADD COLUMN new_field TEXT")
```

**Se MCP inativo** (alternativas):
```bash
# Via Supabase CLI
npx supabase db execute --project-ref szyrzxvlptqqheizyrxu "SELECT * FROM cards LIMIT 10"

# Ou pedir para o usuário executar no Dashboard
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

| Ação | Opção 1 (MCP) | Opção 2 (CLI/API) |
|------|---------------|-------------------|
| **SQL arbitrário** | `execute_sql(...)` | `npx supabase db execute` ou Dashboard |
| **Listar tabelas** | `list_tables()` | Dashboard |
| **Git push** | — | `git push` (com PAT configurado) |
| **PRs/Issues** | MCP GitHub | `gh pr create`, `gh issue list` |
| **Automações N8N** | MCP N8N | API REST fetch/curl |
| **Editar código** | — | Read/Edit/Write tools |
| **Build/Lint** | — | `npm run build`, `npm run lint` |
| **Deploy Functions** | — | `export SUPABASE_ACCESS_TOKEN="sbp_..." && npx supabase functions deploy <nome>` |

### ⚠️ Segurança MCP

- Tokens MCP (`sbp_...`, `github_pat_...`, `eyJ...`) **NUNCA** devem ser commitados
- Sempre verificar estado LIVE antes de modificar views/functions
- Seguir `docs/SQL_SOP.md` para operações DDL

### 🔄 Alternativas quando MCP não está ativo

| Serviço | Alternativa |
|---------|-------------|
| **Supabase SQL** | Bash: `npx supabase db execute` ou Dashboard |
| **GitHub** | Bash: `gh pr create`, `gh issue list`, etc. |
| **N8N** | API REST via `fetch()` ou `curl` |

### 📋 Checklist antes de usar MCP

1. Verificar se tools MCP aparecem na lista
2. Se não aparecem → usar alternativas acima
3. Não assumir que MCP está ativo só porque está configurado

### 🚀 Deploy de Edge Functions

O Claude PODE fazer deploy de Edge Functions via Bash.

**PASSO 1: Obter o token do arquivo de secrets**
```bash
# Ler o token do arquivo de configuração MCP
cat ~/.gemini/antigravity/mcp_config.json | grep -A5 "supabase-mcp-server" | grep "access-token" | cut -d'"' -f2
```

Ou ler diretamente o arquivo `.claude/secrets.json` se existir.

**PASSO 2: Exportar e fazer deploy**
```bash
# Usar o token obtido (substitua sbp_XXXX pelo token real)
export SUPABASE_ACCESS_TOKEN="sbp_XXXX..." && \
npx supabase functions deploy <nome-da-function> --project-ref szyrzxvlptqqheizyrxu
```

**Exemplo completo - Método recomendado:**

1. Ler o token do arquivo MCP config:
```bash
cat ~/.gemini/antigravity/mcp_config.json
```

2. Copiar o valor do `--access-token` (começa com `sbp_`)

3. Executar o deploy:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_COLE_AQUI" && \
npx supabase functions deploy ai-extract-image --project-ref szyrzxvlptqqheizyrxu
```

**Alternativa - Pedir o token ao usuário:**
Se não conseguir ler o arquivo, pergunte:
"Qual é o SUPABASE_ACCESS_TOKEN (sbp_...)? Preciso dele para fazer deploy."

**Nota:** O warning "Docker is not running" pode ser ignorado - deploy funciona sem Docker.

**Project ID:** `szyrzxvlptqqheizyrxu`

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
