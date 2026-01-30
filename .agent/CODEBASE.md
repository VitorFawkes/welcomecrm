# 🗺️ CODEBASE.md - WelcomeCRM Knowledge Base

> [!CAUTION]
> **Este arquivo DEVE ser atualizado sempre que algo novo for criado.**
> Use o workflow `/new-module` Phase 5 para manter sincronizado.

> **Purpose:** Source of Truth for the AI Agent. Read this BEFORE any implementation.
> **Last Updated:** 2026-01-28
> **Trigger:** ALWAYS ON
> **Stats:** 87 tabelas | 28 páginas | 38 hooks | 13 views

---

## 1. Core Entities (The "Suns")

All tables must FK to at least one of these:

| Entity | Table | Description |
|--------|-------|-------------|
| **Deal** | `cards` | The opportunity/viagem |
| **Person** | `contatos` | The client/traveler |
| **User** | `profiles` | The CRM user (agent) |

**Verified Satellites:**
- `activities` (21.974) → cards, profiles
- `arquivos` → cards
- `tarefas` (19.009) → cards, profiles
- `proposals` (6) + `proposal_versions` (54) + `proposal_sections` (246) + `proposal_items` (583)
- `automation_rules` → cards
- `api_keys` → profiles
- `api_request_logs` → api_keys

**Integration System (12 tabelas):**
- `integrations` (19) - Configurações de integrações
- `integration_catalog` (1.094) - Catálogo de entidades externas
- `integration_events` (10.488) - Eventos de sync
- `integration_field_map` (65) - Mapeamento de campos inbound
- `integration_outbound_field_map` (19) - Mapeamento outbound
- `integration_outbound_queue` (28) - Fila de sync
- `integration_router_config` (8) - Roteamento de eventos
- `integration_settings` (12) - Configurações
- `integration_stage_map` (16) - Mapeamento de stages
- `integration_inbound_triggers` (1) - Triggers de entrada

**WhatsApp System (8 tabelas):**
- `whatsapp_platforms` (3) - Configurações de plataformas
- `whatsapp_conversations` (1) - Conversas
- `whatsapp_messages` (495) → cards, contatos, profiles
- `whatsapp_raw_events` (4.054) - Eventos brutos
- `whatsapp_custom_fields` (1) - Campos customizados
- `whatsapp_field_mappings` (36) - Mapeamentos
- `whatsapp_linha_config` (4) - Config de linhas
- `whatsapp_phase_instance_map` (2) - Mapeamento de fases

**Workflow System (5 tabelas):**
- `workflows` (5) - Definições de workflows
- `workflow_nodes` (31) - Nós do workflow
- `workflow_edges` (26) - Conexões entre nós
- `workflow_instances` (109) - Instâncias ativas
- `workflow_queue` (43.106) - Fila de execução
- `workflow_log` (132.757) - Logs de execução

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

### 2.3 Frontend Hooks (COMPLETE - 38 hooks)

#### Section & Field Management
| Hook | File | Purpose |
|------|------|---------|
| `useSections()` | `useSections.ts` | Fetch all active sections |
| `useSectionsByPosition()` | `useSections.ts` | Filter by left/right |
| `useGovernableSections()` | `useSections.ts` | Filter governable only |
| `useFieldConfig()` | `useFieldConfig.ts` | Field visibility/required per stage |
| `useStageRequiredFields()` | `useStageRequiredFields.ts` | Required fields for stage |
| `useStageRequirements()` | `useStageRequirements.ts` | Validador completo de requisitos (fields, proposals, tasks, rules) |

#### Pipeline & Cards
| Hook | File | Purpose |
|------|------|---------|
| `usePipelineStages()` | `usePipelineStages.ts` | Pipeline stages data |
| `usePipelinePhases()` | `usePipelinePhases.ts` | Pipeline phases data |
| `usePipelineFilters()` | `usePipelineFilters.ts` | Zustand store para filtros do Kanban (persisted) |
| `usePipelineCards()` | `usePipelineCards.ts` | **Query de cards com filtros (view_cards_acoes)** |
| `useCardContacts()` | `useCardContacts.ts` | Contacts linked to card |
| `useCardPeople()` | `useCardPeople.ts` | People on a card |
| `useCardCreationRules()` | `useCardCreationRules.ts` | Who can create cards where |
| `useDeleteCard()` | `useDeleteCard.ts` | Card deletion logic |
| `useQualityGate()` | `useQualityGate.ts` | Stage transition validation |
| `useFilterOptions()` | `useFilterOptions.ts` | Filter options for pipeline |
| `useTrips()` | `useTrips.ts` | Query de viagens ganhas |
| `useTripsFilters()` | `useTripsFilters.ts` | Zustand store para filtros de viagens |

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

### 3.3 All Pages (COMPLETE - 28 pages)

#### Core Pages (8)
| Page | Path | Route | Description |
|------|------|-------|-------------|
| `CardDetail` | `src/pages/CardDetail.tsx` | `/cards/:id` | **360° Deal View** |
| `Pipeline` | `src/pages/Pipeline.tsx` | `/pipeline` | Kanban board |
| `Dashboard` | `src/pages/Dashboard.tsx` | `/dashboard` | Main dashboard |
| `People` | `src/pages/People.tsx` | `/people` | Contacts list |
| `Cards` | `src/pages/Cards.tsx` | `/cards` | Cards list view |
| `Tasks` | `src/pages/Tasks.tsx` | `/tasks` | Task management |
| `ActivitiesPage` | `src/pages/ActivitiesPage.tsx` | `/activities` | Activities view |
| `GroupsPage` | `src/pages/GroupsPage.tsx` | `/groups` | Groups management |

