import { useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { useProposal } from '@/hooks/useProposal'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useBlockDragDrop } from '@/hooks/useBlockDragDrop'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { BlockToolbar } from '@/components/proposals/builder/BlockToolbar'
import { BuilderCanvas } from '@/components/proposals/builder/BuilderCanvas'
import { BlockDragOverlay } from '@/components/proposals/builder/BlockDragOverlay'
import { SaveIndicator } from '@/components/proposals/builder/SaveIndicator'
import { ProposalCoverHero } from '@/components/proposals/elite/ProposalCoverHero'
import { ProposalNarrativeEditor } from '@/components/proposals/elite/ProposalNarrativeEditor'
import { ProposalPricingSidebar } from '@/components/proposals/elite/ProposalPricingSidebar'
import { ProposalEliteHeader } from '@/components/proposals/elite/ProposalEliteHeader'
import { Button } from '@/components/ui/Button'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Proposal Builder V3 - Block-Based Visual Editor
 * 
 * Features:
 * - Left toolbar with draggable blocks
 * - Central canvas with sortable sections
 * - Right sidebar with pricing summary
 * - Cover hero and narrative
 * - Full drag-and-drop with visual feedback
 * - Keyboard shortcuts (⌘S save, ⌘P preview, etc.)
 */
export default function ProposalBuilderV3() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const isPreview = searchParams.get('preview') === 'true'

    const { data: proposal, isLoading, error } = useProposal(id!)
    const {
        initialize,
        reset,
        isDirty,
        isSaving,
        sections,
    } = useProposalBuilder()

    const {
        dragState,
        handleDragStart,
        handleDragEnd,
    } = useBlockDragDrop()

    // Auto-save with last saved tracking
    const { lastAutoSave } = useAutoSave()

    // Preview toggle handler
    const togglePreview = useCallback(() => {
        const newParams = new URLSearchParams(searchParams)
        if (isPreview) {
            newParams.delete('preview')
        } else {
            newParams.set('preview', 'true')
        }
        setSearchParams(newParams)
    }, [isPreview, searchParams, setSearchParams])

    // Keyboard shortcuts
    useKeyboardShortcuts({
        isPreview,
        onTogglePreview: togglePreview,
    })

    // Initialize builder
    useEffect(() => {
        if (proposal?.active_version) {
            initialize(
                proposal,
                proposal.active_version,
                proposal.active_version.sections || []
            )
        }
        return () => reset()
    }, [proposal, initialize, reset])

    // Get active block info for drag overlay
    const getActiveBlockInfo = () => {
        if (!dragState.activeId) return { type: null }

        if (dragState.activeType === 'new-block') {
            const blockType = dragState.activeId.replace('new-block-', '')
            return { type: 'new-block' as const, blockType }
        }

        if (dragState.activeType === 'section') {
            const section = sections.find(s => s.id === dragState.activeId)
            return { type: 'section' as const, title: section?.title }
        }

        if (dragState.activeType === 'item') {
            return { type: 'item' as const, title: 'Item' }
        }

        return { type: null }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Carregando proposta...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error || !proposal) {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-50">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">😕</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">
                        Proposta não encontrada
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        A proposta que você está procurando não existe ou foi removida.
                    </p>
                    <Button onClick={() => navigate('/proposals')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para Propostas
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-dvh flex flex-col bg-slate-50 overflow-hidden">
                {/* Header with save indicator and preview toggle */}
                <div className="relative">
                    <ProposalEliteHeader
                        proposal={proposal}
                        isDirty={isDirty}
                        isSaving={isSaving}
                        isPreview={isPreview}
                    />
                    {/* Floating controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
                        <SaveIndicator
                            isDirty={isDirty}
                            isSaving={isSaving}
                            lastSaved={lastAutoSave}
                        />
                        <Button
                            onClick={togglePreview}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            {isPreview ? (
                                <>
                                    <EyeOff className="h-4 w-4" />
                                    Editar
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4" />
                                    Preview
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-h-0 flex">
                    {/* Left: Block Toolbar */}
                    {!isPreview && (
                        <BlockToolbar className="w-64 flex-shrink-0" />
                    )}

                    {/* Center: Canvas */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-3xl mx-auto py-8 px-6">
                            {/* Cover Hero */}
                            <ProposalCoverHero
                                proposal={proposal}
                                isPreview={isPreview}
                            />

                            {/* Narrative */}
                            <div className="mt-8">
                                <ProposalNarrativeEditor
                                    isPreview={isPreview}
                                />
                            </div>

                            {/* Canvas with sections */}
                            <div className="mt-8">
                                <BuilderCanvas isPreview={isPreview} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Pricing Sidebar */}
                    <div className={cn(
                        'w-80 border-l border-slate-200 bg-white flex-shrink-0 overflow-y-auto',
                        isPreview && 'hidden lg:block'
                    )}>
                        <ProposalPricingSidebar
                            proposal={proposal}
                            isPreview={isPreview}
                        />
                    </div>
                </div>
            </div>

            {/* Drag Overlay with styled preview */}
            <DragOverlay>
                {dragState.activeId ? (
                    <BlockDragOverlay {...getActiveBlockInfo()} />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
