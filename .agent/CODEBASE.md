# 🗺️ CODEBASE.md - WelcomeCRM Knowledge Base

> [!CAUTION]
> **Este arquivo DEVE ser atualizado sempre que algo novo for criado.**
> Use o workflow `/new-module` Phase 5 para manter sincronizado.

> **Purpose:** Source of Truth for the AI Agent. Read this BEFORE any implementation.
> **Last Updated:** 2026-01-24
> **Trigger:** ALWAYS ON

---

## 1. Core Entities (The "Suns")

All tables must FK to at least one of these:

| Entity | Table | Description |
|--------|-------|-------------|
| **Deal** | `cards` | The opportunity/viagem |
| **Person** | `contatos` | The client/traveler |
| **User** | `profiles` | The CRM user (agent) |

**Verified Satellites:**
- `activities` → cards, profiles
- `arquivos` → cards
- `tarefas` → cards, profiles
- `whatsapp_messages` → cards, contatos, profiles
- `proposals` → cards
- `automation_rules` → cards
- `api_keys` → profiles
- `api_request_logs` → api_keys

---

## 2. Modular Section System

### 2.1 Database Tables

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `sections` | Section definitions | `key`, `label`, `position`, `is_governable`, `widget_component` |
| `system_fields` | Field dictionary | `key`, `label`, `type`, `section`, `options` |
| `stage_field_config` | Field rules per stage | `stage_id`, `field_key`, `is_visible`, `is_required`, `show_in_header` |

### 2.2 Active Sections (from DB)

| Key | Label | Position | Governable | Widget |
|-----|-------|----------|------------|--------|
| `observacoes_criticas` | Informações Importantes | left_column | ✅ | - |
| `trip_info` | Informações da Viagem | right_column | ✅ | - |
| `people` | Pessoas / Viajantes | right_column | ❌ | - |
| `payment` | Pagamento | right_column | ❌ | - |
| `proposta` | Propostas | right_column | ❌ | `proposals` |
| `marketing` | Marketing & Origem | right_column | ✅ | - |
| `marketing_informacoes_preenchidas` | Marketing & Info Preenchidas | right_column | ✅ | - |
| `system` | Sistema / Interno | right_column | ❌ | - |

### 2.3 Frontend Hooks (COMPLETE - 35 hooks)

#### Section & Field Management
| Hook | File | Purpose |
|------|------|---------|
| `useSections()` | `useSections.ts` | Fetch all active sections |
| `useSectionsByPosition()` | `useSections.ts` | Filter by left/right |
| `useGovernableSections()` | `useSections.ts` | Filter governable only |
| `useFieldConfig()` | `useFieldConfig.ts` | Field visibility/required per stage |
| `useStageRequiredFields()` | `useStageRequiredFields.ts` | Required fields for stage |
| `useStageRequirements()` | `useStageRequirements.ts` | Stage requirements |

#### Pipeline & Cards
| Hook | File | Purpose |
|------|------|---------|
| `usePipelineStages()` | `usePipelineStages.ts` | Pipeline stages data |
| `usePipelinePhases()` | `usePipelinePhases.ts` | Pipeline phases data |
| `usePipelineFilters()` | `usePipelineFilters.ts` | Kanban filtering |
| `useCardContacts()` | `useCardContacts.ts` | Contacts linked to card |
| `useCardPeople()` | `useCardPeople.ts` | People on a card |
| `useCardCreationRules()` | `useCardCreationRules.ts` | Who can create cards where |
| `useDeleteCard()` | `useDeleteCard.ts` | Card deletion logic |
| `useQualityGate()` | `useQualityGate.ts` | Stage transition validation |
| `useFilterOptions()` | `useFilterOptions.ts` | Filter options for pipeline |

#### Proposals
| Hook | File | Purpose |
|------|------|---------|
| `useProposals()` | `useProposals.ts` | Proposal CRUD |
| `useProposal()` | `useProposal.ts` | Single proposal |
| `useProposalBuilder()` | `useProposalBuilder.ts` | Builder logic |
| `useProposalTemplates()` | `useProposalTemplates.ts` | Templates |
| `useProposalNotifications()` | `useProposalNotifications.ts` | Notifications |
| `useContactProposals()` | `useContactProposals.ts` | Proposals by contact |
| `useGeneratePDF()` | `useGeneratePDF.ts` | PDF generation |

#### Users & Teams
| Hook | File | Purpose |
|------|------|---------|
| `useUsers()` | `useUsers.ts` | User management |
| `useTeams()` | `useTeams.ts` | Team management |
| `useRoles()` | `useRoles.ts` | Role management |
| `useDepartments()` | `useDepartments.ts` | Departments |

