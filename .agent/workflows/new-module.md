---
description: Standard Operating Procedure (SOP) for creating new CRM features.
---

# 🚀 New Feature Launch Protocol
> **Goal:** Create a feature that is Safe (Rule 90), Integrated (Rule 90), and Beautiful (Rule 91).

## Phase 1: The Foundation (Database)
1.  **Schema Design:**
    -   Create the migration file.
    -   **Constraint:** Must have FK to `cards`, `contatos`, or `profiles` (Rule 90.1).
    -   **Safety:** Add `DOWN` script (commented out).
2.  **Security Layer:**
    -   Enable RLS immediately.
    -   Apply standard Tenant Isolation policy (`auth.uid() = tenant_id`).
3.  **Type Sync:**
    -   // turbo
    -   Run `npx supabase gen types typescript --local > src/database.types.ts` (Note: file is in src root).

## Phase 2: The Logic (Backend)
1.  **Triggers (The Event Bus):**
    -   Does this feature affect Pipeline Status? If yes, create a trigger.
    -   Does it need an Activity Log? If yes, add to `activities` table.

## Phase 3: The Interface (Frontend)
1.  **Component Creation:**
    -   Create components in `src/components/[feature]/`.
    -   **Vibe Check:** Use `Input` (Glass), `Table`, and `Layout`.
2.  **Integration (The 360° View):**
    -   **Mandatory:** Add the new component to `CardDetail.tsx` tabs.
    -   **Mandatory:** Add to contact-related views if relevant.
    -   **Mandatory:** Add to Global Search.

## Phase 4: Verification
1.  **The "White Screen" Test:** Navigate to the new page. Refresh.
2.  **The "Context" Test:** Open a Deal. Can I see the new data there?
3.  **The "Safety" Test:** Can a user from another tenant see this data? (Verify RLS).
4.  **UI Quality Gate:**
    - [ ] No `bg-white/X` outside of `ThemeBoundary mode="dark"`
    - [ ] No `text-white` without explicit dark container
    - [ ] No native `<select>`, `<input>` (use `@/components/ui/*`)
    - [ ] Text is readable on white background

## Phase 5: Knowledge Sync (MANDATORY)

> 🔴 **NÃO DIGA "CONCLUÍDO" SEM COMPLETAR ESTA FASE**

1. **CODEBASE.md Update:**
   - Se criou tabela → Adicionar em seção 1 (Core Entities) ou satellites
   - Se criou componente → Adicionar na seção apropriada (UI Library, Layouts)
   - Se criou hook → Adicionar em seção 2.3 (Frontend Hooks)
   - Se criou page → Adicionar em seção 3.3 (Key Pages)
   - Se criou section → Adicionar em seção 2.2 (Active Sections)

2. **Verification Gate:**
   ```bash
   grep "feature_name" .agent/CODEBASE.md
   # Se não encontrar → PARE e atualize CODEBASE.md
   ```

3. **Architecture Compliance:**
   - Tabela tem FK para `cards`, `contatos`, ou `profiles`?
   - RLS está habilitado?
   - Types foram regenerados?
   - Componente foi adicionado ao CardDetail.tsx se relevante?
