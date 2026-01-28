/**
 * Debug v4 - Investigar o que REALMENTE está acontecendo
 * Agora sabemos que o registro de integração existe
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szyrzxvlptqqheizyrxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debug() {
  console.log('\n🔍 DEBUG V4 - INVESTIGAÇÃO REAL\n');
  console.log('='.repeat(60));

  // 1. Tentar chamar a função de sync diretamente e ver a resposta
  console.log('\n📡 1. TESTANDO CHAMADA DA FUNÇÃO integration-sync-deals\n');

  // Testar sem filtro de owner
  console.log('  Teste 1: Sem filtro de owner (pipeline 8, limit 5)');
  try {
    const { data: result1, error: err1 } = await supabase.functions.invoke('integration-sync-deals', {
      body: { pipeline_id: '8', limit: 5 }
    });

    if (err1) {
      console.log('  ❌ Erro:', err1.message);
    } else {
      console.log('  ✅ Resposta:', JSON.stringify(result1, null, 2));
    }
  } catch (e: any) {
    console.log('  ❌ Exception:', e.message);
  }

  // Testar com owner_id = 1 (exemplo)
  console.log('\n  Teste 2: Com owner_id=1 (pipeline 8, limit 5)');
  try {
    const { data: result2, error: err2 } = await supabase.functions.invoke('integration-sync-deals', {
      body: { pipeline_id: '8', limit: 5, owner_id: '1' }
    });

    if (err2) {
      console.log('  ❌ Erro:', err2.message);
    } else {
      console.log('  ✅ Resposta:', JSON.stringify(result2, null, 2));
    }
  } catch (e: any) {
    console.log('  ❌ Exception:', e.message);
  }

  // 2. Verificar eventos criados recentemente (últimos 5 minutos)
  console.log('\n📥 2. EVENTOS CRIADOS NOS ÚLTIMOS 5 MINUTOS\n');
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentEvents, count } = await supabase
    .from('integration_events')
    .select('id, status, event_type, external_id, processing_log, created_at', { count: 'exact' })
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`  Total: ${count || 0} eventos`);
  if (recentEvents && recentEvents.length > 0) {
    recentEvents.forEach((e, i) => {
      console.log(`\n  [${i+1}] ${e.status} - ${e.event_type}`);
      console.log(`      External ID: ${e.external_id}`);
      console.log(`      Criado: ${new Date(e.created_at).toLocaleString('pt-BR')}`);
      if (e.processing_log) {
        console.log(`      Log: ${e.processing_log.substring(0, 80)}...`);
      }
    });
  } else {
    console.log('  Nenhum evento recente encontrado');
  }

  // 3. Verificar mapeamentos de stage
  console.log('\n🗺️ 3. MAPEAMENTOS DE STAGE (integration_stage_map)\n');
  const { data: stageMaps, count: stageCount } = await supabase
    .from('integration_stage_map')
    .select('*', { count: 'exact' });

  console.log(`  Total: ${stageCount || 0} mapeamentos`);
  if (stageMaps && stageMaps.length > 0) {
    stageMaps.slice(0, 5).forEach(m => {
      console.log(`    Pipeline ${m.pipeline_id} | Stage AC ${m.external_stage_id} -> CRM ${m.internal_stage_id?.substring(0,8)}...`);
    });
    if ((stageCount || 0) > 5) {
      console.log(`    ... e mais ${(stageCount || 0) - 5} mapeamentos`);
    }
  } else {
    console.log('  ⚠️ NENHUM MAPEAMENTO DE STAGE!');
    console.log('  Isso vai causar erro "Unmapped Stage" no processamento.');
  }

  // 4. Verificar se há eventos pendentes
  console.log('\n⏳ 4. EVENTOS PENDENTES (aguardando processamento)\n');
  const { count: pendingCount } = await supabase
    .from('integration_events')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');

  console.log(`  Total pendentes: ${pendingCount || 0}`);
  if ((pendingCount || 0) > 0) {
    console.log('  ℹ️  Há eventos esperando. Clique em "Processar" ou aguarde o cron.');
  }

  // 5. Verificar eventos com erro
  console.log('\n❌ 5. EVENTOS COM FALHA (últimos 20)\n');
  const { data: failedEvents } = await supabase
    .from('integration_events')
    .select('id, external_id, processing_log, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (failedEvents && failedEvents.length > 0) {
    failedEvents.forEach((e, i) => {
      console.log(`  [${i+1}] External ID: ${e.external_id}`);
      console.log(`      Erro: ${e.processing_log}`);
      console.log(`      Data: ${new Date(e.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    });
  } else {
    console.log('  Nenhum evento com falha encontrado');
  }

  // 6. Verificar configurações de modo
  console.log('\n⚙️ 6. CONFIGURAÇÕES DE MODO\n');
  const { data: settings } = await supabase
    .from('integration_settings')
    .select('key, value')
    .in('key', ['SHADOW_MODE_ENABLED', 'WRITE_MODE_ENABLED']);

  const shadow = settings?.find(s => s.key === 'SHADOW_MODE_ENABLED')?.value;
  const write = settings?.find(s => s.key === 'WRITE_MODE_ENABLED')?.value;

  console.log(`  SHADOW_MODE_ENABLED: ${shadow || 'não definido'}`);
  console.log(`  WRITE_MODE_ENABLED: ${write || 'não definido'}`);

  const isShadow = shadow === 'true' || write !== 'true';
  console.log(`\n  Modo atual: ${isShadow ? '🔮 SHADOW (não grava)' : '✅ WRITE (grava)'}`);

  console.log('\n' + '='.repeat(60) + '\n');
}

debug().catch(console.error);
