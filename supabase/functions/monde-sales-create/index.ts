import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateSaleRequest {
    card_id: string;
    proposal_id?: string | null;
    sale_date: string; // YYYY-MM-DD
    items: Array<{
        proposal_item_id?: string;
        proposal_flight_id?: string;
        card_financial_item_id?: string;
        supplier?: string; // Override supplier
    }>;
}

interface CardFinancialItem {
    id: string;
    product_type: string;
    description: string | null;
    sale_value: number;
    supplier_cost: number;
}

interface ProposalItem {
    id: string;
    item_type: string;
    title: string;
    description: string | null;
    base_price: number | null;
    supplier: string | null;
    rich_content: Record<string, unknown> | null;
}

interface ProposalFlight {
    id: string;
    airline_name: string | null;
    flight_number: string | null;
    origin_city: string | null;
    destination_city: string | null;
    departure_datetime: string | null;
    arrival_datetime: string | null;
    price_total: number | null;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        // Get auth header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Create Supabase client with service role for DB operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Create client with user token to verify auth
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log(`[monde-sales-create] User ${user.id} creating sale...`);

        // Parse request body
        const body: CreateSaleRequest = await req.json();
        const { card_id, proposal_id, sale_date, items } = body;

        // Validate required fields (proposal_id is now optional)
        if (!card_id || !sale_date || !items?.length) {
            return new Response(JSON.stringify({
                error: 'Missing required fields',
                details: 'card_id, sale_date, and items are required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(sale_date)) {
            return new Response(JSON.stringify({
                error: 'Invalid date format',
                details: 'sale_date must be in YYYY-MM-DD format'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 1. Verify card exists and user has access
        const { data: card, error: cardError } = await supabaseAdmin
            .from('cards')
            .select('id, titulo, produto_data')
            .eq('id', card_id)
            .single();

        if (cardError || !card) {
            return new Response(JSON.stringify({ error: 'Card not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Verify proposal exists (only if proposal_id provided)
        if (proposal_id) {
            const { data: proposal, error: proposalError } = await supabaseAdmin
                .from('proposals')
                .select('id, status, accepted_total')
                .eq('id', proposal_id)
                .eq('card_id', card_id)
                .single();

            if (proposalError || !proposal) {
                return new Response(JSON.stringify({ error: 'Proposal not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // 3. Fetch source items based on type
        const proposalItemIds = items.filter(i => i.proposal_item_id).map(i => i.proposal_item_id);
        const proposalFlightIds = items.filter(i => i.proposal_flight_id).map(i => i.proposal_flight_id);
        const financialItemIds = items.filter(i => i.card_financial_item_id).map(i => i.card_financial_item_id);

        let proposalItems: ProposalItem[] = [];
        let proposalFlights: ProposalFlight[] = [];
        let financialItems: CardFinancialItem[] = [];

        if (proposalItemIds.length > 0) {
            const { data } = await supabaseAdmin
                .from('proposal_items')
                .select('id, item_type, title, description, base_price, supplier, rich_content')
                .in('id', proposalItemIds);
            proposalItems = (data || []) as ProposalItem[];
        }

        if (proposalFlightIds.length > 0) {
            const { data } = await supabaseAdmin
                .from('proposal_flights')
                .select('id, airline_name, flight_number, origin_city, destination_city, departure_datetime, arrival_datetime, price_total')
                .in('id', proposalFlightIds);
            proposalFlights = (data || []) as ProposalFlight[];
        }

        if (financialItemIds.length > 0) {
            const { data } = await supabaseAdmin
                .from('card_financial_items')
                .select('id, product_type, description, sale_value, supplier_cost')
                .in('id', financialItemIds);
            financialItems = (data || []) as CardFinancialItem[];
        }

        // 4. Check for already sold items
        const alreadySold: string[] = [];

        for (const item of items) {
            if (item.proposal_item_id) {
                const { data: existing } = await supabaseAdmin
                    .from('monde_sale_items')
                    .select('id, monde_sales!inner(status)')
                    .eq('proposal_item_id', item.proposal_item_id)
                    .eq('monde_sales.status', 'sent')
                    .limit(1);

                if (existing && existing.length > 0) {
                    const proposalItem = proposalItems.find(pi => pi.id === item.proposal_item_id);
                    alreadySold.push(proposalItem?.title || item.proposal_item_id);
                }
            }

            if (item.proposal_flight_id) {
                const { data: existing } = await supabaseAdmin
                    .from('monde_sale_items')
                    .select('id, monde_sales!inner(status)')
                    .eq('proposal_flight_id', item.proposal_flight_id)
                    .eq('monde_sales.status', 'sent')
                    .limit(1);

                if (existing && existing.length > 0) {
                    const proposalFlight = proposalFlights.find(pf => pf.id === item.proposal_flight_id);
                    alreadySold.push(proposalFlight?.airline_name || item.proposal_flight_id);
                }
            }

            if (item.card_financial_item_id) {
                const { data: existing } = await supabaseAdmin
                    .from('monde_sale_items')
                    .select('id, monde_sales!inner(status)')
                    .eq('card_financial_item_id', item.card_financial_item_id)
                    .eq('monde_sales.status', 'sent')
                    .limit(1);

                if (existing && existing.length > 0) {
                    const finItem = financialItems.find(fi => fi.id === item.card_financial_item_id);
                    alreadySold.push(finItem?.description || item.card_financial_item_id);
                }
            }
        }

        if (alreadySold.length > 0) {
            return new Response(JSON.stringify({
                error: 'Some items already sold',
                already_sold: alreadySold
            }), {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. Create monde_sales record
        const idempotencyKey = crypto.randomUUID();

        const { data: sale, error: saleError } = await supabaseAdmin
            .from('monde_sales')
            .insert({
                card_id,
                proposal_id: proposal_id || null,
                sale_date,
                idempotency_key: idempotencyKey,
                status: 'pending',
                created_by: user.id,
                total_value: 0 // Will be calculated by trigger
            })
            .select()
            .single();

        if (saleError || !sale) {
            console.error('[monde-sales-create] Failed to create sale:', saleError);
            return new Response(JSON.stringify({
                error: 'Failed to create sale',
                details: saleError?.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log(`[monde-sales-create] Created sale ${sale.id}`);

        // 6. Create monde_sale_items records
        const saleItems: Array<{
            sale_id: string;
            proposal_item_id?: string;
            proposal_flight_id?: string;
            card_financial_item_id?: string;
            item_type: string;
            title: string;
            description?: string;
            supplier?: string;
            unit_price: number;
            quantity: number;
            total_price: number;
            item_metadata: Record<string, unknown>;
        }> = [];

        for (const item of items) {
            if (item.proposal_item_id) {
                const proposalItem = proposalItems.find(pi => pi.id === item.proposal_item_id);
                if (proposalItem) {
                    const supplier = item.supplier ||
                        proposalItem.supplier ||
                        (proposalItem.rich_content as Record<string, string>)?.supplier ||
                        null;

                    saleItems.push({
                        sale_id: sale.id,
                        proposal_item_id: item.proposal_item_id,
                        item_type: proposalItem.item_type,
                        title: proposalItem.title,
                        description: proposalItem.description || undefined,
                        supplier: supplier || undefined,
                        unit_price: proposalItem.base_price || 0,
                        quantity: 1,
                        total_price: proposalItem.base_price || 0,
                        item_metadata: proposalItem.rich_content || {}
                    });
                }
            }

            if (item.proposal_flight_id) {
                const proposalFlight = proposalFlights.find(pf => pf.id === item.proposal_flight_id);
                if (proposalFlight) {
                    saleItems.push({
                        sale_id: sale.id,
                        proposal_flight_id: item.proposal_flight_id,
                        item_type: 'flight',
                        title: `${proposalFlight.origin_city} → ${proposalFlight.destination_city}`,
                        description: `Voo ${proposalFlight.flight_number || 'N/A'}`,
                        supplier: item.supplier || proposalFlight.airline_name || undefined,
                        unit_price: proposalFlight.price_total || 0,
                        quantity: 1,
                        total_price: proposalFlight.price_total || 0,
                        item_metadata: {
                            flight_number: proposalFlight.flight_number,
                            departure_datetime: proposalFlight.departure_datetime,
                            arrival_datetime: proposalFlight.arrival_datetime
                        }
                    });
                }
            }

            // Handle card_financial_items (no-proposal path)
            if (item.card_financial_item_id) {
                const finItem = financialItems.find(fi => fi.id === item.card_financial_item_id);
                if (finItem) {
                    saleItems.push({
                        sale_id: sale.id,
                        card_financial_item_id: item.card_financial_item_id,
                        item_type: finItem.product_type || 'custom',
                        title: finItem.description || 'Item financeiro',
                        supplier: item.supplier || undefined,
                        unit_price: finItem.sale_value || 0,
                        quantity: 1,
                        total_price: finItem.sale_value || 0,
                        item_metadata: {
                            source: 'card_financial_item',
                            card_financial_item_id: finItem.id,
                            supplier_cost: finItem.supplier_cost
                        }
                    });
                }
            }
        }

        if (saleItems.length > 0) {
            const { error: itemsError } = await supabaseAdmin
                .from('monde_sale_items')
                .insert(saleItems);

            if (itemsError) {
                console.error('[monde-sales-create] Failed to create sale items:', itemsError);
                // Rollback: delete the sale
                await supabaseAdmin.from('monde_sales').delete().eq('id', sale.id);

                return new Response(JSON.stringify({
                    error: 'Failed to create sale items',
                    details: itemsError.message
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // 7. Fetch updated sale with total
        const { data: updatedSale } = await supabaseAdmin
            .from('monde_sales')
            .select('id, sale_date, total_value, status, idempotency_key')
            .eq('id', sale.id)
            .single();

        console.log(`[monde-sales-create] Sale ${sale.id} created with ${saleItems.length} items, total: ${updatedSale?.total_value}`);

        return new Response(JSON.stringify({
            success: true,
            sale: updatedSale,
            items_count: saleItems.length
        }), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[monde-sales-create] Error:', errorMessage);

        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
