
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://szyrzxvlptqqheizyrxu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log('Testing Supabase connection...')
    try {
        const { data, error } = await supabase
            .from('view_dashboard_funil')
            .select('*')
            .limit(5)

        if (error) {
            console.error('Error fetching view_dashboard_funil:', error)
        } else {
            console.log('Success! Data:', data)
        }
    } catch (err) {
        console.error('Unexpected error:', err)
    }
}

test()
