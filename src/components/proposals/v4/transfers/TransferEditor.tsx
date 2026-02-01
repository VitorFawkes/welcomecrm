/**
 * TransferEditor - Editor dedicado para transfers
 *
 * Layout direto sem expand/collapse
 * Campos: imagem, origin/destination, location types, vehicle, date/time, preco, descricao, notes
 */

import { useCallback, useMemo } from 'react'
import { Plus, ArrowRight, Calendar, Clock, Users, Plane, Building2, Ship, MapPin, Car, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { ItemImageUploader } from '@/components/proposals/builder/ItemImageUploader'
import {
    type TransferData,
    type TransferOption,
    type LocationType,
    type VehicleType,
    LOCATION_TYPE_LABELS,
    VEHICLE_TYPE_LABELS,
    CURRENCY_SYMBOLS,
    createInitialTransferData,
} from './types'
import { validateTransfer } from '../validation'
import { ValidationFeedback } from '../ValidationFeedback'
import { SortableOptionsContainer } from '../shared/SortableOptionsContainer'
import { SortableOptionItem } from '../shared/SortableOptionItem'

interface TransferEditorProps {
    data: TransferData | null
    onChange: (data: TransferData) => void
    itemId: string
}

const LOCATION_ICONS: Record<LocationType, React.ElementType> = {
    airport: Plane,
    hotel: Building2,
    port: Ship,
    address: MapPin,
}

export function TransferEditor({ data, onChange, itemId }: TransferEditorProps) {
    const transferData = data || createInitialTransferData()
    const { getCurrency } = useProposalBuilder()
    const currency = getCurrency()
    const currencySymbol = CURRENCY_SYMBOLS[currency] || 'R$'

    // Validação
    const validation = useMemo(() => validateTransfer(transferData), [transferData])

    const updateField = useCallback(<K extends keyof TransferData>(
        field: K,
        value: TransferData[K]
    ) => {
        onChange({ ...transferData, [field]: value })
    }, [transferData, onChange])

    const addOption = useCallback(() => {
        const newOption: TransferOption = {
            id: crypto.randomUUID(),
            vehicle: 'sedan' as VehicleType,
            label: 'Nova opcao',
            price: 0,
            is_recommended: false,
            enabled: true,
            ordem: transferData.options.length,
        }
        onChange({
            ...transferData,
            options: [...transferData.options, newOption],
        })
    }, [transferData, onChange])

    const updateOption = useCallback((id: string, updates: Partial<TransferData['options'][0]>) => {
        onChange({
            ...transferData,
            options: transferData.options.map(opt =>
                opt.id === id ? { ...opt, ...updates } : opt
            ),
        })
    }, [transferData, onChange])

    const removeOption = useCallback((id: string) => {
        onChange({
            ...transferData,
            options: transferData.options.filter(opt => opt.id !== id),
        })
    }, [transferData, onChange])

    const setRecommended = useCallback((id: string) => {
        onChange({
            ...transferData,
            options: transferData.options.map(opt => ({
                ...opt,
                is_recommended: opt.id === id,
            })),
        })
    }, [transferData, onChange])

    const toggleOptionEnabled = useCallback((id: string) => {
        onChange({
            ...transferData,
            options: transferData.options.map(opt =>
                opt.id === id ? { ...opt, enabled: !opt.enabled } : opt
            ),
        })
    }, [transferData, onChange])

    const reorderOptions = useCallback((reorderedOptions: TransferOption[]) => {
        onChange({
            ...transferData,
            options: reorderedOptions,
        })
    }, [transferData, onChange])

    const OriginIcon = LOCATION_ICONS[transferData.origin_type]
    const DestIcon = LOCATION_ICONS[transferData.destination_type]

    return (
        <div className="space-y-4">
            {/* Imagem do Transfer */}
            <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">
                    Imagem do Transfer
                </label>
                <ItemImageUploader
                    imageUrl={transferData.image_url || null}
                    onImageChange={(url) => updateField('image_url', url)}
                    itemId={itemId}
                />
            </div>

            {/* Origin -> Destination Row */}
            <div className="flex items-start gap-3">
                {/* Origin */}
                <div className="flex-1">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">De</label>
                    <div className="flex gap-2">
                        <select
                            value={transferData.origin_type}
                            onChange={(e) => updateField('origin_type', e.target.value as LocationType)}
                            className="w-auto px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                        >
                            {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={transferData.origin}
                            onChange={(e) => updateField('origin', e.target.value)}
                            placeholder="Nome do local"
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center pt-6">
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>

                {/* Destination */}
                <div className="flex-1">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Para</label>
                    <div className="flex gap-2">
                        <select
                            value={transferData.destination_type}
                            onChange={(e) => updateField('destination_type', e.target.value as LocationType)}
                            className="w-auto px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                        >
                            {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={transferData.destination}
                            onChange={(e) => updateField('destination', e.target.value)}
                            placeholder="Nome do local"
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Visual Route Summary */}
            {(transferData.origin || transferData.destination) && (
                <div className="flex items-center justify-center gap-3 py-2 px-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <OriginIcon className="h-4 w-4 text-teal-600" />
                        <span>{transferData.origin || '...'}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <DestIcon className="h-4 w-4 text-teal-600" />
                        <span>{transferData.destination || '...'}</span>
                    </div>
                </div>
            )}

            {/* Date, Time, Passengers Row */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Data
                    </label>
                    <input
                        type="date"
                        value={transferData.date}
                        onChange={(e) => updateField('date', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Horario
                    </label>
                    <input
                        type="time"
                        value={transferData.time}
                        onChange={(e) => updateField('time', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Passageiros
                    </label>
                    <input
                        type="number"
                        value={transferData.passengers}
                        onChange={(e) => updateField('passengers', parseInt(e.target.value) || 1)}
                        min={1}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Vehicle & Price Row */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        Veiculo
                    </label>
                    <select
                        value={transferData.vehicle_type}
                        onChange={(e) => updateField('vehicle_type', e.target.value as VehicleType)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                    >
                        {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Preco</label>
                    <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-lg border border-teal-200">
                        <span className="text-sm font-medium text-teal-700">{currencySymbol}</span>
                        <input
                            type="number"
                            value={transferData.price || ''}
                            onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                            placeholder="0,00"
                            step="0.01"
                            className="flex-1 text-sm font-semibold text-teal-800 bg-white border border-teal-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-teal-500 text-right"
                        />
                    </div>
                </div>
            </div>

            {/* Descricao */}
            <div>
                <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Descricao (opcional)
                </label>
                <textarea
                    value={transferData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Detalhes adicionais sobre o transfer, veículo, motorista..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
            </div>

            {/* Notas Internas */}
            <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                    Observacoes Internas (nao aparece para cliente)
                </label>
                <input
                    type="text"
                    value={transferData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="ex: Voo G3 1100, chega as 14h30"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-amber-50"
                />
            </div>

            {/* Validation Feedback */}
            <ValidationFeedback
                errors={validation.errors}
                warnings={validation.warnings}
            />

            {/* Options (Vehicle Upgrades) */}
            <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-600">Opcoes de Veiculo</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={addOption}
                        className="h-7 text-xs"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                    </Button>
                </div>

                {transferData.options.length > 0 && (
                    <SortableOptionsContainer
                        items={transferData.options}
                        onReorder={reorderOptions}
                    >
                        <div className="space-y-2">
                            {transferData.options
                                .sort((a, b) => a.ordem - b.ordem)
                                .map((option) => (
                                    <SortableOptionItem
                                        key={option.id}
                                        id={option.id}
                                        isRecommended={option.is_recommended}
                                        enabled={option.enabled ?? true}
                                        onSetRecommended={() => setRecommended(option.id)}
                                        onToggleEnabled={() => toggleOptionEnabled(option.id)}
                                        onRemove={() => removeOption(option.id)}
                                        accentColor="teal"
                                    >
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={option.vehicle}
                                                onChange={(e) => updateOption(option.id, { vehicle: e.target.value as VehicleType })}
                                                className={cn(
                                                    "text-sm bg-transparent border-none outline-none cursor-pointer",
                                                    !option.enabled && "text-slate-400"
                                                )}
                                            >
                                                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>

                                            <input
                                                type="text"
                                                value={option.label}
                                                onChange={(e) => updateOption(option.id, { label: e.target.value })}
                                                placeholder="Descricao"
                                                className={cn(
                                                    "flex-1 text-sm bg-transparent border-none outline-none",
                                                    !option.enabled && "text-slate-400"
                                                )}
                                            />

                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                <span>{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    value={option.price || ''}
                                                    onChange={(e) => updateOption(option.id, { price: parseFloat(e.target.value) || 0 })}
                                                    className="w-20 text-right bg-transparent border-none outline-none"
                                                    placeholder="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                    </SortableOptionItem>
                                ))}
                        </div>
                    </SortableOptionsContainer>
                )}

                {transferData.options.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">
                        Nenhuma opcao de veiculo adicionada
                    </p>
                )}
            </div>
        </div>
    )
}

export default TransferEditor
