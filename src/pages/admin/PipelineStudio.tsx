import { Settings } from 'lucide-react'
import StudioStructure from '../../components/admin/studio/StudioStructure'

export default function PipelineStudio() {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-gray-700" />
                        Gerenciamento de Pipeline
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configure as etapas e regras de automação do seu funil de vendas.
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl border shadow-sm min-h-[600px]">
                <StudioStructure />
            </div>
        </div>
    )
}
