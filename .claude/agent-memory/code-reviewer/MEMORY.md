# Code Reviewer — Memoria Persistente

## Erros Recorrentes Encontrados

### 1. Migration SQL nao reflete schema real do banco
**Padrao:** Colunas adicionadas diretamente via Supabase Dashboard (ou ALTER TABLE ad-hoc) sem atualizar o arquivo .sql de migration correspondente.
**Sintoma:** `database.types.ts` tem a coluna, o banco ao vivo tem a coluna, mas o arquivo .sql nao tem.
**Exemplo:** Coluna `modo` em `card_document_requirements` — presente no types e no banco, ausente na migration 20260225.
**Checklist:** Sempre comparar `database.types.ts` com os arquivos em `supabase/migrations/` para features novas.

### 2. Tailwind classes nao existentes (h-4.5, w-4.5)
**Padrao:** Uso de `h-4.5`/`w-4.5` que nao existem no Tailwind v3.
**Escala correta:** h-3(12px), h-4(16px), h-5(20px), h-6(24px).
**Impacto:** Class silenciosamente ignorada; icone fica com tamanho errado.

### 3. group-hover sem classe group no ancestral
**Padrao:** Botoes com `opacity-0 group-hover:opacity-100` sem o ancestral ter `className="group"`.
**Resultado:** Botao permanece invisivel.
**Checar:** Sempre verificar se o div pai do elemento com `group-*` tem a classe `group`.

### 4. campo_contato no seed vs CAMPO_CONTATO_MAP desalinhados
**Padrao:** Seed define `campo_contato = 'passaporte'` mas o Map nao tem entrada para 'passaporte'.
**Causa raiz:** `passaporte_validade` em contatos e data de validade, nao numero do passaporte.
**Regra:** Se `campo_contato` esta preenchido no seed, DEVE ter mapeamento no `CAMPO_CONTATO_MAP` ou deve ser `NULL`.

### 5. useCardPeople pode retornar duplicatas
**Padrao:** `useCardPeople` retorna pessoa principal + viajantes sem deduplicar por ID.
**Impacto:** UI pode mostrar a mesma pessoa duas vezes. Banco e protegido pelo upsert com UNIQUE constraint.
**Mitigacao atual:** `new Set(people.map(p => p.id))` no DocumentSetupModal deduplica para atribuicao, mas `people.length` ainda pode estar errado.

### 6. durationMinutes nao restaurado em modo edit
**Padrao:** Ao editar tarefas do tipo `reuniao`, o campo `durationMinutes` nao e lido de `initialData.metadata.duration_minutes`.
**Impacto:** Ao editar uma reuniao, a duracao sempre aparece como 30min (default) mesmo que tenha sido salva com outro valor.
**Correcao:** No bloco de inicializacao do modo edit, adicionar: `setDurationMinutes((initialData?.metadata as any)?.duration_minutes || 30)`.
**Arquivo:** `src/components/card/SmartTaskModal.tsx`, bloco `if (initialData || mode === 'reschedule')`.

### 7. Icone errado em card selector de SmartTaskModal
**Padrao:** Icone `Star` usado como prefixo do campo de busca de cards (linha 918 de SmartTaskModal.tsx).
**Correto:** Deveria ser `Search` (ja importado no projeto globalmente, mas nao no SmartTaskModal).
**Impacto:** Apenas visual/semantico — sem bugs funcionais.

### 8. computePositions: totalCols calculado fora do group scope
**Padrao:** Em `WeekView.tsx` e `DayView.tsx`, `totalCols = columns.length` e calculado DENTRO do `.map()` de cada item, DEPOIS de inserir o item na coluna. Isso significa que itens processados antes nao sabem o numero final de colunas do grupo de sobreposicao.
**Resultado:** Items que ficam sozinhos em col=0 tem width=90% (ou 94%), mesmo que depois apareçam overlaps que deviam deixa-los com 45% ou 30%.
**Impacto:** Visual — meetings sobrepostas podem se sobrepor na UI em vez de ficarem lado a lado.
**Nota:** Bug pre-existente (nao introduzido nesta PR). Algoritmo correto exige 2 passes: primeiro agrupar overlaps, depois calcular totalCols por grupo.

