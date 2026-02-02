import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://szyrzxvlptqqheizyrxu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYzMzg1OCwiZXhwIjoyMDg0OTkzODU4fQ.ILyMlG1ZVCzsnLTIG0MSQhHK7eq-eqBgoNsKcpbbZVs'
)

async function main() {
  console.log('Dropping orphaned workflow trigger on tarefas...')

  // Execute DDL via RPC
  const { data, error } = await supabase.rpc('exec_ddl', {
    ddl_statement: 'DROP TRIGGER IF EXISTS trg_workflow_task_outcome ON public.tarefas'
  })

  if (error) {
    console.error('exec_ddl error:', error)

    // Fallback: Try creating a function to do it
    console.log('\nTrying alternative approach...')
    const { error: err2 } = await supabase.rpc('exec_sql', {
      query: `
        DO $$
        BEGIN
          DROP TRIGGER IF EXISTS trg_workflow_task_outcome ON public.tarefas;
          DROP FUNCTION IF EXISTS trigger_workflow_on_task_outcome() CASCADE;
        END $$;
      `
    })

    if (err2) {
      console.error('Alternative failed:', err2)
    } else {
      console.log('Trigger dropped successfully via DO block!')
    }
  } else {
    console.log('Trigger dropped successfully!')
  }

  // Verify
  const { data: triggers } = await supabase.rpc('exec_sql', {
    query: "SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.tarefas'::regclass AND tgname LIKE '%workflow%'"
  })

  console.log('\nRemaining workflow triggers on tarefas:', triggers)
}

main().catch(console.error)
