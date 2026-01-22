import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedItem {
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    dates?: string;
    location?: string;
    category?: 'hotel' | 'flight' | 'transfer' | 'experience' | 'service' | 'insurance' | 'custom';
    details?: Record<string, unknown>;
}

interface ExtractionResult {
    success: boolean;
    items: ExtractedItem[];
    rawText?: string;
    confidence?: number;
    suggestedCategory?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log('[AI Extract] Request received');

        const { image, imageUrl } = await req.json();

        if (!image && !imageUrl) {
            console.error('[AI Extract] No image provided');
            return new Response(
                JSON.stringify({ success: false, error: "No image provided", items: [] }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiApiKey) {
            console.error('[AI Extract] OPENAI_API_KEY not configured');
            return new Response(
                JSON.stringify({ success: false, error: "AI service not configured in Supabase Secrets", items: [] }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
        console.log('[AI Extract] API Key configured');

        // Build the image content for OpenAI
        const imageContent = imageUrl
            ? { type: "image_url", image_url: { url: imageUrl } }
            : { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } };

        console.log('[AI Extract] Calling OpenAI GPT-5.1 Vision API...');
        const startTime = Date.now();

        // Call OpenAI Vision API
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-5.1",
                messages: [
                    {
                        role: "system",
                        content: `Você é um assistente especializado em extrair informações de orçamentos de viagem de imagens.

Analise a imagem e extraia TODOS os itens de viagem que encontrar (voos, hotéis, transfers, experiências, seguros, etc.).

Para cada item encontrado, retorne um objeto JSON com:
- title: nome/descrição do item
- description: detalhes adicionais (opcional)
- price: valor numérico sem formatação (opcional)
- currency: moeda (BRL, USD, EUR) (opcional)
- dates: datas relevantes como string (opcional)
- location: cidade/local (opcional)
- category: tipo do item (hotel, flight, transfer, experience, service, insurance, custom)
- company_name: nome da empresa prestadora (ex: LATAM, Hilton, Localiza)
- details: objeto com dados extras específicos do tipo (opcional)

⚠️ IMPORTANTE PARA VOOS:
Se a imagem contém uma TABELA DE VOOS com múltiplos trechos, extraia como UM ÚNICO ITEM com category "flight" e inclua um array "segments" em details.

Cada segment deve ter:
- segment_order: 1, 2, 3... (ordem dos trechos)
- airline_code: código IATA (LA, G3, AA, etc.)
- airline_name: nome completo (LATAM, GOL, etc.)
- flight_number: número do voo (ex: "4904")
- departure_date: data de saída (YYYY-MM-DD)
- departure_time: hora de saída (HH:MM)
- departure_airport: código do aeroporto (GRU, BOG, etc.)
- departure_city: nome da cidade e aeroporto (ex: "São Paulo Guarulhos")
- arrival_date: data de chegada (YYYY-MM-DD)
- arrival_time: hora de chegada (HH:MM)
- arrival_airport: código do aeroporto
- arrival_city: nome da cidade e aeroporto
- cabin_class: Economy, Business, First (se disponível)
- baggage_included: informação de bagagem (se disponível)

Exemplo de extração de tabela com 4 voos:
{
  "category": "flight",
  "title": "Itinerário Aéreo Completo",
  "details": {
    "segments": [
      { "segment_order": 1, "airline_code": "LA", "airline_name": "LATAM", "flight_number": "4904", "departure_date": "2026-11-16", "departure_time": "08:15", "departure_airport": "GRU", "departure_city": "São Paulo Guarulhos", "arrival_date": "2026-11-16", "arrival_time": "12:15", "arrival_airport": "BOG", "arrival_city": "Bogotá El Dorado" },
      { "segment_order": 2, ... }
    ]
  }
}

Responda APENAS com um JSON válido no formato:
{
  "items": [...],
  "confidence": 0.95,
  "rawText": "texto extraído da imagem"
}`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Extraia todas as informações de viagem desta imagem de orçamento."
                            },
                            imageContent as any
                        ]
                    }
                ],
                max_completion_tokens: 4096,
                temperature: 0.2,
            }),
        });

        const duration = Date.now() - startTime;
        console.log(`[AI Extract] OpenAI call took ${duration}ms`);

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('[AI Extract] OpenAI API error:', openaiResponse.status, errorText);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `OpenAI API Error: ${openaiResponse.status}`,
                    details: errorText,
                    items: []
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const openaiData = await openaiResponse.json();
        const content = openaiData.choices?.[0]?.message?.content;

        if (!content) {
            console.error('[AI Extract] No content in OpenAI response');
            return new Response(
                JSON.stringify({ success: false, error: "No response from AI", items: [] }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log('[AI Extract] GPT-5.1 response received, parsing content length:', content.length);

        // Parse the JSON response from GPT
        let parsed: { items: ExtractedItem[]; confidence?: number; rawText?: string };
        try {
            // Remove markdown code blocks if present
            const cleanContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            // Try to extract JSON from the response
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                console.warn('[AI Extract] Could not find JSON object in response');
                parsed = { items: [], rawText: content };
            }
        } catch (parseError) {
            console.error('[AI Extract] Failed to parse AI response:', parseError);
            console.log('[AI Extract] Raw content:', content);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to parse AI response",
                    rawText: content,
                    items: []
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const result: ExtractionResult = {
            success: true,
            items: parsed.items || [],
            confidence: parsed.confidence,
            rawText: parsed.rawText,
        };

        console.log(`[AI Extract] Extraction complete. Found ${result.items.length} items.`);

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error('[AI Extract] Unhandled error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Internal server error', items: [] }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