### 9. MeetingDetailDrawer.tsx sem uso
**Padrao:** Arquivo `src/components/calendar/MeetingDetailDrawer.tsx` existe mas nao e importado em nenhum lugar do projeto.
**Impacto:** Dead code. Checar se foi substituido pelo MeetingPopover ou se e necessario para mobile.

### 10. RPC reescrita em migration perde logica de versoes anteriores
**Padrao:** Ao recriar a funcao `process_whatsapp_raw_event_v2` com `CREATE OR REPLACE`, o autor inclui apenas as mudancas desejadas mas regride logica estabelecida em migrations anteriores.
**Regressoes classicas observadas (migration 20260225 vs 20260213):**
- Remove `IF v_phone LIKE '%@g.us'` → group chats voltam a ser processados
- Remove validacao `IF v_phone_normalized IS NULL OR v_phone_normalized = ''` → erro em telefones vazios
- Substitui `find_contact_by_whatsapp()` por query manual em `contato_meios` → perde logica robusta de resolucao
- `INSERT INTO contatos` perde campos `tipo_pessoa` e `last_whatsapp_conversation_id`
- `INSERT INTO contato_meios` removido → novo contato criado sem meio de contato indexado
- `INSERT INTO cards` usa `etapa_funil_id` (coluna legada) em vez de `pipeline_stage_id` + `pipeline_id`
- Sender profile resolution movido para dentro do bloco `BEGIN/EXCEPTION` isolado → perde profile se card op falhar
**Regra:** Antes de reescrever qualquer RPC de processamento critica, fazer diff linha a linha com a versao anterior mais recente.

### 11. btoa com spread operator falha para arquivos grandes (Edge Function)
**Padrao:** `btoa(String.fromCharCode(...new Uint8Array(buffer)))` lanca `RangeError: Maximum call stack size exceeded` para arquivos acima de ~1MB.
**Correto (Deno):** usar `encode` do `std/encoding/base64.ts` ou loop manual.
**Arquivo:** `supabase/functions/process-whatsapp-media/index.ts`, linha 101.

### 12. setVisibility nao marca isDirty em Zustand stores de Reports
**Padrao:** `setVisibility` em `useReportBuilderStore` nao inclui `isDirty: true`, ao contrario de todos os outros setters (`setTitle`, `setDescription`, `setOrderBy`, etc.).
**Impacto:** Mudanca de visibilidade nao dispara `beforeunload` warning se usuario tentar sair sem salvar.
**Arquivo:** `src/hooks/reports/useReportBuilderStore.ts`, linha 183.
**Regra:** Qualquer setter que modifica estado que sera persistido no banco DEVE marcar `isDirty: true`.

### 13. queryKey com objeto nao serializado causa refetches desnecessarios
**Padrao:** `config?.orderBy` passado diretamente na `queryKey` de `useReportEngine` sem `JSON.stringify`.
**Causa:** `toIQR()` cria novo objeto a cada chamada — React Query compara por referencia, nao por valor.
**Impacto:** Refetch desnecessario toda vez que o store re-renderiza, mesmo sem mudanca real no orderBy.
**Arquivo:** `src/hooks/reports/useReportEngine.ts`, linha 35.
**Regra:** Todos os campos de queryKey que sao objetos devem ser serializados com `JSON.stringify`.

### 14. handleDelete sem try/catch em DashboardViewer [PARCIALMENTE CORRIGIDO]
**Padrao:** `deleteDashboard.mutateAsync` chamado sem try/catch. Erro de RLS ou rede vai silenciosamente para o console.
**Status atual:** try/catch foi adicionado (DashboardViewer.tsx linhas 65-72, ReportViewer.tsx linhas 77-85), mas o catch e SILENCIOSO — sem toast de erro ao usuario (ver item 21).
**Regra:** Todo uso de `.mutateAsync` em handlers de UI deve ter try/catch com estado de erro visivel ao usuario.