#### AI & Search
| Hook | File | Purpose |
|------|------|---------|
| `useAIExtract()` | `useAIExtract.ts` | AI data extraction |
| `useGlobalSearch()` | `useGlobalSearch.ts` | Global search |
| `usePeopleIntelligence()` | `usePeopleIntelligence.ts` | People analytics |

#### UI & UX
| Hook | File | Purpose |
|------|------|---------|
| `useAutoSave()` | `useAutoSave.ts` | Auto-save functionality |
| `useKeyboardShortcuts()` | `useKeyboardShortcuts.ts` | Global shortcuts |
| `useBuilderKeyboardShortcuts()` | `useBuilderKeyboardShortcuts.ts` | Builder shortcuts |
| `useHorizontalScroll()` | `useHorizontalScroll.ts` | Horizontal scroll |
| `useBlockDragDrop()` | `useBlockDragDrop.ts` | Drag and drop |

#### Other
| Hook | File | Purpose |
|------|------|---------|
| `useApiKeys()` | `useApiKeys.ts` | API key management |
| `useLibrary()` | `useLibrary.ts` | Library assets |
| `useProductContext()` | `useProductContext.ts` | Product context |

### 2.4 Admin Components

| Component | Path | Function |
|-----------|------|----------|
| `SectionManager` | `src/components/admin/studio/SectionManager.tsx` | CRUD sections |
| `DynamicSection` | `src/components/card/DynamicSection.tsx` | Render section with fields |
| `DynamicSectionWidget` | `src/components/card/DynamicSectionWidget.tsx` | Render specialized widgets |
| `DeveloperDocs` | `src/pages/DeveloperDocs.tsx` | **Swagger UI API Documentation** |

---

## 3. Layout System

### 3.1 Main Layout

| Component | Path | Usage |
|-----------|------|-------|
| `Layout` | `src/components/layout/Layout.tsx` | **MAIN APP LAYOUT** |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Navigation |
| `Header` | `src/components/layout/Header.tsx` | Top bar |

### 3.2 Specialized Layouts

| Layout | Path | Context |
|--------|------|---------|
| `StudioLayout` | `src/components/admin/studio/StudioLayout.tsx` | Admin/Studio pages |
| `SettingsLayout` | `src/components/settings/layout/SettingsLayout.tsx` | Settings pages |
| `GroupDetailLayout` | `src/components/cards/group/GroupDetailLayout.tsx` | Group detail view |

### 3.3 All Pages (COMPLETE - 25 pages)

#### Core Pages
| Page | Path | Description |
|------|------|-------------|
| `CardDetail` | `src/pages/CardDetail.tsx` | **360° Deal View** |
| `Pipeline` | `src/pages/Pipeline.tsx` | Kanban board |
| `Dashboard` | `src/pages/Dashboard.tsx` | Main dashboard |
| `People` | `src/pages/People.tsx` | Contacts list |
| `Cards` | `src/pages/Cards.tsx` | Cards list view |
| `Tasks` | `src/pages/Tasks.tsx` | Task management |
| `ActivitiesPage` | `src/pages/ActivitiesPage.tsx` | Activities view |
| `GroupsPage` | `src/pages/GroupsPage.tsx` | Groups management |

#### Proposals
| Page | Path | Description |
|------|------|-------------|
| `ProposalsPage` | `src/pages/ProposalsPage.tsx` | Proposals list |
| `ProposalBuilderV4` | `src/pages/ProposalBuilderV4.tsx` | **Latest proposal builder** |
| `ProposalBuilderV3` | `src/pages/ProposalBuilderV3.tsx` | Legacy builder v3 |
| `ProposalBuilderElite` | `src/pages/ProposalBuilderElite.tsx` | Elite builder |
| `ProposalBuilder` | `src/pages/ProposalBuilder.tsx` | Original builder |

#### Admin Pages
| Page | Path | Description |
|------|------|-------------|
| `PipelineStudio` | `src/pages/admin/PipelineStudio.tsx` | Pipeline configuration |
| `UserManagement` | `src/pages/admin/UserManagement.tsx` | User admin |
| `CardCreationRulesPage` | `src/pages/admin/CardCreationRulesPage.tsx` | Creation rules |
| `CategoryManagement` | `src/pages/admin/CategoryManagement.tsx` | Categories |
| `CRMHealth` | `src/pages/admin/CRMHealth.tsx` | System health |
| `Lixeira` | `src/pages/admin/Lixeira.tsx` | Trash/recycle bin |

