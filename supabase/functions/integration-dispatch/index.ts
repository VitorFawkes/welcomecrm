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
            const integration = event.integrations as { config?: { api_key?: string; api_url?: string } };
            const acApiKey = integration?.config?.api_key;
            const acApiUrl = integration?.config?.api_url;

            if (!acApiKey || !acApiUrl) {
                throw new Error('ActiveCampaign API not configured in integration settings');
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
                    // ActiveCampaign custom fields need special formatting
                    const fieldValues = Object.entries(event.payload || {}).map(([fieldId, value]) => ({
                        customFieldId: fieldId,
                        fieldValue: String(value)
                    }));
                    body = {
                        deal: {
                            fields: fieldValues
                        }
                    };
                    console.log(`[integration-dispatch] Field update: Deal ${event.external_id}, ${fieldValues.length} fields`);
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
