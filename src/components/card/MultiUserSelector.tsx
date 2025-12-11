import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Plus } from 'lucide-react'

interface Profile {
    id: string
    nome: string
    email: string
    role: string
}

interface MultiUserSelectorProps {
    selectedUserIds: string[]
    onChange: (userIds: string[]) => void
    label?: string
    disabled?: boolean
}

export default function MultiUserSelector({ selectedUserIds, onChange, label, disabled = false }: MultiUserSelectorProps) {
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

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = e.target.value
        if (userId && !selectedUserIds.includes(userId)) {
            onChange([...selectedUserIds, userId])
        }
        e.target.value = '' // Reset select
    }

    const handleRemove = (userId: string) => {
        onChange(selectedUserIds.filter(id => id !== userId))
    }

    const availableProfiles = profiles.filter(p => !selectedUserIds.includes(p.id))

    return (
        <div className="space-y-2">
            {label && <label className="text-xs font-medium text-gray-700 block">{label}</label>}

            <div className="relative">
                <select
                    onChange={handleSelect}
                    disabled={disabled || loading}
                    className="w-full appearance-none bg-white pl-3 pr-8 py-2 text-sm text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                >
                    <option value="">Adicionar participante...</option>
                    {availableProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                            {profile.nome || profile.email}
                        </option>
                    ))}
                </select>
                <Plus className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {selectedUserIds.map(id => {
                        const profile = profiles.find(p => p.id === id)
                        return (
                            <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {profile?.nome || profile?.email || 'Usuário'}
                                <button
                                    type="button"
                                    onClick={() => handleRemove(id)}
                                    className="hover:text-indigo-900 focus:outline-none"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
