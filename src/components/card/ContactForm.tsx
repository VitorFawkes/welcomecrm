import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'

type Contato = Database['public']['Tables']['contatos']['Row']
import { getTipoPessoa } from '../../lib/contactUtils'
import { Loader2, X, Link } from 'lucide-react'
import { ORIGEM_OPTIONS, needsOrigemDetalhe } from '../../lib/constants/origem'


interface ContactFormProps {
    contact?: Contato
    onSave: (contact: Contato) => void
    onCancel: () => void
    initialName?: string
}

export default function ContactForm({ contact, onSave, onCancel, initialName = '' }: ContactFormProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [potentialGuardians, setPotentialGuardians] = useState<Contato[]>([])

    const [formData, setFormData] = useState<Partial<Contato>>({
        nome: contact?.nome || initialName,
        sobrenome: contact?.sobrenome || '',
        tipo_pessoa: contact?.tipo_pessoa || 'adulto',
        ...contact
    })

    useEffect(() => {
        if (formData.data_nascimento) {
            const tipo = getTipoPessoa(formData.data_nascimento)
            setFormData(prev => ({ ...prev, tipo_pessoa: tipo }))
        }
    }, [formData.data_nascimento])

    useEffect(() => {
        if (formData.tipo_pessoa === 'crianca') {
            fetchPotentialGuardians()
        }
    }, [formData.tipo_pessoa])

    const fetchPotentialGuardians = async () => {
        setLoading(true)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder perde tipo com encadeamento dinâmico
            const { data } = await (supabase.from('contatos') as any)
                .select('*')
                .eq('tipo_pessoa', 'adulto')
                .order('nome')

            if (data) {
                setPotentialGuardians(data)
            }
        } catch (error) {
            console.error('Error fetching guardians:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Build payload explicitly - do NOT spread formData as it may contain extra props (e.g., stats)
            const dataToSave = {
                nome: formData.nome || null,
                sobrenome: formData.sobrenome || null,
                tipo_pessoa: formData.tipo_pessoa || 'adulto',
                email: formData.email || null,
                telefone: formData.telefone || null,
                cpf: formData.cpf || null,
                passaporte: formData.passaporte || null,
                data_nascimento: formData.data_nascimento || null,
                responsavel_id: formData.tipo_pessoa === 'adulto' ? null : formData.responsavel_id,
                observacoes: formData.observacoes || null,
                origem: formData.origem || null,
                origem_detalhe: formData.origem_detalhe || null
            }

            let result
            if (contact?.id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder perde tipo com encadeamento dinâmico
                const { data, error } = await (supabase.from('contatos') as any)
                    .update(dataToSave)
                    .eq('id', contact.id)
                    .select()
                    .single()

                if (error) throw error
                result = data
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder perde tipo com encadeamento dinâmico
                const { data, error } = await (supabase.from('contatos') as any)
                    .insert(dataToSave)
                    .select()
                    .single()

                if (error) throw error
                result = data
            }

            onSave(result)
        } catch (error: unknown) {
            console.error('Error saving contact:', error)
            const msg = error instanceof Error ? error.message : (error as Record<string, unknown>)?.message || 'Erro desconhecido'
            alert(`Erro ao salvar contato:\n${msg}`)
        } finally {
            setSaving(false)
        }
    }

    const isChild = formData.tipo_pessoa === 'crianca'

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                    {contact ? 'Editar Contato' : 'Novo Contato'}
                </h3>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-500"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nome *</label>
                    <input
                        type="text"
                        required
                        value={formData.nome || ''}
                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Sobrenome</label>
                    <input
                        type="text"
                        value={formData.sobrenome || ''}
                        onChange={e => setFormData({ ...formData, sobrenome: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                    <input
                        type="date"
                        value={formData.data_nascimento || ''}
                        onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <select
                        value={formData.tipo_pessoa || ''}
                        onChange={(e) => setFormData({ ...formData, tipo_pessoa: e.target.value as 'adulto' | 'crianca' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    >
                        <option value="adulto">Adulto</option>
                        <option value="crianca">Não Adulto</option>
                    </select>
                </div>

                {isChild && (
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Responsável</label>
                        <select
                            value={formData.responsavel_id || ''}
                            onChange={e => setFormData({ ...formData, responsavel_id: e.target.value || null })}
                            disabled={loading}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        >
                            <option value="">{loading ? 'Carregando...' : 'Selecione um responsável...'}</option>
                            {potentialGuardians.map(g => (
                                <option key={g.id} value={g.id}>{g.nome}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Only show these fields for Adults */}
                {!isChild && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <input
                                type="tel"
                                value={formData.telefone || ''}
                                onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">CPF</label>
                            <input
                                type="text"
                                value={formData.cpf || ''}
                                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Passaporte</label>
                            <input
                                type="text"
                                value={formData.passaporte || ''}
                                onChange={e => setFormData({ ...formData, passaporte: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>
                    </>
                )}

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Observações</label>
                    <textarea
                        rows={3}
                        value={formData.observacoes || ''}
                        onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    />
                </div>

                {/* Origem do Contato */}
                <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5" />
                        Origem do Contato
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ORIGEM_OPTIONS.map(opt => {
                            const selected = formData.origem === opt.value
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        origem: selected ? null : opt.value,
                                        origem_detalhe: selected ? null : formData.origem_detalhe
                                    })}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                        selected
                                            ? `${opt.color} ring-2 ring-offset-1 ring-indigo-500`
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            )
                        })}
                    </div>

                    {needsOrigemDetalhe(formData.origem) === 'indicacao' && (
                        <input
                            type="text"
                            placeholder="Quem indicou?"
                            value={formData.origem_detalhe || ''}
                            onChange={e => setFormData({ ...formData, origem_detalhe: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        />
                    )}

                    {needsOrigemDetalhe(formData.origem) === 'mkt' && (
                        <input
                            type="text"
                            placeholder="Campanha / Fonte (opcional)"
                            value={formData.origem_detalhe || ''}
                            onChange={e => setFormData({ ...formData, origem_detalhe: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        />
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar
                </button>
            </div>
        </form>
    )
}
