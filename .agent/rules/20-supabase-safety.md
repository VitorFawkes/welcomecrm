---
trigger: glob
globs: supabase/**
---

# 🛡️ Supabase Integrity & Safety Protocol
> **Activation:** ALWAYS ON.
> **Scope:** All Database Interactions (Migrations, RLS, Edge Functions, Types).
> **Source:** Based on live Supabase schema.

## 1. The "Hidden Dependency" Law
**Premise:** The database is NOT isolated. It is hard-linked to the Frontend via Views and Types.
**Protocol:** Before ANY schema change (`ALTER`, `DROP`), you MUST perform a **Dependency Audit**:
1.  **Search Codebase:** `grep -r "table_name" src/` (Finds UI usage).
2.  **Search Database:** Query `information_schema.views` and `triggers` (Finds DB usage).
*If dependencies exist, they MUST be updated in the SAME deployment unit.*

## 2. The "Non-Destructive Evolution" Strategy
**Premise:** Rollbacks are impossible if data is deleted.
**Rule:** NEVER use destructive operations (`DROP COLUMN`, `DROP TABLE`) in active systems.
**The Pattern:**
1.  **Phase 1 (Expand):** Add new column/table. Deploy.
2.  **Phase 2 (Migrate):** Dual-write to both old and new. Deploy.
3.  **Phase 3 (Contract):** Mark old as deprecated (rename to `_deprecated_`). Stop writing.
4.  **Phase 4 (Cleanup):** Drop only after N days of zero usage.

## 3. The "Type Sync" Imperative
**Premise:** TypeScript is your only defense against runtime crashes.
**Rule:** Immediately after ANY migration application, you MUST regenerate `database.types.ts`.
**Check:** If `git diff` shows a migration but NO change in `types.ts`, the build is **BROKEN**.

## 4. RLS & Tenant Isolation
**Premise:** Every table is a potential leak.
**Rule:** `ENABLE ROW LEVEL SECURITY` is mandatory for ALL tables.
**Policy:** Default to `auth.uid() = tenant_id` (or equivalent) unless explicitly public.