## Padroes do Projeto Confirmados

### Estrutura de Hooks
- Mutations sempre exportadas como `mutation.mutateAsync` (nao `.mutate`)
- `invalidateAll` padrao: invalida query especifica + `['cards']` para sync global
- `enabled: !!id` em todas as queries com ID de entidade

### Arquivos
- `supabase.storage.from('card-documents')` — bucket de documentos de viajantes
- `arquivos` tabela tem `pessoa_id` (FK para contatos) — usar para vincular arquivo ao viajante

### Visibilidade de Widget por Fase
- `DocumentCollectionWidget` usa `phaseSlug === 'planner' || phaseSlug === 'pos_venda'` para controlar visibilidade
- Fallback em `faseStr` para compatibilidade com dados legados

### Design System (teal para Documentos)
- Widget de documentos usa `teal` como cor de marca (nao `indigo`)
- Aceitavel: cada widget pode ter cor propria desde que use tokens Tailwind

### Navegacao interna: Link/useNavigate obrigatorio
- Nunca usar `<a href=...>` ou `window.location.href = ...` para rotas internas
- Usar `<Link to=...>` ou `navigate(...)` (react-router-dom)
- Padrao corrigido em Pipeline.tsx, Cards.tsx, LeadsTable.tsx, LeadsRowActions.tsx, PipelineListView.tsx

### 15. ScrollArea ref aponta para Root (overflow:hidden), nao para Viewport
**Padrao:** `useRef<HTMLDivElement>` passado como `ref` para `<ScrollArea>` e usado para setar `scrollTop`.
**Causa:** `ScrollArea` forward o ref para `ScrollAreaPrimitive.Root`, que tem `overflow:hidden`. O elemento scrollavel real e o `ScrollAreaPrimitive.Viewport` interno.
**Resultado:** `scrollRef.current.scrollTop = scrollRef.current.scrollHeight` e NOOP — auto-scroll nunca funciona.
**Correto:** Colocar um `<div ref={scrollRef}>` dentro do ScrollArea como filho direto, OU usar `scrollIntoView` em um elemento sentinela no final da lista.
**Arquivos afetados:** `src/components/card/AIChat.tsx` (linha 91), `src/components/card/WhatsAppHistory.tsx` (linha 558) — mesmo bug em ambos.

### 16. useChatIA: chat_history usa closure stale de messages
**Padrao:** `sendMessage` captura `messages` via closure no `useCallback`. Quando enviadas 2+ mensagens rapido (ou antes de re-render), `chatHistory` enviado ao n8n nao inclui a ultima mensagem do usuario recentemente adicionada via `setMessages(prev => ...)`.
**Causa:** `setMessages` e assincrono; `messages` na closure ainda e o valor ANTES do set.
**Correto:** Usar um `useRef` para espelhar `messages` (`messagesRef.current`) e referenciar `messagesRef.current` dentro do callback, ou passar `messages` diretamente como argumento.
**Arquivo:** `src/hooks/useChatIA.ts`, linha 35 (`const chatHistory = messages.map(...)`).

### 17. useChatIA sem useEffect de cleanup no unmount
**Padrao:** `abortRef.current?.abort()` e chamado em `sendMessage` (para cancelar request anterior) e em `reset()`, mas NAO em um `useEffect` de cleanup.
**Resultado:** Se o componente desmontar durante uma request em andamento (ex: usuario fecha modal), a request n8n continua e `setMessages`/`setIsLoading` sao chamados em componente desmontado (React warning).
**Correto:** Adicionar `useEffect(() => () => { abortRef.current?.abort() }, [])` no hook.
**Arquivo:** `src/hooks/useChatIA.ts`.

### 18. toggleAI sem feedback de erro ao usuario
**Padrao:** `toggleAI` em ConversationHistory tem try/finally mas nenhum catch com toast. Se o UPDATE no Supabase falhar (RLS, rede), `toggling` volta para false mas o estado visual nao muda e nenhuma mensagem e exibida.
**Contraste:** Padrao do projeto usa `toast.error(...)` em todos os handlers de mutacao.
**Arquivo:** `src/components/card/ConversationHistory.tsx`, linha 41.

