import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const AC_INTEGRATION_ID = 'a2141b92-561f-4514-92b4-9412a068d236';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const databaseUrl = Deno.env.get('SUPABASE_DB_URL');
    const sql = databaseUrl ? postgres(databaseUrl, { ssl: 'require' }) : null;

    const results: Record<string, unknown> = {};

    try {
        // 1. Clear pending queue
        console.log('[setup-outbound-rules] Clearing pending queue...');
        const { data: deletedQueue, error: deleteError } = await supabase
            .from('integration_outbound_queue')
            .delete()
            .eq('status', 'pending')
            .select('id');

        if (deleteError) {
            results.clear_queue = { error: deleteError.message };
        } else {
            results.clear_queue = { deleted: deletedQueue?.length || 0 };
        }
        console.log(`[setup-outbound-rules] Deleted ${deletedQueue?.length || 0} pending events`);

        // 2. Create default blocking rule
        console.log('[setup-outbound-rules] Creating default blocking rule...');

        // First check if rule already exists
        const { data: existingRule } = await supabase
            .from('integration_outbound_triggers')
            .select('id')
            .eq('integration_id', AC_INTEGRATION_ID)
            .eq('name', 'Bloqueio Padrão - Aguardando Configuração')
            .single();

        if (existingRule) {
            results.create_rule = { message: 'Rule already exists', id: existingRule.id };
        } else {
            const { data: newRule, error: ruleError } = await supabase
                .from('integration_outbound_triggers')
                .insert({
                    integration_id: AC_INTEGRATION_ID,
                    name: 'Bloqueio Padrão - Aguardando Configuração',
                    description: 'Bloqueia todos os eventos de outbound até que regras específicas sejam configuradas',
                    source_pipeline_ids: null,  // Qualquer pipeline
                    source_stage_ids: null,      // Qualquer estágio
                    source_owner_ids: null,      // Qualquer responsável
                    source_status: null,         // Qualquer status
                    event_types: ['stage_change', 'field_update', 'won', 'lost'],
                    sync_field_mode: 'all',
                    sync_fields: null,
                    action_mode: 'block',        // BLOQUEAR
                    is_active: true,
                    priority: 999                // Baixa prioridade (regras específicas têm prioridade)
                })
                .select()
                .single();

            if (ruleError) {
                results.create_rule = { error: ruleError.message };
            } else {
                results.create_rule = { created: true, id: newRule?.id };
            }
        }

        // 3. Update the trigger function to check rules
        if (sql) {
            console.log('[setup-outbound-rules] Updating trigger function...');

            await sql`
                CREATE OR REPLACE FUNCTION log_outbound_card_event()
                RETURNS TRIGGER AS $$
                DECLARE
                    v_integration_id UUID;
                    v_external_id TEXT;
                    v_event_type TEXT;
                    v_payload JSONB := '{}';
                    v_stage_mapping RECORD;
                    v_outbound_enabled BOOLEAN := FALSE;
                    v_shadow_mode BOOLEAN := TRUE;
                    v_allowed_events TEXT;
                    v_rule_result RECORD;
                    v_card_status TEXT;
                BEGIN
                    -- Verificar se é uma atualização originada da integração (evita loop infinito)
                    IF current_setting('app.update_source', TRUE) = 'integration' THEN
                        RETURN NEW;
                    END IF;

                    -- Só processar cards que têm external_id (foram sincronizados de fora)
                    IF NEW.external_id IS NULL THEN
                        RETURN NEW;
                    END IF;

                    -- Buscar integração pelo external_source do card
                    SELECT id INTO v_integration_id
                    FROM public.integrations
                    WHERE provider = NEW.external_source OR name = NEW.external_source
                    LIMIT 1;

                    IF v_integration_id IS NULL THEN
                        RETURN NEW;
                    END IF;

                    v_external_id := NEW.external_id;

                    -- Buscar configurações globais de outbound
                    SELECT COALESCE(value, 'false')::boolean INTO v_outbound_enabled
                    FROM public.integration_settings WHERE key = 'OUTBOUND_SYNC_ENABLED';

                    SELECT COALESCE(value, 'true')::boolean INTO v_shadow_mode
                    FROM public.integration_settings WHERE key = 'OUTBOUND_SHADOW_MODE';

                    SELECT COALESCE(value, 'stage_change,won,lost,field_update') INTO v_allowed_events
                    FROM public.integration_settings WHERE key = 'OUTBOUND_ALLOWED_EVENTS';

                    -- Se outbound desabilitado, não fazer nada
                    IF NOT v_outbound_enabled THEN
                        RETURN NEW;
                    END IF;

                    -- Determinar status do card para verificação de regras
                    v_card_status := COALESCE(NEW.status_comercial, 'ativo');

                    -- 1. Detectar mudança de estágio
                    IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
                        IF v_allowed_events LIKE '%stage_change%' THEN
                            v_event_type := 'stage_change';

                            -- VERIFICAR REGRAS DE OUTBOUND
                            SELECT * INTO v_rule_result
                            FROM check_outbound_trigger(
                                v_integration_id,
                                NEW.pipeline_id,
                                NEW.pipeline_stage_id,
                                NEW.responsavel_id,
                                v_card_status,
                                v_event_type,
                                NULL
                            );

                            -- Se não permitido, não enfileirar
                            IF NOT COALESCE(v_rule_result.allowed, true) THEN
                                RETURN NEW;
                            END IF;

                            -- Buscar mapeamento de estágio
                            SELECT * INTO v_stage_mapping
                            FROM public.integration_outbound_stage_map
                            WHERE integration_id = v_integration_id
                              AND internal_stage_id = NEW.pipeline_stage_id
                              AND is_active = true
                            LIMIT 1;

                            IF v_stage_mapping IS NOT NULL THEN
                                v_payload := jsonb_build_object(
                                    'old_stage_id', OLD.pipeline_stage_id,
                                    'new_stage_id', NEW.pipeline_stage_id,
                                    'target_external_stage_id', v_stage_mapping.external_stage_id,
                                    'target_external_stage_name', v_stage_mapping.external_stage_name,
                                    'shadow_mode', v_shadow_mode,
                                    'matched_rule', v_rule_result.rule_name
                                );

                                INSERT INTO public.integration_outbound_queue (
                                    card_id, integration_id, external_id, event_type, payload,
                                    status, triggered_by
                                ) VALUES (
                                    NEW.id, v_integration_id, v_external_id, v_event_type, v_payload,
                                    CASE WHEN v_shadow_mode THEN 'shadow' ELSE 'pending' END,
                                    'system'
                                );
                            END IF;
                        END IF;
                    END IF;

                    -- 2. Detectar status_comercial = ganho
                    IF OLD.status_comercial IS DISTINCT FROM NEW.status_comercial AND NEW.status_comercial = 'ganho' THEN
                        IF v_allowed_events LIKE '%won%' THEN
                            v_event_type := 'won';

                            -- VERIFICAR REGRAS DE OUTBOUND
                            SELECT * INTO v_rule_result
                            FROM check_outbound_trigger(
                                v_integration_id,
                                NEW.pipeline_id,
                                NEW.pipeline_stage_id,
                                NEW.responsavel_id,
                                v_card_status,
                                v_event_type,
                                NULL
                            );

                            IF NOT COALESCE(v_rule_result.allowed, true) THEN
                                RETURN NEW;
                            END IF;

                            v_payload := jsonb_build_object(
                                'status', 'won',
                                'valor_final', NEW.valor_final,
                                'shadow_mode', v_shadow_mode,
                                'matched_rule', v_rule_result.rule_name
                            );

                            INSERT INTO public.integration_outbound_queue (
                                card_id, integration_id, external_id, event_type, payload,
                                status, triggered_by
                            ) VALUES (
                                NEW.id, v_integration_id, v_external_id, v_event_type, v_payload,
                                CASE WHEN v_shadow_mode THEN 'shadow' ELSE 'pending' END,
                                'system'
                            );
                        END IF;
                    END IF;

                    -- 3. Detectar status_comercial = perdido
                    IF OLD.status_comercial IS DISTINCT FROM NEW.status_comercial AND NEW.status_comercial = 'perdido' THEN
                        IF v_allowed_events LIKE '%lost%' THEN
                            v_event_type := 'lost';

                            -- VERIFICAR REGRAS DE OUTBOUND
                            SELECT * INTO v_rule_result
                            FROM check_outbound_trigger(
                                v_integration_id,
                                NEW.pipeline_id,
                                NEW.pipeline_stage_id,
                                NEW.responsavel_id,
                                v_card_status,
                                v_event_type,
                                NULL
                            );

                            IF NOT COALESCE(v_rule_result.allowed, true) THEN
                                RETURN NEW;
                            END IF;

                            v_payload := jsonb_build_object(
                                'status', 'lost',
                                'motivo_perda', NEW.motivo_perda_id,
                                'shadow_mode', v_shadow_mode,
                                'matched_rule', v_rule_result.rule_name
                            );

                            INSERT INTO public.integration_outbound_queue (
                                card_id, integration_id, external_id, event_type, payload,
                                status, triggered_by
                            ) VALUES (
                                NEW.id, v_integration_id, v_external_id, v_event_type, v_payload,
                                CASE WHEN v_shadow_mode THEN 'shadow' ELSE 'pending' END,
                                'system'
                            );
                        END IF;
                    END IF;

                    -- 4. Detectar mudanças em campos mapeados (simplificado)
                    IF v_allowed_events LIKE '%field_update%' THEN
                        -- valor_estimado
                        IF OLD.valor_estimado IS DISTINCT FROM NEW.valor_estimado THEN
                            SELECT * INTO v_rule_result
                            FROM check_outbound_trigger(
                                v_integration_id, NEW.pipeline_id, NEW.pipeline_stage_id,
                                NEW.responsavel_id, v_card_status, 'field_update', 'valor_estimado'
                            );

                            IF COALESCE(v_rule_result.allowed, true) THEN
                                v_payload := jsonb_build_object(
                                    'valor_estimado', NEW.valor_estimado,
                                    'shadow_mode', v_shadow_mode,
                                    'matched_rule', v_rule_result.rule_name
                                );
                                INSERT INTO public.integration_outbound_queue (
                                    card_id, integration_id, external_id, event_type, payload, status, triggered_by
                                ) VALUES (
                                    NEW.id, v_integration_id, v_external_id, 'field_update', v_payload,
                                    CASE WHEN v_shadow_mode THEN 'shadow' ELSE 'pending' END, 'system'
                                );
                            END IF;
                        END IF;

                        -- valor_final
                        IF OLD.valor_final IS DISTINCT FROM NEW.valor_final THEN
                            SELECT * INTO v_rule_result
                            FROM check_outbound_trigger(
                                v_integration_id, NEW.pipeline_id, NEW.pipeline_stage_id,
                                NEW.responsavel_id, v_card_status, 'field_update', 'valor_final'
                            );

                            IF COALESCE(v_rule_result.allowed, true) THEN
                                v_payload := jsonb_build_object(
                                    'valor_final', NEW.valor_final,
                                    'shadow_mode', v_shadow_mode,
                                    'matched_rule', v_rule_result.rule_name
                                );
                                INSERT INTO public.integration_outbound_queue (
                                    card_id, integration_id, external_id, event_type, payload, status, triggered_by
                                ) VALUES (
                                    NEW.id, v_integration_id, v_external_id, 'field_update', v_payload,
                                    CASE WHEN v_shadow_mode THEN 'shadow' ELSE 'pending' END, 'system'
                                );
                            END IF;
                        END IF;
                    END IF;

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER
                SET search_path = public
            `;

            results.update_trigger = { success: true };
            console.log('[setup-outbound-rules] Trigger function updated');

            await sql.end();
        } else {
            results.update_trigger = { skipped: 'No database URL' };
        }

        // 4. Verify setup
        const { data: rules } = await supabase
            .from('integration_outbound_triggers')
            .select('id, name, action_mode, is_active, priority')
            .eq('integration_id', AC_INTEGRATION_ID)
            .order('priority', { ascending: true });

        const { count: queueCount } = await supabase
            .from('integration_outbound_queue')
            .select('*', { count: 'exact', head: true });

        results.verification = {
            rules_count: rules?.length || 0,
            rules: rules,
            queue_count: queueCount || 0
        };

        return new Response(JSON.stringify({
            success: true,
            results
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: unknown) {
        if (sql) await sql.end();
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[setup-outbound-rules] Error:', errorMessage);
        return new Response(JSON.stringify({
            success: false,
            error: errorMessage,
            results
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
