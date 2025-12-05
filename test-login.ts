
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://szyrzxvlptqqheizyrxu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
    console.log('Attempting login for vitor@welcometrips.com.br...')

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'vitor@welcometrips.com.br',
        password: 'welcomevitor'
    })

    if (error) {
        console.error('Login Failed!')
        console.error('Error:', error.message)
        console.error('Details:', error)
    } else {
        console.log('Login Successful!')
        console.log('User ID:', data.user.id)
        console.log('Session:', data.session ? 'Created' : 'Missing')
    }
}

testLogin()
