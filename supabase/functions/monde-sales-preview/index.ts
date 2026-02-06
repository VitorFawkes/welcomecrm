import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================
// Types
// ============================================

interface CrmItemData {
    id: string;
    type: 'proposal_item' | 'proposal_flight';
    item_type: string;
    title: string;
    description: string | null;
    supplier: string | null;
    price: number;
    rich_content: Record<string, unknown>;
}

interface MondeFieldMapping {
    crm_field: string;
    crm_value: string | number | null;
    monde_field: string;
    monde_value: string | number | null;
}

interface PreviewItem {
    crm: CrmItemData;
    monde_type: string;
    monde_object: Record<string, unknown>;
    field_mappings: MondeFieldMapping[];
}

interface MondeSalePayload {
    company_identifier: string;
    sale_date: string;
    operation_id: string;
    hotels?: Array<Record<string, unknown>>;
    airline_tickets?: Array<Record<string, unknown>>;
    ground_transportations?: Array<Record<string, unknown>>;
    insurances?: Array<Record<string, unknown>>;
}

// ============================================
// Handler
// ============================================

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { cardId, proposalId } = await req.json();

        if (!cardId || !proposalId) {
            return new Response(JSON.stringify({ error: 'cardId and proposalId are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 1. Fetch card
        const { data: card, error: cardError } = await supabase
            .from('cards')
            .select('id, titulo, produto, vendas_owner_id, dono_atual_id, profiles:profiles!cards_vendas_owner_id_fkey(id, nome, email)')
            .eq('id', cardId)
            .single();

        if (cardError || !card) {
            return new Response(JSON.stringify({ error: 'Card not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch proposal with version
        const { data: proposal, error: proposalError } = await supabase
            .from('proposals')
            .select('id, status, accepted_at, accepted_total, active_version_id')
            .eq('id', proposalId)
            .single();

        if (proposalError || !proposal) {
            return new Response(JSON.stringify({ error: 'Proposal not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. Fetch proposal items via sections
        const { data: sections } = await supabase
            .from('proposal_sections')
            .select(`
                id, title, section_type,
                items:proposal_items(id, item_type, title, description, supplier, base_price, rich_content)
            `)
            .eq('version_id', proposal.active_version_id)
            .order('ordem');

        // 4. Fetch proposal flights
        const { data: flights } = await supabase
            .from('proposal_flights')
            .select('*')
            .eq('proposal_id', proposalId)
            .eq('is_selected', true)
            .order('trip_leg')
            .order('segment_order');

        // 5. Load CNPJ setting
        const { data: settings } = await supabase
            .from('integration_settings')
            .select('key, value')
            .in('key', ['MONDE_CNPJ', 'MONDE_SHADOW_MODE']);

        const config = (settings || []).reduce((acc: Record<string, string>, s: { key: string; value: string }) => {
            acc[s.key] = s.value;
            return acc;
        }, {} as Record<string, string>);

        // 6. Build preview items
        const previewItems: PreviewItem[] = [];
        const allItems: CrmItemData[] = [];

        // Normalize proposal items
        for (const section of sections || []) {
            for (const item of (section as any).items || []) {
                const crmItem: CrmItemData = {
                    id: item.id,
                    type: 'proposal_item',
                    item_type: item.item_type,
                    title: item.title,
                    description: item.description,
                    supplier: item.supplier,
                    price: item.base_price || 0,
                    rich_content: item.rich_content || {},
                };
                allItems.push(crmItem);
            }
        }

        // Normalize flights
        for (const flight of flights || []) {
            const crmItem: CrmItemData = {
                id: flight.id,
                type: 'proposal_flight',
                item_type: 'flight',
                title: `${flight.origin_city || flight.origin_airport} → ${flight.destination_city || flight.destination_airport}`,
                description: flight.flight_number
                    ? `Voo ${flight.flight_number} - ${flight.airline_name || 'N/A'}`
                    : flight.airline_name || null,
                supplier: flight.airline_name || null,
                price: flight.price_total || flight.price_per_person || 0,
                rich_content: {
                    origin_airport: flight.origin_airport,
                    destination_airport: flight.destination_airport,
                    origin_city: flight.origin_city,
                    destination_city: flight.destination_city,
                    departure_datetime: flight.departure_datetime,
                    arrival_datetime: flight.arrival_datetime,
                    flight_number: flight.flight_number,
                    airline_name: flight.airline_name,
                    airline_code: flight.airline_code,
                    cabin_class: flight.cabin_class,
                },
            };
            allItems.push(crmItem);
        }

        // 7. Transform each item to Monde format with field mappings
        const hotels: Array<Record<string, unknown>> = [];
        const airlineTickets: Array<Record<string, unknown>> = [];
        const transfers: Array<Record<string, unknown>> = [];
        const insurances: Array<Record<string, unknown>> = [];

        const saleDate = new Date().toISOString().split('T')[0];

        for (const item of allItems) {
            const rc = item.rich_content;

            switch (item.item_type) {
                case 'hotel':
                case 'accommodation': {
                    const mondeObj = {
                        check_in: (rc.check_in as string) || saleDate,
                        check_out: (rc.check_out as string) || saleDate,
                        supplier_name: item.supplier || 'Nao informado',
                        city: (rc.city as string) || (rc.destination as string) || null,
                        rooms: (rc.rooms as number) || 1,
                        value: item.price,
                    };
                    hotels.push(mondeObj);
                    previewItems.push({
                        crm: item,
                        monde_type: 'hotels',
                        monde_object: mondeObj,
                        field_mappings: [
                            { crm_field: 'Titulo', crm_value: item.title, monde_field: '(titulo nao enviado)', monde_value: null },
                            { crm_field: 'Fornecedor', crm_value: item.supplier, monde_field: 'supplier_name', monde_value: mondeObj.supplier_name },
                            { crm_field: 'Check-in', crm_value: rc.check_in as string, monde_field: 'check_in', monde_value: mondeObj.check_in },
                            { crm_field: 'Check-out', crm_value: rc.check_out as string, monde_field: 'check_out', monde_value: mondeObj.check_out },
                            { crm_field: 'Cidade', crm_value: (rc.city as string) || null, monde_field: 'city', monde_value: mondeObj.city },
                            { crm_field: 'Quartos', crm_value: (rc.rooms as number) || null, monde_field: 'rooms', monde_value: mondeObj.rooms },
                            { crm_field: 'Valor', crm_value: item.price, monde_field: 'value', monde_value: mondeObj.value },
                        ],
                    });
                    break;
                }

                case 'flight': {
                    const mondeObj = {
                        departure_date: (rc.departure_datetime as string)?.substring(0, 10) || saleDate,
                        arrival_date: (rc.arrival_datetime as string)?.substring(0, 10) || null,
                        origin: (rc.origin_airport as string) || 'N/A',
                        destination: (rc.destination_airport as string) || 'N/A',
                        locator: (rc.flight_number as string) || null,
                        supplier_name: item.supplier || 'Nao informado',
                        value: item.price,
                    };
                    airlineTickets.push(mondeObj);
                    previewItems.push({
                        crm: item,
                        monde_type: 'airline_tickets',
                        monde_object: mondeObj,
                        field_mappings: [
                            { crm_field: 'Titulo', crm_value: item.title, monde_field: '(titulo nao enviado)', monde_value: null },
                            { crm_field: 'Companhia', crm_value: item.supplier, monde_field: 'supplier_name', monde_value: mondeObj.supplier_name },
                            { crm_field: 'Origem', crm_value: (rc.origin_city as string) || (rc.origin_airport as string), monde_field: 'origin', monde_value: mondeObj.origin },
                            { crm_field: 'Destino', crm_value: (rc.destination_city as string) || (rc.destination_airport as string), monde_field: 'destination', monde_value: mondeObj.destination },
                            { crm_field: 'Partida', crm_value: rc.departure_datetime as string, monde_field: 'departure_date', monde_value: mondeObj.departure_date },
                            { crm_field: 'Chegada', crm_value: rc.arrival_datetime as string, monde_field: 'arrival_date', monde_value: mondeObj.arrival_date },
                            { crm_field: 'Numero Voo', crm_value: rc.flight_number as string, monde_field: 'locator', monde_value: mondeObj.locator },
                            { crm_field: 'Valor', crm_value: item.price, monde_field: 'value', monde_value: mondeObj.value },
                        ],
                    });
                    break;
                }

                case 'transfer':
                case 'ground_transportation': {
                    const mondeObj = {
                        date: (rc.date as string) || saleDate,
                        origin: (rc.origin as string) || null,
                        destination: (rc.destination as string) || null,
                        supplier_name: item.supplier || null,
                        value: item.price,
                    };
                    transfers.push(mondeObj);
                    previewItems.push({
                        crm: item,
                        monde_type: 'ground_transportations',
                        monde_object: mondeObj,
                        field_mappings: [
                            { crm_field: 'Titulo', crm_value: item.title, monde_field: '(titulo nao enviado)', monde_value: null },
                            { crm_field: 'Fornecedor', crm_value: item.supplier, monde_field: 'supplier_name', monde_value: mondeObj.supplier_name },
                            { crm_field: 'Data', crm_value: rc.date as string, monde_field: 'date', monde_value: mondeObj.date },
                            { crm_field: 'Origem', crm_value: rc.origin as string, monde_field: 'origin', monde_value: mondeObj.origin },
                            { crm_field: 'Destino', crm_value: rc.destination as string, monde_field: 'destination', monde_value: mondeObj.destination },
                            { crm_field: 'Valor', crm_value: item.price, monde_field: 'value', monde_value: mondeObj.value },
                        ],
                    });
                    break;
                }

                case 'insurance': {
                    const mondeObj = {
                        start_date: (rc.start_date as string) || saleDate,
                        end_date: (rc.end_date as string) || null,
                        supplier_name: item.supplier || null,
                        value: item.price,
                    };
                    insurances.push(mondeObj);
                    previewItems.push({
                        crm: item,
                        monde_type: 'insurances',
                        monde_object: mondeObj,
                        field_mappings: [
                            { crm_field: 'Titulo', crm_value: item.title, monde_field: '(titulo nao enviado)', monde_value: null },
                            { crm_field: 'Fornecedor', crm_value: item.supplier, monde_field: 'supplier_name', monde_value: mondeObj.supplier_name },
                            { crm_field: 'Inicio', crm_value: rc.start_date as string, monde_field: 'start_date', monde_value: mondeObj.start_date },
                            { crm_field: 'Fim', crm_value: rc.end_date as string, monde_field: 'end_date', monde_value: mondeObj.end_date },
                            { crm_field: 'Valor', crm_value: item.price, monde_field: 'value', monde_value: mondeObj.value },
                        ],
                    });
                    break;
                }

                default: {
                    previewItems.push({
                        crm: item,
                        monde_type: 'nao_mapeado',
                        monde_object: { info: `Tipo "${item.item_type}" nao tem mapeamento direto no Monde` },
                        field_mappings: [
                            { crm_field: 'Tipo', crm_value: item.item_type, monde_field: '-', monde_value: 'Nao mapeado' },
                            { crm_field: 'Titulo', crm_value: item.title, monde_field: '-', monde_value: null },
                            { crm_field: 'Valor', crm_value: item.price, monde_field: '-', monde_value: null },
                        ],
                    });
                }
            }
        }

        // 8. Build complete payload
        const payload: MondeSalePayload = {
            company_identifier: (config['MONDE_CNPJ'] || 'CNPJ_NAO_CONFIGURADO').replace(/\D/g, ''),
            sale_date: saleDate,
            operation_id: `WC-${cardId.substring(0, 8)}`,
        };

        if (hotels.length > 0) payload.hotels = hotels;
        if (airlineTickets.length > 0) payload.airline_tickets = airlineTickets;
        if (transfers.length > 0) payload.ground_transportations = transfers;
        if (insurances.length > 0) payload.insurances = insurances;

        // 9. Profile info
        const profile = (card as any).profiles;

        // 10. Return preview
        const totalValue = allItems.reduce((sum, i) => sum + i.price, 0);

        return new Response(JSON.stringify({
            card: {
                id: card.id,
                titulo: card.titulo,
            },
            proposal: {
                id: proposal.id,
                status: proposal.status,
                accepted_at: proposal.accepted_at,
                accepted_total: proposal.accepted_total,
            },
            travel_agent: profile ? {
                name: profile.nome,
                email: profile.email,
            } : null,
            shadow_mode: config['MONDE_SHADOW_MODE'] === 'true',
            cnpj_configured: !!config['MONDE_CNPJ'],
            total_value: totalValue,
            items_count: allItems.length,
            items_preview: previewItems,
            full_payload: payload,
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
