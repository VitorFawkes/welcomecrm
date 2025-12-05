
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://szyrzxvlptqqheizyrxu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw'

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
