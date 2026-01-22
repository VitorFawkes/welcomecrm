import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useProposal } from '@/hooks/useProposal'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { useAutoSave } from '@/hooks/useAutoSave'
import { BlockPalette } from '@/components/proposals/v4/BlockPalette'
import { BuilderCanvas } from '@/components/proposals/v4/BuilderCanvas'
import { PricingSidebar } from '@/components/proposals/v4/PricingSidebar'
import { BlockSearchDrawer } from '@/components/proposals/v4/BlockSearchDrawer'
import { BuilderHeader } from '@/components/proposals/v4/BuilderHeader'
import { BlockDragOverlay } from '@/components/proposals/v4/BlockDragOverlay'
import { Loader2 } from 'lucide-react'
import type { ProposalSectionType, ProposalItemType } from '@/types/proposals'

/**
 * ProposalBuilderV4 - Elite Proposal Builder with Block-based Architecture
 * 
 * Layout:
 * - Left: BlockPalette (200px) - Draggable blocks
 * - Center: BuilderCanvas - Proposal content
 * - Right: PricingSidebar (250px) - Pricing summary
 * 
 * Features:
 * - Drag & drop blocks from palette to canvas
 * - Smart search when dropping travel blocks (Hotel, Flight, etc.)
 * - AI extraction for flight images
 * - Real-time pricing updates
 */

// Block type definitions
export type BlockType =
    // Travel
    | 'hotel'
    | 'flight'
    | 'cruise'
    | 'car'
    | 'transfer'    // Aeroporto ↔ Hotel
    | 'experience'  // Passeios com data/hora
    | 'insurance'   // Seguro viagem
    | 'custom'      // Seção livre "Outros"
    // Content
    | 'title'
    | 'text'
    | 'image'
    | 'video'
    // Layout
    | 'divider'
    | 'table'

// Blocks that require library search
export const SEARCHABLE_BLOCKS: BlockType[] = ['hotel', 'flight', 'cruise', 'car', 'experience']

// Map block type to section type
export const BLOCK_TO_SECTION_TYPE: Record<BlockType, ProposalSectionType> = {
    hotel: 'hotels',
    flight: 'flights',
    cruise: 'custom',
    car: 'transfers',
    transfer: 'transfers',
    experience: 'custom',
    insurance: 'custom',
    custom: 'custom',
    title: 'custom',
    text: 'custom',
    image: 'custom',
    video: 'custom',
    divider: 'custom',
    table: 'custom',
}

// Map block type to item type
export const BLOCK_TO_ITEM_TYPE: Record<BlockType, ProposalItemType> = {
    hotel: 'hotel',
    flight: 'flight',
    cruise: 'custom',
    car: 'transfer',
    transfer: 'transfer',
    experience: 'experience',
    insurance: 'insurance',
    custom: 'custom',
    title: 'custom',
    text: 'custom',
    image: 'custom',
    video: 'custom',
    divider: 'custom',
    table: 'custom',
}

