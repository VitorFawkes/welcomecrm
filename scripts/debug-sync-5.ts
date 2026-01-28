/**
 * Debug v5 - Verificar eventos recém criados e processar um para ver o erro
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szyrzxvlptqqheizyrxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debug() {
  console.log('\n🔍 DEBUG V5 - VERIFICAR EVENTOS E PROCESSAR\n');
  console.log('='.repeat(60));

  // 1. Contar todos os eventos por status
  console.log('\n📊 1. CONTAGEM DE EVENTOS POR STATUS\n');

  const statuses = ['pending', 'processed', 'processed_shadow', 'failed', 'ignored'];

  for (const status of statuses) {
    const { count } = await supabase
      .from('integration_events')
      .select('id', { count: 'exact' })
      .eq('status', status);

    const icon = status === 'processed' ? '✅' :
                 status === 'pending' ? '⏳' :
                 status === 'failed' ? '❌' :
                 status === 'ignored' ? '🚫' :
                 status === 'processed_shadow' ? '🔮' : '❓';

    console.log(`  ${icon} ${status}: ${count || 0}`);
  }

  // 2. Buscar eventos pendentes mais recentes
  console.log('\n⏳ 2. EVENTOS PENDENTES (últimos 10)\n');

  const { data: pendingEvents } = await supabase
    .from('integration_events')
    .select('id, external_id, event_type, payload, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (pendingEvents && pendingEvents.length > 0) {
    console.log(`  Encontrados ${pendingEvents.length} eventos pendentes:`);
    pendingEvents.slice(0, 3).forEach((e, i) => {
      const stage = e.payload?.stage || e.payload?.stage_id || e.payload?.['deal[stageid]'] || '?';
      const pipeline = e.payload?.pipeline || e.payload?.pipeline_id || e.payload?.['deal[pipelineid]'] || '?';
      const owner = e.payload?.owner || e.payload?.owner_id || '?';
      console.log(`\n  [${i+1}] ID: ${e.id.substring(0, 8)}...`);
      console.log(`      External ID (AC Deal): ${e.external_id}`);
      console.log(`      Tipo: ${e.event_type}`);
      console.log(`      Pipeline AC: ${pipeline} | Stage AC: ${stage} | Owner AC: ${owner}`);
      console.log(`      Criado: ${new Date(e.created_at).toLocaleString('pt-BR')}`);
    });

    // 3. Tentar processar os eventos
    console.log('\n\n🔄 3. TENTANDO PROCESSAR EVENTOS...\n');

    const { data: processResult, error: processError } = await supabase.functions.invoke('integration-process', {
      body: { limit: 5 }
    });

    if (processError) {
      console.log('  ❌ Erro ao chamar integration-process:', processError.message);
    } else {
      console.log('  Resultado do processamento:');
      console.log(JSON.stringify(processResult, null, 2));
    }

    // 4. Verificar se algum evento falhou agora
    console.log('\n\n❌ 4. VERIFICAR EVENTOS QUE FALHARAM APÓS PROCESSAMENTO\n');

    const { data: failedNow } = await supabase
      .from('integration_events')
      .select('id, external_id, processing_log, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (failedNow && failedNow.length > 0) {
      console.log('  Eventos com falha:');
      failedNow.forEach((e, i) => {
        console.log(`\n  [${i+1}] External ID: ${e.external_id}`);
        console.log(`      ERRO: ${e.processing_log}`);
      });
    } else {
      console.log('  Nenhum evento com falha');
    }

  } else {
    console.log('  Nenhum evento pendente encontrado');
    console.log('  (Pode ser que RLS esteja bloqueando a visualização)');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

debug().catch(console.error);
