import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Loader2, Plus, Trash2, Edit2, Check, X, Shield } from 'lucide-react'
import type { Database } from '../../../database.types'

type SystemField = Database['public']['Tables']['system_fields']['Row']

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

const SECTIONS = [
    { value: 'header', label: 'Cabeçalho (Header)' },
    { value: 'trip_info', label: 'Informações da Viagem' },
    { value: 'people', label: 'Pessoas / Viajantes' },
    { value: 'payment', label: 'Pagamento' },
    { value: 'system', label: 'Sistema / Interno' }
]

export default function StudioFields() {
    const queryClient = useQueryClient()
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [newField, setNewField] = useState<Partial<SystemField>>({
        key: '',
        label: '',
        type: 'text',
        section: 'trip_info',
        active: true,
        is_system: false
    })

    const { data: fields, isLoading } = useQuery({
        queryKey: ['system-fields-studio'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_fields')
                .select('*')
                .order('section')
                .order('label')

            if (error) throw error
            return data as SystemField[]
        }
    })

    const createFieldMutation = useMutation({
        mutationFn: async (field: Partial<SystemField>) => {
            // Validate key format (lowercase, underscore)
            const key = field.key?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

            const { error } = await supabase
                .from('system_fields')
                .insert({ ...field, key } as any)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-studio'] })
            setIsAdding(false)
            setNewField({ key: '', label: '', type: 'text', section: 'trip_info', active: true, is_system: false })
        },
        onError: (error) => alert(error.message)
    })

    const updateFieldMutation = useMutation({
        mutationFn: async (field: Partial<SystemField>) => {
            const { error } = await supabase
                .from('system_fields')
                .update({ label: field.label, active: field.active, section: field.section })
                .eq('key', field.key!)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-studio'] })
            setEditingId(null)
        }
    })

    const deleteFieldMutation = useMutation({
        mutationFn: async (key: string) => {
            const { error } = await supabase
                .from('system_fields')
                .delete()
                .eq('key', key)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-studio'] })
        }
    })

    const handleSaveNew = () => {
        if (!newField.key || !newField.label) return alert('Preencha chave e nome.')
        createFieldMutation.mutate(newField)
    }

    if (isLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Dicionário de Campos</h2>
                    <p className="text-sm text-gray-500">Defina quais dados o sistema pode armazenar.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    <Plus className="w-4 h-4" />
                    Novo Campo
                </button>
            </div>

            {/* Add New Form */}
            {isAdding && (
                <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-medium text-indigo-900 mb-3">Novo Campo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Chave (ID)</label>
                            <input
                                value={newField.key}
                                onChange={e => setNewField({ ...newField, key: e.target.value })}
                                placeholder="ex: data_nascimento"
                                className="w-full rounded border-indigo-200 text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Nome Visível (Label)</label>
                            <input
                                value={newField.label}
                                onChange={e => setNewField({ ...newField, label: e.target.value })}
                                placeholder="ex: Data de Nascimento"
                                className="w-full rounded border-indigo-200 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Tipo</label>
                            <select
                                value={newField.type}
                                onChange={e => setNewField({ ...newField, type: e.target.value })}
                                className="w-full rounded border-indigo-200 text-sm"
                            >
                                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-700 mb-1">Seção Padrão</label>
                            <select
                                value={newField.section}
                                onChange={e => setNewField({ ...newField, section: e.target.value })}
                                className="w-full rounded border-indigo-200 text-sm"
                            >
                                {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button onClick={handleSaveNew} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar Campo</button>
                    </div>
                </div>
            )}

            {/* Fields List */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campo / Chave</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seção</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {fields?.map((field) => (
                            <tr key={field.key} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingId === field.key ? (
                                        <input
                                            defaultValue={field.label}
                                            className="rounded border-gray-300 text-sm w-full"
                                            onBlur={(e) => updateFieldMutation.mutate({ ...field, label: e.target.value })}
                                        />
                                    ) : (
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{field.label}</div>
                                            <div className="text-xs text-gray-500 font-mono">{field.key}</div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {SECTIONS.find(s => s.value === field.section)?.label || field.section}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => updateFieldMutation.mutate({ ...field, active: !field.active })}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${field.active ? 'bg-green-500' : 'bg-gray-200'}`}
                                    >
                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${field.active ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {field.is_system ? (
                                        <span className="text-gray-400 flex items-center justify-end gap-1" title="Campo de Sistema (Protegido)">
                                            <Shield className="w-4 h-4" />
                                        </span>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingId(editingId === field.key ? null : field.key)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Excluir este campo? Dados associados podem ser perdidos.')) {
                                                        deleteFieldMutation.mutate(field.key)
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