export default function ProposalBuilderV4() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    // Data fetching
    const { data: proposal, isLoading, error } = useProposal(id!)
    const { initialize, reset, isDirty, isSaving, sections, insertSectionAt } = useProposalBuilder()

    // Auto-save
    useAutoSave()

    // DnD state
    const [activeBlockType, setActiveBlockType] = useState<BlockType | null>(null)
    const [searchDrawer, setSearchDrawer] = useState<{
        isOpen: boolean
        blockType: BlockType | null
        sectionId: string | null
    }>({ isOpen: false, blockType: null, sectionId: null })

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor)
    )

    // Initialize builder when proposal loads - FIXED: useEffect instead of useState
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

    // Handle drag start
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const blockType = event.active.data.current?.blockType as BlockType
        if (blockType) {
            setActiveBlockType(blockType)
        }
    }, [])

    // Handle drag end - block dropped on canvas
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        setActiveBlockType(null)

        if (!over) return

        const blockType = active.data.current?.blockType as BlockType
        if (!blockType) return

        // Determine insertion index from drop zone
        const overId = String(over.id)
        let insertIndex = sections.length // default: end

        if (overId.startsWith('drop-zone-')) {
            // Extract index from drop zone ID (e.g., "drop-zone-2" => 2)
            insertIndex = parseInt(overId.replace('drop-zone-', ''), 10)
        }

        // SPECIAL: Text blocks create a special section with inline editing
        if (blockType === 'text') {
            const sectionType = BLOCK_TO_SECTION_TYPE[blockType]
            insertSectionAt(insertIndex, sectionType, '')

            // Add a text block item to the section
            setTimeout(() => {
                const updatedSections = useProposalBuilder.getState().sections
                const newSection = updatedSections[insertIndex]
                if (newSection) {
                    const { addItem, updateItem } = useProposalBuilder.getState()
                    addItem(newSection.id, 'custom', 'Texto')

                    // Mark as text block in rich_content
                    const latestSections = useProposalBuilder.getState().sections
                    const latestSection = latestSections[insertIndex]
                    const item = latestSection?.items[0]
                    if (item) {
                        updateItem(item.id, {
                            title: '',
                            rich_content: { is_text_block: true, content: '' },
                        })
                    }
                }
            }, 0)
            return
        }

        // SPECIAL: Title blocks create a special section for headings
        if (blockType === 'title') {
            const sectionType = BLOCK_TO_SECTION_TYPE[blockType]
            insertSectionAt(insertIndex, sectionType, '')

            setTimeout(() => {
                const updatedSections = useProposalBuilder.getState().sections
                const newSection = updatedSections[insertIndex]
                if (newSection) {
                    const { addItem, updateItem } = useProposalBuilder.getState()
                    addItem(newSection.id, 'custom', 'Título')

                    const latestSections = useProposalBuilder.getState().sections
                    const latestSection = latestSections[insertIndex]
                    const item = latestSection?.items[0]
                    if (item) {
                        updateItem(item.id, {
                            title: 'Novo Título',
                            rich_content: { is_title_block: true },
                        })
                    }
                }
            }, 0)
            return
        }

        // SPECIAL: Divider blocks create a visual separator
        if (blockType === 'divider') {
            const sectionType = BLOCK_TO_SECTION_TYPE[blockType]
            insertSectionAt(insertIndex, sectionType, '')

            setTimeout(() => {
                const updatedSections = useProposalBuilder.getState().sections
                const newSection = updatedSections[insertIndex]
                if (newSection) {
                    const { addItem, updateItem } = useProposalBuilder.getState()
                    addItem(newSection.id, 'custom', 'Divisor')

                    const latestSections = useProposalBuilder.getState().sections
                    const latestSection = latestSections[insertIndex]
                    const item = latestSection?.items[0]
                    if (item) {
                        updateItem(item.id, {
                            title: '',
                            rich_content: { is_divider_block: true },
                        })
                    }
                }
            }, 0)
            return
        }

        // SPECIAL: Image blocks create a media section
        if (blockType === 'image') {
            const sectionType = BLOCK_TO_SECTION_TYPE[blockType]
            insertSectionAt(insertIndex, sectionType, '')

            setTimeout(() => {
                const updatedSections = useProposalBuilder.getState().sections
                const newSection = updatedSections[insertIndex]
                if (newSection) {
                    const { addItem, updateItem } = useProposalBuilder.getState()
                    addItem(newSection.id, 'custom', 'Imagem')

                    const latestSections = useProposalBuilder.getState().sections
                    const latestSection = latestSections[insertIndex]
                    const item = latestSection?.items[0]
                    if (item) {
                        updateItem(item.id, {
                            title: '',
                            rich_content: { is_image_block: true, image_url: '' },
                        })
                    }
                }
            }, 0)
            return
        }

        // SPECIAL: Video blocks create a media section
        if (blockType === 'video') {
            const sectionType = BLOCK_TO_SECTION_TYPE[blockType]
            insertSectionAt(insertIndex, sectionType, '')

            setTimeout(() => {
                const updatedSections = useProposalBuilder.getState().sections
                const newSection = updatedSections[insertIndex]
                if (newSection) {
                    const { addItem, updateItem } = useProposalBuilder.getState()
                    addItem(newSection.id, 'custom', 'Vídeo')

                    const latestSections = useProposalBuilder.getState().sections
                    const latestSection = latestSections[insertIndex]
                    const item = latestSection?.items[0]
                    if (item) {
                        updateItem(item.id, {
                            title: '',
                            rich_content: { is_video_block: true, video_url: '' },
                        })
                    }
                }
            }, 0)
            return
        }

        // Check if this block type requires library search
        if (SEARCHABLE_BLOCKS.includes(blockType)) {
            // Create a section at the specified position
            const sectionType = BLOCK_TO_SECTION_TYPE[blockType]
            insertSectionAt(insertIndex, sectionType)

            // Get the newly created section ID (it's at the insertIndex)
            // We need to wait for the state to update, so using setTimeout
            setTimeout(() => {
                const updatedSections = useProposalBuilder.getState().sections
                const newSectionId = updatedSections[insertIndex]?.id

                // Open search drawer
                setSearchDrawer({
                    isOpen: true,
                    blockType,
                    sectionId: newSectionId || null,
                })
            }, 0)
        } else {
            // For other non-searchable blocks (table, etc.)
            // Add directly with default content
            const sectionType = BLOCK_TO_SECTION_TYPE[blockType]
            insertSectionAt(insertIndex, sectionType, getDefaultTitle(blockType))
        }
    }, [insertSectionAt, sections])

    // Close search drawer
    const handleCloseSearchDrawer = useCallback(() => {
        setSearchDrawer({ isOpen: false, blockType: null, sectionId: null })
    }, [])

    // Loading state
    if (isLoading) {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-500">Carregando proposta...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error || !proposal) {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <p className="text-red-500 mb-4">Erro ao carregar proposta</p>
                    <button
                        onClick={() => navigate('/proposals')}
                        className="text-blue-600 hover:underline"
                    >
                        Voltar para propostas
                    </button>
                </div>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-dvh flex flex-col bg-slate-50 overflow-hidden">
                {/* Header */}
                <BuilderHeader
                    proposal={proposal}
                    isDirty={isDirty}
                    isSaving={isSaving}
                />

                {/* Main Content - 3 Column Layout */}
                <div className="flex-1 flex min-h-0">
                    {/* Left: Block Palette (200px) */}
                    <BlockPalette />

                    {/* Center: Canvas */}
                    <div className="flex-1 h-full overflow-hidden">
                        <SortableContext
                            items={sections.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <BuilderCanvas sections={sections} />
                        </SortableContext>
                    </div>

                    {/* Right: Pricing Sidebar (250px) */}
                    <PricingSidebar sections={sections} />
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeBlockType && (
                    <BlockDragOverlay blockType={activeBlockType} />
                )}
            </DragOverlay>

            {/* Search Drawer */}
            <BlockSearchDrawer
                isOpen={searchDrawer.isOpen}
                blockType={searchDrawer.blockType}
                sectionId={searchDrawer.sectionId}
                onClose={handleCloseSearchDrawer}
            />
        </DndContext>
    )
}

// Helper function for default titles
function getDefaultTitle(blockType: BlockType): string {
    const titles: Record<BlockType, string> = {
        hotel: 'Hospedagem',
        flight: 'Passagem Aérea',
        cruise: 'Cruzeiro',
        car: 'Locação de Carro',
        transfer: 'Transfers',
        experience: 'Experiências',
        insurance: 'Seguro Viagem',
        custom: 'Nova Seção',
        title: 'Título',
        text: 'Texto',
        image: 'Imagem',
        video: 'Vídeo',
        divider: '',
        table: 'Tabela',
    }
    return titles[blockType] || 'Seção'
}

