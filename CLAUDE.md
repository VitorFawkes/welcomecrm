# WelcomeCRM - Claude Code

> Este arquivo define como o Claude opera neste projeto.

---

## 🗄️ SUPABASE - ACESSO NATIVO (VIA CLI)

**Project ID:** `szyrzxvlptqqheizyrxu`
**Dashboard:** https://supabase.com/dashboard/project/szyrzxvlptqqheizyrxu

> **NUNCA coloque tokens diretamente neste arquivo. Use variaveis de ambiente.**

### Setup Inicial (usuario faz uma vez):
```bash
# Criar arquivo de ambiente (FORA do repo)
echo 'export SUPABASE_ACCESS_TOKEN="seu_token_aqui"' >> ~/.welcomecrm-env
echo 'export SUPABASE_PROJECT_REF="szyrzxvlptqqheizyrxu"' >> ~/.welcomecrm-env

# Adicionar ao shell profile
echo '[ -f ~/.welcomecrm-env ] && source ~/.welcomecrm-env' >> ~/.zshrc
source ~/.zshrc
```

### Comandos (via API REST - SEMPRE FUNCIONA):
```bash
# Carregar credenciais do .env
source .env

# Query simples (listar cards)
curl -s "https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/cards?select=id,titulo&limit=5" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Contar registros
curl -s "https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/cards?select=count" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" -I | grep content-range

# Query SQL via RPC (se existir funcao)
curl -s "https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/rpc/nome_funcao" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"param1": "valor"}'
```

### Deploy de Edge Function:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_SEU_TOKEN" && \
npx supabase functions deploy NOME_FUNCTION --project-ref szyrzxvlptqqheizyrxu
```

### Regenerar Types:
```bash
npx supabase gen types typescript --project-id szyrzxvlptqqheizyrxu > src/database.types.ts
```

### Para queries SQL complexas:
Usar o Dashboard: https://supabase.com/dashboard/project/szyrzxvlptqqheizyrxu/sql

---

## 🐙 GITHUB - ACESSO NATIVO

### Git ja esta configurado com PAT. Comandos funcionam:
```bash
git status
git add .
git commit -m "mensagem"
git push origin main
git pull origin main
```

### Para PRs e Issues (se gh CLI estiver instalado):
```bash
# Verificar se gh esta disponivel
gh --version

# PRs
gh pr create --title "..." --body "..."
gh pr list

# Issues
gh issue list
```

### Se gh nao estiver instalado:
- Criar PRs pelo Dashboard: https://github.com/VitorFawkes/welcomecrm/pulls
- Ou instalar: `brew install gh && gh auth login`

---

## 🧠 Comportamento Automatico (SEMPRE)

### 1. Classificar a Tarefa

| Tipo | Trigger | Acao |
|------|---------|------|
| **PERGUNTA** | "o que e", "como funciona" | Responder diretamente |
| **EXPLORACAO** | "analisar", "listar", "overview" | Investigar sem editar |
| **CODIGO SIMPLES** | "corrigir", "adicionar" (1 arquivo) | Editar diretamente |
| **CODIGO COMPLEXO** | "criar", "implementar", "refatorar" | Socratic Gate -> Agent |
| **DESIGN/UI** | "design", "UI", "pagina" | Socratic Gate -> Agent |

### 2. Socratic Gate (Tarefas Complexas)

**Para tarefas COMPLEXAS ou DESIGN, PARE e pergunte:**
- Qual o objetivo principal?
- Quais sao os edge cases?
- Ha preferencias de implementacao?

> Minimo 2-3 perguntas antes de implementar.

### 3. Routing Automatico de Agents

| Tipo de Tarefa | Agent |
|----------------|-------|
| SQL, banco, migrations | `database-architect` |
| Frontend, React, UI | `frontend-specialist` |
| Backend, API, Edge Functions | `backend-specialist` |
| Debug, investigar erro | `debugger` |
| Testes, QA | `test-engineer` |
| Planejar feature | `project-planner` |
| Codigo legado, refactor | `code-archaeologist` |
| Performance | `performance-optimizer` |
| Seguranca | `security-auditor` |
| **Mobile (RN, Flutter)** | `mobile-developer` - NAO usar frontend! |

**Ao ativar um agent:**
```
Aplicando conhecimento de `{agent}`...
```

### 4. Carregar Skills do Agent

Cada agent tem campo `skills:` no header. Ler em:
`.agent/skills/<nome>/SKILL.md`

### 5. Consultar Documentacao

- `.agent/CODEBASE.md` -> Entidades, hooks, paginas
- `docs/SYSTEM_CONTEXT.md` -> Arquitetura, patterns
- `docs/SQL_SOP.md` -> Antes de modificar views/triggers

---

## 🔒 TRIPLE-LOCK PROTOCOL (OBRIGATORIO)

> **BLOQUEANTE:** Cada lock deve ser completado com OUTPUT VISIVEL antes de prosseguir.

---

### 🔒 LOCK 1: REALITY SNAPSHOT (Antes de qualquer codigo)

**O agente DEVE produzir esta tabela verificando estado REAL:**

```markdown
## REALITY SNAPSHOT - [DATA/HORA]

### Verificacao ao Vivo
| Asset | CODEBASE.md | Realidade | Delta | Status |
|-------|-------------|-----------|-------|--------|
| Hooks | {doc}       | {scan}    | +/-N  | FRESH/STALE |
| Pages | {doc}       | {scan}    | +/-N  | FRESH/STALE |
| Tables| {doc}       | {query}   | +/-N  | FRESH/STALE |

