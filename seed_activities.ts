
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://szyrzxvlptqqheizyrxu.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseKey) {
    console.error('Error: SUPABASE_ANON_KEY or VITE_SUPABASE_KEY is required.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedActivities() {
    const cardId = 'e40f8070-5ab1-4ffb-a5b6-b259dd6a7e59'

    const activities = [
        { card_id: cardId, tipo: 'whatsapp', titulo: 'Conversa inicial', descricao: 'Cliente interessado em pacote para Europa em Julho.', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
        { card_id: cardId, tipo: 'ligacao', titulo: 'Qualificação', descricao: 'Alinhamento de expectativas e budget. Cliente prefere hotéis 4 estrelas.', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
        { card_id: cardId, tipo: 'email', titulo: 'Envio de Cotação', descricao: 'Primeira versão do roteiro enviada por email.', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
        { card_id: cardId, tipo: 'whatsapp', titulo: 'Dúvidas sobre roteiro', descricao: 'Cliente perguntou sobre passeios em Roma.', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
        { card_id: cardId, tipo: 'reuniao', titulo: 'Apresentação de Proposta', descricao: 'Reunião agendada para fechar detalhes.', created_at: new Date(Date.now() - 1 * 86400000).toISOString() }
    ]

    const { error } = await supabase
        .from('atividades')
        .insert(activities)

    if (error) {
        console.error('Error seeding activities:', error)
    } else {
        console.log('Activities seeded successfully')
    }
}

seedActivities()
