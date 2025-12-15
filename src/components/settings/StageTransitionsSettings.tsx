import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ArrowRight, Check, X, Loader2, AlertCircle } from 'lucide-react'
import type { Database } from '../../database.types'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type StageTransition = Database['public']['Tables']['stage_transitions']['Row']

interface StageTransitionsSettingsProps {
    stages: PipelineStage[]
}

export default function StageTransitionsSettings({ stages }: StageTransitionsSettingsProps) {
    const queryClient = useQueryClient()
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

    // Fetch existing transitions
    const { data: transitions, isLoading } = useQuery({
        queryKey: ['stage-transitions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stage_transitions')
                .select('*')

            if (error) throw error
            return data as StageTransition[]
        }
    })

    // Mutation to toggle transition
    const toggleTransitionMutation = useMutation({
        mutationFn: async ({ sourceId, targetId, allowed }: { sourceId: string, targetId: string, allowed: boolean }) => {
            // Check if record exists
            const existing = transitions?.find(t => t.source_stage_id === sourceId && t.target_stage_id === targetId)

            if (existing) {
                const { error } = await supabase
                    .from('stage_transitions')
                    .update({ allowed })
                    .eq('id', existing.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('stage_transitions')
                    .insert({
                        source_stage_id: sourceId,
                        target_stage_id: targetId,
                        allowed
                    })
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-transitions'] })
        }
    })

    // Group stages by phase for better UI
    const sortedStages = [...stages].sort((a, b) => a.ordem - b.ordem)

    // Helper to check if allowed
    const isAllowed = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return true
        const transition = transitions?.find(t => t.source_stage_id === sourceId && t.target_stage_id === targetId)
        // Default to true if no rule exists (as per migration logic assumption)
        // But wait, migration logic: "If row exists and allowed=false -> block. Else allow."
        // So default is true.
        return transition ? transition.allowed : true
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h3 className="font-medium text-blue-900">Como funciona o Controle de Transições</h3>
                    <p className="text-sm text-blue-700 mt-1">
                        Defina quais movimentações são permitidas no pipeline.
                        O Admin sempre pode mover para qualquer etapa.
                        Se nenhuma regra for criada, a transição é permitida por padrão.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Source Stage Selection */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b font-medium text-gray-700">
                        1. De onde sai o card?
                    </div>
                    <div className="divide-y max-h-[600px] overflow-y-auto">
                        {sortedStages.map(stage => (
                            <button
                                key={stage.id}
                                onClick={() => setSelectedSourceId(stage.id)}
                                className={`w-full text-left p-3 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between
                                    ${selectedSourceId === stage.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600'}
                                `}
                            >
                                <span>{stage.nome}</span>
                                {selectedSourceId === stage.id && <ArrowRight className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Target Stage Configuration */}
                <div className="md:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b font-medium text-gray-700 flex items-center justify-between">
                        <span>2. Para onde ele pode ir?</span>
                        {selectedSourceId && (
                            <span className="text-xs font-normal text-gray-500">
                                Configurando saída de: <strong>{stages.find(s => s.id === selectedSourceId)?.nome}</strong>
                            </span>
                        )}
                    </div>

                    {!selectedSourceId ? (
                        <div className="p-12 text-center text-gray-400">
                            Selecione uma etapa de origem à esquerda
                        </div>
                    ) : (
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {sortedStages.map(targetStage => {
                                if (targetStage.id === selectedSourceId) return null
                                const allowed = isAllowed(selectedSourceId, targetStage.id)
                                const isUpdating = toggleTransitionMutation.isPending && toggleTransitionMutation.variables?.targetId === targetStage.id

                                return (
                                    <div key={targetStage.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${allowed ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-sm text-gray-700">{targetStage.nome}</span>
                                        </div>

                                        <button
                                            onClick={() => toggleTransitionMutation.mutate({
                                                sourceId: selectedSourceId,
                                                targetId: targetStage.id,
                                                allowed: !allowed
                                            })}
                                            disabled={isUpdating}
                                            className={`
                                                px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2
                                                ${allowed
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                }
                                                ${isUpdating ? 'opacity-50 cursor-wait' : ''}
                                            `}
                                        >
                                            {isUpdating ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : allowed ? (
                                                <><Check className="w-3 h-3" /> Permitido</>
                                            ) : (
                                                <><X className="w-3 h-3" /> Bloqueado</>
                                            )}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
