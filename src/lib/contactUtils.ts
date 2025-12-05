import type { Database } from '../database.types'

type Contato = Database['public']['Tables']['contatos']['Row'] & {
    tipo_pessoa?: 'adulto' | 'crianca'
}

export function calculateAge(birthDate: string | null | undefined): number | null {
    if (!birthDate) return null

    const birth = new Date(birthDate)
    const today = new Date()

    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }

    return age
}

export function getTipoPessoa(birthDate: string | null | undefined): 'adulto' | 'crianca' {
    const age = calculateAge(birthDate)
    if (age === null) return 'adulto' // Default to adult if no birth date
    return age < 18 ? 'crianca' : 'adulto'
}

export function formatContactName(contact: Contato): string {
    return contact.nome
}

export function getContactSummary(contacts: Contato[]): { adults: number, children: number } {
    return contacts.reduce(
        (acc, contact) => {
            if (contact.tipo_pessoa === 'adulto') {
                acc.adults++
            } else {
                acc.children++
            }
            return acc
        },
        { adults: 0, children: 0 }
    )
}
