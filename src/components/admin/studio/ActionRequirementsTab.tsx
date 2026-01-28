import GovernanceConsole from './GovernanceConsole'

export default function ActionRequirementsTab() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Governança de Processos</h2>
                <p className="text-muted-foreground mt-1">
                    Defina regras de bloqueio (Stage Gates) para garantir que processos sejam seguidos.
                </p>
            </div>
            <GovernanceConsole />
        </div>
    )
}
