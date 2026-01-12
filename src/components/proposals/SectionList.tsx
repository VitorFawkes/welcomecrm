import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { SectionEditor } from './SectionEditor'
import { AddSectionMenu } from './AddSectionMenu'
import { FileText } from 'lucide-react'

export function SectionList() {
    const { sections } = useProposalBuilder()

    if (sections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Proposta vazia
                </h3>
                <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
                    Comece adicionando seções à sua proposta. Cada seção pode conter
                    múltiplos itens como hotéis, voos e experiências.
                </p>
                <AddSectionMenu />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {sections.map((section) => (
                <SectionEditor
                    key={section.id}
                    section={section}
                />
            ))}

            {/* Add Section Button at bottom */}
            <div className="flex justify-center pt-4">
                <AddSectionMenu />
            </div>
        </div>
    )
}
