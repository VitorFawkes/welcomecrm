# WelcomeCRM - System Context & Architecture

> **🚨 AI PROTOCOL (READ FIRST) 🚨**
> 
> **To the AI Agent working on this project:**
> 1.  **MANDATORY CONTEXT:** You MUST read this file at the start of every `PLANNING` phase. Do not assume you know the architecture.
> 2.  **SAFETY PROTOCOL:** You MUST read `.cursorrules` immediately to load the "Iron Dome" safety protocols.
> 3.  **SINGLE SOURCE OF TRUTH:** This file is the absolute truth. If code contradicts this file, flag it to the user.
> 3.  **UPDATE ON CHANGE:** If you modify the DB Schema, add a new Hook, or change a Business Rule, you **MUST** update this file immediately after the Execution phase. Do not wait for the user to ask.
> 4.  **INTEGRATION INTELLIGENCE:** Before suggesting a new library or pattern, check Section 3 ("Frontend Patterns") and Section 4 ("Integrations"). Consistency > Novelty.
> 5.  **NO REGRESSIONS:** Before deleting or refactoring, check Section 2 ("Data Model") to ensure you are not breaking hidden dependencies (like Triggers or Views).
> 6.  **EVOLUTION PROTOCOL:** When a new architectural decision is made (e.g., "All constants must be in X"), you MUST update this document immediately. This file is the "Living Constitution" of the project.
> 7.  **AUTOMATION IMPERATIVE:** Before marking a task as DONE, you MUST ask: *"Could this error happen again?"* If yes, you MUST propose an automated fix (Lint/Type/Test) immediately. Do not wait for the user to ask.
> 8.  **ARCHITECTURAL ALIGNMENT:** When designing new features, you MUST explicitly reference an existing feature as a "Template". (e.g., "I will build the *Invoices* module following the exact pattern of the *Contacts* module"). Consistency > Creativity.

---

# 1. Core Architecture
- **Stack:** React (Vite) + TypeScript + TailwindCSS.
- **Backend:** Supabase (PostgreSQL + Auth + Storage).
- **State Management:** React Query (Server State) + Context API (Auth/Toast) + **Zustand (User Preferences/Persistence)**.
- **Philosophy:** "Database as the Brain". Business logic (validations, status updates, logs) prefers to live in PostgreSQL Triggers/Functions rather than Frontend code.

## 2. Data Model (Critical Rules)

### Cards (`cards`)
- **Central Entity:** Represents a Deal/Trip.
- **Identity:** `id` (UUID).
- **Status:** `status_comercial` ('aberto', 'ganho', 'perdido').
    - **Automation:** `trigger_card_status_automation` automatically sets this based on `pipeline_stages.is_won` / `is_lost`.
    - **Rule:** Do NOT manually update `status_comercial` from Frontend unless overriding automation.
- **Contacts:**
    - `pessoa_principal_id`: FK to `contatos`. The payer/negotiator.
    - `cards_contatos`: Many-to-Many table for companions/travelers.
    - **Rule:** A contact cannot be both Principal and Companion on the same card. The `useCardContacts` hook enforces this (DB Trigger was removed to avoid transaction conflicts).

### Contacts (`contatos`)
- **Identity:** `email` or `telefone` should be unique (soft rule).
- **Fields:** `nome`, `email`, `telefone`, `cpf`, `data_nascimento`.
- **Validation:** `telefone` is often used for WhatsApp integration. Must be kept clean (digits only) in DB or cleaned on read.

### Pipeline (`pipeline_stages`)
- **Structure:** `id`, `nome`, `ordem`, `fase`.
- **Governance Flags:**
    - `is_won`: Marks stage as "Ganho" (sets `status_comercial` = 'ganho').
    - `is_lost`: Marks stage as "Perdido" (sets `status_comercial` = 'perdido').
    - `target_role`: Enforces owner role (e.g., 'vendas', 'concierge') upon entry.
- **Phases:** 'SDR', 'Planner', 'Pós-venda'.
- **Quality Gates:** `pode_avancar_etapa` (DB Function) checks if a card can move.
    - **Rule:** Moving to > "Qualificado pelo SDR" requires `taxa_status` to be 'paga' or 'cortesia' (if product is TRIPS).

## 3. Frontend Patterns ("Paved Road")

### Data Fetching
- **Library:** `@tanstack/react-query`.
- **Keys:** `['card', id]`, `['contact', id]`, `['pipeline']`.
- **Pattern:** Use Custom Hooks for complex logic.
    - `useCardContacts(cardId)`: Manages all contact linking logic.
    - `useQualityGate()`: Checks if card can move stages.

### Design System & UX (Premium Standards)
- **Layout Architecture:**
    - **Viewport Units:** Use `dvh` (Dynamic Viewport Height) for full-screen layouts to handle mobile browser bars correctly.
    - **Global Overflow:** Enforce `overflow: hidden` on `html`/`body` and `overscroll-behavior: none` to mimic native app feel.
- **Component Polish:**
    - **Inputs:** Standardize "Premium Input" styles (height, background, border, focus ring) for consistency.
    - **Performance:** Avoid `backdrop-blur` on large scrollable areas (like Kanban columns) to prevent rendering artifacts. Use solid colors (e.g., `bg-gray-50`).
- **State Persistence:**
    - **Pattern:** Use `zustand/middleware`'s `persist` to save user preferences (filters, view modes, collapsed states) to `localStorage`.

### Code Quality & Safety
- **Date Handling:** Never use `.toISOString()` on string dates directly without validation.
- **Type Safety:** Enforce strict types for filters (`FilterState`) to prevent runtime errors.

