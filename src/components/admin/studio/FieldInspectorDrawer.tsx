import { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '../../ui/drawer'
import { Input } from '../../ui/Input'
import { Label } from '../../ui/label'
import { Select } from '../../ui/Select'
import { Button } from '../../ui/Button'
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { Database } from '../../../database.types'
import UniversalFieldRenderer from '../../fields/UniversalFieldRenderer'
import { SECTIONS, FIELD_TYPES } from '../../../constants/admin'

type SystemField = Database['public']['Tables']['system_fields']['Row']

interface FieldInspectorDrawerProps {
    isOpen: boolean
    onClose: () => void
    field: Partial<SystemField> | null
    onSave: (field: Partial<SystemField>) => void
    isCreating?: boolean
}

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
    const [optionError, setOptionError] = useState<string | null>(null)

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

        const normalizedLabel = newOptionLabel.trim()
        const normalizedValue = normalizedLabel.toLowerCase().replace(/\s+/g, '_')

        // Check for duplicates
        if (options.some(opt => opt.value === normalizedValue || opt.label.toLowerCase() === normalizedLabel.toLowerCase())) {
            setOptionError('Esta opção já existe.')
            return
        }

        const newOption = {
            label: normalizedLabel,
            value: normalizedValue,
            color: 'gray'
        }
        setOptions([...options, newOption])
        setNewOptionLabel('')
        setOptionError(null)
    }

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index))
    }

    const updateOptionColor = (index: number, color: string) => {
        const newOptions = [...options]
        newOptions[index] = { ...newOptions[index], color }
        setOptions(newOptions)
    }

    const showOptionsManager = formData.type === 'select' || formData.type === 'multiselect' || formData.type === 'checklist'

    const [keyTouched, setKeyTouched] = useState(false)

    useEffect(() => {
        if (isCreating && !keyTouched && formData.label) {
            const generatedKey = formData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            setFormData((prev: Partial<SystemField>) => ({ ...prev, key: generatedKey }))
        }
    }, [formData.label, isCreating, keyTouched])

    // Construct preview field object
    const previewField = {
        ...formData,
        options: options
    }

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="sm:max-w-xl flex flex-col overflow-hidden h-[90vh]">
                <DrawerClose onClick={onClose} />
                <DrawerHeader>
                    <DrawerTitle>{isCreating ? 'Novo Campo' : 'Editar Campo'}</DrawerTitle>
                    <p className="text-sm text-gray-500">
                        {isCreating ? 'Defina as propriedades do novo campo.' : `Ajustando configurações de "${formData.label}"`}
                    </p>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-8">

                        {/* LIVE PREVIEW SECTION */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Live Preview (Como aparecerá no Card)
                            </h4>

                            {/* Generate appropriate preview value based on field type */}
                            {(() => {
                                // Compute preview value based on type
                                let previewValue: any = 'Valor de Exemplo'

                                switch (formData.type) {
                                    case 'multiselect':
                                        previewValue = options.length > 0
                                            ? options.slice(0, 2).map((o: any) => o.label || o.value)
                                            : ['Opção 1', 'Opção 2']
                                        break
                                    case 'checklist':
                                        // For checklist, show some items as checked
                                        previewValue = options.length > 0
                                            ? options.slice(0, 2).map((o: any) => o.value || o.label)
                                            : ['item_1', 'item_2']
                                        break
                                    case 'select':
                                        previewValue = options.length > 0
                                            ? (options[0].label || options[0].value)
                                            : 'Opção Selecionada'
                                        break
                                    case 'boolean':
                                        previewValue = true
                                        break
                                    case 'date':
                                        previewValue = '2025-06-15'
                                        break
                                    case 'date_range':
                                        previewValue = { start: '2025-06-15', end: '2025-06-20' }
                                        break
                                    case 'currency':
                                        previewValue = 5000
                                        break
                                    case 'number':
                                        previewValue = 42
                                        break
                                    case 'textarea':
                                        previewValue = 'Texto de exemplo com múltiplas linhas...'
                                        break
                                    default:
                                        previewValue = 'Valor de Exemplo'
                                }

                                // Different preview based on section
                                if (formData.section === 'observacoes_criticas') {
                                    // Important Info Layout: Label + Input (Edit Mode)
                                    return (
                                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                {formData.label || 'Nome do Campo'}
                                            </label>
                                            <UniversalFieldRenderer
                                                field={previewField}
                                                value={formData.type === 'boolean' ? false : (formData.type === 'multiselect' ? [] : '')}
                                                mode="edit"
                                                onChange={() => { }}
                                            />
                                        </div>
                                    )
                                } else {
                                    // Trip Info Layout: Card Display Mode
                                    return (
                                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                            <UniversalFieldRenderer
                                                field={previewField}
                                                value={previewValue}
                                                mode="display"
                                            />
                                        </div>
                                    )
                                }
                            })()}
                        </div>

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
                                        onChange={e => {
                                            setFormData({ ...formData, key: e.target.value })
                                            setKeyTouched(true)
                                        }}
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
                                        options={FIELD_TYPES as any}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Seção</Label>
                                    <Select
                                        value={formData.section || 'trip_info'}
                                        onChange={val => setFormData({ ...formData, section: val })}
                                        options={SECTIONS.filter(s => ['trip_info', 'observacoes_criticas'].includes(s.value)) as any}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Options Manager */}
                        {showOptionsManager && (
                            <div className="border-t pt-6">
                                <h4 className="font-medium text-gray-900 mb-4">Opções de Seleção</h4>

                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={newOptionLabel}
                                        onChange={e => {
                                            setNewOptionLabel(e.target.value)
                                            if (optionError) setOptionError(null)
                                        }}
                                        placeholder="Nova opção (ex: Preço Alto)"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault() // Prevent form submission if any
                                                addOption()
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button" // CRITICAL FIX: Prevent form submission
                                        onClick={addOption}
                                        size="sm"
                                        className="shrink-0"
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                                    </Button>
                                </div>
                                {optionError && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 mb-3">
                                        <AlertCircle className="h-3 w-3" /> {optionError}
                                    </p>
                                )}

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
                                                            type="button"
                                                            key={c.value}
                                                            onClick={() => updateOptionColor(idx, c.value)}
                                                            className={cn("w-4 h-4 rounded-full hover:scale-110 transition-transform", c.bg)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <span className="text-sm font-medium flex-1">{opt.label}</span>
                                            <span className="text-xs text-gray-400 font-mono">{opt.value}</span>

                                            <button
                                                type="button"
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

                <DrawerFooter className="border-t bg-white">
                    <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isCreating ? 'Criar Campo' : 'Salvar Alterações'}
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
