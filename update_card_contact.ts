
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://szyrzxvlptqqheizyrxu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateCard() {
    // 1. Try to get a contact
    let { data: contacts, error: contactError } = await supabase
        .from('contatos')
        .select('id, nome')
        .limit(1)

    let contactId;

    if (!contacts || contacts.length === 0) {
        console.log('No contacts found. Creating one...')
        const { data: newContact, error: createError } = await supabase
            .from('contatos')
            .insert({
                nome: 'Contato Teste',
                email: 'teste@exemplo.com',
                tipo_pessoa: 'adulto'
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating contact:', createError)
            return
        }
        contactId = newContact.id
        console.log('Created contact:', newContact)
    } else {
        contactId = contacts[0].id
        console.log('Found contact:', contacts[0])
    }

    // 2. Update the card
    const cardId = 'e40f8070-5ab1-4ffb-a5b6-b259dd6a7e59'
    const { error: updateError } = await supabase
        .from('cards')
        .update({ pessoa_principal_id: contactId })
        .eq('id', cardId)

    if (updateError) {
        console.error('Error updating card:', updateError)
    } else {
        console.log('Card updated successfully with primary contact:', contactId)
    }
}

updateCard()
