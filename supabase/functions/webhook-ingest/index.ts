import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-integration-id",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const url = new URL(req.url);
        const integrationId = url.searchParams.get("id");

        if (!integrationId) {
            return new Response(JSON.stringify({ error: "Missing integration_id" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Fetch Integration Config
        const { data: integration, error: fetchError } = await supabaseClient
            .from("integrations")
            .select("*")
            .eq("id", integrationId)
            .single();

        if (fetchError || !integration) {
            return new Response(JSON.stringify({ error: "Integration not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!integration.is_active) {
            return new Response(JSON.stringify({ error: "Integration is inactive" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload = await req.json();
        const headers = Object.fromEntries(req.headers.entries());

        // 2. Validate HMAC (if configured)
        // TODO: Implement HMAC validation based on integration.config.secret_key and provider

        // 3. Idempotency Check
        const idempotencyKey = headers["idempotency-key"] || headers["x-idempotency-key"] || payload.id || payload.event_id;

        if (idempotencyKey) {
            const { data: existingEvent } = await supabaseClient
                .from("integration_events")
                .select("id")
                .eq("integration_id", integrationId)
                .eq("idempotency_key", String(idempotencyKey))
                .single();

            if (existingEvent) {
                console.log(`Duplicate event ignored: ${idempotencyKey}`);
                return new Response(JSON.stringify({ message: "Ignored duplicate" }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // 4. Enqueue Event
        const { error: insertError } = await supabaseClient
            .from("integration_events")
            .insert({
                integration_id: integrationId,
                payload: payload,
                status: "pending",
                idempotency_key: idempotencyKey ? String(idempotencyKey) : null,
                logs: [{ step: "ingest", timestamp: new Date().toISOString(), message: "Webhook received" }]
            });

        if (insertError) {
            console.error("Failed to insert event:", insertError);
            return new Response(JSON.stringify({ error: "Internal Server Error" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ message: "Accepted" }), {
            status: 202,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
