# WelcomeCRM - System Context & Architecture

> **🚨 AI PROTOCOL (READ FIRST) 🚨**
> 
> **To the AI Agent working on this project:**
> 1.  **MANDATORY CONTEXT:** You MUST read this file at the start of every `PLANNING` phase. Do not assume you know the architecture.
> 2.  **SINGLE SOURCE OF TRUTH:** This file is the absolute truth. If code contradicts this file, flag it to the user.
> 3.  **UPDATE ON CHANGE:** If you modify the DB Schema, add a new Hook, or change a Business Rule, you **MUST** update this file immediately after the Execution phase. Do not wait for the user to ask.
> 4.  **INTEGRATION INTELLIGENCE:** Before suggesting a new library or pattern, check Section 3 ("Frontend Patterns") and Section 4 ("Integrations"). Consistency > Novelty.
> 5.  **NO REGRESSIONS:** Before deleting or refactoring, check Section 2 ("Data Model") to ensure you are not breaking hidden dependencies (like Triggers or Views).

---

# 1. Core Architecture
- **Stack:** React (Vite) + TypeScript + TailwindCSS.
- **Backend:** Supabase (PostgreSQL + Auth + Storage).
- **State Management:** React Query (Server State) + Context API (Auth/Toast).
- **Philosophy:** "Database as the Brain". Business logic (validations, status updates, logs) prefers to live in PostgreSQL Triggers/Functions rather than Frontend code.

## 2. Data Model (Critical Rules)

### Cards (`cards`)
- **Central Entity:** Represents a Deal/Trip.
- **Identity:** `id` (UUID).
- **Status:** `status_comercial` ('aberto', 'ganho', 'perdido').
    - **Automation:** `trigger_card_status_automation` automatically sets this based on `pipeline_stage_id`.
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

### UI Components
- **Widgets:** `PessoasWidget`, `CardHeader`, `ActionButtons`.
- **Rule:** Widgets should receive data via Props or Hooks, never fetch directly if possible. `PessoasWidget` strictly uses `useCardContacts`.

## 4. Integrations & External Services
- **WhatsApp:** Direct link generation (`wa.me`). Depends on `contatos.telefone`.
- **Email:** `mailto:` links. Depends on `contatos.email`.

## 5. Security (RLS)
- **Policy:** "Permissive for Authenticated".
- **Rule:** Most tables allow `SELECT/INSERT/UPDATE` for `authenticated` role.
- **Sensitive Data:** `profiles` table controls access levels (admin, gestor, sdr).

## 6. Known "Gotchas"
- **Ghost Contacts:** `view_cards_acoes` has `pessoa_nome`. Always prefer this over fetching `contatos` again to avoid sync issues.
- **Optimistic Updates:** Frontend must update Cache immediately for good UX, but must handle Rollback on error. `useCardContacts` implements this correctly.