#### Public Pages (No Auth)
| Page | Path | Description |
|------|------|-------------|
| `ProposalView` | `src/pages/public/ProposalView.tsx` | Public proposal view |
| `ProposalReview` | `src/pages/public/ProposalReview.tsx` | Client review |
| `ProposalConfirmed` | `src/pages/public/ProposalConfirmed.tsx` | Confirmation |

#### Auth & Settings
| Page | Path | Description |
|------|------|-------------|
| `Login` | `src/pages/Login.tsx` | Authentication |
| `InvitePage` | `src/pages/InvitePage.tsx` | User invitation |
| `SettingsPage` | `src/pages/SettingsPage.tsx` | Settings |

---

## 4. UI Component Library

### 4.1 Mandatory Components (`src/components/ui/`)

| Component | File | Use For |
|-----------|------|---------|
| `Input` | `Input.tsx` | All text inputs |
| `Select` | `Select.tsx` | Dropdowns |
| `Button` | `Button.tsx` | All buttons |
| `Table` | `Table.tsx` | Data tables |
| `Textarea` | `textarea.tsx` | Multiline text |
| `ThemeBoundary` | `ThemeBoundary.tsx` | Dark mode containers |

### 4.2 Style Tokens

```css
/* Light Mode (Default) */
bg-white border-slate-200 shadow-sm text-slate-900

/* Dark Mode (Inside ThemeBoundary mode="dark") */
bg-white/10 border-white/20 text-white
```

---

## 5. Pipeline System

### 5.1 Tables

| Table | Purpose |
|-------|---------|
| `pipelines` | Pipeline definitions |
| `pipeline_phases` | Phases (groups of stages) |
| `pipeline_stages` | Individual stages |
| `card_creation_rules` | Who can create cards where |
| `teams` | Team definitions |
| `team_members` | User-team relationships |
| `roles` | Role definitions |

### 5.2 Stage Transitions

Cards move through stages. Each stage can have:
- Different visible fields (`stage_field_config`)
- Required fields for progression
- Quality gates (blocking rules)

---

## 6. Integration System

### 6.1 Tables

| Table | Purpose |
|-------|---------|
| `integration_connections` | Active integrations |
| `integration_field_map` | Inbound field mappings |
| `integration_outbound_field_map` | Outbound mappings |
| `integration_field_catalog` | Available fields per integration |
| `whatsapp_platforms` | WhatsApp configurations |
| `whatsapp_platforms` | WhatsApp configurations |
| `whatsapp_messages` | Message history |
| `integration_outbound_queue` | Queue for sync events (RLS: Auth Insert Allowed) |

### 6.2 Public API (Edge Functions)

> **Tech Stack:** Hono + Zod + OpenAPI

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/deals` | GET, POST | Manage deals |
| `/contacts` | GET, POST | Manage contacts |
| `/openapi.json` | GET | OpenAPI 3.0 Spec |

**Authentication:** `X-API-Key` header required for all endpoints (except health/docs).

**Authentication:** `X-API-Key` header required for all endpoints (except health/docs).

### 6.3 Integration Architecture (Sync Flow)

> **Critical Security Note:** The `integration_outbound_queue` table has a special RLS policy allowing `INSERT` for `authenticated` users. This is required because triggers like `trg_card_outbound_sync` execute in the user's context but need to queue system events.

**Outbound Flow:**
1. User updates Card (with `external_id`)
2. Trigger `trg_card_outbound_sync` fires
3. Trigger inserts into `integration_outbound_queue`
4. Edge Function processes queue asynchronously

---

## 7. File Dependencies (Before Editing)

### 7.1 If Modifying `sections` table
- Update `src/hooks/useSections.ts` types if needed
- Check `src/components/admin/studio/SectionManager.tsx`
- Verify `src/components/card/DynamicSection.tsx`

### 7.2 If Adding New Section
1. Insert into `sections` table
2. Define fields in `system_fields`
3. Configure visibility in `stage_field_config`
4. Add to `CardDetail.tsx` if custom widget needed

### 7.3 If Modifying Pipeline Stages
- Update `stage_field_config` for new stage
- Check `card_creation_rules` if affecting creation

---

## 8. Quick Reference Commands

```bash
# Regenerate types after DB changes
npx supabase gen types typescript --project-id szyrzxvlptqqheizyrxu > src/database.types.ts

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## 9. Critical Rules Summary

1. **No DashboardLayout** → Use `Layout`
2. **No DataTable** → Use `Table`
3. **No SmartForm** → Use UI components directly
4. **No ContactProfile** → Component doesn't exist yet
5. **CardDetail is in `pages/`** → Not in `components/cards/`
6. **Always use hooks** → `useSections()`, `useFieldConfig()` for dynamic data
7. **ProposalBuilderV4** → Latest version, use this for new features
