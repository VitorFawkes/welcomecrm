import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MondeSale {
    id: string;
    card_id: string;
    proposal_id: string | null;
    sale_date: string;
    total_value: number;
    idempotency_key: string;
    status: string;
    attempts: number;
    max_attempts: number;
    cards?: {
        id: string;
        titulo: string;
        produto_data: Record<string, unknown> | null;
    };
}

interface MondeSaleItem {
    id: string;
    sale_id: string;
    item_type: string;
    title: string;
    description: string | null;
    supplier: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
    service_date_start: string | null;
    service_date_end: string | null;
    item_metadata: Record<string, unknown>;
}

// Monde API V3 payload types
interface MondeHotel {
    check_in: string;
    check_out: string;
    supplier_name: string;
    city?: string;
    rooms?: number;
    daily_quantity?: number;
    value: number;
}

interface MondeAirlineTicket {
    departure_date: string;
    arrival_date?: string;
    origin: string;
    destination: string;
    locator?: string;
    supplier_name: string;
    value: number;
}

interface MondeSalePayload {
    company_identifier: string;
    sale_date: string;
    operation_id?: string;
    travel_agent?: {
        name: string;
        email?: string;
    };
    payer?: {
        name: string;
        document?: string;
        email?: string;
    };
    hotels?: MondeHotel[];
    airline_tickets?: MondeAirlineTicket[];
    ground_transportations?: Array<{
        date: string;
        origin?: string;
        destination?: string;
        supplier_name?: string;
        value: number;
    }>;
    insurances?: Array<{
        start_date: string;
        end_date?: string;
        supplier_name?: string;
        value: number;
    }>;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[monde-sales-dispatch] Starting dispatch processing...');

    // 1. Load settings
    const { data: settings } = await supabase
        .from('integration_settings')
        .select('key, value')
        .in('key', ['MONDE_API_URL', 'MONDE_SHADOW_MODE', 'MONDE_CNPJ', 'MONDE_ENVIRONMENT']);

