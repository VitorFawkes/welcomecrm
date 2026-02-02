import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { describeRoute, OpenAPIHono } from "npm:@hono/zod-openapi";
import { z } from "npm:zod";
import { swaggerUI } from "npm:@hono/swagger-ui";

// ============================================
// WelcomeCRM Public API (v2)
// Built with Hono + Zod + OpenAPI
// ============================================

const app = new OpenAPIHono().basePath('/public-api');

// ---- Middleware ----
app.use("/*", cors());

// Authentication Middleware
app.use("/*", async (c, next) => {
    // Skip auth for docs and health
    if (c.req.path.includes("/openapi.json") || c.req.path.includes("/health") || c.req.path.includes("/docs")) {
        return await next();
    }

    const apiKey = c.req.header("X-API-Key");
    if (!apiKey) {
        return c.json({ error: "Missing X-API-Key header" }, 401);
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate Key
    const { data, error } = await supabase.rpc("validate_api_key", { p_key: apiKey });

    if (error || !data || data.length === 0 || !data[0].is_valid) {
        return c.json({ error: "Invalid API Key" }, 401);
    }

    const keyData = data[0];
    c.set("apiKey", keyData);
    c.set("supabase", supabase);

    // Log Request (Async - Fire and Forget)
    const startTime = Date.now();
    await next();
    const endTime = Date.now();

    // Log to DB
    supabase.from("api_request_logs").insert({
        api_key_id: keyData.key_id,
        endpoint: c.req.path,
        method: c.req.method,
        status_code: c.res.status,
        response_time_ms: endTime - startTime,
        ip_address: c.req.header("x-forwarded-for"),
        user_agent: c.req.header("user-agent"),
    }).then();
});

// ---- Schemas (Zod) ----

const ErrorSchema = z.object({
    error: z.string().openapi({ example: "Invalid request" }),
});

const DealSchema = z.object({
    id: z.string().uuid(),
    titulo: z.string(),
    valor_estimado: z.number().nullable(),
    pipeline_stage_id: z.string().uuid().nullable(),
    created_at: z.string().datetime(),
});

const CreateDealSchema = z.object({
    titulo: z.string().min(1).openapi({ example: "New Enterprise Deal" }),
    valor_estimado: z.number().optional().openapi({ example: 50000 }),
    pipeline_stage_id: z.string().uuid().optional().openapi({ example: "uuid-of-stage" }),
    pessoa_principal_id: z.string().uuid().optional(),
});

const ContactSchema = z.object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string().email().nullable(),
    telefone: z.string().nullable(),
});

const CreateContactSchema = z.object({
    nome: z.string().min(1).openapi({ example: "John" }),
    sobrenome: z.string().optional().openapi({ example: "Doe" }),
    email: z.string().email().optional().openapi({ example: "john@example.com" }),
    telefone: z.string().optional().openapi({ example: "+5511999999999" }),
});

const ContactDetailSchema = z.object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string().email().nullable(),
    telefone: z.string().nullable(),
    last_whatsapp_conversation_id: z.string().nullable().optional(),
    whatsapp_conversations: z.array(z.object({
        id: z.string(),
        status: z.string().nullable(),
        unread_count: z.number().nullable(),
        last_message_at: z.string().nullable(),
    })).optional(),
    deals: z.array(z.object({
        id: z.string(),
        titulo: z.string(),
        status_comercial: z.string().nullable(),
        pipeline_stage_id: z.string().nullable(),
    })).optional(),
});

// ---- Routes ----

// 1. Health Check
app.openapi(
    {
        method: "get",
        path: "/health",
        summary: "Health Check",
        description: "Check if the API is running",
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: z.object({ status: z.string() }) } },
            },
        },
    },
    (c) => c.json({ status: "ok" })
);

// 2. List Deals
app.openapi(
    {
        method: "get",
        path: "/deals",
        summary: "List Deals",
        security: [{ apiKeyAuth: [] }],
        request: {
            query: z.object({
                limit: z.string().optional().openapi({ example: "50" }),
                offset: z.string().optional().openapi({ example: "0" }),
            }),
        },
        responses: {
            200: {
                description: "List of deals",
                content: { "application/json": { schema: z.array(DealSchema) } },
            },
            401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
        },
    },
    async (c) => {
        const supabase = c.get("supabase");
        const limit = parseInt(c.req.query("limit") || "50");
        const offset = parseInt(c.req.query("offset") || "0");

        const { data, error } = await supabase
            .from("cards")
            .select("id, titulo, valor_estimado, pipeline_stage_id, created_at")
            .range(offset, offset + limit - 1);

        if (error) return c.json({ error: error.message }, 500);
        return c.json(data);
    }
);

