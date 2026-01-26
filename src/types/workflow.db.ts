export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Workflow {
    id: string
    name: string
    description: string | null
    trigger_type: 'stage_enter' | 'stage_exit' | 'task_outcome' | 'field_changed'
    trigger_config: Record<string, any>
    pipeline_id: string | null
    is_active: boolean
    is_draft: boolean
    created_at: string
    updated_at: string
    created_by: string | null
}

export interface WorkflowNode {
    id: string
    workflow_id: string
    node_key: string
    node_type: 'trigger' | 'action' | 'condition' | 'wait' | 'end'
    action_type: 'create_task' | 'move_card' | 'notify' | 'update_field' | null
    action_config: Record<string, any> | null
    condition_config: Record<string, any> | null
    wait_config: Record<string, any> | null
    position_x: number
    position_y: number
    created_at: string
}

export interface WorkflowEdge {
    id: string
    workflow_id: string
    source_node_id: string
    target_node_id: string
    condition: Record<string, any> | null
    label: string | null
    edge_order: number
    created_at: string
}

export interface WorkflowInstance {
    id: string
    workflow_id: string
    card_id: string
    current_node_id: string | null
    status: 'running' | 'waiting' | 'completed' | 'cancelled' | 'failed'
    waiting_for: 'task_outcome' | 'time' | 'field_change' | null
    waiting_task_id: string | null
    resume_at: string | null
    context: Record<string, any>
    started_at: string
    completed_at: string | null
    error_message: string | null
}

export interface WorkflowQueueItem {
    id: string
    instance_id: string
    execute_at: string
    priority: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    attempts: number
    max_attempts: number
    last_error: string | null
    node_id: string | null
    action_payload: Record<string, any> | null
    created_at: string
    processed_at: string | null
}

export interface WorkflowLog {
    id: string
    instance_id: string | null
    workflow_id: string | null
    card_id: string | null
    event_type: 'started' | 'node_entered' | 'action_executed' | 'condition_evaluated' | 'completed' | 'failed'
    node_id: string | null
    input_data: Record<string, any> | null
    output_data: Record<string, any> | null
    error_message: string | null
    created_at: string
    duration_ms: number | null
}

export interface TaskTypeOutcome {
    tipo: string
    outcome_key: string
    outcome_label: string
    ordem: number
    is_success: boolean
}