    const config = (settings || []).reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {} as Record<string, string>);

    const shadowMode = config['MONDE_SHADOW_MODE'] === 'true';
    const mondeUrl = config['MONDE_API_URL'] || 'https://web.monde.com.br/api/v3';
    const mondeCnpj = config['MONDE_CNPJ'];

    // Load credentials from environment (secrets)
    const mondeUsername = Deno.env.get('MONDE_USERNAME');
    const mondePassword = Deno.env.get('MONDE_PASSWORD');

    if (!shadowMode && (!mondeUsername || !mondePassword)) {
        console.error('[monde-sales-dispatch] Missing Monde credentials');
        return new Response(JSON.stringify({
            error: 'Monde credentials not configured',
            details: 'Set MONDE_USERNAME and MONDE_PASSWORD secrets'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (!mondeCnpj && !shadowMode) {
        console.error('[monde-sales-dispatch] Missing MONDE_CNPJ');
        return new Response(JSON.stringify({
            error: 'MONDE_CNPJ not configured',
            details: 'Set MONDE_CNPJ in integration_settings'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 2. Fetch pending sales
    const now = new Date().toISOString();
    const { data: sales, error: fetchError } = await supabase
        .from('monde_sales')
        .select(`
            id, card_id, proposal_id, sale_date, total_value, idempotency_key, status, attempts, max_attempts,
            cards:cards(id, titulo, produto_data)
        `)
        .eq('status', 'pending')
        .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
        .order('created_at')
        .limit(50);

    if (fetchError) {
        console.error('[monde-sales-dispatch] Failed to fetch sales:', fetchError);
        return new Response(JSON.stringify({ error: fetchError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (!sales?.length) {
        console.log('[monde-sales-dispatch] No pending sales');
        return new Response(JSON.stringify({
            message: 'No pending sales',
            processed: 0,
            shadow_mode: shadowMode
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log(`[monde-sales-dispatch] Processing ${sales.length} sales (shadow=${shadowMode})...`);

    const results: Array<{ id: string; status: string; monde_sale_id?: string; error?: string }> = [];

    for (const sale of sales as unknown as MondeSale[]) {
        try {
            // Mark as processing
            await supabase
                .from('monde_sales')
                .update({ status: 'processing' })
                .eq('id', sale.id);

            // Fetch sale items
            const { data: items } = await supabase
                .from('monde_sale_items')
                .select('*')
                .eq('sale_id', sale.id);

            const saleItems = (items || []) as MondeSaleItem[];

            // Build Monde payload
            const payload = buildMondePayload(sale, saleItems, mondeCnpj || '00000000000000');

            if (shadowMode) {
                // Shadow mode - log only
                console.log(`[monde-sales-dispatch] [SHADOW] Would POST to Monde:`, JSON.stringify(payload, null, 2));

                await supabase
                    .from('monde_sales')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        monde_sale_id: `SHADOW-${Date.now()}`,
                        monde_response: { shadow: true, payload },
                        attempts_log: [
                            ...(Array.isArray(sale.attempts) ? sale.attempts : []),
                            { timestamp: new Date().toISOString(), status: 'shadow_success' }
                        ]
                    })
                    .eq('id', sale.id);

                results.push({ id: sale.id, status: 'sent_shadow', monde_sale_id: `SHADOW-${Date.now()}` });
                console.log(`[monde-sales-dispatch] [SHADOW] Sale ${sale.id} simulated successfully`);
                continue;
            }

            // Real dispatch to Monde API
            const startTime = Date.now();
            const response = await fetch(`${mondeUrl}/sales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(`${mondeUsername}:${mondePassword}`)}`,
                    'Idempotency-Key': sale.idempotency_key
                },
                body: JSON.stringify(payload)
            });

            const durationMs = Date.now() - startTime;
            const responseBody = await response.json().catch(() => ({}));

            // Log attempt
            const attemptLog = {
                timestamp: new Date().toISOString(),
                attempt: sale.attempts + 1,
                http_status: response.status,
                duration_ms: durationMs,
                response: responseBody
            };

            if (response.ok) {
                // Success
                const mondeSaleId = responseBody.sale_id || responseBody.id;

                await supabase
                    .from('monde_sales')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        monde_sale_id: mondeSaleId,
                        monde_sale_number: responseBody.sale_number,
                        monde_response: responseBody,
                        attempts: sale.attempts + 1,
                        attempts_log: [...(Array.isArray(sale.attempts) ? sale.attempts : []), attemptLog]
                    })
                    .eq('id', sale.id);

                results.push({ id: sale.id, status: 'sent', monde_sale_id: mondeSaleId });
                console.log(`[monde-sales-dispatch] ✓ Sale ${sale.id} sent successfully, Monde ID: ${mondeSaleId}`);

            } else {
                // Handle error
                const newAttempts = sale.attempts + 1;
                const isRetryable = [408, 429, 500, 502, 503, 504].includes(response.status);
                const shouldRetry = isRetryable && newAttempts < sale.max_attempts;

                if (shouldRetry) {
                    // Schedule retry with exponential backoff
                    const delayMs = 60000 * Math.pow(2, newAttempts - 1); // 1min, 2min, 4min...

                    await supabase
                        .from('monde_sales')
                        .update({
                            status: 'pending',
                            attempts: newAttempts,
                            next_retry_at: new Date(Date.now() + delayMs).toISOString(),
                            error_message: `HTTP ${response.status}: ${JSON.stringify(responseBody)}`,
                            attempts_log: [...(Array.isArray(sale.attempts) ? sale.attempts : []), attemptLog]
                        })
                        .eq('id', sale.id);

                    results.push({ id: sale.id, status: 'retry_scheduled', error: `HTTP ${response.status}` });
                    console.log(`[monde-sales-dispatch] Sale ${sale.id} scheduled for retry (attempt ${newAttempts})`);

                } else {
                    // Final failure
                    await supabase
                        .from('monde_sales')
                        .update({
                            status: 'failed',
                            attempts: newAttempts,
                            error_message: `HTTP ${response.status}: ${JSON.stringify(responseBody)}`,
                            attempts_log: [...(Array.isArray(sale.attempts) ? sale.attempts : []), attemptLog]
                        })
                        .eq('id', sale.id);

                    results.push({ id: sale.id, status: 'failed', error: `HTTP ${response.status}` });
                    console.error(`[monde-sales-dispatch] ✗ Sale ${sale.id} failed definitively: HTTP ${response.status}`);
                }
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[monde-sales-dispatch] ✗ Sale ${sale.id} error:`, errorMessage);

            // Mark as failed on exception
            await supabase
                .from('monde_sales')
                .update({
                    status: 'failed',
                    attempts: sale.attempts + 1,
                    error_message: errorMessage,
                    attempts_log: [
                        ...(Array.isArray(sale.attempts) ? sale.attempts : []),
                        { timestamp: new Date().toISOString(), error: errorMessage }
                    ]
                })
                .eq('id', sale.id);

            results.push({ id: sale.id, status: 'error', error: errorMessage });
        }
    }

    const successCount = results.filter(r => r.status === 'sent' || r.status === 'sent_shadow').length;
    const failCount = results.filter(r => r.status === 'failed' || r.status === 'error').length;
    const retryCount = results.filter(r => r.status === 'retry_scheduled').length;

    console.log(`[monde-sales-dispatch] Complete: ${successCount} sent, ${failCount} failed, ${retryCount} retry`);

    return new Response(JSON.stringify({
        processed: results.length,
        sent: successCount,
        failed: failCount,
        retry_scheduled: retryCount,
        shadow_mode: shadowMode,
        results
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
});

/**
 * Build Monde API V3 payload from sale and items
 */
function buildMondePayload(
    sale: MondeSale,
    items: MondeSaleItem[],
    cnpj: string
): MondeSalePayload {
    const card = sale.cards;
    const produtoData = card?.produto_data || {};

    const payload: MondeSalePayload = {
        company_identifier: cnpj.replace(/\D/g, ''), // Remove non-digits
        sale_date: sale.sale_date,
        operation_id: `WC-${sale.card_id.substring(0, 8)}` // WelcomeCRM reference
    };

    // Group items by type
    const hotels: MondeHotel[] = [];
    const airlineTickets: MondeAirlineTicket[] = [];
    const transfers: MondeSalePayload['ground_transportations'] = [];
    const insurances: MondeSalePayload['insurances'] = [];

    for (const item of items) {
        const metadata = item.item_metadata || {};

        switch (item.item_type) {
            case 'hotel':
            case 'accommodation':
                hotels.push({
                    check_in: (metadata.check_in as string) || sale.sale_date,
                    check_out: (metadata.check_out as string) || sale.sale_date,
                    supplier_name: item.supplier || 'Não informado',
                    city: (metadata.city as string) || (metadata.destination as string),
                    rooms: (metadata.rooms as number) || 1,
                    value: item.total_price
                });
                break;

            case 'flight':
                airlineTickets.push({
                    departure_date: (metadata.departure_datetime as string)?.substring(0, 10) || sale.sale_date,
                    arrival_date: (metadata.arrival_datetime as string)?.substring(0, 10),
                    origin: (metadata.origin_airport as string) || (metadata.origin as string) || 'N/A',
                    destination: (metadata.destination_airport as string) || (metadata.destination as string) || 'N/A',
                    locator: (metadata.flight_number as string) || (metadata.locator as string),
                    supplier_name: item.supplier || 'Não informado',
                    value: item.total_price
                });
                break;

            case 'transfer':
            case 'ground_transportation':
                transfers.push({
                    date: (metadata.date as string) || sale.sale_date,
                    origin: metadata.origin as string,
                    destination: metadata.destination as string,
                    supplier_name: item.supplier,
                    value: item.total_price
                });
                break;

            case 'insurance':
                insurances.push({
                    start_date: (metadata.start_date as string) || sale.sale_date,
                    end_date: metadata.end_date as string,
                    supplier_name: item.supplier,
                    value: item.total_price
                });
                break;

            default:
                // For other types, try to categorize or skip
                console.log(`[monde-sales-dispatch] Unknown item type: ${item.item_type}, skipping`);
        }
    }

    // Add non-empty arrays to payload
    if (hotels.length > 0) payload.hotels = hotels;
    if (airlineTickets.length > 0) payload.airline_tickets = airlineTickets;
    if (transfers.length > 0) payload.ground_transportations = transfers;
    if (insurances.length > 0) payload.insurances = insurances;

    return payload;
}
