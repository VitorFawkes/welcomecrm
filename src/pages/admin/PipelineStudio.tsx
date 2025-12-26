import { useState } from 'react'
import { List, Settings, SlidersHorizontal } from 'lucide-react'
import StudioStructure from '../../components/admin/studio/StudioStructure'
import StudioUnified from '../../components/admin/studio/StudioUnified'

type StudioTab = 'structure' | 'fields'

export default function PipelineStudio() {
    const [activeTab, setActiveTab] = useState<StudioTab>('structure')

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-gray-700" />
                        Pipeline Studio
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gerencie etapas, campos do sistema e regras de exibição em um único lugar.
                    </p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg w-fit mb-8">
                <button
                    onClick={() => setActiveTab('structure')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'structure'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <List className="w-4 h-4" />
                    Estrutura (Etapas)
                </button>
                <button
                    onClick={() => setActiveTab('fields')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'fields'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    Campos & Regras
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl border shadow-sm min-h-[600px]">
                {activeTab === 'structure' && <StudioStructure />}
                {activeTab === 'fields' && <StudioUnified />}
            </div>
        </div>
    )
}
