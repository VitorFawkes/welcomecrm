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

        // 1. Credentials Check & Fallback
        let AC_API_URL = Deno.env.get('ACTIVECAMPAIGN_API_URL');
        let AC_API_KEY = Deno.env.get('ACTIVECAMPAIGN_API_KEY');

        if (!AC_API_URL || !AC_API_KEY) {
            // Fallback: Try to get from integration_settings
            const { data: settings } = await supabase
                .from('integration_settings')
                .select('*')
                .in('key', ['ACTIVECAMPAIGN_API_URL', 'ACTIVECAMPAIGN_API_KEY']);

            if (settings) {
                const urlSetting = settings.find(s => s.key === 'ACTIVECAMPAIGN_API_URL');
                const keySetting = settings.find(s => s.key === 'ACTIVECAMPAIGN_API_KEY');
                if (urlSetting) AC_API_URL = urlSetting.value;
                if (keySetting) AC_API_KEY = keySetting.value;
            }
        }

        if (!AC_API_URL || !AC_API_KEY) {
            throw new Error('Missing ActiveCampaign credentials in environment variables or integration_settings');
        }

        let body = {};
        try { body = await req.json(); } catch { /* empty body */ }
        const { integration_id } = body;

        // 1. Sync ALL Pipelines & Stages (Global)
        // We no longer depend on integration_router_config for this. We want everything in the catalog.

        // Use the first active integration_id found, or just the one passed in body.
        // If no integration_id is passed, we try to find one from the DB.
        let targetIntegrationId = integration_id;

        if (!targetIntegrationId) {
            const { data: anyConfig } = await supabase
                .from('integrations')
                .select('id')
                .eq('provider', 'active_campaign')
                .limit(1)
                .single();
            targetIntegrationId = anyConfig?.id;
        }

        if (!targetIntegrationId) {
            throw new Error('No ActiveCampaign integration found.');
        }

        const stats = {
            pipelines_scanned: 0,
            stages_synced: 0,
            users_synced: 0,
            fields_synced: 0,
            errors: [] as string[]
        };

        try {
            // A. Fetch ALL Pipelines
            const pipelinesRes = await fetch(`${AC_API_URL}/api/3/dealGroups?limit=100`, {
                headers: { 'Api-Token': AC_API_KEY }
            });

            if (!pipelinesRes.ok) {
                throw new Error(`Failed to fetch pipelines: ${pipelinesRes.statusText}`);
            }

            const pipelinesData = await pipelinesRes.json();
            const pipelines = pipelinesData.dealGroups || [];

            for (const pipeline of pipelines) {
                stats.pipelines_scanned++;

                // Upsert Pipeline to Catalog
                await supabase.from('integration_catalog').upsert({
                    integration_id: targetIntegrationId,
                    entity_type: 'pipeline',
                    external_id: pipeline.id,
                    external_name: pipeline.title,
                    parent_external_id: '', // Use empty string instead of null for unique constraint
                    metadata: pipeline
                }, { onConflict: 'integration_id,entity_type,external_id,parent_external_id' });

                // B. Fetch Stages for this Pipeline
                const stagesRes = await fetch(`${AC_API_URL}/api/3/dealStages?filters[group]=${pipeline.id}`, {
                    headers: { 'Api-Token': AC_API_KEY }
                });

                if (stagesRes.ok) {
                    const stagesData = await stagesRes.json();
                    const stages = stagesData.dealStages || [];

                    for (const stage of stages) {
                        await supabase.from('integration_catalog').upsert({
                            integration_id: targetIntegrationId,
                            entity_type: 'stage',
                            external_id: stage.id,
                            external_name: stage.title,
                            parent_external_id: pipeline.id,
                            metadata: stage
                        }, { onConflict: 'integration_id,entity_type,external_id,parent_external_id' });
                        stats.stages_synced++;
                    }
                } else {
                    stats.errors.push(`Failed to fetch stages for pipeline ${pipeline.id}: ${stagesRes.statusText}`);
                }
            }

        } catch (err: any) {
            console.error(`Error syncing pipelines:`, err);
            stats.errors.push(`Pipelines Sync: ${err.message}`);
        }

        // 3. Sync Users (Global)
        try {
            const usersRes = await fetch(`${AC_API_URL}/api/3/users?limit=100`, {
                headers: { 'Api-Token': AC_API_KEY }
            });
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                const users = usersData.users || [];
                for (const user of users) {
                    await supabase.from('integration_catalog').upsert({
                        integration_id: targetIntegrationId,
                        entity_type: 'user',
                        external_id: user.id,
                        external_name: `${user.firstName} ${user.lastName}`.trim(),
                        parent_external_id: '', // Use empty string
                        metadata: user
                    }, { onConflict: 'integration_id,entity_type,external_id,parent_external_id' });
                    stats.users_synced++;
                }
            }
        } catch (err: any) {
            stats.errors.push(`Users Sync: ${err.message}`);
        }

        // 4. Sync Deal Custom Fields (Global)
        try {
            const fieldsRes = await fetch(`${AC_API_URL}/api/3/dealCustomFieldMeta?limit=100`, {
                headers: { 'Api-Token': AC_API_KEY }
            });
            if (fieldsRes.ok) {
                const fieldsData = await fieldsRes.json();
                const fields = fieldsData.dealCustomFieldMeta || [];
                for (const field of fields) {
                    await supabase.from('integration_catalog').upsert({
                        integration_id: targetIntegrationId,
                        entity_type: 'field', // Generic 'field' for deal fields
                        external_id: field.id,
                        external_name: field.fieldLabel,
                        parent_external_id: '', // Use empty string
                        metadata: field
                    }, { onConflict: 'integration_id,entity_type,external_id,parent_external_id' });
                    stats.fields_synced++;
                }
            }
        } catch (err: any) {
            stats.errors.push(`Fields Sync: ${err.message}`);
        }

        return new Response(JSON.stringify(stats), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Unhandled error:', error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Return 400 instead of 500 to see the error in frontend if possible, or just to be cleaner
        })
    }
})
