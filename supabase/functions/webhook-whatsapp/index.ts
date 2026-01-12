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

        const url = new URL(req.url);
        const providerParam = url.searchParams.get("provider"); // 'chatpro' | 'echo'
        const payload = await req.json();

        console.log("Webhook received:", JSON.stringify(payload));

        // 1. Identify Instance
        let instance = null;
        let provider = providerParam;

        // Try to find instance by external_id in payload
        // ChatPro: instance_id
        // ECHO: instance_id (assumed based on user input)
        const payloadInstanceId = payload.instance_id || payload.body?.instance_id;

        if (payloadInstanceId) {
            const { data: foundInstance } = await supabase
                .from("whatsapp_instances")
                .select("*")
                .eq("external_id", payloadInstanceId)
                .single();

            if (foundInstance) {
                instance = foundInstance;
                provider = foundInstance.provider;
            }
        }

        // Fallback: If no instance found, check if we have a primary instance for the provider
        if (!instance && provider) {
            const { data: primaryInstance } = await supabase
                .from("whatsapp_instances")
                .select("*")
                .eq("provider", provider)
                .eq("is_primary", true)
                .single();

            instance = primaryInstance;
        }

        // Fallback: Legacy ChatPro (if no provider specified and looks like ChatPro)
        if (!instance && !provider) {
            // Heuristic: ChatPro usually has 'message_data' or 'body.message_data'
            if (payload.message_data || payload.body?.message_data) {
                provider = 'chatpro';
                // Try to find legacy instance
                const { data: legacyInstance } = await supabase
                    .from("whatsapp_instances")
                    .select("*")
                    .eq("external_id", "legacy-chatpro")
                    .single();
                instance = legacyInstance;
            }
        }

        if (!instance) {
            console.warn("No matching instance found. Processing as orphan/generic if possible, or logging error.");
            // We can still process if we know the provider, but we won't have an instance_id to link.
            // Ideally we should reject or log.
        }

        console.log(`Processing for Provider: ${provider}, Instance: ${instance?.name || 'Unknown'}`);

        // 2. Route to Handler
        if (provider === 'chatpro') {
            return await handleChatPro(supabase, payload, instance);
        } else if (provider === 'echo') {
            return await handleEcho(supabase, payload, instance);
        } else {
            return new Response(JSON.stringify({ message: "Unknown provider or format" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200, // Return 200 to acknowledge receipt
            });
        }

    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

// --- Handlers ---

async function handleChatPro(supabase: any, payload: any, instance: any) {
    const messageData = payload.body?.message_data || payload.message_data;

    if (!messageData) {
        return new Response(JSON.stringify({ message: "Ignored event type (no message_data)" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    const {
        id: externalId,
        number: rawNumber, // Sender (inbound) or Recipient (outbound)
        message: body,
        from_me: fromMe,
        type: messageType,
        file_type: fileType,
        url: mediaUrl,
        participant
    } = messageData;

    // Idempotency Check
    const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("external_id", externalId)
        .eq("instance_id", instance?.id) // Check within instance scope if possible
        .maybeSingle();

    if (existing) {
        return new Response(JSON.stringify({ message: "Duplicate" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    // Normalize Phone
    const { data: normalizedPhone } = await supabase.rpc('normalize_phone', { phone_number: rawNumber });
    if (!normalizedPhone) throw new Error("Failed to normalize phone");

    // Find/Create Contact & Conversation
    const { contact, conversation } = await findOrCreateContactAndConversation(supabase, normalizedPhone, instance?.id);

    // Insert Message
    const { error } = await supabase
        .from("whatsapp_messages")
        .insert({
            external_id: externalId,
            instance_id: instance?.id,
            contact_id: contact?.id,
            conversation_id: conversation?.id,
            direction: fromMe ? 'outbound' : 'inbound',
            type: fileType || messageType || 'text',
            body: body,
            media_url: mediaUrl,
            status: 'delivered',
            metadata: messageData,
            created_at: new Date().toISOString()
        });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
    });
}

async function handleEcho(supabase: any, payload: any, instance: any) {
    // ECHO Logic (Based on user provided node config)
    // "event": "received_message" | "sent_message"
    // "message_data_json": ...

    const event = payload.event;
    const messageData = payload.message_data || {};
    // Or if payload is flattened as per user node:
    // User node: "message_data_json": "={{JSON.stringify($json.message_data || {})}}"

    // Let's assume standard ECHO payload structure based on "message_data" presence
    // If it's a status update, we might ignore for now or update status.

    const externalId = payload.message_id || messageData.id;
    const rawNumber = payload.contact_number || messageData.number;
    const body = payload.text || messageData.text || messageData.caption; // Echo might use caption for media
    const fromMe = payload.direction === 'outgoing' || payload.from_me;
    const messageType = payload.message_type || 'text';
    const mediaUrl = payload.url || messageData.url;

    if (!externalId || !rawNumber) {
        return new Response(JSON.stringify({ message: "Ignored (missing id or number)" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    // Idempotency Check
    const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("external_id", externalId)
        .eq("instance_id", instance?.id)
        .maybeSingle();

    if (existing) {
        return new Response(JSON.stringify({ message: "Duplicate" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    // Normalize Phone
    const { data: normalizedPhone } = await supabase.rpc('normalize_phone', { phone_number: rawNumber });
    if (!normalizedPhone) throw new Error("Failed to normalize phone");

    // Find/Create Contact & Conversation
    const { contact, conversation } = await findOrCreateContactAndConversation(supabase, normalizedPhone, instance?.id);

    // Insert Message
    const { error } = await supabase
        .from("whatsapp_messages")
        .insert({
            external_id: externalId,
            instance_id: instance?.id,
            contact_id: contact?.id,
            conversation_id: conversation?.id,
            direction: fromMe ? 'outbound' : 'inbound',
            type: messageType,
            body: body,
            media_url: mediaUrl,
            status: 'delivered',
            metadata: payload,
            created_at: new Date().toISOString()
        });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
    });
}

// --- Helpers ---

async function findOrCreateContactAndConversation(supabase: any, phone: string, instanceId: string) {
    // 1. Find Contact
    let { data: contact } = await supabase
        .from("contatos")
        .select("id, nome")
        .or(`telefone.eq.${phone},telefone.eq.+${phone}`)
        .maybeSingle();

    // 2. Auto-Create Contact if needed
    if (!contact) {
        const { data: config } = await supabase
            .from("whatsapp_config")
            .select("value")
            .eq("key", "auto_create_leads")
            .single();

        if (config?.value === true) {
            const { data: newContact, error } = await supabase
                .from("contatos")
                .insert({
                    nome: `WhatsApp ${phone}`,
                    telefone: phone,
                    tipo_pessoa: 'adulto',
                    observacoes: 'Criado via WhatsApp'
                })
                .select("id")
                .single();

            if (!error) contact = newContact;
        }
    }

    // 3. Find/Create Conversation
    let conversation = null;
    if (contact && instanceId) {
        const { data: conv } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("contact_id", contact.id)
            .eq("instance_id", instanceId)
            .maybeSingle();

        if (conv) {
            conversation = conv;
            // Update last_message_at
            await supabase
                .from("whatsapp_conversations")
                .update({ last_message_at: new Date().toISOString() })
                .eq("id", conv.id);
        } else {
            // Create new conversation
            const { data: newConv } = await supabase
                .from("whatsapp_conversations")
                .insert({
                    contact_id: contact.id,
                    instance_id: instanceId,
                    last_message_at: new Date().toISOString(),
                    status: 'open'
                })
                .select("id")
                .single();
            conversation = newConv;
        }
    }

    return { contact, conversation };
}