### UI Components
- **Widgets:** `PessoasWidget`, `CardHeader`, `ActionButtons`.
- **Rule:** Widgets should receive data via Props or Hooks, never fetch directly if possible. `PessoasWidget` strictly uses `useCardContacts`.

### Admin Module Standards
- **Single Source of Truth:** All static definitions (Sections, Field Types, Colors, Macro Stages) MUST live in `src/constants/admin.ts`.
- **Rule:** Do NOT hardcode lists in components (e.g., `StudioUnified`, `FieldInspectorDrawer`). Import them from constants.

## 4. Integrations & External Services
- **WhatsApp:** Direct link generation (`wa.me`). Depends on `contatos.telefone`.
- **Email:** `mailto:` links. Depends on `contatos.email`.

## 5. Security (RLS)
- **Policy:** "Permissive for Authenticated".
- **Rule:** Most tables allow `SELECT/INSERT/UPDATE` for `authenticated` role.
- **Sensitive Data:** `profiles` table controls access levels (admin, gestor, sdr).

## 6. User Management & Auth (Invite System)
- **Philosophy:** "Invite Only". Public registration is DISABLED.
- **Core Table:** `invitations` (email, role, token, expires_at).
- **Flow:**
    1.  **Admin** creates invite via `UserManagement.tsx` -> `generate_invite_token` (RPC).
    2.  **User** receives link (`/invite/:token`) -> `InvitePage.tsx`.
    3.  **Validation:** `get_invite_details` (RPC) checks validity before showing form.
    4.  **Signup:** `supabase.auth.signUp()` triggers `check_invite_whitelist` (DB Trigger).
    5.  **Activation:** Success triggers `mark_invite_used` and `handle_new_user` (creates Profile).
- **Security:**
    -   `check_invite_whitelist`: BLOCKS any signup where email is not in `invitations` or token is expired.
    -   `invitations` RLS: Only Admins can SELECT/INSERT/DELETE.

## 7. Known "Gotchas"
- **Ghost Contacts:** `view_cards_acoes` has `pessoa_nome`. Always prefer this over fetching `contatos` again to avoid sync issues.
- **Optimistic Updates:** Frontend must update Cache immediately for good UX, but must handle Rollback on error. `useCardContacts` implements this correctly.

## 7. Recent Architecture Updates (Dec 2025)

### Kanban Board 2.0 (UX Polish)
- **Infinite Columns:** Columns must extend to the bottom of the viewport using `h-full` and `flex-1` correctly.
- **Auto-Scroll:** Collapsing a phase must auto-scroll the board to the start (`left: 0`) for immediate visibility.
- **Unified Header:** Collapsed phases must display Name and Count side-by-side (Horizontal) above the column, matching the open state.

### Task Management (`tarefas`)
- **Single Source of Truth:** The `tarefas` table is the only source for "Next Steps".
- **View Logic:** `view_cards_acoes` aggregates the *next pending task* for each card.
    - **Logic:** `ORDER BY data_vencimento ASC, created_at DESC`.
    - **Fix:** We recently fixed a bug where "No next step" appeared incorrectly. The view now robustly handles this.
- **Rescheduling:**
    - **Pattern:** When rescheduling, we do NOT just update the date.
    - **Flow:** 1. Mark old task as `completed` (outcome: 'rescheduled'). 2. Create NEW task with new date. 3. Log `task_rescheduled` activity.

### Activity Logging (`log_tarefa_activity`)
- **Comprehensive Logging:** We moved from ad-hoc logging to a centralized Trigger-based approach.
- **Trigger:** `log_tarefa_activity` captures INSERT/UPDATE on `tarefas` and automatically inserts into `atividades`.
- **Rule:** Do NOT manually insert into `atividades` from the Frontend for task-related actions. Let the DB trigger handle it.

### Header Logic
- **Dense & Honest:** The Card Header must show real data only.
    - **Budget/Dates:** If null, show nothing. Do not show placeholders.
    - **Next Step:** Derived strictly from `view_cards_acoes`.

### Pipeline Governance 2.0
- **Data-Driven Rules:** Moved from hardcoded stage names/IDs to database columns (`is_won`, `is_lost`, `target_role`).
- **Owner Handoff:** `KanbanBoard` checks `target_role` on drag-end. If set, it triggers `StageChangeModal` to enforce role compliance (e.g., SDR -> Planner).
- **Automation:** `trigger_card_status_automation` now uses `is_won`/`is_lost` flags instead of string matching.

### Organizational OS (Team Studio)
- **Hierarchy:** The system now enforces a strict hierarchy: `Departments` (Macro Areas) -> `Teams` -> `Members`.
- **Team Management:**
    - **CRUD:** Teams are managed via `TeamManagement.tsx` and persisted in the `teams` table.
    - **Association:** Users are linked to teams via `profiles.team_id`.
- **Bulk Operations:**
    - **Pattern:** Use "Selection State" + "Floating Action Bar" for bulk actions (e.g., `UserManagement.tsx`).
    - **Mutation:** Prefer single batch mutations (e.g., `update().in('id', ids)`) over iterating in the frontend.

## 8. Database Operations Protocol (MANDATORY)
-   **The "Blind Surgery" Rule:** Never modify a View or Function based on a `.sql` file in the codebase.
-   **SOP:** You MUST follow the **Live Schema Verification** protocol defined in `docs/SQL_SOP.md`.
    1.  Query `pg_views` / `pg_get_functiondef` to get the *real* definition.
    2.  Diff against your changes.
    3.  Apply & Verify.
