import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addMinutes, isWeekend, setHours, setMinutes, isAfter, isBefore, addDays } from "npm:date-fns@2.30.0";
import { utcToZonedTime, zonedTimeToUtc } from "npm:date-fns-tz@2.0.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

        // 0. Check for Manual Trigger (Test Mode)
        const body = await req.json().catch(() => ({}));

        if (body.action === 'trigger_test') {
            return await handleTestTrigger(supabaseClient, body);
        }

        // 1. Default: Process Queue
        return await processPendingQueue(supabaseClient);

    } catch (error) {
        console.error("Fatal error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

// --- CORE PROCESSING LOGIC ---

async function processPendingQueue(supabaseClient) {
    let totalProcessed = 0;
    const allResults = [];
    let loopCount = 0;
    const MAX_LOOPS = 5; // Prevent infinite loops, but allow multi-step flows

    while (loopCount < MAX_LOOPS) {
        // 1. Fetch pending items
        const { data: queueItems, error: fetchError } = await supabaseClient
            .from("workflow_queue")
            .select(`
        *,
        instance:workflow_instances (
          *,
          workflow:workflows (*)
        ),
        node:workflow_nodes (*)
      `)
            .eq("status", "pending")
            .lte("execute_at", new Date().toISOString())
            .lt("attempts", 3)
            .order("priority", { ascending: false })
            .order("execute_at", { ascending: true })
            .limit(50);

        if (fetchError) throw fetchError;

        if (queueItems.length === 0) {
            break; // No more items to process
        }

        console.log(`Loop ${loopCount + 1}: Processing ${queueItems.length} queue items...`);

        for (const item of queueItems) {
            try {
                // Mark as processing
                await supabaseClient
                    .from("workflow_queue")
                    .update({ status: "processing", attempts: item.attempts + 1 })
                    .eq("id", item.id);

                const instance = item.instance;
                const node = item.node;
                const workflow = instance.workflow;
                let actionResult = {};

                // --- EXECUTE NODE LOGIC ---
                if (node.node_type === "trigger") {
                    // Trigger just passes through
                    actionResult = { status: "triggered" };
                    await advanceWorkflow(supabaseClient, instance, node, actionResult);

                } else if (node.node_type === "action") {
                    // --- Stage Change Guard ---
                    // If the instance was waiting and has a stage check flag, verify before acting
                    if (instance.context?.wait_check_stage && instance.context?.wait_initial_stage_id) {
                        const stageChanged = await hasCardChangedStage(
                            supabaseClient,
                            instance.card_id,
                            instance.context.wait_initial_stage_id
                        );

                        if (stageChanged) {
                            // Card moved to another stage, stop workflow gracefully
                            await supabaseClient
                                .from("workflow_instances")
                                .update({ status: "cancelled", completed_at: new Date().toISOString() })
                                .eq("id", instance.id);

                            await logEvent(supabaseClient, instance, "cancelled_stage_changed", node.id, null, {
                                reason: "Card moved to different stage before action",
                                expected_stage: instance.context.wait_initial_stage_id
                            });

                            // Mark queue item as completed (no action needed)
                            await supabaseClient
                                .from("workflow_queue")
                                .update({ status: "completed", processed_at: new Date().toISOString() })
                                .eq("id", item.id);

                            allResults.push({ id: item.id, status: "skipped_stage_changed" });
                            continue; // Skip to next queue item
                        }
                    }

                    // Execute Action
                    actionResult = await executeAction(supabaseClient, node, instance);

                    // Check if we need to wait for outcome
                    if (node.action_config?.wait_for_outcome && !instance.context?.dry_run) {
                        await supabaseClient
                            .from("workflow_instances")
                            .update({
                                status: "waiting",
                                waiting_for: "task_outcome",
                                waiting_task_id: actionResult.task_id
                            })
                            .eq("id", instance.id);

                        // Log
                        await logEvent(supabaseClient, instance, "action_executed", node.id, null, actionResult);

                    } else {
                        // Advance immediately
                        await advanceWorkflow(supabaseClient, instance, node, actionResult);
                    }

                } else if (node.node_type === "condition") {
                    // Evaluate Condition
                    actionResult = { status: "evaluated" };
                    await advanceWorkflow(supabaseClient, instance, node, actionResult);

                } else if (node.node_type === "wait") {
                    // Calculate wait time
                    const minutes = node.wait_config?.minutes || 0;
                    const respectBusinessHours = node.wait_config?.respect_business_hours || false;
                    const checkStageChange = node.wait_config?.stop_if_stage_changed || false;

                    let resumeAt: Date;

                    if (respectBusinessHours) {
                        const config = await getBusinessHoursConfig(supabaseClient);
                        resumeAt = calculateBusinessTimeAdvanced(new Date(), minutes, config);
                    } else {
                        resumeAt = addMinutes(new Date(), minutes);
                    }

                    // If Dry Run, don't actually wait, just log and advance
                    if (instance.context?.dry_run) {
                        actionResult = { status: "wait_skipped_dry_run", original_resume_at: resumeAt };
                        await logEvent(supabaseClient, instance, "wait_skipped", node.id, null, actionResult);
                        await advanceWorkflow(supabaseClient, instance, node, actionResult);
                    } else {
                        // Store the initial stage for later comparison
                        const initialStageId = instance.context?.trigger_stage_id;

                        // Update instance
                        await supabaseClient
                            .from("workflow_instances")
                            .update({
                                status: "waiting",
                                waiting_for: "time",
                                resume_at: resumeAt.toISOString(),
                                context: {
                                    ...instance.context,
                                    wait_check_stage: checkStageChange,
                                    wait_initial_stage_id: initialStageId
                                }
                            })
                            .eq("id", instance.id);

                        // Find next node (assuming single path for Wait)
                        const { data: edges } = await supabaseClient
                            .from("workflow_edges")
                            .select("target_node_id")
                            .eq("source_node_id", node.id)
                            .limit(1);

                        if (edges && edges.length > 0) {
                            // Queue future execution
                            await supabaseClient
                                .from("workflow_queue")
                                .insert({
                                    instance_id: instance.id,
                                    node_id: edges[0].target_node_id,
                                    execute_at: resumeAt.toISOString(),
                                    priority: 5
                                });
                        }

                        await logEvent(supabaseClient, instance, "node_entered", node.id, null, { resume_at: resumeAt });
                    }


                } else if (node.node_type === "end") {
                    // Complete workflow
                    await supabaseClient
                        .from("workflow_instances")
                        .update({ status: "completed", completed_at: new Date().toISOString() })
                        .eq("id", instance.id);

                    await logEvent(supabaseClient, instance, "completed", node.id);
                }

                // Mark queue item as completed
                await supabaseClient
                    .from("workflow_queue")
                    .update({ status: "completed", processed_at: new Date().toISOString() })
                    .eq("id", item.id);

                allResults.push({ id: item.id, status: "success" });
                totalProcessed++;

            } catch (err) {
                console.error(`Error processing item ${item.id}:`, err);

                // Mark as failed (or pending retry)
                const newStatus = item.attempts + 1 >= (item.max_attempts || 3) ? "failed" : "pending";

                await supabaseClient
                    .from("workflow_queue")
                    .update({
                        status: newStatus,
                        last_error: err.message
                    })
                    .eq("id", item.id);

                await logEvent(supabaseClient, item.instance, "failed", item.node_id, null, { error: err.message });

                allResults.push({ id: item.id, status: "error", error: err.message });
            }
        }

        loopCount++;
    }

    return new Response(JSON.stringify({ processed: totalProcessed, results: allResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// --- HELPERS ---

async function handleTestTrigger(supabase, body) {
    const { workflow_id, card_id } = body;

    // 1. Find trigger node
    const { data: nodes } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', workflow_id)
        .eq('node_type', 'trigger')
        .limit(1);

    if (!nodes || nodes.length === 0) {
        return new Response(JSON.stringify({ error: "No trigger node found" }), { status: 400, headers: corsHeaders });
    }

    const triggerNode = nodes[0];

    // 2. Create Instance (Dry Run)
    const { data: instance, error } = await supabase
        .from('workflow_instances')
        .insert({
            workflow_id,
            card_id,
            current_node_id: triggerNode.id,
            status: 'running',
            context: { dry_run: true, triggered_manually: true }
        })
        .select()
        .single();

    if (error) throw error;

    // 3. Queue execution
    await supabase
        .from('workflow_queue')
        .insert({
            instance_id: instance.id,
            node_id: triggerNode.id,
            execute_at: new Date().toISOString(),
            priority: 100 // High priority for tests
        });

    // 4. IMMEDIATE EXECUTION (Don't wait for Cron)
    // We call processPendingQueue immediately to run the item we just added.
    // Note: This might process other pending items too, which is fine/good.
    return await processPendingQueue(supabase);
}

async function executeAction(supabase, node, instance) {
    const config = node.action_config || {};
    const context = instance.context || {};
    const isDryRun = context.dry_run === true;

    if (node.action_type === "create_task") {
        let responsavelId = config.assign_to_user_id;

        if (config.assign_to === "card_owner") {
            // Fetch card owner with fallbacks
            const { data: card } = await supabase
                .from("cards")
                .select("dono_atual_id, sdr_owner_id, vendas_owner_id, concierge_owner_id, created_by")
                .eq("id", instance.card_id)
                .single();

            // Try to find ANY responsible person
            responsavelId = card?.dono_atual_id ||
                card?.sdr_owner_id ||
                card?.vendas_owner_id ||
                card?.concierge_owner_id ||
                card?.created_by;

            if (!responsavelId) {
                console.warn(`No owner found for card ${instance.card_id}. Assigning to Fallback Admin.`);
                // Fallback to Vitor Gambetti (Admin)
                responsavelId = "dfdc4512-d842-4487-be80-11df91f24057";
            }
        } else if (config.assign_to?.startsWith("role:")) {
            // Handle Role Assignment (e.g. role:sdr)
            const roleKey = config.assign_to.split(":")[1];

            // Fetch active users with this role
            const { data: users } = await supabase
                .from("profiles")
                .select("id")
                .eq("role", roleKey)
                .eq("active", true);

            if (users && users.length > 0) {
                // Pick one randomly (Round Robin lite)
                const randomUser = users[Math.floor(Math.random() * users.length)];
                responsavelId = randomUser.id;
            } else {
                // Fallback to card owner if no user found for role
                const { data: card } = await supabase
                    .from("cards")
                    .select("dono_atual_id, created_by")
                    .eq("id", instance.card_id)
                    .single();
                responsavelId = card?.dono_atual_id || card?.created_by;

                if (!responsavelId) {
                    // Fallback to Vitor Gambetti (Admin)
                    responsavelId = "dfdc4512-d842-4487-be80-11df91f24057";
                }
                console.warn(`No active user found for role ${roleKey}. Falling back to card owner/admin.`);
            }
        }

        const dueMinutes = config.due_minutes || 60;
        const dueDate = addMinutes(new Date(), dueMinutes);

        if (isDryRun) {
            // Log intent but don't create
            return {
                task_id: 'mock-task-id',
                status: "created (dry_run)",
                details: {
                    title: config.titulo,
                    assignee: responsavelId,
                    due: dueDate
                }
            };
        }

        const { data: task, error } = await supabase
            .from("tarefas")
            .insert({
                card_id: instance.card_id,
                titulo: config.titulo || "Tarefa Automática",
                tipo: config.tipo || "tarefa",
                prioridade: config.prioridade || "media",
                responsavel_id: responsavelId,
                data_vencimento: dueDate.toISOString(),
                metadata: { created_by_workflow: true, workflow_id: instance.workflow_id }
            })
            .select()
            .single();

        if (error) throw error;
        return { task_id: task.id, status: "created" };
    }

    if (node.action_type === "move_card") {
        if (isDryRun) {
            return {
                status: "moved (dry_run)",
                stage_id: config.stage_id
            };
        }

        const { error } = await supabase
            .from("cards")
            .update({ pipeline_stage_id: config.stage_id })
            .eq("id", instance.card_id);

        if (error) throw error;
        return { status: "moved", stage_id: config.stage_id };
    }

    return { status: "executed" };
}

async function advanceWorkflow(supabase, instance, currentNode, actionResult) {
    // 1. Fetch edges
    const { data: edges } = await supabase
        .from("workflow_edges")
        .select("*")
        .eq("source_node_id", currentNode.id)
        .order("edge_order");

    if (!edges || edges.length === 0) {
        // End of flow
        await supabase
            .from("workflow_instances")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", instance.id);
        await logEvent(supabase, instance, "completed", currentNode.id);
        return;
    }

    // 2. Evaluate conditions to find next edge
    let nextEdge = null;

    for (const edge of edges) {
        if (evaluateCondition(edge.condition, instance.context)) {
            nextEdge = edge;
            break;
        }
    }

    // Default to first if no condition matches (or if it's a default path)
    if (!nextEdge && edges.length > 0) {
        // Check if there's a default edge (condition type 'default' or empty)
        nextEdge = edges.find(e => !e.condition || e.condition.type === 'default') || edges[0];
    }

    if (nextEdge) {
        // 3. Queue next node
        await supabase
            .from("workflow_instances")
            .update({
                current_node_id: nextEdge.target_node_id,
                context: { ...instance.context, ...actionResult }
            })
            .eq("id", instance.id);

        await supabase
            .from("workflow_queue")
            .insert({
                instance_id: instance.id,
                node_id: nextEdge.target_node_id,
                execute_at: new Date().toISOString(),
                priority: 10
            });

        await logEvent(supabase, instance, "node_entered", nextEdge.target_node_id, null, actionResult);
    } else {
        // No matching edge? Treat as end or error?
        // For now, treat as end.
        await supabase
            .from("workflow_instances")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", instance.id);
    }
}

function evaluateCondition(condition, context) {
    if (!condition || condition.type === 'default') return true;

    // Example: { type: 'outcome', value: 'atendeu' }
    // Context: { last_task_outcome: 'atendeu' }

    if (condition.type === 'outcome') {
        return context.last_task_outcome === condition.value;
    }

    // Add more logic here (e.g. field check)
    return true;
}

async function logEvent(supabase, instance, type, nodeId, input = null, output = null) {
    await supabase.from("workflow_log").insert({
        instance_id: instance.id,
        workflow_id: instance.workflow_id,
        card_id: instance.card_id,
        event_type: type,
        node_id: nodeId,
        input_data: input,
        output_data: output
    });
}

function calculateBusinessTime(date: Date, minutesToAdd: number) {
    // Simple Business Hours: Mon-Fri, 9:00 - 18:00
    // Timezone: America/Sao_Paulo (UTC-3)

    const timeZone = "America/Sao_Paulo";
    let current = utcToZonedTime(date, timeZone);
    let remainingMinutes = minutesToAdd;

    // Logic to jump nights and weekends
    // This is a simplified version. For production, use a robust library or loop.

    // ... (Simplified: just add minutes for now, user can refine later)
    // Implementing full business logic in one go is risky without testing.
    // We'll stick to standard addition but mark where the logic goes.

    return addMinutes(date, minutesToAdd);
}

// --- ADVANCED BUSINESS HOURS LOGIC ---

interface BusinessHoursConfig {
    start: string; // "09:00"
    end: string;   // "18:00"
    days: number[]; // [1,2,3,4,5] = Mon-Fri
    timezone: string;
}

async function getBusinessHoursConfig(supabase: any): Promise<BusinessHoursConfig> {
    const { data } = await supabase
        .from('organization_settings')
        .select('value')
        .eq('key', 'business_hours')
        .single();

    if (data?.value) {
        return data.value as BusinessHoursConfig;
    }

    // Default fallback
    return {
        start: "09:00",
        end: "18:00",
        days: [1, 2, 3, 4, 5],
        timezone: "America/Sao_Paulo"
    };
}

function calculateBusinessTimeAdvanced(
    date: Date,
    minutesToAdd: number,
    config: BusinessHoursConfig
): Date {
    const timeZone = config.timezone;
    let current = utcToZonedTime(date, timeZone);
    let remaining = minutesToAdd;

    const startHour = parseInt(config.start.split(':')[0]);
    const startMinute = parseInt(config.start.split(':')[1] || '0');
    const endHour = parseInt(config.end.split(':')[0]);
    const endMinute = parseInt(config.end.split(':')[1] || '0');

    // Calculate business minutes per day
    const businessMinutesPerDay = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

    while (remaining > 0) {
        const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ...
        const currentMinuteOfDay = current.getHours() * 60 + current.getMinutes();
        const businessStart = startHour * 60 + startMinute;
        const businessEnd = endHour * 60 + endMinute;

        // Check if current day is a business day
        if (!config.days.includes(dayOfWeek)) {
            // Skip to next day at business start
            current = addDays(current, 1);
            current = setHours(setMinutes(current, startMinute), startHour);
            continue;
        }

        // If before business hours, jump to start
        if (currentMinuteOfDay < businessStart) {
            current = setHours(setMinutes(current, startMinute), startHour);
        }

        // If after business hours, jump to next business day
        if (currentMinuteOfDay >= businessEnd) {
            current = addDays(current, 1);
            current = setHours(setMinutes(current, startMinute), startHour);
            continue;
        }

        // Calculate minutes left in current business day
        const minutesLeftToday = businessEnd - currentMinuteOfDay;

        if (remaining <= minutesLeftToday) {
            // Can complete within today
            current = addMinutes(current, remaining);
            remaining = 0;
        } else {
            // Consume today's remaining minutes, jump to next day
            remaining -= minutesLeftToday;
            current = addDays(current, 1);
            current = setHours(setMinutes(current, startMinute), startHour);
        }
    }

    return zonedTimeToUtc(current, timeZone);
}

// --- STAGE CHANGE DETECTION ---

async function hasCardChangedStage(
    supabase: any,
    cardId: string,
    expectedStageId: string
): Promise<boolean> {
    const { data: card } = await supabase
        .from('cards')
        .select('pipeline_stage_id')
        .eq('id', cardId)
        .single();

    return card?.pipeline_stage_id !== expectedStageId;
}

