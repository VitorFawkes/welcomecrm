import { useState } from 'react';
import { IntegrationList } from './IntegrationList';
import { IntegrationBuilder } from './IntegrationBuilder';
import { IntegrationFieldExplorer } from './IntegrationFieldExplorer';
import type { IntegrationType } from '@/lib/integrations';

export function IntegrationsPage() {
    const [view, setView] = useState<'list' | 'builder' | 'inspector' | 'explorer'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<IntegrationType>('input');

    const handleSelect = (id: string | null, type?: IntegrationType) => {
        if (id === 'new') {
            setSelectedId('new');
            if (type) setSelectedType(type);
            setView('builder');
        } else if (id) {
            setSelectedId(id);
            // Default to inspector for existing integrations, but maybe builder?
            // Let's show a split view or tabs in the future. For now, let's go to builder but with an inspector tab.
            setView('builder');
        }
    };

    return (
        <div className="h-full p-6 space-y-6">
            {view === 'builder' && selectedId ? (
                <IntegrationBuilder
                    integrationId={selectedId}
                    initialType={selectedType}
                    onBack={() => {
                        setView('list');
                        setSelectedId(null);
                    }}
                    onDraftCreated={(newId) => {
                        setSelectedId(newId);
                    }}
                />
            ) : view === 'explorer' ? (
                <IntegrationFieldExplorer onBack={() => setView('list')} />
            ) : (
                <IntegrationList
                    onSelect={handleSelect}
                    onExploreFields={() => setView('explorer')}
                />
            )}
        </div>
    );
}
