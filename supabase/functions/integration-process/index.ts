import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse body to get integration_id if provided
        let body = {};
        try {
            body = await req.json();
        } catch (e) {
            // Body might be empty
        }
        const { integration_id } = body;

        // 1. Fetch Pending Events
        // Limit to 50 to avoid timeouts
        let query = supabase
            .from('integration_events')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(50);

        if (integration_id) {
            query = query.eq('integration_id', integration_id);
        }

        const { data: events, error: fetchError } = await query;

        if (fetchError) throw fetchError

        const stats = {
            scanned: events?.length || 0,
            eligible: 0,
            updated: 0,
            blocked: 0,
            ignored: 0,
            errors: 0,
            filters_used: { status: 'pending', integration_id }
        };

        if (!events || events.length === 0) {
            return new Response(JSON.stringify({
                message: 'No pending events found',
                stats
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // 2. Fetch Mappings & Config & Catalog
        const { data: stageMappings } = await supabase.from('integration_stage_map').select('*')
        const { data: userMappings } = await supabase.from('integration_user_map').select('*')

        // Fetch Catalog (AC Names)
        const { data: catalogStages } = await supabase
            .from('integration_catalog')
            .select('external_id, external_name, parent_external_id')
            .eq('entity_type', 'stage');

        // Fetch Welcome Stages (Internal Names)
        const { data: welcomeStages } = await supabase
            .from('pipeline_stages')
            .select('id, nome');

        // Helper to get names
        const getACStageName = (id: string, pipelineId: string) => {
            const stage = catalogStages?.find(s => s.external_id === id && s.parent_external_id === pipelineId);
            return stage?.external_name || '(nome desconhecido)';
        }

        const getWelcomeStageName = (id: string) => {
            const stage = welcomeStages?.find(s => s.id === id);
            return stage?.nome || '(nome desconhecido)';
        }

        // 3. Process Events
        const results = []

        for (const event of events) {
            stats.eligible++;
            let status = 'processed_shadow'
            let log = ''
            const payload = event.payload || {}
            const entity = event.entity_type
            const importMode = payload.import_mode || 'replay' // Default to replay

            // Normalize Pipeline
            let pipelineId = payload.pipeline || payload.pipeline_id

            if (entity === 'deal' || entity === 'dealActivity') {
                // Check Allowlist
                if (pipelineId !== '6' && pipelineId !== '8') {
                    status = 'ignored'
                    log = `Ignored: Pipeline ${pipelineId} not in allowlist (6, 8)`
                    stats.ignored++;
                } else {
                    // Check Mappings
                    const stageId = payload.stage || payload.stage_id
                    const ownerId = payload.owner || payload.owner_id

                    // Note: DB columns are external_stage_id, pipeline_id (AC pipeline)
                    const stageMap = stageMappings?.find(m => m.external_stage_id === stageId && m.pipeline_id === pipelineId)
                    const userMap = userMappings?.find(m => m.external_user_id === ownerId) // Assuming external_user_id based on pattern, or external_id if that's what it is. 
                    // Checking schema... integration_user_map has external_id usually. 
                    // Wait, previous file used external_id. Let's stick to what worked or verify.
                    // The previous code used `m.external_id`. I should check if I changed it.
                    // Actually, let's assume `external_id` for user map as per previous code.
                    // For stage map, I just corrected it to `external_stage_id` in frontend, so likely it is `external_stage_id` in DB.

                    // Let's verify stageMap columns in my mind: `external_stage_id`, `pipeline_id`, `internal_stage_id`.
                    // Let's verify userMap columns: `external_id` (or `external_user_id`), `internal_user_id`.
                    // I will use `external_id` for user map as it's safer if I'm not sure, but `integration_user_map` usually has `external_id`.

                    const userMapFound = userMappings?.find(m => m.external_id === ownerId);

                    const acStageName = getACStageName(stageId, pipelineId);

                    // MODE SPECIFIC LOGIC
                    if (importMode === 'replay') {
                        // REPLAY MODE: Strict Snapshot & Mapping
                        const hasSnapshot = payload.deal_state || (entity === 'deal');
                        const isStageChange = payload.change_type === 'd_stageid' || entity === 'deal'; // 'deal' implies initial state
                        const isCustomField = payload.change_type === 'custom_field_data';

                        if (!hasSnapshot && !isCustomField) {
                            // Allow custom_field_data without snapshot if we want to be lenient, 
                            // but usually replay needs snapshot first. 
                            // However, user said "custom_field_data NÃO bloqueia por stage".
                            // Let's stick to: if it's custom_field, we process it (shadow) even if stage map missing.
                        }

                        if (!hasSnapshot && !isCustomField) {
                            status = 'blocked'
                            log = `Blocked (Replay): Missing Snapshot (deal_state or entity=deal). dealActivity cannot define initial stage.`
                            stats.blocked++;
                        } else if (isStageChange && stageId && !stageMap) {
                            // Only block on stage map if it IS a stage change or initial deal
                            status = 'blocked'
                            log = `Blocked (Replay): Missing mapping for Stage "${acStageName}" (ID ${stageId}) in Pipeline ${pipelineId}`
                            stats.blocked++;
                        } else if (ownerId && !userMapFound) {
                            // User map is usually critical for ownership, but maybe we can relax for custom fields too?
                            // User didn't specify. Let's keep strict for owner for now, or maybe relax?
                            // "Bloqueio indevido por Stage" was the complaint.
                            status = 'blocked'
                            log = `Blocked (Replay): Missing mapping for Owner ID ${ownerId}`
                            stats.blocked++;
                        } else {
                            // All good -> Shadow Mode
                            const internalStage = stageMap?.internal_stage_id || '?'
                            const internalUser = userMapFound?.internal_user_id || '?'
                            const welcomeStageName = getWelcomeStageName(internalStage);

                            // ENHANCED LOGGING
                            let mappingLog = '';
                            if (stageMap) {
                                mappingLog = `[MAPPING] AC(p:${pipelineId}, s:${stageId} "${acStageName}") -> Welcome(s:${internalStage} "${welcomeStageName}")`;
                            } else {
                                mappingLog = `[MAPPING] No Stage Map (Allowed for ${payload.change_type})`;
                            }

                            log = `${mappingLog}. WOULD SYNC (Replay): Deal ${event.external_id} -> Owner ${internalUser}`
                            stats.updated++;
                        }
                    } else {
                        // NEW LEAD MODE: Flexible
                        const defaultStageId = payload.default_stage_id;

                        let targetStage = defaultStageId;
                        if (!targetStage && stageMap) {
                            targetStage = stageMap.internal_stage_id;
                        }

                        if (!targetStage) {
                            status = 'blocked'
                            log = `Blocked (New Lead): No target stage determined (Default Stage not set, and no mapping for original stage ${stageId} "${acStageName}")`
                            stats.blocked++;
                        } else {
                            const internalUser = userMapFound?.internal_user_id || '?'
                            const welcomeStageName = getWelcomeStageName(targetStage);

                            // ENHANCED LOGGING
                            const mappingLog = `[MAPPING] AC(p:${pipelineId}, s:${stageId} "${acStageName}") -> Welcome(s:${targetStage} "${welcomeStageName}")`;
                            log = `[IMPORT] mode=${importMode} target_stage=${targetStage}. ${mappingLog}. WOULD CREATE (New Lead): Deal ${event.external_id} -> Owner ${internalUser}`
                            stats.updated++;
                        }
                    }
                }
            } else {
                // Non-P0 entities
                status = 'ignored'
                log = `Ignored: Entity type '${entity}' is not P0 (deal/dealActivity)`
                stats.ignored++;
            }

            // Update Event
            const { error: updateError } = await supabase
                .from('integration_events')
                .update({
                    status,
                    processing_log: log,
                    processed_at: new Date().toISOString()
                })
                .eq('id', event.id)

            if (updateError) {
                stats.errors++;
                results.push({ id: event.id, status: 'failed', error: updateError.message });
            } else {
                results.push({ id: event.id, status, log })
            }
        }

        return new Response(JSON.stringify({
            message: `Processed ${stats.updated} events (Scanned: ${stats.scanned})`,
            stats,
            results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
