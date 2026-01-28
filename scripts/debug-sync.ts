/**
 * Script de diagnóstico para problemas de sincronização AC -> CRM
 * Executa: npx tsx scripts/debug-sync.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szyrzxvlptqqheizyrxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('\n🔍 DIAGNÓSTICO DE SINCRONIZAÇÃO AC -> CRM\n');
  console.log('='.repeat(60));

  // 1. Verificar configurações de integração
  console.log('\n📋 1. CONFIGURAÇÕES DE INTEGRAÇÃO\n');
  const { data: settings } = await supabase
    .from('integration_settings')
    .select('key, value')
    .in('key', ['SHADOW_MODE_ENABLED', 'WRITE_MODE_ENABLED', 'INBOUND_INGEST_ENABLED']);

  const settingsMap = settings?.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>) || {};

  console.log('  SHADOW_MODE_ENABLED:', settingsMap.SHADOW_MODE_ENABLED || 'não definido');
  console.log('  WRITE_MODE_ENABLED:', settingsMap.WRITE_MODE_ENABLED || 'não definido');
  console.log('  INBOUND_INGEST_ENABLED:', settingsMap.INBOUND_INGEST_ENABLED || 'não definido');

  const isShadowMode = settingsMap.SHADOW_MODE_ENABLED === 'true' || settingsMap.WRITE_MODE_ENABLED !== 'true';
  console.log('\n  ⚠️  Modo atual:', isShadowMode ? '🔮 SHADOW (não grava no banco)' : '✅ WRITE (grava no banco)');

  // 2. Verificar últimos eventos criados
  console.log('\n📥 2. ÚLTIMOS EVENTOS DE INTEGRAÇÃO (últimas 24h)\n');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentEvents, count } = await supabase
    .from('integration_events')
    .select('id, status, event_type, entity_type, external_id, processing_log, created_at, payload', { count: 'exact' })
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(`  Total de eventos nas últimas 24h: ${count || 0}`);

  if (recentEvents && recentEvents.length > 0) {
    // Agrupar por status
    const byStatus = recentEvents.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n  Por status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      const icon = status === 'processed' ? '✅' :
                   status === 'pending' ? '⏳' :
                   status === 'failed' ? '❌' :
                   status === 'ignored' ? '🚫' :
                   status === 'processed_shadow' ? '🔮' : '❓';
      console.log(`    ${icon} ${status}: ${count}`);
    });

    console.log('\n  Últimos 5 eventos:');
    recentEvents.slice(0, 5).forEach((e, i) => {
      const time = new Date(e.created_at).toLocaleString('pt-BR');
      const ownerId = e.payload?.owner || e.payload?.owner_id || e.payload?.['deal[owner]'] || '-';
      console.log(`\n  [${i + 1}] ${e.status.toUpperCase()}`);
      console.log(`      Tipo: ${e.event_type} | Entidade: ${e.entity_type}`);
      console.log(`      External ID: ${e.external_id || '-'}`);
      console.log(`      Owner ID (AC): ${ownerId}`);
      console.log(`      Criado em: ${time}`);
      if (e.processing_log) {
        console.log(`      Log: ${e.processing_log.substring(0, 100)}${e.processing_log.length > 100 ? '...' : ''}`);
      }
    });
  } else {
    console.log('\n  ⚠️  Nenhum evento encontrado nas últimas 24h');
  }

  // 3. Verificar eventos pendentes
  console.log('\n⏳ 3. EVENTOS PENDENTES\n');
  const { data: pendingEvents, count: pendingCount } = await supabase
    .from('integration_events')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');

  console.log(`  Total de eventos pendentes: ${pendingCount || 0}`);
  if ((pendingCount || 0) > 0) {
    console.log('  ⚠️  Há eventos pendentes! Clique em "Processar" no dashboard de integração.');
  }

  // 4. Verificar mapeamento de usuários
  console.log('\n👤 4. MAPEAMENTO DE USUÁRIOS (AC -> CRM)\n');
  const { data: userMaps } = await supabase
    .from('integration_user_map')
    .select('external_user_id, internal_user_id, notes');

  if (userMaps && userMaps.length > 0) {
    console.log('  Mapeamentos configurados:');
    userMaps.forEach(m => {
      console.log(`    AC User ${m.external_user_id} -> CRM User ${m.internal_user_id?.substring(0, 8)}... ${m.notes ? `(${m.notes})` : ''}`);
    });
  } else {
    console.log('  ⚠️  Nenhum mapeamento de usuário configurado!');
    console.log('  Isso pode causar problemas se você está filtrando por owner_id.');
  }

  // 5. Verificar integração AC
  console.log('\n🔌 5. INTEGRAÇÃO ACTIVE CAMPAIGN\n');
  const { data: integration } = await supabase
    .from('integrations')
    .select('id, provider, is_active, created_at')
    .eq('provider', 'active_campaign')
    .single();

  if (integration) {
    console.log(`  ID: ${integration.id}`);
    console.log(`  Ativa: ${integration.is_active ? '✅ Sim' : '❌ Não'}`);
    console.log(`  Criada em: ${new Date(integration.created_at).toLocaleString('pt-BR')}`);
  } else {
    console.log('  ❌ Integração AC não encontrada!');
  }

  // 6. Verificar triggers de entrada
  console.log('\n🎯 6. TRIGGERS DE ENTRADA (Regras de Ingestão)\n');
  const { data: triggers } = await supabase
    .from('integration_inbound_triggers')
    .select('*')
    .eq('is_active', true);

  if (triggers && triggers.length > 0) {
    console.log(`  ${triggers.length} trigger(s) ativo(s):`);
    triggers.forEach(t => {
      console.log(`    - Pipeline ${t.external_pipeline_id} / Stage ${t.external_stage_id}`);
      console.log(`      Ação: ${t.action_type} | Entidades: ${t.entity_types?.join(', ')}`);
    });
  } else {
    console.log('  ℹ️  Nenhum trigger configurado (permite todos os eventos)');
  }

  // 7. Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DO DIAGNÓSTICO\n');

  const issues: string[] = [];

  if (isShadowMode) {
    issues.push('🔮 Shadow Mode está ATIVO - eventos são processados mas NÃO gravam no banco');
  }
  if ((pendingCount || 0) > 0) {
    issues.push(`⏳ Há ${pendingCount} evento(s) pendente(s) aguardando processamento`);
  }
  if (!userMaps || userMaps.length === 0) {
    issues.push('👤 Nenhum mapeamento de usuário configurado');
  }
  if ((count || 0) === 0) {
    issues.push('📥 Nenhum evento criado nas últimas 24h - verifique se o owner_id está correto');
  }

  if (issues.length === 0) {
    console.log('  ✅ Nenhum problema óbvio encontrado!');
  } else {
    console.log('  Possíveis problemas encontrados:\n');
    issues.forEach(issue => console.log(`  • ${issue}`));
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

diagnose().catch(console.error);
