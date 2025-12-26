import { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '../../ui/drawer'
import { Input } from '../../ui/Input'
import { Label } from '../../ui/label'
import { Select } from '../../ui/Select'
import { Button } from '../../ui/Button'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { Database } from '../../../database.types'

type SystemField = Database['public']['Tables']['system_fields']['Row']

interface FieldInspectorDrawerProps {
    isOpen: boolean
    onClose: () => void
    field: Partial<SystemField> | null
    onSave: (field: Partial<SystemField>) => void
    isCreating?: boolean
}

const SECTIONS = [
    { value: 'trip_info', label: 'Informações da Viagem' },
    { value: 'people', label: 'Pessoas / Viajantes' },
    { value: 'payment', label: 'Pagamento' },
    { value: 'system', label: 'Sistema / Interno' },
    { value: 'details', label: 'Outros Detalhes' }
]

const FIELD_TYPES = [
    { value: 'text', label: 'Texto Simples' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
    { value: 'currency', label: 'Moeda' },
    { value: 'select', label: 'Seleção Única' },
    { value: 'multiselect', label: 'Múltipla Seleção' },
    { value: 'boolean', label: 'Sim/Não' },
    { value: 'json', label: 'JSON (Avançado)' }
]

const COLORS = [
    { value: 'gray', bg: 'bg-gray-100', text: 'text-gray-800' },
    { value: 'blue', bg: 'bg-blue-100', text: 'text-blue-800' },
    { value: 'green', bg: 'bg-green-100', text: 'text-green-800' },
    { value: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    { value: 'red', bg: 'bg-red-100', text: 'text-red-800' },
    { value: 'purple', bg: 'bg-purple-100', text: 'text-purple-800' },
    { value: 'pink', bg: 'bg-pink-100', text: 'text-pink-800' },
]

export default function FieldInspectorDrawer({ isOpen, onClose, field, onSave, isCreating = false }: FieldInspectorDrawerProps) {
    const [formData, setFormData] = useState<Partial<SystemField>>({})
    const [options, setOptions] = useState<any[]>([])
    const [newOptionLabel, setNewOptionLabel] = useState('')

    useEffect(() => {
        if (field) {
            setFormData(field)
            // Parse options if they exist
            if (field.options) {
                if (Array.isArray(field.options)) {
                    setOptions(field.options)
                } else {
                    setOptions([])
                }
            } else {
                setOptions([])
            }
        }
    }, [field])

    const handleSave = () => {
        onSave({
            ...formData,
            options: options.length > 0 ? options : null
        })
        onClose()
    }

    const addOption = () => {
        if (!newOptionLabel.trim()) return
        const newOption = {
            label: newOptionLabel,
            value: newOptionLabel.toLowerCase().replace(/\s+/g, '_'),
            color: 'gray'
        }
        setOptions([...options, newOption])
        setNewOptionLabel('')
    }

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index))
    }

    const updateOptionColor = (index: number, color: string) => {
        const newOptions = [...options]
        newOptions[index] = { ...newOptions[index], color }
        setOptions(newOptions)
    }

    const showOptionsManager = formData.type === 'select' || formData.type === 'multiselect'

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="sm:max-w-xl flex flex-col overflow-hidden">
                <DrawerClose onClick={onClose} />
                <DrawerHeader>
                    <DrawerTitle>{isCreating ? 'Novo Campo' : 'Editar Campo'}</DrawerTitle>
                    <p className="text-sm text-gray-500">
                        {isCreating ? 'Defina as propriedades do novo campo.' : `Ajustando configurações de "${formData.label}"`}
                    </p>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    <div className="space-y-6 py-4">
                        {/* Identity Section */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome do Campo (Label)</Label>
                                    <Input
                                        value={formData.label || ''}
                                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                                        placeholder="Ex: Motivo de Perda"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chave (ID do Sistema)</Label>
                                    <Input
                                        value={formData.key || ''}
                                        onChange={e => setFormData({ ...formData, key: e.target.value })}
                                        disabled={!isCreating}
                                        placeholder="ex: motivo_perda"
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo de Dado</Label>
                                    <Select
                                        value={formData.type || 'text'}
                                        onChange={val => setFormData({ ...formData, type: val })}
                                        options={FIELD_TYPES}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Seção</Label>
                                    <Select
                                        value={formData.section || 'trip_info'}
                                        onChange={val => setFormData({ ...formData, section: val })}
                                        options={SECTIONS}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Options Manager */}
                        {showOptionsManager && (
                            <div className="border-t pt-6">
                                <h4 className="font-medium text-gray-900 mb-4">Opções de Seleção</h4>

                                <div className="flex gap-2 mb-4">
                                    <Input
                                        value={newOptionLabel}
                                        onChange={e => setNewOptionLabel(e.target.value)}
                                        placeholder="Nova opção (ex: Preço Alto)"
                                        onKeyDown={e => e.key === 'Enter' && addOption()}
                                    />
                                    <Button onClick={addOption} size="sm" className="shrink-0">
                                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                                    </Button>
                                </div>

                                <div className="space-y-2 bg-gray-50 p-3 rounded-lg min-h-[100px]">
                                    {options.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4">Nenhuma opção definida.</p>
                                    )}
                                    {options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 shadow-sm group">
                                            <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />

                                            {/* Color Picker */}
                                            <div className="relative group/color">
                                                <div className={cn("w-4 h-4 rounded-full cursor-pointer border border-gray-200",
                                                    COLORS.find(c => c.value === (opt.color || 'gray'))?.bg || 'bg-gray-100'
                                                )} />
                                                <div className="absolute left-0 top-6 bg-white border shadow-lg rounded p-1 z-10 hidden group-hover/color:flex gap-1">
                                                    {COLORS.map(c => (
                                                        <button
                                                            key={c.value}
                                                            onClick={() => updateOptionColor(idx, c.value)}
                                                            className={cn("w-4 h-4 rounded-full", c.bg)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <span className="text-sm font-medium flex-1">{opt.label}</span>
                                            <span className="text-xs text-gray-400 font-mono">{opt.value}</span>

                                            <button
                                                onClick={() => removeOption(idx)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DrawerFooter>
                    <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isCreating ? 'Criar Campo' : 'Salvar Alterações'}
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
