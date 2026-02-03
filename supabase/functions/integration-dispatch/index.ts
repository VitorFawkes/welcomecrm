import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface OutboundEvent {
    id: string;
    card_id: string;
    integration_id: string;
    external_id: string;
    event_type: 'stage_change' | 'field_update' | 'won' | 'lost';
    payload: Record<string, unknown>;
    status: string;
    attempts: number;
    integrations?: {
        config?: {
            api_key?: string;
            api_url?: string;
        };
    };
}

Deno.serve(async (req) => {
    // Only allow POST for scheduled invocations
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[integration-dispatch] Starting outbound event processing...');

    // 0. Check if outbound sync is enabled and not in shadow mode
    const { data: settings } = await supabase
        .from('integration_settings')
        .select('key, value')
        .in('key', ['OUTBOUND_SYNC_ENABLED', 'OUTBOUND_SHADOW_MODE']);

    const settingsMap = (settings || []).reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {} as Record<string, string>);

    const syncEnabled = settingsMap['OUTBOUND_SYNC_ENABLED'] === 'true';
    const shadowMode = settingsMap['OUTBOUND_SHADOW_MODE'] === 'true';

    if (!syncEnabled) {
        console.log('[integration-dispatch] Outbound sync is disabled');
        return new Response(JSON.stringify({
            message: 'Outbound sync is disabled',
            processed: 0,
            sync_enabled: false
        }), { status: 200 });
    }

    if (shadowMode) {
        console.log('[integration-dispatch] Shadow mode is active - skipping actual dispatch');
        return new Response(JSON.stringify({
            message: 'Shadow mode active - no events dispatched',
            processed: 0,
            shadow_mode: true
        }), { status: 200 });
    }

    // 1. Fetch pending outbound events
    const { data: events, error: fetchError } = await supabase
        .from('integration_outbound_queue')
        .select(`
            id, card_id, integration_id, external_id, event_type, payload, status, attempts,
            integrations:integrations(config)
        `)
        .eq('status', 'pending')
        .order('created_at')
        .limit(50);

    if (fetchError) {
        console.error('[integration-dispatch] Failed to fetch events:', fetchError);
        return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!events?.length) {
        console.log('[integration-dispatch] No pending events');
        return new Response(JSON.stringify({ message: 'No pending events', processed: 0 }), { status: 200 });
    }

    console.log(`[integration-dispatch] Processing ${events.length} events...`);

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const event of events as unknown as OutboundEvent[]) {
        try {
            // 2. Mark as processing
            await supabase
                .from('integration_outbound_queue')
                .update({ status: 'processing' })
                .eq('id', event.id);

            // 3. Get ActiveCampaign API credentials
            // First try from integration config, then fallback to integration_settings
            const integration = event.integrations as { config?: { api_key?: string; api_url?: string } };
            let acApiKey = integration?.config?.api_key;
            let acApiUrl = integration?.config?.api_url;

            // Fallback to integration_settings if not in config
            if (!acApiKey || !acApiUrl) {
                const { data: acSettings } = await supabase
                    .from('integration_settings')
                    .select('key, value')
                    .in('key', ['ACTIVECAMPAIGN_API_KEY', 'ACTIVECAMPAIGN_API_URL']);

                const acSettingsMap = (acSettings || []).reduce((acc, s) => {
                    acc[s.key] = s.value;
                    return acc;
                }, {} as Record<string, string>);

                acApiKey = acApiKey || acSettingsMap['ACTIVECAMPAIGN_API_KEY'];
                acApiUrl = acApiUrl || acSettingsMap['ACTIVECAMPAIGN_API_URL'];
            }

            if (!acApiKey || !acApiUrl) {
                throw new Error('ActiveCampaign API not configured. Set ACTIVECAMPAIGN_API_KEY and ACTIVECAMPAIGN_API_URL in integration settings.');
            }

            // 4. Build API request based on event type
            let endpoint = '';
            const method = 'PUT';
            let body: Record<string, unknown> = {};

            switch (event.event_type) {
                case 'stage_change': {
                    endpoint = `/api/3/deals/${event.external_id}`;
                    const targetStageId = (event.payload as { target_external_stage_id?: string }).target_external_stage_id;
                    body = {
                        deal: {
                            stage: targetStageId
                        }
                    };
                    console.log(`[integration-dispatch] Stage change: Deal ${event.external_id} -> Stage ${targetStageId}`);
                    break;
                }

                case 'field_update': {
                    endpoint = `/api/3/deals/${event.external_id}`;

                    // Separate standard fields from custom fields
                    // Standard fields use format "deal[fieldname]" (e.g., "deal[value]", "deal[title]")
                    // Custom fields use numeric IDs (e.g., "21", "24")
                    const standardFields: Record<string, unknown> = {};
                    const customFields: Array<{ customFieldId: string; fieldValue: string }> = [];

                    for (const [fieldId, value] of Object.entries(event.payload || {})) {
                        // Skip metadata fields
                        if (fieldId === 'shadow_mode') continue;

                        // Check if it's a standard field (deal[fieldname] format)
                        const standardMatch = fieldId.match(/^deal\[(\w+)\]$/);
                        if (standardMatch) {
                            // Standard field - add directly to deal object
                            const fieldName = standardMatch[1];
                            standardFields[fieldName] = value;
                        } else {
                            // Custom field - add to fields array
                            customFields.push({
                                customFieldId: fieldId,
                                fieldValue: String(value)
                            });
                        }
                    }

                    // Build the deal object
                    const dealObject: Record<string, unknown> = { ...standardFields };
                    if (customFields.length > 0) {
                        dealObject.fields = customFields;
                    }

                    body = { deal: dealObject };
                    console.log(`[integration-dispatch] Field update: Deal ${event.external_id}, ${Object.keys(standardFields).length} standard fields, ${customFields.length} custom fields`);
                    break;
                }

                case 'won': {
                    endpoint = `/api/3/deals/${event.external_id}`;
                    body = {
                        deal: {
                            status: 1 // 1 = Won in ActiveCampaign
                        }
                    };
                    console.log(`[integration-dispatch] Won: Deal ${event.external_id}`);
                    break;
                }

                case 'lost': {
                    endpoint = `/api/3/deals/${event.external_id}`;
                    body = {
                        deal: {
                            status: 2 // 2 = Lost in ActiveCampaign
                        }
                    };
                    console.log(`[integration-dispatch] Lost: Deal ${event.external_id}`);
                    break;
                }

                default:
                    throw new Error(`Unknown event type: ${event.event_type}`);
            }

            // 5. Call ActiveCampaign API
            const apiResponse = await fetch(`${acApiUrl}${endpoint}`, {
                method,
                headers: {
                    'Api-Token': acApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                throw new Error(`ActiveCampaign API Error: ${apiResponse.status} - ${errorText}`);
            }

            // 6. Mark as sent
            await supabase
                .from('integration_outbound_queue')
                .update({
                    status: 'sent',
                    processed_at: new Date().toISOString(),
                    processing_log: `Success: ${apiResponse.status}`
                })
                .eq('id', event.id);

            results.push({ id: event.id, status: 'sent' });
            console.log(`[integration-dispatch] ✓ Event ${event.id} sent successfully`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[integration-dispatch] ✗ Event ${event.id} failed:`, errorMessage);

            // Determine if we should retry
            const maxAttempts = 3;
            const newAttempts = (event.attempts || 0) + 1;
            const newStatus = newAttempts >= maxAttempts ? 'failed' : 'pending';
            const retryDelay = 60000 * newAttempts; // Exponential backoff: 1min, 2min, 3min

            await supabase
                .from('integration_outbound_queue')
                .update({
                    status: newStatus,
                    attempts: newAttempts,
                    next_retry_at: new Date(Date.now() + retryDelay).toISOString(),
                    processing_log: `Error (attempt ${newAttempts}): ${errorMessage}`
                })
                .eq('id', event.id);

            results.push({ id: event.id, status: 'error', error: errorMessage });
        }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    const failCount = results.filter(r => r.status === 'error').length;

    console.log(`[integration-dispatch] Complete: ${successCount} sent, ${failCount} failed`);

    return new Response(JSON.stringify({
        processed: results.length,
        sent: successCount,
        failed: failCount,
        results
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
});
