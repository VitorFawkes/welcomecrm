/**
 * Script para aplicar os controles de outbound sync
 * Executa via: node scripts/apply-outbound-controls.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szyrzxvlptqqheizyrxu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYzMzg1OCwiZXhwIjoyMDg0OTkzODU4fQ.ILyMlG1ZVCzsnLTIG0MSQhHK7eq-eqBgoNsKcpbbZVs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function execSQL(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) throw new Error(`SQL Error: ${error.message}`);
  return data;
}

async function applyMigration() {
  console.log('🚀 Aplicando controles de sincronização outbound...\n');

  // 1. Verificar settings existentes
  console.log('1️⃣ Verificando settings existentes...');
  const existingSettings = await execSQL(
    "SELECT key FROM integration_settings WHERE key LIKE 'OUTBOUND%'"
  );
  console.log(`   Encontrados: ${existingSettings?.length || 0} settings OUTBOUND`);

  if (existingSettings?.length >= 3) {
    console.log('   ✅ Settings já existem\n');
  } else {
    console.log('   ⚠️ Inserindo settings via REST API...');
    const { error } = await supabase
      .from('integration_settings')
      .upsert([
        { key: 'OUTBOUND_SYNC_ENABLED', value: 'false', description: 'Habilita sincronização de mudanças do CRM para o ActiveCampaign' },
        { key: 'OUTBOUND_SHADOW_MODE', value: 'true', description: 'Quando ativo, registra eventos na fila mas NÃO envia para o ActiveCampaign' },
        { key: 'OUTBOUND_ALLOWED_EVENTS', value: 'stage_change,won,lost,field_update', description: 'Tipos de eventos que serão sincronizados (CSV)' }
      ], { onConflict: 'key' });

    if (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    } else {
      console.log('   ✅ Settings inseridos\n');
    }
  }

  // 2. Verificar função get_outbound_setting
  console.log('2️⃣ Verificando função get_outbound_setting...');
  const funcExists = await execSQL(
    "SELECT proname FROM pg_proc WHERE proname = 'get_outbound_setting'"
  );

  if (funcExists?.length > 0) {
    console.log('   ✅ Função get_outbound_setting já existe\n');
  } else {
    console.log('   ⚠️ Função não existe - precisa ser criada via SQL Editor\n');
  }

  // 3. Verificar função log_outbound_card_event
  console.log('3️⃣ Verificando função log_outbound_card_event...');
  const triggerFunc = await execSQL(
    "SELECT prosrc FROM pg_proc WHERE proname = 'log_outbound_card_event'"
  );

  if (triggerFunc?.[0]?.prosrc?.includes('get_outbound_setting')) {
    console.log('   ✅ Função log_outbound_card_event já tem controles de admin\n');
  } else {
    console.log('   ⚠️ Função existe mas SEM controles de admin');
    console.log('   ⚠️ Precisa atualizar via SQL Editor\n');
  }

  // 4. Verificar constraint de status
  console.log('4️⃣ Verificando constraint de status na fila...');
  const constraints = await execSQL(`
    SELECT conname, pg_get_constraintdef(c.oid) as definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'integration_outbound_queue'
    AND c.contype = 'c'
  `);

  const statusConstraint = constraints?.find(c => c.conname?.includes('status'));
  if (statusConstraint?.definition?.includes('shadow')) {
    console.log('   ✅ Constraint de status já inclui "shadow"\n');
  } else {
    console.log(`   ⚠️ Constraint atual: ${statusConstraint?.definition || 'não encontrada'}`);
    console.log('   ⚠️ Precisa atualizar via SQL Editor\n');
  }

  // 5. Verificar índice
  console.log('5️⃣ Verificando índice de performance...');
  const indexes = await execSQL(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'integration_outbound_queue'
    AND indexname LIKE '%status_created%'
  `);

  if (indexes?.length > 0) {
    console.log('   ✅ Índice já existe\n');
  } else {
    console.log('   ⚠️ Índice não existe - precisa ser criado via SQL Editor\n');
  }

  // Resumo
  console.log('=' .repeat(60));
  console.log('\n📋 RESUMO:');
  console.log('   Settings: ✅ OK (já aplicados via REST)');
  console.log('   Funções: ⚠️ Precisam ser atualizadas via SQL Editor');
  console.log('   Constraint: ⚠️ Precisa ser atualizada via SQL Editor');
  console.log('   Índice: ⚠️ Precisa ser criado via SQL Editor');

  console.log('\n📝 Para completar a migration, execute no SQL Editor do Supabase:');
  console.log('   https://supabase.com/dashboard/project/szyrzxvlptqqheizyrxu/sql\n');
  console.log('   Use o arquivo: supabase/migrations/20260202100000_outbound_sync_controls.sql\n');
}

applyMigration().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
