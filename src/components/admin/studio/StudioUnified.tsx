import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Loader2, Plus, Trash2, Eye, EyeOff, CheckSquare, Square, LayoutTemplate, Shield, Edit2, Layers, Grid } from 'lucide-react'
import { cn } from '../../../lib/utils'
import FieldInspectorDrawer from './FieldInspectorDrawer'
import type { Database } from '../../../database.types'

type SystemField = Database['public']['Tables']['system_fields']['Row']
type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type StageFieldConfig = Database['public']['Tables']['stage_field_config']['Row']

import { SECTIONS, MACRO_STAGES } from '../../../constants/admin'

export default function StudioUnified() {
    const queryClient = useQueryClient()
    const [isAdding, setIsAdding] = useState(false)
    const [editingField, setEditingField] = useState<SystemField | null>(null)
    const [viewMode, setViewMode] = useState<'matrix' | 'macro'>('macro')

    // New Field State
    const [newField, setNewField] = useState<Partial<SystemField>>({
        key: '',
        label: '',
        type: 'text',
        section: 'trip_info',
        active: true,
        is_system: false
    })

    // --- Data Fetching ---
    const { data: stages } = useQuery({
        queryKey: ['pipeline-stages-unified'],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_stages').select('*').order('ordem')
            return data as PipelineStage[]
        }
    })

    const { data: fields, isLoading: loadingFields } = useQuery({
        queryKey: ['system-fields-unified'],
        queryFn: async () => {
            const { data } = await supabase.from('system_fields').select('*').order('section').order('label')
            return data as SystemField[]
        }
    })

    const { data: configs } = useQuery({
        queryKey: ['stage-field-configs-unified'],
        queryFn: async () => {
            const { data } = await supabase.from('stage_field_config').select('*')
            return data as StageFieldConfig[]
        }
    })

    // --- Optimistic State ---
    const [localConfigs, setLocalConfigs] = useState<Record<string, StageFieldConfig>>({})

    useEffect(() => {
        if (configs) {
            const map: Record<string, StageFieldConfig> = {}
            configs.forEach(c => {
                map[`${c.stage_id}-${c.field_key}`] = c
            })
            setLocalConfigs(map)
        }
    }, [configs])

    // --- Mutations ---
    const createFieldMutation = useMutation({
        mutationFn: async (field: Partial<SystemField>) => {
            const key = field.key?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            const { error } = await supabase.from('system_fields').insert({ ...field, key } as any)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-unified'] })
            setIsAdding(false)
            setNewField({ key: '', label: '', type: 'text', section: 'trip_info', active: true, is_system: false })
        },
        onError: (err) => alert(err.message)
    })

    const updateFieldMutation = useMutation({
        mutationFn: async (field: Partial<SystemField>) => {
            const { error } = await supabase
                .from('system_fields')
                .update({
                    label: field.label,
                    active: field.active,
                    section: field.section,
                    type: field.type,
                    options: field.options
                })
                .eq('key', field.key!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-unified'] })
            setEditingField(null)
        }
    })

    const deleteFieldMutation = useMutation({
        mutationFn: async (key: string) => {
            const { error } = await supabase.from('system_fields').delete().eq('key', key)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-fields-unified'] })
    })

    const upsertConfigMutation = useMutation({
        mutationFn: async (newConfigs: Partial<StageFieldConfig>[]) => {
            const { error } = await supabase
                .from('stage_field_config')
                .upsert(newConfigs as any, { onConflict: 'stage_id, field_key' })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-field-configs-unified'] })
        }
    })

    // --- Helpers ---
    const getConfig = (stageId: string, fieldKey: string) => {
        return localConfigs[`${stageId}-${fieldKey}`]
    }

    const handleConfigToggle = (stageId: string, fieldKey: string, type: 'visible' | 'required' | 'header') => {
        const current = getConfig(stageId, fieldKey)
        const nextValue = {
            stage_id: stageId,
            field_key: fieldKey,
            is_visible: current?.is_visible ?? true,
            is_required: current?.is_required ?? false,
            show_in_header: current?.show_in_header ?? false
        }

        if (type === 'visible') nextValue.is_visible = !nextValue.is_visible
        if (type === 'required') nextValue.is_required = !nextValue.is_required
        if (type === 'header') nextValue.show_in_header = !nextValue.show_in_header

        setLocalConfigs(prev => ({ ...prev, [`${stageId}-${fieldKey}`]: nextValue as StageFieldConfig }))
        upsertConfigMutation.mutate([nextValue])
    }

    const handleMacroToggle = (macroStageId: string, fieldKey: string, type: 'visible' | 'required' | 'header') => {
        const targetStages = stages?.filter(s => s.fase === macroStageId) || []
        if (targetStages.length === 0) return

        // Calculate current state (if ALL are true, toggle to false. Otherwise toggle to true)
        const allTrue = targetStages.every(s => {
            const c = getConfig(s.id, fieldKey)
            if (type === 'visible') return c?.is_visible !== false // default true
            if (type === 'required') return c?.is_required === true
            if (type === 'header') return c?.show_in_header === true
            return false
        })

        const newValue = !allTrue
        const updates: Partial<StageFieldConfig>[] = []

        targetStages.forEach(s => {
            const current = getConfig(s.id, fieldKey)
            const next = {
                stage_id: s.id,
                field_key: fieldKey,
                is_visible: current?.is_visible ?? true,
                is_required: current?.is_required ?? false,
                show_in_header: current?.show_in_header ?? false
            }

            if (type === 'visible') next.is_visible = newValue
            if (type === 'required') next.is_required = newValue
            if (type === 'header') next.show_in_header = newValue

            updates.push(next)

            // Optimistic update
            setLocalConfigs(prev => ({ ...prev, [`${s.id}-${fieldKey}`]: next as StageFieldConfig }))
        })

        upsertConfigMutation.mutate(updates)
    }

    const getMacroState = (macroStageId: string, fieldKey: string, type: 'visible' | 'required' | 'header') => {
        const targetStages = stages?.filter(s => s.fase === macroStageId) || []
        if (targetStages.length === 0) return 'none'

        let trueCount = 0
        targetStages.forEach(s => {
            const c = getConfig(s.id, fieldKey)
            let val = false
            if (type === 'visible') val = c?.is_visible !== false
            if (type === 'required') val = c?.is_required === true
            if (type === 'header') val = c?.show_in_header === true
            if (val) trueCount++
        })

        if (trueCount === targetStages.length) return 'all'
        if (trueCount > 0) return 'some'
        return 'none'
    }

    const fieldsBySection = useMemo(() => {
        if (!fields) return {}
        return fields.reduce((acc, field) => {
            const section = field.section || 'details'
            if (!acc[section]) acc[section] = []
            acc[section].push(field)
            return acc
        }, {} as Record<string, SystemField[]>)
    }, [fields])

    if (loadingFields) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Matriz de Governança</h2>
                    <p className="text-gray-500 mt-1">Configure a visibilidade e regras de campos por etapa.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('macro')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                viewMode === 'macro' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Layers className="w-4 h-4" />
                            Visão Macro
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                viewMode === 'matrix' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Grid className="w-4 h-4" />
                            Matriz Detalhada
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Campo
                    </button>
                </div>
            </div>

            {/* INSPECTOR DRAWER */}
            <FieldInspectorDrawer
                isOpen={isAdding || !!editingField}
                onClose={() => { setIsAdding(false); setEditingField(null); }}
                field={editingField || newField}
                isCreating={isAdding}
                onSave={(field) => {
                    if (isAdding) {
                        createFieldMutation.mutate(field)
                    } else {
                        updateFieldMutation.mutate(field)
                    }
                }}
            />

            {/* MATRIX GRID */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            {/* Sticky Corner */}
                            <th className="sticky left-0 top-0 z-20 bg-gray-50 border-b border-r border-gray-200 p-4 min-w-[250px] text-left">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Campos do Sistema</span>
                            </th>

                            {/* Headers based on View Mode */}
                            {viewMode === 'macro' ? (
                                MACRO_STAGES.map(macro => (
                                    <th key={macro.id} className={cn("sticky top-0 z-10 border-b border-gray-200 p-3 min-w-[180px] text-center", macro.bgColor)}>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={cn("text-xs font-bold uppercase", macro.textColor)}>{macro.label}</span>
                                            <span className="text-[10px] text-gray-500 font-normal">
                                                {stages?.filter(s => s.fase === macro.id).length} etapas
                                            </span>
                                        </div>
                                    </th>
                                ))
                            ) : (
                                stages?.map(stage => (
                                    <th key={stage.id} className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-2 min-w-[140px] text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full mb-1",
                                                stage.fase === 'SDR' ? 'bg-blue-500' :
                                                    stage.fase === 'Planner' ? 'bg-purple-500' :
                                                        stage.fase === 'Pós-venda' ? 'bg-green-500' : 'bg-gray-500'
                                            )} />
                                            <span className="text-xs font-bold text-gray-700 uppercase">{stage.nome}</span>
                                        </div>
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {SECTIONS.map(section => {
                            const sectionFields = fieldsBySection[section.value] || []
                            if (sectionFields.length === 0) return null

                            return (
                                <>
                                    {/* Section Header */}
                                    <tr key={section.value} className="bg-gray-50/50">
                                        <td colSpan={(viewMode === 'macro' ? MACRO_STAGES.length : (stages?.length || 0)) + 1} className="px-4 py-2 border-y border-gray-100">
                                            <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide", section.color)}>
                                                {section.label}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Field Rows */}
                                    {sectionFields.map(field => (
                                        <tr key={field.key} className="group hover:bg-indigo-50/30 transition-colors">
                                            {/* Field Name Column (Sticky Left) */}
                                            <td className="sticky left-0 z-10 bg-white group-hover:bg-indigo-50/30 border-r border-gray-100 px-4 py-3">
                                                <div className="flex items-center justify-between group/cell">
                                                    <div
                                                        className="cursor-pointer"
                                                        onClick={() => setEditingField(field)}
                                                    >
                                                        <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                                            {field.label}
                                                            {field.is_system && <Shield className="w-3 h-3 text-gray-400" />}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{field.key}</div>
                                                    </div>

                                                    {/* Row Actions (Hover) */}
                                                    <div className="opacity-0 group-hover/cell:opacity-100 flex items-center gap-1">
                                                        <button
                                                            onClick={() => setEditingField(field)}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-100"
                                                            title="Editar Campo"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        {!field.is_system && (
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Tem certeza?')) deleteFieldMutation.mutate(field.key)
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-100"
                                                                title="Excluir Campo"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Config Cells */}
                                            {viewMode === 'macro' ? (
                                                MACRO_STAGES.map(macro => {
                                                    const visibleState = getMacroState(macro.id, field.key, 'visible')
                                                    const requiredState = getMacroState(macro.id, field.key, 'required')
                                                    const headerState = getMacroState(macro.id, field.key, 'header')

                                                    return (
                                                        <td key={macro.id} className="px-2 py-3 text-center border-r border-gray-50 last:border-r-0">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => handleMacroToggle(macro.id, field.key, 'visible')}
                                                                    className={cn(
                                                                        "p-1.5 rounded-md transition-all",
                                                                        visibleState === 'all' ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100" :
                                                                            visibleState === 'some' ? "bg-blue-50/50 text-blue-400 ring-1 ring-blue-100/50" :
                                                                                "bg-transparent text-gray-200 hover:bg-gray-50 hover:text-gray-400"
                                                                    )}
                                                                    title="Visível"
                                                                >
                                                                    {visibleState === 'some' ? <div className="w-3.5 h-3.5 flex items-center justify-center font-bold text-xs">-</div> :
                                                                        visibleState === 'all' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                                </button>

                                                                <button
                                                                    onClick={() => handleMacroToggle(macro.id, field.key, 'required')}
                                                                    className={cn(
                                                                        "p-1.5 rounded-md transition-all",
                                                                        requiredState === 'all' ? "bg-red-50 text-red-600 ring-1 ring-red-100" :
                                                                            requiredState === 'some' ? "bg-red-50/50 text-red-400 ring-1 ring-red-100/50" :
                                                                                "bg-transparent text-gray-200 hover:bg-gray-50 hover:text-gray-400"
                                                                    )}
                                                                    title="Obrigatório"
                                                                >
                                                                    {requiredState === 'some' ? <div className="w-3.5 h-3.5 flex items-center justify-center font-bold text-xs">-</div> :
                                                                        requiredState === 'all' ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                                                </button>

                                                                <button
                                                                    onClick={() => handleMacroToggle(macro.id, field.key, 'header')}
                                                                    className={cn(
                                                                        "p-1.5 rounded-md transition-all",
                                                                        headerState === 'all' ? "bg-purple-50 text-purple-600 ring-1 ring-purple-100" :
                                                                            headerState === 'some' ? "bg-purple-50/50 text-purple-400 ring-1 ring-purple-100/50" :
                                                                                "bg-transparent text-gray-200 hover:bg-gray-50 hover:text-gray-400"
                                                                    )}
                                                                    title="No Cabeçalho"
                                                                >
                                                                    {headerState === 'some' ? <div className="w-3.5 h-3.5 flex items-center justify-center font-bold text-xs">-</div> :
                                                                        <LayoutTemplate className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )
                                                })
                                            ) : (
                                                stages?.map(stage => {
                                                    const config = getConfig(stage.id, field.key)
                                                    const isVisible = config?.is_visible ?? true
                                                    const isRequired = config?.is_required ?? false
                                                    const isHeader = config?.show_in_header ?? false

                                                    return (
                                                        <td key={stage.id} className="px-2 py-3 text-center border-r border-gray-50 last:border-r-0">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => handleConfigToggle(stage.id, field.key, 'visible')}
                                                                    className={cn(
                                                                        "p-1.5 rounded-md transition-all",
                                                                        isVisible
                                                                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-100"
                                                                            : "bg-transparent text-gray-200 hover:bg-gray-50 hover:text-gray-400"
                                                                    )}
                                                                    title={isVisible ? "Visível" : "Oculto"}
                                                                >
                                                                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                                </button>

                                                                <button
                                                                    onClick={() => handleConfigToggle(stage.id, field.key, 'required')}
                                                                    className={cn(
                                                                        "p-1.5 rounded-md transition-all",
                                                                        isRequired
                                                                            ? "bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-100"
                                                                            : "bg-transparent text-gray-200 hover:bg-gray-50 hover:text-gray-400"
                                                                    )}
                                                                    title={isRequired ? "Obrigatório" : "Opcional"}
                                                                >
                                                                    {isRequired ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                                                </button>

                                                                <button
                                                                    onClick={() => handleConfigToggle(stage.id, field.key, 'header')}
                                                                    className={cn(
                                                                        "p-1.5 rounded-md transition-all",
                                                                        isHeader
                                                                            ? "bg-purple-50 text-purple-600 hover:bg-purple-100 ring-1 ring-purple-100"
                                                                            : "bg-transparent text-gray-200 hover:bg-gray-50 hover:text-gray-400"
                                                                    )}
                                                                    title={isHeader ? "No Cabeçalho" : "Fora do Cabeçalho"}
                                                                >
                                                                    <LayoutTemplate className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )
                                                })
                                            )}
                                        </tr>
                                    ))}
                                </>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
