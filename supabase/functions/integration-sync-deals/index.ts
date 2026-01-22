import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Fetch deals from ActiveCampaign API with pagination.
 * Filters by pipeline (6 = Wedding, 8 = Trips).
 */
async function fetchDeals(
    baseUrl: string,
    apiKey: string,
    pipelineId: string,
    limit: number = 100
): Promise<any[]> {
    const allDeals: any[] = [];
    let offset = 0;

    while (true) {
        const url = `${baseUrl}/api/3/deals?filters[pipeline]=${pipelineId}&limit=${limit}&offset=${offset}&orders[cdate]=DESC`;
        const res = await fetch(url, {
            headers: { 'Api-Token': apiKey }
        });

        if (!res.ok) {
            throw new Error(`AC API error: ${res.status} - ${await res.text()}`);
        }

        const data = await res.json();
        const deals = data.deals || [];
        allDeals.push(...deals);

        console.log(`Fetched ${deals.length} deals from pipeline ${pipelineId}, offset ${offset}`);

        if (deals.length < limit) break;
        offset += limit;

        // Safety limit - only fetch up to 500 to prevent timeout
        if (offset > 400) {
            console.log('Reached safety limit of 500 deals');
            break;
        }
    }
    return allDeals;
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

        // Parse body for options
        let body: { pipeline_id?: string; limit?: number } = {};
        try {
            body = await req.json();
        } catch (_e) {
            // Body might be empty
        }

        // Default to pipeline 8 (Trips) if not specified
        const pipelineId = body.pipeline_id || '8';
        const fetchLimit = body.limit || 100;

        // Get AC credentials
        const { data: settings } = await supabase
            .from('integration_settings')
            .select('key, value')
            .in('key', ['ACTIVECAMPAIGN_API_URL', 'ACTIVECAMPAIGN_API_KEY']);

        const AC_API_URL = settings?.find((s: { key: string; value: string }) => s.key === 'ACTIVECAMPAIGN_API_URL')?.value;
        const AC_API_KEY = settings?.find((s: { key: string; value: string }) => s.key === 'ACTIVECAMPAIGN_API_KEY')?.value;

        if (!AC_API_URL || !AC_API_KEY) {
            throw new Error('AC credentials not found in integration_settings');
        }

        // Get integration ID - use maybeSingle to avoid throwing
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('id')
            .eq('provider', 'active_campaign')
            .limit(1)
            .maybeSingle();

        if (integrationError) {
            throw new Error(`Failed to fetch integration: ${integrationError.message}`);
        }

        if (!integration?.id) {
            throw new Error('No AC integration found in database');
        }

        // Fetch deals from AC (limited for performance)
        const deals = await fetchDeals(AC_API_URL, AC_API_KEY, pipelineId, fetchLimit);

        if (deals.length === 0) {
            return new Response(JSON.stringify({
                pipeline_id: pipelineId,
                deals_fetched: 0,
                already_synced: 0,
                new_events_created: 0,
                error: null
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Process in batches of 50 to avoid large IN() query issues
        const BATCH_SIZE = 50;
        let totalInserted = 0;
        let totalSkipped = 0;
        let lastError = null;

        for (let i = 0; i < deals.length; i += BATCH_SIZE) {
            const batchDeals = deals.slice(i, i + BATCH_SIZE);

            // Build idempotency keys for this batch
            const batchKeys = batchDeals.map(d => `sync_${d.id}_${pipelineId}`);

            // Check for existing events in this batch
            const { data: existingEvents } = await supabase
                .from('integration_events')
                .select('idempotency_key')
                .in('idempotency_key', batchKeys);

            const existingKeySet = new Set(existingEvents?.map(e => e.idempotency_key) || []);
            totalSkipped += existingKeySet.size;

            // Filter out already synced deals
            const newDeals = batchDeals.filter(d => !existingKeySet.has(`sync_${d.id}_${pipelineId}`));

            if (newDeals.length === 0) continue;

            // Build events for insertion
            const events = newDeals.map(deal => ({
                integration_id: integration.id,
                status: 'pending',
                entity_type: 'deal',
                event_type: 'deal_add',
                external_id: String(deal.id),
                payload: {
                    id: deal.id,
                    pipeline: pipelineId,
                    pipeline_id: pipelineId,
                    stage: deal.stage,
                    stage_id: deal.stage,
                    owner: deal.owner,
                    owner_id: deal.owner,
                    title: deal.title,
                    value: deal.value,
                    status: deal.status,
                    'deal[id]': deal.id,
                    'deal[title]': deal.title,
                    'deal[value]': deal.value,
                    'deal[status]': deal.status,
                    'deal[stageid]': deal.stage,
                    'deal[pipelineid]': pipelineId,
                    'deal[owner]': deal.owner,
                    contact_email: deal.contact?.email,
                    contact_name: deal.contact?.firstName ? `${deal.contact.firstName} ${deal.contact.lastName || ''}`.trim() : undefined,
                    contact_phone: deal.contact?.phone,
                    import_mode: 'sync',
                    synced_at: new Date().toISOString()
                },
                processing_log: `Synced from AC API (Pipeline ${pipelineId})`,
                idempotency_key: `sync_${deal.id}_${pipelineId}`
            }));

            // Insert batch
            const { error } = await supabase
                .from('integration_events')
                .insert(events);

            if (error) {
                console.error(`Batch ${Math.floor(i / BATCH_SIZE)} insert error:`, error.message);
                lastError = error.message;
            } else {
                totalInserted += events.length;
            }

            console.log(`Batch ${Math.floor(i / BATCH_SIZE)}: ${newDeals.length} new, ${existingKeySet.size} skipped`);
        }

        return new Response(JSON.stringify({
            pipeline_id: pipelineId,
            deals_fetched: deals.length,
            already_synced: totalSkipped,
            new_events_created: totalInserted,
            error: lastError
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: lastError && totalInserted === 0 ? 400 : 200,
        });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Sync deals error:', msg);
        return new Response(JSON.stringify({ error: msg }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