### Comandos Executados:
find src/hooks -name "*.ts" -type f | wc -l
find src/pages -name "*.tsx" -type f | wc -l

### Entidades Envolvidas na Tarefa:
- {lista das tabelas/hooks/pages que serao tocados}
```

**Se Delta > 5:** Agente DEVE avisar que CODEBASE.md esta desatualizado.

---

### 🔒 LOCK 2: BLAST RADIUS (Antes de modificar)

**O agente DEVE produzir analise de impacto com PROVA:**

```markdown
## BLAST RADIUS - Analise de Impacto

### Dependencias Diretas (VAO QUEBRAR)
| Dependencia | Tipo | Por que Quebra | Severidade |
|-------------|------|----------------|------------|
| {nome}      | Hook/Page | {razao} | CRITICO/ALTO/MEDIO |

### Comandos de Verificacao Executados:
grep -r "ENTIDADE" src/hooks/
grep -r "ENTIDADE" src/pages/
grep -r "ENTIDADE" src/components/

### Resultado do Grep:
{colar output real}

### Plano de Mitigacao:
1. {passo para evitar quebra}
2. {arquivos que precisam ser atualizados junto}
```

---

### 🔒 LOCK 3: SYNC CERTIFICATE (Antes de dizer "pronto")

**O agente DEVE provar que atualizou a documentacao:**

```markdown
## SYNC CERTIFICATE

### Itens Criados/Modificados
| Item | Tipo | Secao CODEBASE.md | Status |
|------|------|-------------------|--------|
| {nome} | Hook/Page/Table | Secao X.Y | ADICIONADO |

### Prova de Atualizacao:
grep "{nome_criado}" .agent/CODEBASE.md
# Output: {mostrar linha encontrada}

### Stats Atualizados:
- Antes: X hooks | Y pages
- Depois: X+1 hooks | Y pages
- Header atualizado: SIM/NAO

### Assinatura:
- Agent: {nome}
- Timestamp: {ISO}
```

**Se grep nao encontrar:** BLOQUEADO. Nao pode finalizar sem atualizar CODEBASE.md.

---

## 🎯 TRIGGERS DE VERIFICACAO (Usuario pode cobrar)

| Comando do Usuario | O que o Agente DEVE Fazer |
|--------------------|---------------------------|
| **"State check"** | Rodar contagem ao vivo e comparar com CODEBASE.md |
| **"Show me the blast radius"** | Mostrar analise de impacto com grep |
| **"Prove you synced"** | Mostrar Sync Certificate com grep de prova |
| **"Protocol audit"** | Relatorio completo de compliance dos 3 locks |

### Resposta ao "Protocol audit":
```markdown
## PROTOCOL COMPLIANCE AUDIT

### Lock 1 (Grounding): {PASS/FAIL}
- Reality Snapshot produzido: SIM/NAO
- Contagens verificadas ao vivo: SIM/NAO

### Lock 2 (Impact): {PASS/FAIL}
- Blast Radius produzido: SIM/NAO
- Grep de dependencias executado: SIM/NAO

### Lock 3 (Sync): {PASS/FAIL}
- Sync Certificate produzido: SIM/NAO
- Grep de prova executado: SIM/NAO
- CODEBASE.md atualizado: SIM/NAO

### Compliance Geral: {PASS/FAIL}
```

---

## 🔐 Rules Globais

| Rule | Proposito |
|------|-----------|
| `01-mandatory-context.md` | Protocolo entrada/saida |
| `00-project-context.md` | IDs Supabase, stack |
| `10-secrets-protection.md` | **NUNCA hardcodar tokens** |
| `20-supabase-safety.md` | Seguranca SQL |
| `90-project-architecture.md` | Arquitetura (3 Suns) |
| `91-project-design.md` | Design system |
| `95-excellence-enforcement.md` | Qualidade |
| `99-qa-guardian.md` | QA obrigatorio |

---

## 🔑 Secrets

**NUNCA** hardcodar tokens:
```typescript
// PROIBIDO
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// CORRETO
const KEY = process.env.SUPABASE_KEY;
```

---

## ⚠️ SQL Safety (OBRIGATORIO)

Antes de modificar View/Function/Trigger:
1. Ler `docs/SQL_SOP.md`
2. Consultar estado LIVE: `SELECT definition FROM pg_views WHERE viewname = '...'`
3. Verificar apos aplicar

**Violacao = Critical Engineering Failure**

---

## 🔄 Workflows

| Comando | Quando usar |
|---------|-------------|
| `/plan` | Planejar feature |
| `/create` | Criar funcionalidade |
| `/debug` | Investigar bug |
| `/enhance` | Melhorar codigo |
| `/test` | Criar/rodar testes |
| `/deploy` | Preparar deploy |
| `/sync` | Sincronizar CODEBASE.md |

---

## 🔄 Commits

- Mensagens em portugues
- Co-author: `Co-Authored-By: Claude <noreply@anthropic.com>`
- Branch: `main`
- Lint antes: `npm run lint`

---

## 🏁 Verificacao Final

Quando solicitado "verificacao final" ou "final checks":
```bash
python .agent/scripts/checklist.py .
```

Ordem de prioridade: Security -> Lint -> Schema -> Tests -> UX -> SEO