### 19. setState durante render em DashboardViewer (anti-padrao React) [AINDA PRESENTE]
**Padrao:** Atualizacao de estado diretamente no corpo do componente (fora de useEffect), usando condicao para evitar loop infinito.
**Status atual (verificado 2026-02-26):** DashboardViewer.tsx linhas 29-34 usa `prevDashId/setPrevDashId` (renomeado de syncedId), mas o padrao persiste:
```ts
if (dashboard && dashboard.id !== prevDashId) {
    setPrevDashId(dashboard.id)
    setGlobalFilters(dashboard.global_filters ?? {})
}
```
**Nota:** React docs aceitam este padrao especificamente para "render-time adjustments" — e a forma recomendada quando nao se quer o delay de um useEffect para sincronizar estado derivado. O comentario no codigo diz "React recommended pattern". Severidade reducida.
**Arquivo:** `src/components/reports/DashboardViewer.tsx`, linhas 29-34.

### 20. Botoes interativos sem aria-label quando icone-only
**Padrao:** Botoes que exibem apenas icones (sem texto visivel) devem ter `aria-label` ou `title` para leitores de tela.
**Observado em:** `DashboardViewer.tsx` linha 87 (Pin/PinOff button nao tem `title`), `ReportViewer.tsx` linha 98 (ArrowLeft button sem aria-label), linha 129 (Trash2 button sem aria-label).
**Correto:** Adicionar `aria-label="..."` em todos os botoes icone-only.
**Regra:** Qualquer `<button>` com apenas um `<Icon />` como filho precisa de `aria-label` ou `title`.

### 21. catch vazio silencia erros sem notificar usuario
**Padrao:** `catch { // RLS will block... }` no handleDelete de ReportViewer e DashboardViewer nao exibe toast de erro ao usuario.
**Contraste:** MEMORY item 14 registrou esse padrao em DashboardViewer; foi corrigido com try/catch, mas o catch ainda e silencioso (sem toast).
**Arquivo:** `ReportViewer.tsx` linha 83, `DashboardViewer.tsx` linha 72.
**Correto:** `catch (err) { toast.error('Erro ao excluir: ' + (err as Error).message) }` — ou pelo menos logar visualmente.

### 22. DashboardFilters: dateRange default em modo custom usa YYYY-MM-DD (nao ISO)
**Padrao:** Ao ativar o preset "Personalizado" pela primeira vez, `defaultRange.start/end` sao armazenados como `"YYYY-MM-DD"` (via `.split('T')[0]`), nao como ISO completo.
**Causa:** `handleDatePresetChange` usa `.toISOString().split('T')[0]` para criar o default range visual nos inputs. Apenas edicoes posteriores via `handleCustomDateChange` chamam `new Date(value + 'T00:00:00').toISOString()`.
**Impacto:** Se o usuario clicar em "Personalizado" sem alterar os inputs, `dateRange.start` e.g. `"2026-02-01"` e passado ao RPC em vez de `"2026-02-01T00:00:00.000Z"`. Dependendo do RPC, pode ser aceito ou quebrar comparacao de data.
**Arquivo:** `src/components/reports/dashboard/DashboardFilters.tsx`, linhas 85-88.

### 23. ReportPreview chamado sem props de filtro no ReportBuilder
**Padrao:** `ReportPreview` aceita `{ dateStart, dateEnd, product, ownerId }` como props opcionais, mas em `ReportBuilder.tsx` linha 322 e chamado como `<ReportPreview />` sem nenhum prop.
**Impacto:** Preview no builder nunca tem filtros globais — intencional para o builder, mas a interface de props e morta (sem uso). Se futuramente quiserem filtros no builder, a infra existe mas nao esta conectada.
**Arquivos:** `src/components/reports/builder/ReportPreview.tsx` linhas 11-16 (props), `src/components/reports/ReportBuilder.tsx` linha 322 (uso).