#### Proposals (5)
| Page | Path | Route | Description |
|------|------|-------|-------------|
| `ProposalsPage` | `src/pages/ProposalsPage.tsx` | `/proposals` | Proposals list |
| `ProposalBuilderV4` | `src/pages/ProposalBuilderV4.tsx` | `/proposals/:id/v4` | **Latest proposal builder** |
| `ProposalBuilderV3` | `src/pages/ProposalBuilderV3.tsx` | `/proposals/:id/v3` | Legacy builder v3 |
| `ProposalBuilderElite` | `src/pages/ProposalBuilderElite.tsx` | `/proposals/:id/elite` | Elite builder |
| `ProposalBuilder` | `src/pages/ProposalBuilder.tsx` | `/proposals/:id/edit` | Original builder |

#### Admin Pages (9)
| Page | Path | Route | Description |
|------|------|-------|-------------|
| `PipelineStudio` | `src/pages/admin/PipelineStudio.tsx` | `/settings/pipeline/structure` | Pipeline configuration |
| `UserManagement` | `src/pages/admin/UserManagement.tsx` | `/settings/team/members` | User admin |
| `CardCreationRulesPage` | `src/pages/admin/CardCreationRulesPage.tsx` | `/settings/team/card-rules` | Creation rules |
| `CategoryManagement` | `src/pages/admin/CategoryManagement.tsx` | `/settings/customization/categories` | Categories |
| `CRMHealth` | `src/pages/admin/CRMHealth.tsx` | `/settings/operations/health` | System health |
| `Lixeira` | `src/pages/admin/Lixeira.tsx` | `/settings/operations/trash` | Trash/recycle bin |
| `LossReasonManagement` | `src/pages/admin/LossReasonManagement.tsx` | `/settings/customization/loss-reasons` | **Motivos de perda** |
| `WorkflowBuilderPage` | `src/pages/admin/WorkflowBuilderPage.tsx` | `/settings/workflows/builder/:id?` | **Visual workflow builder** |
| `WorkflowListPage` | `src/pages/admin/WorkflowListPage.tsx` | `/settings/workflows` | **Lista de workflows** |

#### Developer (1)
| Page | Path | Route | Description |
|------|------|-------|-------------|
| `DeveloperHub` | `src/pages/developer/DeveloperHub.tsx` | `/settings/developer-platform` | API keys, Swagger UI |

#### Public Pages - No Auth (3)
| Page | Path | Route | Description |
|------|------|-------|-------------|
| `ProposalView` | `src/pages/public/ProposalView.tsx` | `/p/:token` | Public proposal view |
| `ProposalReview` | `src/pages/public/ProposalReview.tsx` | `/p/:token/review` | Client review |
| `ProposalConfirmed` | `src/pages/public/ProposalConfirmed.tsx` | `/p/:token/confirmed` | Confirmation |

#### Auth & Settings (2)
| Page | Path | Route | Description |
|------|------|-------|-------------|
| `Login` | `src/pages/Login.tsx` | `/login` | Authentication |
| `InvitePage` | `src/pages/InvitePage.tsx` | `/invite/:token` | User invitation |

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

## 9. Componentes Críticos (Comportamento Importante)

### CardHeader.tsx
- **Edição de título:** Inline editing com mutation
- **Mudança de etapa:** Dropdown ordenado por fase, valida quality gate antes de mover
- **Seleção de owners:** SDR, Planner, Pós-Venda (baseado na fase)
- **Quality Gate:** Usa `useQualityGate().validateMoveSync()` antes de permitir mudança

### KanbanBoard.tsx
- **Drag-drop:** @dnd-kit para arrastar cards entre etapas
- **RPC de mover:** Usa `mover_card(p_card_id, p_nova_etapa_id, p_motivo_perda_id?, p_motivo_perda_comentario?)`
- **Validações:** Quality gate, governance rules, loss reason
- **Scroll horizontal:** `useHorizontalScroll()` com drag-to-pan

### KanbanCard.tsx
- **Campos dinâmicos:** Renderiza baseado em `pipeline_card_settings.campos_kanban`
- **Field registry:** Usa `fieldRegistry.ts` para componentes de campo
- **Tipos suportados:** currency, date, select, boolean, numeric, text

### CreateCardModal.tsx
- **Allowed stages:** Usa `useAllowedStages(product)` baseado no time do usuário
- **Auto-select:** Primeira etapa permitida é selecionada automaticamente
- **Owner default:** `dono_atual_id = profile.id` do usuário logado

---

## 10. Critical Rules Summary

1. **No DashboardLayout** → Use `Layout`
2. **No DataTable** → Use `Table`
3. **No SmartForm** → Use UI components directly
4. **No ContactProfile** → Component doesn't exist yet
5. **CardDetail is in `pages/`** → Not in `components/cards/`
6. **Always use hooks** → `useSections()`, `useFieldConfig()` for dynamic data
7. **ProposalBuilderV4** → Latest version, use this for new features
8. **Mover card** → Sempre via RPC `mover_card`, nunca UPDATE direto
9. **Quality Gate** → Validar antes de mover para nova etapa
10. **Campos dinâmicos** → Via `pipeline_card_settings` + `system_fields`
