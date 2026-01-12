import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { ITEM_TYPE_CONFIG } from '@/types/proposals'
import type { ProposalItemType } from '@/types/proposals'
import { Button } from '@/components/ui/Button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface AddItemMenuProps {
    sectionId: string
}

export function AddItemMenu({ sectionId }: AddItemMenuProps) {
    const { addItem } = useProposalBuilder()

    const itemTypes = Object.entries(ITEM_TYPE_CONFIG) as [ProposalItemType, typeof ITEM_TYPE_CONFIG[ProposalItemType]][]

    const handleAddItem = (type: ProposalItemType) => {
        const config = ITEM_TYPE_CONFIG[type]
        addItem(sectionId, type, `Novo ${config.label}`)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500">
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Item
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                {itemTypes.map(([type, config]) => {
                    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] || LucideIcons.Package
                    return (
                        <DropdownMenuItem
                            key={type}
                            onClick={() => handleAddItem(type)}
                            className="flex items-center gap-2"
                        >
                            <IconComponent className="h-4 w-4 text-slate-500" />
                            <span>{config.label}</span>
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
