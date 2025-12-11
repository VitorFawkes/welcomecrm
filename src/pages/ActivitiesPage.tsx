import ActivityFeed from '../components/card/ActivityFeed'

export default function ActivitiesPage() {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Atividades Recentes</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <ActivityFeed />
            </div>
        </div>
    )
}
