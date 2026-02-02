import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://szyrzxvlptqqheizyrxu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYzMzg1OCwiZXhwIjoyMDg0OTkzODU4fQ.ILyMlG1ZVCzsnLTIG0MSQhHK7eq-eqBgoNsKcpbbZVs'
)

async function main() {
  console.log('Step 1: Creating helper function to drop triggers...')

  // First, create a function that can drop triggers
  const createFn = await supabase.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION public.drop_workflow_trigger_fix()
      RETURNS TEXT AS $fn$
      BEGIN
        DROP TRIGGER IF EXISTS trg_workflow_task_outcome ON public.tarefas;
        DROP TRIGGER IF EXISTS trg_workflow_on_task_outcome ON public.tarefas;
        DROP FUNCTION IF EXISTS trigger_workflow_on_task_outcome() CASCADE;
        RETURN 'Triggers and function dropped successfully';
      END;
      $fn$ LANGUAGE plpgsql SECURITY DEFINER
    `
  })

  if (createFn.error) {
    console.error('Failed to create helper function:', createFn.error)
    return
  }

  console.log('Step 2: Executing helper function...')

  // Call the function
  const { data, error } = await supabase.rpc('drop_workflow_trigger_fix')

  if (error) {
    console.error('Failed to execute:', error)
  } else {
    console.log('Result:', data)
  }

  console.log('\nStep 3: Verifying...')

  // Verify
  const { data: triggers } = await supabase.rpc('exec_sql', {
    query: "SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.tarefas'::regclass AND tgname LIKE '%workflow%'"
  })

  console.log('Remaining workflow triggers on tarefas:', triggers)

  // Cleanup: drop the helper function
  console.log('\nStep 4: Cleaning up helper function...')
  await supabase.rpc('exec_sql', {
    query: 'DROP FUNCTION IF EXISTS public.drop_workflow_trigger_fix()'
  })
  console.log('Done!')
}

main().catch(console.error)
