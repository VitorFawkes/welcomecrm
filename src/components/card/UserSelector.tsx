import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User } from 'lucide-react'

interface Profile {
    id: string
    nome: string
    email: string
    role: string | null
}

interface UserSelectorProps {
    currentUserId: string | null
    onSelect: (userId: string | null) => void
    label?: string
    disabled?: boolean
    roleFilter?: string | string[]
}

export default function UserSelector({ currentUserId, onSelect, label, disabled = false, roleFilter }: UserSelectorProps) {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true)
            try {
                // Busca todos os usuários ativos
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, nome, email, role')
                    .eq('active', true)
                    .order('nome')

                if (error) throw error

                let filteredProfiles = data || []

                // Filtra por role se especificado (usando o campo 'role' diretamente)
                if (roleFilter) {
                    const roleArray = Array.isArray(roleFilter) ? roleFilter : [roleFilter]
                    filteredProfiles = filteredProfiles.filter(p =>
                        p.role && roleArray.includes(p.role)
                    )
                }

                setProfiles(filteredProfiles as Profile[])
            } catch (error) {
                console.error('Error fetching profiles:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProfiles()
    }, [roleFilter])

    return (
        <div>
            {label && <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>}
            <div className="relative">
                <select
                    value={currentUserId || ''}
                    onChange={(e) => onSelect(e.target.value || null)}
                    disabled={disabled || loading}
                    className="w-full appearance-none rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 pl-9 pr-8 cursor-pointer disabled:bg-gray-50 disabled:text-gray-500"
                >
                    <option value="">Sem responsável</option>
                    {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                            {profile.nome || profile.email}
                        </option>
                    ))}
                </select>
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
    )
}
