# /sync - Sincronizar Documentação

> **Trigger:** Usuário digita `/sync`
> **Propósito:** Verificar e corrigir gaps entre código e documentação

---

## Quando Usar

- Após criar múltiplas páginas/hooks/componentes
- Quando suspeitar que CODEBASE.md está desatualizado
- Antes de iniciar trabalho em área desconhecida
- Periodicamente para manter docs atualizadas

---

## Passos de Execução

### 1. Verificar Contadores

```bash
# Contar páginas
find src/pages -name "*.tsx" -type f | wc -l

# Contar hooks
find src/hooks -name "*.ts" -type f | wc -l

# Contar tabelas (via Supabase MCP)
# supabase_rpc → list_all_tables()
```

**Comparar com CODEBASE.md:**
- Páginas: Seção 3.3 (deve ter 28)
- Hooks: Seção 2.3 (deve ter 38)
- Tabelas: Seção 1 (deve ter 87)

### 2. Identificar Gaps

**Para Páginas:**
```bash
# Listar todas as páginas
find src/pages -name "*.tsx" -type f

# Comparar com lista em CODEBASE.md seção 3.3
grep -E "^\| .+ \| src/pages" .agent/CODEBASE.md
```

**Para Hooks:**
```bash
# Listar todos os hooks
ls src/hooks/*.ts

# Comparar com lista em CODEBASE.md seção 2.3
grep -E "^\| .+\.ts \|" .agent/CODEBASE.md
```

### 3. Reportar Gaps

Criar relatório no formato:

```markdown
## Relatório de Sync

### Páginas
- Total no código: X
- Total documentado: Y
- Gap: Z

**Faltando em CODEBASE.md:**
- NomeDaPagina.tsx (rota: /caminho)

### Hooks
- Total no código: X
- Total documentado: Y
- Gap: Z

**Faltando em CODEBASE.md:**
- useNomeDoHook.ts (propósito: descrição)

### Tabelas
- Total no banco: X
- Total documentado: Y
- Gap: Z
```

### 4. Atualizar CODEBASE.md

Para cada gap encontrado, adicionar na seção correspondente:

- **Páginas:** Adicionar em 3.3 com path, route e description
- **Hooks:** Adicionar em 2.3 com file e purpose
- **Tabelas:** Adicionar em 1 com contagem e relacionamentos

### 5. Atualizar Timestamp

```markdown
> **Last Updated:** {data de hoje}
> **Stats:** {X} tabelas | {Y} páginas | {Z} hooks | {W} views
```

### 6. Commit

```bash
git add .agent/CODEBASE.md
git commit -m "docs: sync CODEBASE.md com estado atual do projeto

- Atualizado contadores
- Adicionados itens faltantes
- Timestamp atualizado

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verificação Rápida (Quick Check)

Para verificação rápida sem atualização:

```bash
echo "=== QUICK SYNC CHECK ==="
echo "Páginas: $(find src/pages -name '*.tsx' -type f | wc -l)"
echo "Hooks: $(find src/hooks -name '*.ts' -type f | wc -l)"
echo ""
echo "Esperado (CODEBASE.md):"
echo "Páginas: 28"
echo "Hooks: 38"
echo "Tabelas: 87"
```

---

## Automação Sugerida

Considere rodar `/sync` após:
- Cada sprint
- Antes de PR major
- Quando novo desenvolvedor entrar no projeto
- Após refatorações grandes
