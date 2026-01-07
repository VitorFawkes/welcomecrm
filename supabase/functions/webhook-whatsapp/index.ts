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

        const payload = await req.json();
        console.log("Webhook received:", JSON.stringify(payload));

        // 1. Validate Payload Structure (ChatPro specific)
        const messageData = payload.body?.message_data || payload.message_data;
        if (!messageData) {
            console.log("Ignored: No message_data found (likely a status update or other event)");
            return new Response(JSON.stringify({ message: "Ignored event type" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const {
            id: externalId,
            number: rawNumber,
            message: body,
            from_me: fromMe,
            type: messageType,
            file_type: fileType,
            url: mediaUrl,
            participant
        } = messageData;

        // 2. Idempotency Check
        const { data: existing } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("external_id", externalId)
            .single();

        if (existing) {
            console.log(`Duplicate message ignored: ${externalId}`);
            return new Response(JSON.stringify({ message: "Duplicate" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 3. Normalize Phone
        // ChatPro sends "number" as "5511999999999@s.whatsapp.net" or just "5511999999999"
        // We need to strip everything non-numeric.
        const phoneToNormalize = fromMe ? participant : rawNumber; // If from_me, 'number' is the recipient, 'participant' is me (or vice versa depending on API version, usually 'number' is the remote party in ChatPro webhooks)
        // Actually, in ChatPro 'sent_message': 'number' is the destination. 'participant' is the sender (me).
        // In 'new_message' (inbound): 'number' is the sender.

        // Let's rely on 'number' field which usually points to the "Remote" party (the contact).
        // If it's a group, logic might differ, but for 1:1:
        // Inbound: number = sender
        // Outbound: number = recipient
        // So 'number' is ALWAYS the Contact's number.

        const { data: normalizedPhone } = await supabase.rpc('normalize_phone', { phone_number: rawNumber });

        if (!normalizedPhone) {
            throw new Error("Failed to normalize phone number");
        }

        // 4. Find Contact
        let { data: contact } = await supabase
            .from("contatos")
            .select("id, nome")
            .or(`telefone.eq.${normalizedPhone},telefone.eq.+${normalizedPhone}`) // Try exact match or with +
            .maybeSingle();

        // 5. Auto-Create Logic (Governance)
        if (!contact) {
            // Fetch Config
            const { data: config } = await supabase
                .from("whatsapp_config")
                .select("value")
                .eq("key", "auto_create_leads")
                .single();

            const autoCreate = config?.value === true;

            if (autoCreate) {
                console.log(`Contact not found for ${normalizedPhone}. Auto-creating...`);

                // Create Contact
                const { data: newContact, error: contactError } = await supabase
                    .from("contatos")
                    .insert({
                        nome: `WhatsApp ${normalizedPhone}`,
                        telefone: normalizedPhone,
                        tipo_pessoa: 'adulto', // Default
                        observacoes: 'Criado automaticamente via integração WhatsApp'
                    })
                    .select("id")
                    .single();

                if (contactError) {
                    console.error("Failed to create contact:", contactError);
                    // Fallback: Store as orphan (contact_id null)
                } else {
                    contact = newContact;

                    // Create Lead (Card) if configured
                    const { data: pipelineConfig } = await supabase
                        .from("whatsapp_config")
                        .select("value")
                        .eq("key", "default_pipeline_id")
                        .single();

                    const pipelineId = pipelineConfig?.value;

                    if (pipelineId) {
                        const { error: cardError } = await supabase
                            .from("cards")
                            .insert({
                                titulo: `Lead WhatsApp ${normalizedPhone}`,
                                pessoa_principal_id: contact.id,
                                pipeline_id: pipelineId,
                                produto: 'TRIPS', // Default
                                origem: 'WhatsApp',
                                status_comercial: 'novo'
                            });
                        if (cardError) console.error("Failed to create card:", cardError);
                    }
                }
            } else {
                console.log(`Contact not found for ${normalizedPhone}. Auto-create disabled.`);
            }
        }

        // 6. Insert Message
        const { error: insertError } = await supabase
            .from("whatsapp_messages")
            .insert({
                external_id: externalId,
                contact_id: contact?.id || null, // Null if orphan
                direction: fromMe ? 'outbound' : 'inbound',
                type: fileType || messageType || 'text',
                body: body,
                media_url: mediaUrl,
                status: 'delivered',
                metadata: messageData,
                created_at: new Date().toISOString() // Use current time for ingestion, or messageData.ts_receive if available
            });

        if (insertError) {
            throw insertError;
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
