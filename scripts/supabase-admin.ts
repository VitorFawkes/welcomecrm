/**
 * Supabase Admin Script - Acesso total ao Supabase
 * Uso: npx ts-node scripts/supabase-admin.ts <comando> [args]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szyrzxvlptqqheizyrxu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE4OTIyMywiZXhwIjoyMDc5NzY1MjIzfQ.V2kluX9iDZ99xR1voSwBqXbkSn6WdY4peBVzTFZs-qE';
const MANAGEMENT_API_KEY = 'sb_secret_RFrk_cRPCfIES5-wrwfHiQ_LskCpaab';
const PROJECT_REF = 'szyrzxvlptqqheizyrxu';

// Cliente com acesso total (bypass RLS)
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Funções para Management API
export async function managementAPI(endpoint: string, method = 'GET', body?: any) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return response.json();
}

// === COMANDOS ===

async function listTables() {
  const { data, error } = await supabaseAdmin.rpc('pg_tables_list')
    .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

  if (error) {
    // Fallback: query direta
    const result = await supabaseAdmin.from('cards').select('id').limit(1);
    if (result.error) {
      console.log('Erro:', result.error.message);
      return;
    }

    // Usar SQL direto via REST
    const tablesQuery = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_all_tables`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!tablesQuery.ok) {
      console.log('Criando função helper...');
      await runSQL(`
        CREATE OR REPLACE FUNCTION list_all_tables()
        RETURNS TABLE (table_name text, row_estimate bigint)
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT tablename::text,
                 (SELECT reltuples::bigint FROM pg_class WHERE relname = tablename)
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename;
        $$;
      `);
      console.log('Função criada! Rode novamente.');
      return;
    }

    console.log(await tablesQuery.json());
    return;
  }

  console.log(data);
}

async function runSQL(sql: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    // Tentar via Management API
    const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANAGEMENT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    return mgmtResponse.json();
  }

  return response.json();
}

async function listEdgeFunctions() {
  return managementAPI('/functions');
}

async function getProjectInfo() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, {
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_API_KEY}`,
    }
  });
  return response.json();
}

// CLI
const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case 'tables':
      await listTables();
      break;
    case 'sql':
      console.log(await runSQL(args.join(' ')));
      break;
    case 'functions':
      console.log(await listEdgeFunctions());
      break;
    case 'info':
      console.log(await getProjectInfo());
      break;
    case 'test':
      console.log('Testando conexão...');
      const { data, error } = await supabaseAdmin.from('cards').select('id').limit(1);
      if (error) console.log('Erro:', error);
      else console.log('✅ Conexão OK! Encontrado:', data);
      break;
    default:
      console.log(`
Uso: npx ts-node scripts/supabase-admin.ts <comando>

Comandos:
  test      - Testa conexão
  tables    - Lista tabelas
  sql       - Executa SQL
  functions - Lista edge functions
  info      - Info do projeto
      `);
  }
}

main().catch(console.error);