// 3. Create Deal
app.openapi(
    {
        method: "post",
        path: "/deals",
        summary: "Create Deal",
        security: [{ apiKeyAuth: [] }],
        request: {
            body: {
                content: { "application/json": { schema: CreateDealSchema } },
            },
        },
        responses: {
            201: {
                description: "Deal created",
                content: { "application/json": { schema: DealSchema } },
            },
        },
    },
    async (c) => {
        const supabase = c.get("supabase");
        const body = await c.req.json();

        const { data, error } = await supabase
            .from("cards")
            .insert(body)
            .select()
            .single();

        if (error) return c.json({ error: error.message }, 400);
        return c.json(data, 201);
    }
);

// 4. List Contacts
app.openapi(
    {
        method: "get",
        path: "/contacts",
        summary: "List Contacts",
        security: [{ apiKeyAuth: [] }],
        request: {
            query: z.object({
                search: z.string().optional(),
                id: z.string().optional(),
                limit: z.string().optional(),
            }),
        },
        responses: {
            200: {
                description: "List of contacts",
                content: { "application/json": { schema: z.array(ContactDetailSchema) } },
            },
        },
    },
    async (c) => {
        const supabase = c.get("supabase");
        const search = c.req.query("search");
        const id = c.req.query("id");
        const limit = parseInt(c.req.query("limit") || "50");

        let query = supabase.from("contatos").select(`
            id, nome, email, telefone, last_whatsapp_conversation_id,
            whatsapp_conversations(id, status, unread_count, last_message_at),
            cards!cards_pessoa_principal_id_fkey(id, titulo, status_comercial, pipeline_stage_id),
            cards_contatos(
                cards(id, titulo, status_comercial, pipeline_stage_id)
            )
        `).limit(limit);

        if (id) {
            query = query.eq("id", id);
        } else if (search) {
            query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) return c.json({ error: error.message }, 500);

        // Transform data to flat structure
        const enrichedData = data.map((contact: any) => {
            const directDeals = contact.cards || [];
            const associatedDeals = (contact.cards_contatos || [])
                .map((cc: any) => cc.cards)
                .filter((c: any) => c !== null); // Remove nulls if any

            // Merge and deduplicate deals by ID
            const allDeals = [...directDeals, ...associatedDeals];
            const uniqueDeals = Array.from(new Map(allDeals.map((d: any) => [d.id, d])).values());

            return {
                id: contact.id,
                nome: contact.nome,
                email: contact.email,
                telefone: contact.telefone,
                last_whatsapp_conversation_id: contact.last_whatsapp_conversation_id,
                whatsapp_conversations: contact.whatsapp_conversations || [],
                deals: uniqueDeals
            };
        });

        return c.json(enrichedData);
    }
);

// 5. Create Contact
app.openapi(
    {
        method: "post",
        path: "/contacts",
        summary: "Create Contact",
        security: [{ apiKeyAuth: [] }],
        request: {
            body: {
                content: { "application/json": { schema: CreateContactSchema } },
            },
        },
        responses: {
            201: {
                description: "Contact created",
                content: { "application/json": { schema: ContactSchema } },
            },
        },
    },
    async (c) => {
        const supabase = c.get("supabase");
        const body = await c.req.json();

        const { data, error } = await supabase
            .from("contatos")
            .insert(body)
            .select()
            .single();

        if (error) return c.json({ error: error.message }, 400);
        return c.json(data, 201);
    }
);

// ---- Documentation ----

app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
        version: "2.0.0",
        title: "WelcomeCRM API",
        description: "Robust, auto-generated API for WelcomeCRM integrations.",
    },
    servers: [
        {
            url: "https://szyrzxvlptqqheizyrxu.supabase.co/functions/v1/public-api",
            description: "Production Server",
        },
    ],
});

app.get("/docs", swaggerUI({ url: "/functions/v1/public-api/openapi.json" }));

// ---- Start ----
Deno.serve(app.fetch);