### 24. documentos source sem filtro global de data no engine
**Padrao:** `report_query_engine` e `report_drill_down` aplicam `p_date_start/p_date_end` para 9 dos 11 sources, mas 'documentos' e 'equipe' nao tem WHEN na CASE de data. 'documentos' tem `created_at` em `card_document_requirements`, portanto o filtro poderia ser `cdr.created_at`.
**Impacto:** Ao aplicar filtro de data global em DashboardFilters com source='documentos', a data e silenciosamente ignorada (ELSE NULL). Dados aparecem sem corte temporal.
**Arquivo:** `supabase/migrations/20260226_report_engine_v4_enrichment.sql`, linhas 506-533 (engine) e 766-793 (drill_down).

### 25. Presets 'today'/'last_7_days' ficam stale quando persistidos no DashboardViewer
**Padrao:** `DashboardFilters.handleDatePresetChange` resolve presets para datas absolutas (ISO) e as persiste via `updateDashboard.mutate`. Quando o dashboard e reaberto em outro dia, `dateRange` contem as datas do dia anterior.
**Causa:** Design atual armazena o `dateRange` resolvido, nao o `datePreset` como chave para re-resolucao.
**Impacto:** Critico para 'today' (nunca sera "hoje" apos o dia de criacao) e 'last_7_days'. Ja existia para outros presets ('this_month', etc.) — porem 'today'/'last_7_days' sao agravantes por terem janelas ainda menores.
**Correto:** Re-resolver o preset ao carregar os filtros do banco, OU nao persistir `dateRange` para presets que nao sejam 'custom' (persistir apenas `datePreset`, re-resolver no cliente).
**Arquivo:** `src/components/reports/dashboard/DashboardFilters.tsx` e `src/components/reports/DashboardViewer.tsx`.

### 26. button sem type="button" em computed measures do FieldPicker
**Padrao:** Botoes de medidas calculadas (computed measures) no FieldPicker nao tem `type="button"` (linha 166). Em formularios HTML, botoes sem type sao tratados como `type="submit"` e podem disparar submit involuntario se o FieldPicker estiver dentro de um form.
**Contexto:** No ReportBuilder nao ha form wrapper explicito, mas e boa pratica defensiva. Botoes regulares de campo (dimensoes, medidas) ja tem `type="button"` (linha 122).
**Arquivo:** `src/components/reports/builder/FieldPicker.tsx`, linha 166.

### 27. ORDER BY %I com field key original falha para campos com ponto
**Padrao:** `format('ORDER BY %I %s', v_field, ...)` onde `v_field = 'ps.nome'` produz `ORDER BY "ps.nome" DESC` — o identificador e quoted como um nome com ponto, nao como alias de coluna nem como expressao tabela.coluna.
**Status:** Bug pre-existente desde `20260226_report_query_engine.sql`. Nao introduzido nesta PR.
**Impacto:** ORDER BY explicito pelo usuario nunca funciona na pratica (silenciosamente ignorado pelo PostgreSQL ao nao encontrar a coluna). Ordering automatico por fase/etapa (usando MIN(ps.ordem)) continua funcionando pois e hardcoded.
**Correcao correta:** Usar o alias da dimensao (dim_0, dim_1, etc.) como campo de ordenacao, ou usar o resultado de `_report_resolve_field_sql`.

### 28. database.types.ts desatualizado apos adicionar colunas novas a RPC existente
**Padrao:** Migration adiciona campos de retorno a uma RPC (`valor_total`, `receita_total` em `analytics_funnel_by_owner`), mas `src/database.types.ts` nao e regenerado. Frontend usa `as any` no rpc call para contornar — codigo funciona em runtime, mas sem type safety.
**Impacto:** Bugs silenciosos se o nome do campo mudar no banco. Autocompletar e verificacao de tipos nao funcionam para os novos campos.
**Regra:** Apos qualquer migration que adicione/remova campos em RPCs, executar `npx supabase gen types typescript --project-id szyrzxvlptqqheizyrxu > src/database.types.ts`.
**Observado em:** `analytics_funnel_by_owner` — `valor_total`/`receita_total` nao estao em `database.types.ts` (linha 8960-8967), mas o hook `useFunnelByOwner` ja usa a interface local `FunnelByOwnerRow` que tem os campos corretos (linha 18-19). O drill-down tambem usa cast `as any`.

