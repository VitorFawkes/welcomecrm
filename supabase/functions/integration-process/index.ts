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

        // Helper to update event status
        const updateEventStatus = async (eventId: string, status: string, log: string) => {
            const { error } = await supabase
                .from('integration_events')
                .update({
                    status,
                    processing_log: log,
                    processed_at: new Date().toISOString()
                })
                .eq('id', eventId);
            return error;
        }

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
            processed_shadow: 0,
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

        // 1.5 Auto-Detect Entities (Pipelines, Stages, Users, Fields)
        // We do this BEFORE fetching catalog so we can use the detected names immediately if needed.
        const detectedUpserts = [];
        const seenKeys = new Set();

        for (const event of events) {
            const p = event.payload || {};
            const intId = event.integration_id;
            if (!intId) continue;

            // Pipeline
            const pipeId = p.pipeline || p.pipeline_id;
            if (pipeId) {
                const key = `pipeline:${intId}:${pipeId}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    detectedUpserts.push({
                        integration_id: intId,
                        entity_type: 'pipeline',
                        external_id: pipeId,
                        external_name: p.pipeline_title || `Pipeline ${pipeId}`,
                        parent_external_id: '',
                        metadata: { source: 'detected' },
                        updated_at: new Date().toISOString()
                    });
                }
            }

            // Stage
            const stageId = p.stage || p.stage_id || p.d_stageid;
            if (stageId && pipeId) {
                const key = `stage:${intId}:${pipeId}:${stageId}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    detectedUpserts.push({
                        integration_id: intId,
                        entity_type: 'stage',
                        external_id: stageId,
                        parent_external_id: pipeId,
                        external_name: p.stage_title || `Stage ${stageId}`,
                        metadata: { source: 'detected' },
                        updated_at: new Date().toISOString()
                    });
                }
            }

            // User
            const ownerId = p.owner || p.owner_id;
            if (ownerId) {
                const key = `user:${intId}:${ownerId}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    detectedUpserts.push({
                        integration_id: intId,
                        entity_type: 'user',
                        external_id: ownerId,
                        external_name: p.owner_name || (p.owner_firstname ? `${p.owner_firstname} ${p.owner_lastname}` : `User ${ownerId}`),
                        parent_external_id: '',
                        metadata: { source: 'detected' },
                        updated_at: new Date().toISOString()
                    });
                }
            }

            // Fields (custom_field_data)
            if (p.custom_field_data) {
                for (const fieldId of Object.keys(p.custom_field_data)) {
                    const key = `field:${intId}:${fieldId}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        detectedUpserts.push({
                            integration_id: intId,
                            entity_type: 'field',
                            external_id: fieldId,
                            external_name: `Field ${fieldId}`, // We don't get names here usually
                            parent_external_id: '',
                            metadata: { source: 'detected' },
                            updated_at: new Date().toISOString()
                        });
                    }
                }
            }
        }

        if (detectedUpserts.length > 0) {
            // Use ignoreDuplicates: true to avoid overwriting manual entries
            await supabase
                .from('integration_catalog')
                .upsert(detectedUpserts, {
                    onConflict: 'integration_id,entity_type,external_id,parent_external_id',
                    ignoreDuplicates: true
                });
        }

        // 2. Fetch Mappings & Config & Catalog
        const { data: stageMappings } = await supabase.from('integration_stage_map').select('*')
        const { data: userMappings } = await supabase.from('integration_user_map').select('*')

        // Fetch Catalog (AC Names)
        const { data: catalogPipelines } = await supabase
            .from('integration_catalog')
            .select('external_id, external_name')
            .eq('entity_type', 'pipeline');

        const { data: catalogStages } = await supabase
            .from('integration_catalog')
            .select('external_id, external_name, parent_external_id')
            .eq('entity_type', 'stage');

        const { data: catalogUsers } = await supabase
            .from('integration_catalog')
            .select('external_id, external_name')
            .eq('entity_type', 'user');

        const { data: catalogFields } = await supabase
            .from('integration_catalog')
            .select('external_id, external_name')
            .eq('entity_type', 'field');

        // Fetch Welcome Stages (Internal Names)
        const { data: welcomeStages } = await supabase
            .from('pipeline_stages')
            .select('id, nome');

        // Helper to get names
        const getACPipelineName = (id: string) => {
            const p = catalogPipelines?.find(x => x.external_id === id);
            return p?.external_name || `Pipeline ${id}`;
        }

        const getACStageName = (id: string, pipelineId: string) => {
            const stage = catalogStages?.find(s => s.external_id === id && s.parent_external_id === pipelineId);
            return stage?.external_name || '(nome desconhecido)';
        }

        const getACUserName = (id: string) => {
            const user = catalogUsers?.find(u => u.external_id === id);
            return user?.external_name || `User ${id}`;
        }

        const getACFieldName = (id: string) => {
            const field = catalogFields?.find(f => f.external_id === id);
            return field?.external_name || `Field ${id}`;
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
            const pipelineName = getACPipelineName(pipelineId);

            // Check if we need to process this entity
            if (entity === 'deal' || entity === 'dealActivity') {
                // Check Allowlist (Pipeline 6 & 8)
                if (pipelineId !== '6' && pipelineId !== '8') {
                    status = 'ignored'
                    log = `Ignored: Pipeline ${pipelineId} not in allowlist (6, 8)`
                    stats.ignored++;

                    const error = await updateEventStatus(event.id, status, log);
                    if (error) {
                        stats.errors++;
                        results.push({ id: event.id, status: 'failed', error: error.message });
                    } else {
                        results.push({ id: event.id, status, log });
                    }
                    continue;
                }

                // Check Mappings
                const stageId = payload.stage || payload.stage_id
                const ownerId = payload.owner || payload.owner_id

                const acStageName = getACStageName(stageId, pipelineId);
                const acUserName = getACUserName(ownerId);

                // MODE SPECIFIC LOGIC
                // REPLAY MODE: Strict Snapshot & Mapping
                const hasSnapshot = payload.deal_state || (entity === 'deal');
                const isStageChange = payload.change_type === 'd_stageid' || entity === 'deal'; // 'deal' implies initial state
                const isCustomField = payload.change_type === 'custom_field_data';

                // 3. Stage Mapping Check (Granular Safe-by-Default)
                // Only block if the event DEFINES or CHANGES the stage (deal_state snapshot or d_stageid)
                // custom_field_data should NOT be blocked by missing stage map
                const isStageDefiningEvent =
                    (event.event_type === 'deal_state' && payload.stage) ||
                    (event.event_type === 'd_stageid') ||
                    (entity === 'deal'); // deal entity always defines stage

                let targetStageId = null;
                if (isStageDefiningEvent) {
                    const stageMap = stageMappings?.find(m =>
                        m.integration_id === event.integration_id &&
                        m.pipeline_id === pipelineId &&
                        m.external_stage_id === (payload.stage || payload.d_stageid || payload.stage_id)
                    );

                    if (!stageMap) {
                        const stageName = catalogStages?.find(s => s.external_id === (payload.stage || payload.d_stageid || payload.stage_id))?.external_name || (payload.stage || payload.d_stageid || payload.stage_id);

                        // BLOCK: Missing Stage Map for stage-defining event
                        const msg = `Unmapped Stage: ${stageName} (ID: ${payload.stage || payload.d_stageid || payload.stage_id}) in Pipeline ${pipelineName}`;
                        const error = await updateEventStatus(event.id, 'blocked', msg);
                        if (error) {
                            stats.errors++;
                            results.push({ id: event.id, status: 'failed', error: error.message });
                        } else {
                            stats.blocked++;
                            results.push({ id: event.id, status: 'blocked', log: msg });
                        }
                        continue;
                    }
                    targetStageId = stageMap.internal_stage_id;
                } else if (event.event_type === 'custom_field_data') {
                    // For custom fields, we don't enforce stage mapping
                    // We might try to find it for logging, but don't block
                }

                // 4. Owner Mapping Check (Warning in Shadow Mode)
                let targetOwnerId = null;
                if (ownerId) {
                    const userMap = userMappings?.find(m =>
                        m.integration_id === event.integration_id &&
                        m.external_user_id === ownerId
                    );

                    if (userMap) {
                        targetOwnerId = userMap.internal_user_id;
                    } else {
                        const ownerName = catalogUsers?.find(u => u.external_id === ownerId)?.external_name || ownerId;
                        const msg = `Unmapped Owner: ${ownerName} (ID: ${ownerId})`;

                        // Check if we are in Shadow Mode (assuming true for now as per task)
                        const isShadowMode = true;

                        if (isShadowMode) {
                            console.warn(`[SHADOW] ${msg} - Would block in Write Mode`);
                            log += (log ? '; ' : '') + msg;
                        } else {
                            // In Write Mode, block creation/assignment if owner is missing
                            if (event.event_type === 'deal_add' || event.event_type === 'deal_owner_update') {
                                const error = await updateEventStatus(event.id, 'blocked', msg);
                                if (error) {
                                    stats.errors++;
                                    results.push({ id: event.id, status: 'failed', error: error.message });
                                } else {
                                    stats.blocked++;
                                    results.push({ id: event.id, status: 'blocked', log: msg });
                                }
                                continue;
                            }
                        }
                    }
                }

                if (importMode === 'replay') {
                    // REPLAY MODE: Strict Snapshot & Mapping
                    if (!hasSnapshot && !isCustomField) {
                        const msg = `Blocked (Replay): Missing Snapshot (deal_state or entity=deal). dealActivity cannot define initial stage.`;
                        const error = await updateEventStatus(event.id, 'blocked', msg);
                        if (error) {
                            stats.errors++;
                            results.push({ id: event.id, status: 'failed', error: error.message });
                        } else {
                            stats.blocked++;
                            results.push({ id: event.id, status: 'blocked', log: msg });
                        }
                        continue;
                    } else if (isStageDefiningEvent && targetStageId === null) {
                        // Should have been caught above, but double check
                        const msg = `Blocked (Replay): Missing mapping for Stage ID ${stageId}`;
                        const error = await updateEventStatus(event.id, 'blocked', msg);
                        if (error) {
                            stats.errors++;
                            results.push({ id: event.id, status: 'failed', error: error.message });
                        } else {
                            stats.blocked++;
                            results.push({ id: event.id, status: 'blocked', log: msg });
                        }
                        continue;
                    } else {
                        // All good -> Shadow Mode
                        const internalStage = targetStageId || '?'
                        const internalUser = targetOwnerId || '?'

                        // ENHANCED LOGGING
                        let mappingLog = '';
                        if (targetStageId) {
                            const welcomeStageName = getWelcomeStageName(targetStageId);
                            mappingLog = `[MAPPING] AC(p:${pipelineId}, s:${stageId} "${acStageName}") -> Welcome(s:${internalStage} "${welcomeStageName}")`;
                        } else {
                            mappingLog = `[MAPPING] No Stage Map (Allowed for ${payload.change_type})`;
                        }

                        log = `[IMPORT] mode=${importMode} target_stage=${internalStage} owner=${internalUser}. ${mappingLog}`;

                        // Update status to processed_shadow
                        const error = await updateEventStatus(event.id, 'processed_shadow', log);
                        if (error) {
                            stats.errors++;
                            results.push({ id: event.id, status: 'failed', error: error.message });
                        } else {
                            stats.processed_shadow++;
                            results.push({ id: event.id, status: 'processed_shadow', log });
                        }
                    }
                } else {
                    // NEW LEAD MODE
                    const defaultStageId = payload.default_stage_id;
                    let internalStage = targetStageId || defaultStageId;

                    if (!internalStage) {
                        const msg = `Blocked (New Lead): No target stage determined (Default Stage not set, and no mapping for original stage ${stageId} "${acStageName}")`;
                        const error = await updateEventStatus(event.id, 'blocked', msg);
                        if (error) {
                            stats.errors++;
                            results.push({ id: event.id, status: 'failed', error: error.message });
                        } else {
                            stats.blocked++;
                            results.push({ id: event.id, status: 'blocked', log: msg });
                        }
                        continue;
                    } else {
                        const internalUser = targetOwnerId || '?'
                        const welcomeStageName = getWelcomeStageName(internalStage);

                        // ENHANCED LOGGING
                        const mappingLog = `[MAPPING] AC(p:${pipelineId}, s:${stageId} "${acStageName}") -> Welcome(s:${internalStage} "${welcomeStageName}")`;
                        log = `[IMPORT] mode=${importMode} target_stage=${internalStage} owner=${internalUser}. ${mappingLog}. WOULD CREATE (New Lead): Deal ${event.external_id} -> Owner ${internalUser} (${acUserName})`
                        const error = await updateEventStatus(event.id, 'processed_shadow', log);
                        if (error) {
                            stats.errors++;
                            results.push({ id: event.id, status: 'failed', error: error.message });
                        } else {
                            stats.processed_shadow++;
                            results.push({ id: event.id, status: 'processed_shadow', log });
                        }
                    }
                }
            } else {
                // Non-P0 entities
                status = 'ignored'
                log = `Ignored: Entity type '${entity}' is not P0 (deal/dealActivity)`
                stats.ignored++;

                const error = await updateEventStatus(event.id, status, log);
                if (error) {
                    stats.errors++;
                    results.push({ id: event.id, status: 'failed', error: error.message });
                } else {
                    results.push({ id: event.id, status, log });
                }
            }
        }

        return new Response(JSON.stringify({
            message: `Processed ${stats.updated + stats.processed_shadow} events (Scanned: ${stats.scanned})`,
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
