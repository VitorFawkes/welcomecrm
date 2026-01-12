import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { contact_id, instance_id, text, attachments } = await req.json();

        if (!contact_id || !text) {
            return new Response(JSON.stringify({ error: "Missing contact_id or text" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // 1. Resolve Instance
        let instance;
        if (instance_id) {
            const { data } = await supabase
                .from("whatsapp_instances")
                .select("*")
                .eq("id", instance_id)
                .single();
            instance = data;
        } else {
            // Try to find last conversation instance
            const { data: conv } = await supabase
                .from("whatsapp_conversations")
                .select("instance_id")
                .eq("contact_id", contact_id)
                .order("last_message_at", { ascending: false })
                .limit(1)
                .single();

            if (conv?.instance_id) {
                const { data } = await supabase
                    .from("whatsapp_instances")
                    .select("*")
                    .eq("id", conv.instance_id)
                    .single();
                instance = data;
            } else {
                // Fallback to primary
                const { data } = await supabase
                    .from("whatsapp_instances")
                    .select("*")
                    .eq("is_primary", true)
                    .single();
                instance = data;
            }
        }

        if (!instance) {
            // Legacy Fallback (Env Vars)
            // If no instance found in DB, check if we can use legacy env vars
            const legacyUrl = Deno.env.get("CHATPRO_API_URL");
            if (legacyUrl) {
                instance = {
                    provider: 'chatpro',
                    api_url: legacyUrl,
                    api_key: Deno.env.get("CHATPRO_API_TOKEN"),
                    external_id: 'legacy-env'
                };
            } else {
                throw new Error("No WhatsApp instance available");
            }
        }

        // 2. Resolve Contact Phone
        const { data: contact } = await supabase
            .from("contatos")
            .select("telefone")
            .eq("id", contact_id)
            .single();

        if (!contact?.telefone) throw new Error("Contact has no phone number");

        const { data: normalizedPhone } = await supabase.rpc('normalize_phone', { phone_number: contact.telefone });

        // 3. Send Message via Provider
        let providerResponse;
        let providerMessageId;

        if (instance.provider === 'chatpro') {
            providerResponse = await sendChatPro(instance, normalizedPhone, text, attachments);
            providerMessageId = providerResponse.id; // Adjust based on actual response
        } else if (instance.provider === 'echo') {
            providerResponse = await sendEcho(instance, normalizedPhone, text, attachments);
            providerMessageId = providerResponse.id;
        } else {
            throw new Error(`Unsupported provider: ${instance.provider}`);
        }

        // 4. Log to Database
        // Find/Create Conversation first
        let conversationId = null;
        if (instance.id) { // Only if real DB instance
            const { data: conv } = await supabase
                .from("whatsapp_conversations")
                .select("id")
                .eq("contact_id", contact_id)
                .eq("instance_id", instance.id)
                .maybeSingle();

            if (conv) {
                conversationId = conv.id;
                await supabase.from("whatsapp_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
            } else {
                const { data: newConv } = await supabase.from("whatsapp_conversations").insert({
                    contact_id, instance_id: instance.id, last_message_at: new Date().toISOString()
                }).select("id").single();
                conversationId = newConv.id;
            }
        }

        const { error: logError } = await supabase
            .from("whatsapp_messages")
            .insert({
                contact_id,
                instance_id: instance.id || null, // Null if legacy env var
                conversation_id: conversationId,
                direction: 'outbound',
                type: 'text', // TODO: Handle attachments type
                body: text,
                status: 'sent',
                external_id: providerMessageId || `sent-${Date.now()}`, // Fallback ID
                metadata: providerResponse,
                created_at: new Date().toISOString()
            });

        if (logError) console.error("Failed to log outbound message:", logError);

        return new Response(JSON.stringify({ success: true, provider_response: providerResponse }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error sending message:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

// --- Provider Implementations ---

async function sendChatPro(instance: any, phone: string, text: string, attachments: any) {
    // ChatPro API: POST /api/v1/send_message
    // Headers: Authorization: token
    // Body: { number: "...", message: "..." }

    const url = `${instance.api_url}/api/v1/send_message`;
    const body = {
        number: phone,
        message: text
        // TODO: Attachments
    };

    console.log(`Sending ChatPro message to ${url}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': instance.api_key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ChatPro API Error: ${response.status} - ${errText}`);
    }

    return await response.json();
}

async function sendEcho(instance: any, phone: string, text: string, attachments: any) {
    // ECHO API (Assumed generic or n8n webhook)
    // If ECHO is just a webhook receiver, we post to it.
    // If it's a real API, we need docs.
    // User said "ECHO: Que tem apenas uma instância por enquanto".
    // Assuming it has an API URL in settings.

    const url = instance.api_url;
    if (!url) throw new Error("ECHO instance has no API URL");

    const body = {
        number: phone,
        text: text,
        type: 'text'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${instance.api_key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`ECHO API Error: ${response.status}`);
    }

    return await response.json();
}