### 29. ownerIds/tagIds como array na queryKey pode causar refetch excessivo
**Padrao:** Arrays passados diretamente na `queryKey` do React Query. React Query v5 compara arrays por valor profundo (deep equal) nas queryKeys usando `hashKey`, portanto arrays de strings sao comparados corretamente. NAO e problema na versao atual.
**Contexto:** Em versoes antigas (pre-v4) ou com objetos (nao arrays de primitivos), isso causava refetch. Para `string[]` em React Query v5, esta correto.
**Confirmado em:** `useAnalyticsDrillDown.ts` linha 92 — `ownerIds` e `tagIds` sao `string[]` (primitivos), sem problema.

### 30. setDatePreset no cleanup de useEffect polui o store global ao sair da view
**Padrao:** Views de snapshot (ex: PipelineCurrentView) chamam `setDatePreset('all_time')` no mount de um useEffect e apenas `setActiveView('overview')` no cleanup — sem restaurar o datePreset anterior.
**Causa:** O cleanup nao chama `setDatePreset` com o valor anterior, entao ao navegar para OverviewView o datePreset fica como 'all_time' em vez do default 'last_3_months'.
**Impacto (MEDIO):** Usuario entra em Pipeline Atual, sai para Visao Geral, os charts de Visao Geral exibem "Todo Periodo" (desde 2020) sem aviso. Pode passar despercebido.
**Correto:** Capturar `datePreset` antes do set e restaurar no cleanup: `const prev = useAnalyticsFilters.getState().datePreset; setDatePreset('all_time'); return () => { setActiveView('overview'); setDatePreset(prev) }`.
**Arquivo:** `src/components/analytics/views/PipelineCurrentView.tsx`, linhas 75-79.

### 31. RPC nova nao registrada em database.types.ts (analytics_pipeline_current)
**Padrao:** `usePipelineCurrent` usa `(supabase.rpc as any)('analytics_pipeline_current', ...)` para contornar a ausencia do tipo em `database.types.ts`. A RPC `analytics_pipeline_current` foi criada em `20260304_analytics_pipeline_current.sql` mas o types nao foi regenerado.
**Impacto:** Sem type safety no call. Se o schema da RPC mudar, o erro sera em runtime, nao em compile time.
**Regra:** Apos criar nova RPC, regenerar types com `npx supabase gen types typescript --project-id szyrzxvlptqqheizyrxu > src/database.types.ts`.
**Arquivo:** `src/hooks/analytics/usePipelineCurrent.ts`, linha 80.

### 32. Drill-down current_stage ignora filtro de datas mas usa dateRange do store global
**Padrao:** `useAnalyticsDrillDownQuery` passa `dateRange.start/end` do store global como `p_date_start/p_date_end` para `analytics_drill_down_cards`. Para `drillSource = 'current_stage'`, a RPC IGNORA as datas em certas branches (nao aplica filtro de data ao `v_where` base), MAS em modo `v_is_entries_mode = true` ainda aplica `c.created_at >= p_date_start`. O comportamento correto (filtrar por cards abertos hoje, sem corte de data) funciona — MAS o valor `dateRange` no store pode ser 'all_time' (2020–hoje) apenas porque PipelineCurrentView fez `setDatePreset('all_time')`, criando dependencia implicita de side-effect de outro componente. Isso e fragil: se outra view setar 'last_month' antes do drill-down ser aberto, os cards abertos apareceriam filtrados por data_criacao.
**Impacto (MEDIO):** Tecnicamente correto hoje (PipelineCurrentView garante all_time), mas arquiteturalmente fragil.
**Correto:** `DrillDownContext` deveria ter campos `p_date_start` e `p_date_end` opcionais para override explicito, em vez de herdar o estado global do store.

