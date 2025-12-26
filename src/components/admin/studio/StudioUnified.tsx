import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, Eye, EyeOff, CheckSquare, Square, LayoutTemplate, Shield } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { Database } from '../../../database.types'

type SystemField = Database['public']['Tables']['system_fields']['Row']
type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type StageFieldConfig = Database['public']['Tables']['stage_field_config']['Row']

const SECTIONS = [
    { value: 'trip_info', label: 'Informações da Viagem' },
    { value: 'people', label: 'Pessoas / Viajantes' },
    { value: 'payment', label: 'Pagamento' },
    { value: 'system', label: 'Sistema / Interno' },
    { value: 'details', label: 'Outros Detalhes' }
]

const FIELD_TYPES = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
    { value: 'currency', label: 'Moeda' },
    { value: 'select', label: 'Seleção' },
    { value: 'multiselect', label: 'Múltipla Seleção' },
    { value: 'boolean', label: 'Sim/Não' },
    { value: 'json', label: 'JSON (Complexo)' }
]

export default function StudioUnified() {
    const queryClient = useQueryClient()
    const [expandedField, setExpandedField] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)

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
                .update({ label: field.label, active: field.active, section: field.section, type: field.type })
                .eq('key', field.key!)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-fields-unified'] })
    })

    const deleteFieldMutation = useMutation({
        mutationFn: async (key: string) => {
            const { error } = await supabase.from('system_fields').delete().eq('key', key)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-fields-unified'] })
    })

    const upsertConfigMutation = useMutation({
        mutationFn: async (newConfig: Partial<StageFieldConfig>) => {
            const { error } = await supabase
                .from('stage_field_config')
                .upsert(newConfig as any, { onConflict: 'stage_id, field_key' })
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stage-field-configs-unified'] })
    })

    // --- Helpers ---
    const getConfig = (stageId: string, fieldKey: string) => {
        return configs?.find(c => c.stage_id === stageId && c.field_key === fieldKey)
    }

    const handleConfigToggle = (stageId: string, fieldKey: string, type: 'visible' | 'required' | 'header') => {
        const current = getConfig(stageId, fieldKey)
        const updates: any = {
            stage_id: stageId,
            field_key: fieldKey,
            is_visible: current?.is_visible ?? true,
            is_required: current?.is_required ?? false,
            show_in_header: current?.show_in_header ?? false
        }

        if (type === 'visible') updates.is_visible = !updates.is_visible
        if (type === 'required') updates.is_required = !updates.is_required
        if (type === 'header') updates.show_in_header = !updates.show_in_header

        upsertConfigMutation.mutate(updates)
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
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gerenciador de Campos</h2>
                    <p className="text-gray-500 mt-1">Configure quais dados são coletados e suas regras por etapa.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Novo Campo
                </button>
            </div>

            {/* Add New Field Form */}
            {isAdding && (
                <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-xl p-6 animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <h3 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Adicionar Novo Campo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Chave (ID único)</label>
                            <input
                                value={newField.key}
                                onChange={e => setNewField({ ...newField, key: e.target.value })}
                                placeholder="ex: data_nascimento"
                                className="w-full rounded-lg border-indigo-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Nome Visível (Label)</label>
                            <input
                                value={newField.label}
                                onChange={e => setNewField({ ...newField, label: e.target.value })}
                                placeholder="ex: Data de Nascimento"
                                className="w-full rounded-lg border-indigo-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Tipo</label>
                            <select
                                value={newField.type}
                                onChange={e => setNewField({ ...newField, type: e.target.value })}
                                className="w-full rounded-lg border-indigo-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Seção</label>
                            <select
                                value={newField.section || 'trip_info'}
                                onChange={e => setNewField({ ...newField, section: e.target.value })}
                                className="w-full rounded-lg border-indigo-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => createFieldMutation.mutate(newField)}
                            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
                        >
                            Salvar Campo
                        </button>
                    </div>
                </div>
            )}

            {/* Fields List Grouped by Section */}
            <div className="space-y-8">
                {SECTIONS.map(section => {
                    const sectionFields = fieldsBySection[section.value] || []
                    if (sectionFields.length === 0) return null

                    return (
                        <div key={section.value} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">{section.label}</h3>
                                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                                    {sectionFields.length} campos
                                </span>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {sectionFields.map(field => {
                                    const isExpanded = expandedField === field.key

                                    return (
                                        <div key={field.key} className={cn("transition-colors", isExpanded ? "bg-indigo-50/30" : "hover:bg-gray-50")}>
                                            {/* Field Header Row */}
                                            <div
                                                className="px-6 py-4 flex items-center justify-between cursor-pointer group"
                                                onClick={() => setExpandedField(isExpanded ? null : field.key)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "p-2 rounded-lg transition-colors",
                                                        isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm"
                                                    )}>
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                                            {field.label}
                                                            {!field.active && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">Inativo</span>
                                                            )}
                                                            {/* Check if field is in header for ANY stage */}
                                                            {stages?.some(s => getConfig(s.id, field.key)?.show_in_header) && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase flex items-center gap-1">
                                                                    <LayoutTemplate className="w-3 h-3" />
                                                                    Cabeçalho
                                                                </span>
                                                            )}
                                                            {field.is_system && (
                                                                <div title="Campo de Sistema">
                                                                    <Shield className="w-3 h-3 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{field.key}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                                    <span className="px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-600">
                                                        {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                                    </span>

                                                    {!field.is_system && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (confirm('Tem certeza? Isso pode afetar dados existentes.')) deleteFieldMutation.mutate(field.key)
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Excluir Campo"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Configuration Panel */}
                                            {isExpanded && (
                                                <div className="px-6 pb-6 pt-2 border-t border-indigo-100 bg-indigo-50/30 animate-in slide-in-from-top-1">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                                        {/* Left: Global Settings */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Configurações Globais</h4>

                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Campo</label>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        defaultValue={field.label || ''}
                                                                        onBlur={(e) => updateFieldMutation.mutate({ ...field, label: e.target.value })}
                                                                        className="flex-1 rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">Seção</label>
                                                                <select
                                                                    defaultValue={field.section || 'details'}
                                                                    onChange={(e) => updateFieldMutation.mutate({ ...field, section: e.target.value })}
                                                                    className="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                >
                                                                    {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                                </select>
                                                            </div>

                                                            <div className="flex items-center gap-2 pt-2">
                                                                <button
                                                                    onClick={() => updateFieldMutation.mutate({ ...field, active: !field.active })}
                                                                    className={cn(
                                                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                                                        field.active ? 'bg-green-500' : 'bg-gray-200'
                                                                    )}
                                                                >
                                                                    <span className={cn(
                                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                                        field.active ? 'translate-x-6' : 'translate-x-1'
                                                                    )} />
                                                                </button>
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    {field.active ? 'Campo Ativo' : 'Campo Inativo'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right: Per-Stage Rules */}
                                                        <div className="lg:col-span-2">
                                                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">Regras por Etapa</h4>
                                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                                <table className="min-w-full divide-y divide-gray-100">
                                                                    <thead className="bg-gray-50">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Etapa</th>
                                                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase" title="Aparece no formulário?">Visível</th>
                                                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase" title="Bloqueia avanço se vazio?">Obrigatório</th>
                                                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase" title="Mostra no cabeçalho do card?">Cabeçalho</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {stages?.map(stage => {
                                                                            const config = getConfig(stage.id, field.key)
                                                                            const isVisible = config?.is_visible ?? true
                                                                            const isRequired = config?.is_required ?? false
                                                                            const isHeader = config?.show_in_header ?? false

                                                                            return (
                                                                                <tr key={stage.id} className="hover:bg-gray-50">
                                                                                    <td className="px-4 py-2 text-sm text-gray-900">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={cn(
                                                                                                "w-2 h-2 rounded-full",
                                                                                                stage.fase === 'SDR' ? 'bg-blue-500' :
                                                                                                    stage.fase === 'Planner' ? 'bg-purple-500' :
                                                                                                        stage.fase === 'Pós-venda' ? 'bg-green-500' : 'bg-gray-500'
                                                                                            )} />
                                                                                            {stage.nome}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-center">
                                                                                        <button
                                                                                            onClick={() => handleConfigToggle(stage.id, field.key, 'visible')}
                                                                                            className={cn("p-1.5 rounded transition-colors", isVisible ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-300 hover:bg-gray-100")}
                                                                                        >
                                                                                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                                                        </button>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-center">
                                                                                        <button
                                                                                            onClick={() => handleConfigToggle(stage.id, field.key, 'required')}
                                                                                            className={cn("p-1.5 rounded transition-colors", isRequired ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-gray-300 hover:bg-gray-100")}
                                                                                        >
                                                                                            {isRequired ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                                                        </button>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-center">
                                                                                        <button
                                                                                            onClick={() => handleConfigToggle(stage.id, field.key, 'header')}
                                                                                            className={cn("p-1.5 rounded transition-colors", isHeader ? "text-purple-600 bg-purple-50 hover:bg-purple-100" : "text-gray-300 hover:bg-gray-100")}
                                                                                        >
                                                                                            <LayoutTemplate className="w-4 h-4" />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
