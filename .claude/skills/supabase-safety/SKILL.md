---
name: supabase-safety
description: Protocolo de segurança para modificações no banco de dados Supabase
---

# Supabase Safety Protocol

## Antes de Modificar View/Trigger/Function

1. **Ler** `docs/SQL_SOP.md`
2. **Consultar estado LIVE:**
   ```sql
   SELECT definition FROM pg_views WHERE viewname = 'nome_da_view';
   SELECT prosrc FROM pg_proc WHERE proname = 'nome_da_function';
   ```
3. **Aplicar** a mudança
4. **Verificar** que o estado novo está correto

## Regras
- NUNCA usar DROP sem IF EXISTS
- NUNCA modificar RLS policies sem entender o impacto
- Sempre usar CREATE OR REPLACE quando possível
- Testar queries com LIMIT antes de rodar sem filtro
- Regenerar types após mudança no schema: `npx supabase gen types typescript --project-id szyrzxvlptqqheizyrxu > src/database.types.ts`
