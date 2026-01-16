import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

/**
 * Seeds demonstration proposals for the CRM.
 * Creates realistic proposals with versions for testing and demo purposes.
 */
export async function seedProposals() {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        // Get existing cards to link proposals
        const { data: cards } = await supabase
            .from('cards')
            .select('id, titulo')
            .limit(5)

        if (!cards || cards.length === 0) {
            toast.warning('Crie alguns cards no Pipeline antes de gerar propostas de exemplo')
            return false
        }

        console.log('Starting proposals seed...')
        let created = 0

        const demoProposals = [
            {
                title: 'Maldivas - Lua de Mel Romantic Paradise',
                status: 'sent',
                cardIndex: 0,
            },
            {
                title: 'Disney Magic - Família Silva',
                status: 'draft',
                cardIndex: 1 % cards.length,
            },
            {
                title: 'Eurotrip Premium - 15 dias',
                status: 'accepted',
                cardIndex: 2 % cards.length,
            },
            {
                title: 'Nova York - Ano Novo Times Square',
                status: 'viewed',
                cardIndex: 0,
            },
            {
                title: 'Caribe All Inclusive - Família Costa',
                status: 'in_progress',
                cardIndex: 1 % cards.length,
            }
        ]

        for (const demo of demoProposals) {
            const card = cards[demo.cardIndex]

            // Check if proposal already exists for this card with same title
            const { data: existing } = await supabase
                .from('proposals')
                .select('id, active_version:proposal_versions(title)')
                .eq('card_id', card.id)
                .limit(10)

            const titleExists = existing?.some(p =>
                (p.active_version as any)?.title === demo.title
            )

            if (titleExists) {
                console.log('Proposal already exists:', demo.title)
                continue
            }

            // Create proposal
            const { data: proposal, error: proposalError } = await supabase
                .from('proposals')
                .insert({
                    card_id: card.id,
                    status: demo.status,
                    created_by: user.id,
                    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    view_count: demo.status === 'viewed' ? 3 : demo.status === 'accepted' ? 5 : 0,
                })
                .select()
                .single()

            if (proposalError) {
                console.error('Error creating proposal:', proposalError)
                continue
            }

            // Create version
            const { data: version, error: versionError } = await supabase
                .from('proposal_versions')
                .insert({
                    proposal_id: proposal.id,
                    version_number: 1,
                    title: demo.title,
                    created_by: user.id,
                    cover_image_url: null,
                    sections: [
                        { id: 'cover', type: 'cover', title: 'Capa', order: 0, items: [] },
                        { id: 'intro', type: 'text', title: 'Introdução', order: 1, items: [] },
                        { id: 'itinerary', type: 'day_by_day', title: 'Roteiro', order: 2, items: [] },
                    ],
                    pricing: {
                        total: Math.floor(Math.random() * 30000) + 10000,
                        currency: 'BRL',
                    },
                })
                .select()
                .single()

            if (versionError) {
                console.error('Error creating version:', versionError)
                continue
            }

            // Update proposal with active_version_id
            await supabase
                .from('proposals')
                .update({ active_version_id: version.id })
                .eq('id', proposal.id)

            console.log('Created proposal:', demo.title)
            created++
        }

        if (created > 0) {
            toast.success(`${created} propostas de exemplo criadas!`)
        } else {
            toast.info('Propostas de exemplo já existem')
        }

        return true
    } catch (error) {
        console.error('Error seeding proposals:', error)
        toast.error('Erro ao gerar propostas de exemplo')
        return false
    }
}
