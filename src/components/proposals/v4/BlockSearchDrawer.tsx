/**
 * BlockSearchDrawer - Slide-in drawer for searching library items OR extracting via AI
 * 
 * Features:
 * - Search input for library
 * - Results with thumbnails
 * - "Create New" button
 * - AI Tab for flight extraction from images
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLibrarySearch, type LibrarySearchResult, type LibraryCategory } from '@/hooks/useLibrary'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { ItemCreatorDrawer } from '@/components/proposals/builder/ItemCreatorDrawer'
import { AIImageExtractor } from '@/components/proposals/AIImageExtractor'
import type { ExtractedItem } from '@/hooks/useAIExtract'
import {
    X,
    Search,
    Plus,
    Building2,
    Plane,
    Ship,
    Car,
    Bus,
    Star,
    Shield,
    Sparkles,
    Loader2,
    Library,
} from 'lucide-react'
import type { BlockType } from '@/pages/ProposalBuilderV4'
import type { ProposalItemType } from '@/types/proposals'

interface BlockSearchDrawerProps {
    isOpen: boolean
    blockType: BlockType | null
    sectionId: string | null
    onClose: () => void
}

// Block type to library category map
const BLOCK_TO_LIBRARY_CATEGORY: Partial<Record<BlockType, LibraryCategory>> = {
    hotel: 'hotel',
    flight: 'flight',
    cruise: 'custom',
    car: 'transfer',
    transfer: 'transfer',
    experience: 'experience',
    insurance: 'custom',
    custom: 'custom',
}

// Block type labels
const BLOCK_LABELS: Record<BlockType, string> = {
    hotel: 'Hotel',
    flight: 'Voo',
    cruise: 'Cruzeiro',
    car: 'Carro',
    transfer: 'Transfer',
    experience: 'Experiência',
    insurance: 'Seguro',
    custom: 'Outros',
    title: 'Título',
    text: 'Texto',
    image: 'Imagem',
    video: 'Vídeo',
    divider: 'Divisor',
    table: 'Tabela',
}

// Block type icons
const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
    hotel: Building2,
    flight: Plane,
    cruise: Ship,
    car: Car,
    transfer: Bus,
    experience: Sparkles,
    insurance: Shield,
    custom: Star,
    title: Building2,
    text: Building2,
    image: Building2,
    video: Building2,
    divider: Building2,
    table: Building2,
}

// Block to item type
const BLOCK_TO_ITEM: Record<BlockType, ProposalItemType> = {
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

// Blocks that support AI extraction
const AI_ENABLED_BLOCKS: BlockType[] = ['flight']

type TabType = 'library' | 'ai'

export function BlockSearchDrawer({
    isOpen,
    blockType,
    sectionId,
    onClose,
}: BlockSearchDrawerProps) {
    const [search, setSearch] = useState('')
    const [showCreator, setShowCreator] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('library')
    const { addItemFromLibrary, addItem, updateItem } = useProposalBuilder()

    // Check if AI is available for this block type
    const hasAISupport = blockType && AI_ENABLED_BLOCKS.includes(blockType)

    // Get library category for this block type
    const libraryCategory = blockType ? BLOCK_TO_LIBRARY_CATEGORY[blockType] : undefined

    // Search library
    const { data: results = [], isLoading } = useLibrarySearch(
        {
            search,
            category: libraryCategory,
        },
        isOpen && search.length >= 2 && activeTab === 'library'
    )

    // Handle selecting a result
    const handleSelect = useCallback((item: LibrarySearchResult) => {
        if (sectionId) {
            addItemFromLibrary(sectionId, item)
        }
        onClose()
    }, [sectionId, addItemFromLibrary, onClose])

    // Handle AI extraction complete
    const handleAIExtractComplete = useCallback((extractedItems: ExtractedItem[]) => {
        if (!sectionId || !blockType) return

        // Add each extracted item to the section
        for (const extracted of extractedItems) {
            // Create the item
            const itemType = BLOCK_TO_ITEM[blockType] || 'flight'
            addItem(sectionId, itemType, extracted.title)

            // Get the newly added item and update with extracted data
            const sections = useProposalBuilder.getState().sections
            const section = sections.find(s => s.id === sectionId)
            if (section && section.items.length > 0) {
                const lastItem = section.items[section.items.length - 1]
                updateItem(lastItem.id, {
                    description: extracted.description || null,
                    base_price: extracted.price || 0,
                    rich_content: {
                        extracted_from_ai: true,
                        location: extracted.location,
                        dates: extracted.dates,
                        category: extracted.category,
                        ...extracted.details,
                    },
                })
            }
        }

        onClose()
    }, [sectionId, blockType, addItem, updateItem, onClose])

    // Handle create new
    const handleCreateNew = useCallback(() => {
        setShowCreator(true)
    }, [])

    // Handle creator close
    const handleCreatorClose = useCallback(() => {
        setShowCreator(false)
        onClose()
    }, [onClose])

    // Close drawer
    const handleClose = useCallback(() => {
        setSearch('')
        setActiveTab('library')
        onClose()
    }, [onClose])

    if (!isOpen || !blockType) return null

    const Icon = BLOCK_ICONS[blockType] || Building2
    const label = BLOCK_LABELS[blockType]
    const itemType = BLOCK_TO_ITEM[blockType]

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                onClick={handleClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    'fixed right-0 top-0 h-full w-full max-w-md',
                    'bg-white shadow-2xl z-50',
                    'flex flex-col',
                    'transform transition-transform duration-300 ease-out',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Adicionar {label}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {hasAISupport ? 'Busque na biblioteca ou extraia com IA' : 'Busque na biblioteca ou crie novo'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="h-10 w-10"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Tabs - Only show if AI is available */}
                {hasAISupport && (
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('library')}
                            className={cn(
                                'flex-1 py-3 px-4 text-sm font-medium transition-colors',
                                'flex items-center justify-center gap-2',
                                activeTab === 'library'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            )}
                        >
                            <Library className="h-4 w-4" />
                            Biblioteca
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={cn(
                                'flex-1 py-3 px-4 text-sm font-medium transition-colors',
                                'flex items-center justify-center gap-2',
                                activeTab === 'ai'
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            )}
                        >
                            <Sparkles className="h-4 w-4" />
                            Extrair com IA
                        </button>
                    </div>
                )}

                {/* Content based on active tab */}
                {activeTab === 'ai' && hasAISupport ? (
                    /* AI Extraction Tab */
                    <div className="flex-1 overflow-y-auto p-4">
                        <AIImageExtractor
                            onExtractComplete={handleAIExtractComplete}
                            onCancel={handleClose}
                        />
                    </div>
                ) : (
                    /* Library Search Tab */
                    <>
                        {/* Search */}
                        <div className="px-4 py-3 border-b border-slate-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder={`Buscar ${label.toLowerCase()}...`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                    autoFocus={activeTab === 'library'}
                                />
                            </div>
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            ) : search.length < 2 ? (
                                <div className="p-6 text-center">
                                    <Library className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm text-slate-500">
                                        Digite pelo menos 2 caracteres para buscar
                                    </p>
                                </div>
                            ) : results.length === 0 ? (
                                <div className="p-6 text-center">
                                    <Search className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm text-slate-500 mb-4">
                                        Nenhum resultado para "{search}"
                                    </p>
                                    <Button onClick={handleCreateNew}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Criar Novo {label}
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {results.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelect(item)}
                                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50 transition-colors text-left"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                                                {item.thumbnail_url ? (
                                                    <img
                                                        src={item.thumbnail_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <Icon className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 truncate">
                                                    {item.name}
                                                </p>
                                                {item.location_city && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {item.location_city}
                                                        {item.location_country && `, ${item.location_country}`}
                                                    </p>
                                                )}
                                                {item.star_rating && (
                                                    <div className="flex items-center gap-0.5 mt-1">
                                                        {Array.from({ length: item.star_rating }).map((_, i) => (
                                                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Price */}
                                            {item.base_price && Number(item.base_price) > 0 && (
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-semibold text-emerald-600">
                                                        {new Intl.NumberFormat('pt-BR', {
                                                            style: 'currency',
                                                            currency: item.currency || 'BRL',
                                                        }).format(Number(item.base_price))}
                                                    </p>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {results.length > 0 && (
                            <div className="p-4 border-t border-slate-200">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleCreateNew}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Criar Novo {label}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Item Creator Drawer */}
            {showCreator && sectionId && (
                <ItemCreatorDrawer
                    isOpen={showCreator}
                    onClose={handleCreatorClose}
                    sectionId={sectionId}
                    itemType={itemType}
                    defaultTitle={search}
                />
            )}
        </>
    )
}

export default BlockSearchDrawer
