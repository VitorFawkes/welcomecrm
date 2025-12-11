import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User } from 'lucide-react'

interface Profile {
    id: string
    nome: string
    email: string
    role: string
}

interface UserSelectorProps {
    currentUserId: string | null
    onSelect: (userId: string) => void
    label?: string
    disabled?: boolean
}

export default function UserSelector({ currentUserId, onSelect, label, disabled = false }: UserSelectorProps) {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, nome, email, role')
                    .eq('active', true)
                    .order('nome')

                if (error) throw error
                setProfiles(data || [])
            } catch (error) {
                console.error('Error fetching profiles:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProfiles()
    }, [])

    return (
        <div className="flex items-center gap-2">
            {label && <span className="text-xs text-gray-500">{label}:</span>}
            <div className="relative">
                <select
                    value={currentUserId || ''}
                    onChange={(e) => onSelect(e.target.value)}
                    disabled={disabled || loading}
                    className="appearance-none bg-transparent pl-6 pr-8 py-1 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                    <option value="">Sem responsável</option>
                    {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                            {profile.nome || profile.email}
                        </option>
                    ))}
                </select>
                <User className="absolute left-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
        </div>
    )
}
