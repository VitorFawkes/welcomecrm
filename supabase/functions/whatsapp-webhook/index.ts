import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-platform-id",
};

/**
 * WhatsApp Webhook Ingest
 * 
 * Receives webhooks from ChatPro and Echo, stores raw payload for processing.
 * 
 * Usage:
 * POST /functions/v1/whatsapp-webhook?provider=chatpro
 * POST /functions/v1/whatsapp-webhook?provider=echo
 */
Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const url = new URL(req.url);
        const provider = url.searchParams.get("provider");

        // Validate provider
        if (!provider || !["chatpro", "echo"].includes(provider)) {
            return new Response(
                JSON.stringify({ error: "Invalid or missing provider. Use ?provider=chatpro or ?provider=echo" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // 1. Fetch Platform Config
        const { data: platform, error: platformError } = await supabaseClient
            .from("whatsapp_platforms")
            .select("id, is_active")
            .eq("provider", provider)
            .single();

        if (platformError || !platform) {
            console.error("Platform not found:", provider, platformError);
            return new Response(
                JSON.stringify({ error: `Platform '${provider}' not configured` }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (!platform.is_active) {
            return new Response(
                JSON.stringify({ error: `Platform '${provider}' is inactive` }),
                {
                    status: 403,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // 2. Parse payload
        const payload = await req.json();

        // Handle array payloads (some platforms send batches)
        const payloads = Array.isArray(payload) ? payload : [payload];
        const insertedIds: string[] = [];
        const errors: string[] = [];

        for (const singlePayload of payloads) {
            // 3. Extract event type and idempotency key based on provider
            let eventType: string | null = null;
            let idempotencyKey: string | null = null;
            let origem: string | null = null;

            if (provider === "chatpro") {
                eventType = singlePayload.event || singlePayload.message_type || null;
                idempotencyKey = singlePayload.message_id || null;
                origem = singlePayload.origem || null;
            } else if (provider === "echo") {
                // Echo wraps data in 'data' object
                const data = singlePayload.data || singlePayload;
                eventType = data.event || singlePayload.event || null;
                idempotencyKey = data.whatsapp_message_id || data.message_id || null;
                origem = null; // Echo doesn't have origem
            }

            // 4. Idempotency Check
            if (idempotencyKey) {
                const { data: existingEvent } = await supabaseClient
                    .from("whatsapp_raw_events")
                    .select("id")
                    .eq("platform_id", platform.id)
                    .eq("idempotency_key", String(idempotencyKey))
                    .single();

                if (existingEvent) {
                    console.log(`Duplicate event ignored: ${idempotencyKey}`);
                    continue; // Skip duplicate
                }
            }

            // 5. Insert raw event
            const { data: insertedEvent, error: insertError } = await supabaseClient
                .from("whatsapp_raw_events")
                .insert({
                    platform_id: platform.id,
                    event_type: eventType,
                    origem: origem,
                    idempotency_key: idempotencyKey,
                    raw_payload: singlePayload,
                    status: "pending",
                })
                .select("id")
                .single();

            if (insertError) {
                console.error("Failed to insert event:", insertError);
                errors.push(insertError.message);
            } else if (insertedEvent) {
                insertedIds.push(insertedEvent.id);
            }
        }

        // 6. Update platform last_event_at
        await supabaseClient
            .from("whatsapp_platforms")
            .update({ last_event_at: new Date().toISOString() })
            .eq("id", platform.id);

        // 7. Return response
        if (errors.length > 0 && insertedIds.length === 0) {
            return new Response(
                JSON.stringify({ error: "Failed to process all events", details: errors }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                message: "Accepted",
                events_received: payloads.length,
                events_inserted: insertedIds.length,
                events_duplicated: payloads.length - insertedIds.length - errors.length,
                event_ids: insertedIds,
            }),
            {
                status: 202,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal Server Error", details: String(error) }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
