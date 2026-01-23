import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ChevronDown, User, Zap, Users } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ROLES } from '../../constants/admin'
import type { Database } from '../../database.types'

type Product = Database['public']['Enums']['app_product']

interface Profile {
    id: string
    nome: string | null
    email: string | null
    role: string | null
    produtos: string[] | null
    team_id: string | null
    teams?: { name: string } | null
}

interface OwnerSelectorProps {
    value: string | null
    onChange: (ownerId: string | null, ownerName: string | null) => void
    product: Product
    placeholder?: string
    className?: string
    /** If true, shows "Sem SDR" as default and "Auto-atribuir" as an option */
    showNoSdrOption?: boolean
    /** Callback when auto-assign is selected */
    onAutoAssign?: () => void
}

export default function OwnerSelector({
    value,
    onChange,
    product,
    placeholder = 'Selecionar responsável',
    className,
    showNoSdrOption = false,
    onAutoAssign
}: OwnerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    // When showNoSdrOption is true, default to no selection (not auto mode)
    const [autoMode, setAutoMode] = useState(!showNoSdrOption && !value)

    // Fetch eligible users (active users - produtos filter removed as data is not populated)
    const { data: users = [], isLoading } = useQuery({
        queryKey: ['eligible-owners', product],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          id,
          nome,
          email,
          role,
          produtos,
          team_id,
          teams(name)
        `)
                .eq('active', true)
                .order('nome')

            if (error) throw error
            return data as Profile[]
        }
    })

    // Fetch cards count per user for workload indicator
    const { data: workload = {} } = useQuery({
        queryKey: ['owner-workload'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cards')
                .select('sdr_owner_id')
                .eq('status_comercial', 'em_andamento')
                .not('sdr_owner_id', 'is', null)

            if (error) throw error

            // Count cards per owner
            const counts: Record<string, number> = {}
            data?.forEach(card => {
                if (card.sdr_owner_id) {
                    counts[card.sdr_owner_id] = (counts[card.sdr_owner_id] || 0) + 1
                }
            })
            return counts
        },
        staleTime: 1000 * 30 // 30 seconds
    })

    const selectedUser = useMemo(() =>
        users.find(u => u.id === value),
        [users, value]
    )

    const getRoleBadge = (role: string | null) => {
        const roleConfig = ROLES.find(r => r.value === role)
        if (!roleConfig) return null
        return (
            <span className={cn('text-xs px-1.5 py-0.5 rounded', roleConfig.color)}>
                {roleConfig.label}
            </span>
        )
    }

    const handleSelect = (user: Profile | null) => {
        if (user) {
            setAutoMode(false)
            onChange(user.id, user.nome)
        } else {
            setAutoMode(true)
            onChange(null, null)
        }
        setIsOpen(false)
    }

    return (
        <div className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5',
                    'border border-slate-200 rounded-lg bg-white',
                    'hover:border-slate-300 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {autoMode ? (
                        <>
                            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <Zap className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">Auto-atribuir</p>
                                <p className="text-xs text-slate-500 truncate">Round-robin entre SDRs</p>
                            </div>
                        </>
                    ) : selectedUser ? (
                        <>
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-3.5 w-3.5 text-slate-600" />
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{selectedUser.nome}</p>
                                <div className="flex items-center gap-1.5">
                                    {getRoleBadge(selectedUser.role)}
                                    {selectedUser.teams?.name && (
                                        <span className="text-xs text-slate-500">• {selectedUser.teams.name}</span>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : showNoSdrOption ? (
                        <>
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-sm font-medium text-slate-600 truncate">Sem SDR</p>
                                <p className="text-xs text-slate-400 truncate">Clique para atribuir</p>
                            </div>
                        </>
                    ) : (
                        <span className="text-sm text-slate-500">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={cn(
                    'h-4 w-4 text-slate-400 transition-transform flex-shrink-0',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {/* "Sem SDR" option - only when showNoSdrOption is true */}
                        {showNoSdrOption && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAutoMode(false)
                                        onChange(null, null)
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors',
                                        !autoMode && !value && 'bg-slate-50'
                                    )}
                                >
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                        <User className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-slate-700">Sem SDR</p>
                                        <p className="text-xs text-slate-500">Card sem responsável definido</p>
                                    </div>
                                </button>
                                <div className="border-t border-slate-100" />
                            </>
                        )}

                        {/* Auto-atribuir option */}
                        <button
                            type="button"
                            onClick={() => {
                                setAutoMode(true)
                                onChange(null, null)
                                onAutoAssign?.()
                                setIsOpen(false)
                            }}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors',
                                autoMode && 'bg-indigo-50'
                            )}
                        >
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-slate-900">Auto-atribuir</p>
                                <p className="text-xs text-slate-500">Round-robin entre SDRs disponíveis</p>
                            </div>
                        </button>

                        <div className="border-t border-slate-100" />

                        {/* User list */}
                        {isLoading ? (
                            <div className="px-3 py-4 text-center text-sm text-slate-500">
                                Carregando...
                            </div>
                        ) : users.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-slate-500">
                                Nenhum usuário disponível para {product}
                            </div>
                        ) : (
                            users.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelect(user)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors',
                                        value === user.id && 'bg-indigo-50'
                                    )}
                                >
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                        <User className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-900 truncate">{user.nome}</p>
                                            {getRoleBadge(user.role)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {user.teams?.name && <span>{user.teams.name}</span>}
                                            {workload[user.id] !== undefined && (
                                                <span className="flex items-center gap-0.5">
                                                    <Users className="h-3 w-3" />
                                                    {workload[user.id]} cards
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
