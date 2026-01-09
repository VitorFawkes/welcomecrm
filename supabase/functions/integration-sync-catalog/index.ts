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

        const AC_API_URL = Deno.env.get('ACTIVECAMPAIGN_API_URL');
        const AC_API_KEY = Deno.env.get('ACTIVECAMPAIGN_API_KEY');

        if (!AC_API_URL || !AC_API_KEY) {
            // Fallback: Try to get from integration_settings if env vars are missing (just in case)
            // But for now, throw error to force proper config
            throw new Error('Missing ActiveCampaign credentials in environment variables (ACTIVECAMPAIGN_API_URL, ACTIVECAMPAIGN_API_KEY)');
        }

        let body = {};
        try { body = await req.json(); } catch { /* empty body */ }
        const { integration_id } = body;

        // 1. Get Active Pipelines from Router Config
        let query = supabase
            .from('integration_router_config')
            .select('*')
            .eq('is_active', true);

        if (integration_id) {
            query = query.eq('integration_id', integration_id);
        }

        const { data: configs, error: configError } = await query;
        if (configError) throw configError;

        const stats = {
            pipelines_scanned: 0,
            stages_synced: 0,
            errors: [] as string[]
        };

        // 2. Sync Catalog for each pipeline
        for (const config of configs) {
            const pipelineId = config.pipeline_id;
            const integrationId = config.integration_id;
            stats.pipelines_scanned++;

            try {
                // A. Sync Pipeline Entity
                const pipelineRes = await fetch(`${AC_API_URL}/api/3/dealGroups/${pipelineId}`, {
                    headers: { 'Api-Token': AC_API_KEY }
                });

                if (pipelineRes.ok) {
                    const pipelineData = await pipelineRes.json();
                    const pipelineName = pipelineData.dealGroup?.title || `Pipeline ${pipelineId}`;

                    await supabase.from('integration_catalog').upsert({
                        integration_id: integrationId,
                        entity_type: 'pipeline',
                        external_id: pipelineId,
                        external_name: pipelineName,
                        parent_external_id: null,
                        metadata: pipelineData.dealGroup
                    }, { onConflict: 'integration_id, entity_type, external_id, parent_external_id' });
                } else {
                    stats.errors.push(`Failed to fetch pipeline ${pipelineId}: ${pipelineRes.statusText}`);
                }

                // B. Sync Stages
                const stagesRes = await fetch(`${AC_API_URL}/api/3/dealStages?filters[group]=${pipelineId}`, {
                    headers: { 'Api-Token': AC_API_KEY }
                });

                if (!stagesRes.ok) {
                    throw new Error(`Failed to fetch stages for pipeline ${pipelineId}: ${stagesRes.statusText}`);
                }

                const stagesData = await stagesRes.json();
                const stages = stagesData.dealStages || [];

                for (const stage of stages) {
                    await supabase.from('integration_catalog').upsert({
                        integration_id: integrationId,
                        entity_type: 'stage',
                        external_id: stage.id,
                        external_name: stage.title,
                        parent_external_id: pipelineId,
                        metadata: stage
                    }, { onConflict: 'integration_id, entity_type, external_id, parent_external_id' });
                    stats.stages_synced++;
                }

            } catch (err: any) {
                console.error(`Error syncing pipeline ${pipelineId}:`, err);
                stats.errors.push(`Pipeline ${pipelineId}: ${err.message}`);
            }
        }

        return new Response(JSON.stringify(stats), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
