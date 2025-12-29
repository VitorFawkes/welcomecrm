---
description: Standard Operating Procedure (SOP) for creating new CRM features.
---

# 🚀 New Feature Launch Protocol
> **Goal:** Create a feature that is Safe (Rule 20), Integrated (Rule 40), and Beautiful (Rule 10).

## Phase 1: The Foundation (Database)
1.  **Schema Design:**
    -   Create the migration file.
    -   **Constraint:** Must have FK to `cards`, `contatos`, or `users` (Rule 40.1).
    -   **Safety:** Add `DOWN` script (commented out) (Rule 20.2).
2.  **Security Layer:**
    -   Enable RLS immediately.
    -   Apply standard Tenant Isolation policy (`auth.uid() = tenant_id`).
3.  **Type Sync:**
    -   // turbo
    -   Run `npx supabase gen types typescript --local > src/types/database.types.ts`

## Phase 2: The Logic (Backend)
1.  **Triggers (The Event Bus):**
    -   Does this feature affect Pipeline Status? If yes, create a trigger.
    -   Does it need an Activity Log? If yes, add to `log_activity`.

## Phase 3: The Interface (Frontend)
1.  **Component Creation:**
    -   Create components in `src/components/[feature]/`.
    -   **Vibe Check:** Use `Input` (Glass), `DataTable`, and `DashboardLayout`.
2.  **Integration (The 360° View):**
    -   **Mandatory:** Add the new component to `CardDetail.tsx` tabs.
    -   **Mandatory:** Add to `ContactProfile.tsx` if relevant.
    -   **Mandatory:** Add to Global Search.

## Phase 4: Verification
1.  **The "White Screen" Test:** Navigate to the new page. Refresh.
2.  **The "Context" Test:** Open a Deal. Can I see the new data there?
3.  **The "Safety" Test:** Can a user from another tenant see this data? (Verify RLS).
