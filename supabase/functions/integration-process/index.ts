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

        // Parse body
        let body: Record<string, any> = {};
        try {
            body = await req.json();
        } catch (_e) {
            // Body might be empty
        }
        const { integration_id, event_ids } = body;

        // 0. Fetch Settings
        const { data: settings } = await supabase
            .from('integration_settings')
            .select('key, value')
            .in('key', ['SHADOW_MODE_ENABLED', 'WRITE_MODE_ENABLED', 'ALLOWED_EVENT_TYPES']);

        const shadowModeSetting = settings?.find(s => s.key === 'SHADOW_MODE_ENABLED')?.value === 'true';
        const writeModeSetting = settings?.find(s => s.key === 'WRITE_MODE_ENABLED')?.value === 'true';
        const allowedEventTypesSetting = settings?.find(s => s.key === 'ALLOWED_EVENT_TYPES')?.value;
        const allowedEventTypes = allowedEventTypesSetting ? allowedEventTypesSetting.split(',').map((t: string) => t.trim()) : ['deal_add', 'deal_update', 'deal_state'];
        const isShadowMode = shadowModeSetting || !writeModeSetting;

        // 1. Fetch Events to Process
        let query = supabase
            .from('integration_events')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        // If specific event IDs provided, fetch those (any status); otherwise fetch pending
        if (event_ids && Array.isArray(event_ids) && event_ids.length > 0) {
            query = query.in('id', event_ids);
        } else {
            query = query.eq('status', 'pending');
        }

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
            mode: isShadowMode ? 'SHADOW' : 'WRITE'
        };

        if (!events || events.length === 0) {
            return new Response(JSON.stringify({ message: 'No pending events found', stats }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // 2. Load Metadata (Pipelines, Stages, Maps)
        const { data: stageMappings } = await supabase.from('integration_stage_map').select('*');
        const { data: userMappings } = await supabase.from('integration_user_map').select('*');
        const { data: fieldMappings } = await supabase.from('integration_field_map').select('*');
        const { data: systemFields } = await supabase.from('system_fields').select('key, type, section');

        // Load Topology
        const { data: pipelineStages } = await supabase.from('pipeline_stages').select('id, pipeline_id, nome');
        const { data: pipelines } = await supabase.from('pipelines').select('id, nome, produto');

        // Helper: Parse flattened AC fields (deal[fields][109][value] -> { 109: "value" })
        const parseCustomFields = (payload: Record<string, any>) => {
            const fields: Record<string, any> = {};

            Object.keys(payload).forEach(key => {
                const match = key.match(/^deal\[fields\]\[(\d+)\]\[value\]$/);
                if (match) {
                    const fieldId = match[1];
                    fields[fieldId] = payload[key];
                }
            });
            return fields;
        };

        // Helper: Resolve Topology
        const resolveTopology = (stageId: string) => {
            const stage = pipelineStages?.find(s => s.id === stageId);
            if (!stage) return null;

            const pipeline = pipelines?.find(p => p.id === stage.pipeline_id);
            if (!pipeline) return null;

            return {
                pipelineId: pipeline.id,
                pipelineName: pipeline.nome,
                produto: pipeline.produto,
                stageName: stage.nome
            };
        };

        // Helper: Map Status
        const mapStatus = (acStatus: string | number) => {
            const s = String(acStatus);
            if (s === '1') return 'ganho';
            if (s === '2') return 'perdido';
            return 'aberto';
        };

        // 3. Process Events
        const results: any[] = [];

        for (const event of events) {
            stats.eligible++;
            let log = '';

            try {
                const payload = event.payload || {};
                const entity = event.entity_type;
                const importMode = payload.import_mode || 'replay';

                // ═══════════════════════════════════════════════════════════════════
                // CONTACT EVENT HANDLER
                // ═══════════════════════════════════════════════════════════════════
                if (entity === 'contact') {
                    const acContactId = payload['contact[id]'] || payload.contact_id || payload.id;
                    const firstName = payload['contact[first_name]'] || payload.first_name || '';
                    const lastName = payload['contact[last_name]'] || payload.last_name || '';
                    const email = payload['contact[email]'] || payload.email;
                    const phone = payload['contact[phone]'] || payload.phone;

                    // Use separate fields for nome and sobrenome
                    const nome = firstName.trim() || 'Sem Nome';
                    const sobrenome = lastName.trim() || null;

                    if (!acContactId) {
                        stats.ignored++;
                        await updateEventStatus(event.id, 'ignored', 'Contact event missing contact ID');
                        continue;
                    }

                    if (!isShadowMode) {
                        // Try to find existing contact by external_id OR email
                        let existingContact = null;

                        const { data: byExternalId } = await supabase
                            .from('contatos')
                            .select('id')
                            .eq('external_id', String(acContactId))
                            .eq('external_source', 'active_campaign')
                            .single();

                        if (byExternalId) {
                            existingContact = byExternalId;
                        } else if (email) {
                            const { data: byEmail } = await supabase
                                .from('contatos')
                                .select('id')
                                .eq('email', email)
                                .single();
                            existingContact = byEmail;
                        }

                        if (existingContact) {
                            const updatePayload: Record<string, any> = {
                                external_id: String(acContactId),
                                external_source: 'active_campaign',
                                updated_at: new Date().toISOString()
                            };
                            if (nome !== 'Sem Nome') updatePayload.nome = nome;
                            if (sobrenome) updatePayload.sobrenome = sobrenome;
                            if (phone) updatePayload.telefone = phone;

                            const { error: uErr } = await supabase
                                .from('contatos')
                                .update(updatePayload)
                                .eq('id', existingContact.id);

                            if (uErr) throw new Error(`Contact Update Error: ${uErr.message}`);
                            log = `Updated Contact ${existingContact.id} (AC ID: ${acContactId})`;
                        } else {
                            // Create new contact with AC external_id
                            const { error: cErr } = await supabase
                                .from('contatos')
                                .insert({
                                    nome: nome,
                                    sobrenome: sobrenome,
                                    email: email,
                                    telefone: phone,
                                    external_id: String(acContactId),
                                    external_source: 'active_campaign',
                                    tags: ['active_campaign'],
                                    tipo_pessoa: 'adulto'
                                });

                            if (cErr) throw new Error(`Contact Create Error: ${cErr.message}`);
                            log = `Created Contact (AC ID: ${acContactId})`;
                        }

                        await updateEventStatus(event.id, 'processed', log);
                        stats.updated++;
                        results.push({ id: event.id, status: 'processed', log });
                    } else {
                        log = `[SHADOW] Would upsert Contact (AC ID: ${acContactId})`;
                        await updateEventStatus(event.id, 'processed_shadow', log);
                        stats.processed_shadow++;
                        results.push({ id: event.id, status: 'processed_shadow', log });
                    }
                    continue;
                }

                // Only process deals and dealActivity
                if (entity !== 'deal' && entity !== 'dealActivity') {
                    stats.ignored++;
                    await updateEventStatus(event.id, 'ignored', `Ignored: Entity ${entity}`);
                    continue;
                }

                // Only process allowed event types
                if (!allowedEventTypes.includes(event.event_type)) {
                    stats.ignored++;
                    await updateEventStatus(event.id, 'ignored', `Ignored: Event type ${event.event_type} not allowed`);
                    continue;
                }

                // 3.1 Resolve Target Stage
                // Support both flat format (stage, pipeline) and bracket format (deal[stageid], deal[pipelineid])
                const acStageId = payload.stage || payload.stage_id || payload.d_stageid || payload['deal[stageid]'];
                const acPipelineId = payload.pipeline || payload.pipeline_id || payload['deal[pipelineid]'];

                let targetStageId: string | null = null;

                const map = stageMappings?.find(m =>
                    m.integration_id === event.integration_id &&
                    m.external_stage_id === acStageId &&
                    m.pipeline_id === acPipelineId
                );

                if (map) {
                    targetStageId = map.internal_stage_id;
                } else if (importMode === 'new_lead' && payload.default_stage_id) {
                    targetStageId = payload.default_stage_id;
                }

                const isMoveEvent = event.event_type === 'deal_add' || event.event_type === 'deal_update' || event.event_type === 'deal_state';

                if (isMoveEvent && !targetStageId) {
                    throw new Error(`Unmapped Stage: AC Stage ${acStageId} (Pipeline ${acPipelineId})`);
                }

                // 3.2 Resolve Topology
                let topology: { pipelineId: string; pipelineName: string; produto: string; stageName: string } | null = null;
                if (targetStageId) {
                    topology = resolveTopology(targetStageId);
                    if (!topology) {
                        throw new Error(`Topology Error: Could not resolve Pipeline/Product for Stage ${targetStageId}`);
                    }
                }

                // 3.3 Resolve Owner
                // Support both flat format (owner) and bracket format (deal[owner])
                const acOwnerId = payload.owner || payload.owner_id || payload['deal[owner]'];
                let targetOwnerId: string | null = null;
                if (acOwnerId) {
                    const uMap = userMappings?.find(m => m.external_user_id === acOwnerId && m.integration_id === event.integration_id);
                    if (uMap) targetOwnerId = uMap.internal_user_id;
                }

                // 3.4 Parse Custom Fields & Map Data
                const acFields = parseCustomFields(payload);
                const marketingData: Record<string, any> = {
                    active_campaign_id: payload.id || payload['deal[id]'],
                    source: 'active_campaign',
                    raw_fields: acFields,
                    unmapped_fields: {}
                };

                // Dynamic Field Mapping
                Object.entries(acFields).forEach(([fieldId, value]) => {
                    const fieldMap = fieldMappings?.find(m => m.external_field_id === fieldId && m.integration_id === event.integration_id);

                    if (fieldMap) {
                        marketingData[fieldMap.local_field_key] = value;
                    } else {
                        marketingData.unmapped_fields[fieldId] = value;
                    }
                });

                // Special Case: Epoca Viagem (109 = Start, 101 = End)
                const dateStart = acFields['109'];
                const dateEnd = acFields['101'];

                if (dateStart || dateEnd) {
                    marketingData.epoca_viagem = {
                        from: dateStart || null,
                        to: dateEnd || null
                    };
                }

                // 3.5 Prepare DB Payload
                const dealId = payload.id || payload['deal[id]'] || payload.deal_id;
                const title = payload.title || payload['deal[title]'] || 'Sem Título';
                const value = parseFloat(payload.value || payload['deal[value]'] || '0');
                const status = mapStatus(payload.status || payload['deal[status]']);

                const contactEmail = payload.contact_email || payload['deal[contact_email]'] || payload.email;
                // Build contact name from first_name + last_name - keep separate
                const acFirstName = payload['contact[first_name]'] || payload.contact_first_name || '';
                const acLastName = payload['contact[last_name]'] || payload.contact_last_name || '';
                const contactNome = acFirstName.trim() || payload.contact_name || payload['deal[contact_name]'] || 'Sem Nome';
                const contactSobrenome = acLastName.trim() || null;
                const contactPhone = payload.contact_phone || payload['deal[contact_phone]'] || payload.phone;
                const acContactId = payload['deal[contactid]'] || payload.contactid || payload.contact_id;

                if (!isShadowMode) {
                    // UPSERT CONTACT
                    let contactId: string | null = null;
                    if (contactEmail) {
                        const { data: existingContact } = await supabase
                            .from('contatos')
                            .select('id')
                            .eq('email', contactEmail)
                            .single();

                        if (existingContact) {
                            contactId = existingContact.id;
                            // Update external_id if missing (linking existing contact to AC)
                            if (acContactId) {
                                await supabase
                                    .from('contatos')
                                    .update({
                                        external_id: String(acContactId),
                                        external_source: 'active_campaign'
                                    })
                                    .eq('id', contactId)
                                    .is('external_id', null);
                            }
                        } else {
                            const { data: newContact, error: cErr } = await supabase
                                .from('contatos')
                                .insert({
                                    nome: contactNome,
                                    sobrenome: contactSobrenome,
                                    email: contactEmail,
                                    telefone: contactPhone,
                                    external_id: acContactId ? String(acContactId) : null,
                                    external_source: acContactId ? 'active_campaign' : null,
                                    tags: ['active_campaign'],
                                    tipo_pessoa: 'adulto'
                                })
                                .select('id')
                                .single();
                            if (cErr) throw new Error(`Contact Create Error: ${cErr.message}`);
                            contactId = newContact.id;
                        }
                    }

                    // UPSERT CARD
                    const { data: existingCard } = await supabase
                        .from('cards')
                        .select('id')
                        .eq('external_id', dealId)
                        .eq('external_source', 'active_campaign')
                        .single();

                    const cardPayload: Record<string, any> = {
                        titulo: title,
                        valor_estimado: value,
                        status_comercial: status,
                        marketing_data: marketingData,
                        updated_at: new Date().toISOString()
                    };

                    if (targetStageId && topology) {
                        cardPayload.pipeline_stage_id = targetStageId;
                        cardPayload.pipeline_id = topology.pipelineId;
                        cardPayload.produto = topology.produto;
                    }

                    if (targetOwnerId) {
                        cardPayload.dono_atual_id = targetOwnerId;
                    }

                    if (existingCard) {
                        const { error: uErr } = await supabase
                            .from('cards')
                            .update(cardPayload)
                            .eq('id', existingCard.id);

                        if (uErr) throw new Error(`Card Update Error: ${uErr.message}`);
                        log = `Updated Card ${existingCard.id} (Pipeline: ${topology?.pipelineName})`;

                    } else {
                        if (!topology) throw new Error("Cannot create card: Missing Topology (Stage/Pipeline/Product)");

                        cardPayload.external_id = dealId;
                        cardPayload.external_source = 'active_campaign';
                        cardPayload.origem = 'active_campaign';
                        cardPayload.pessoa_principal_id = contactId;
                        cardPayload.created_at = new Date().toISOString();

                        const { error: iErr } = await supabase
                            .from('cards')
                            .insert(cardPayload);

                        if (iErr) throw new Error(`Card Create Error: ${iErr.message}`);
                        log = `Created Card (Pipeline: ${topology.pipelineName})`;
                    }

                    await updateEventStatus(event.id, 'processed', log);
                    stats.updated++;
                    results.push({ id: event.id, status: 'processed', log });

                } else {
                    log = `[SHADOW] Would ${targetStageId ? 'Upsert Card' : 'Process Event'} - Pipeline: ${topology?.pipelineName || 'N/A'}`;
                    await updateEventStatus(event.id, 'processed_shadow', log);
                    stats.processed_shadow++;
                    results.push({ id: event.id, status: 'processed_shadow', log });
                }

            } catch (err: any) {
                console.error(`Event ${event.id} failed:`, err);
                await updateEventStatus(event.id, 'failed', err.message);
                stats.errors++;
                results.push({ id: event.id, status: 'failed', error: err.message });
            }
        }

        return new Response(JSON.stringify({
            message: `Processed ${stats.updated + stats.processed_shadow} events`,
            stats,
            results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
