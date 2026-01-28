/**
 * Script para criar o registro de integração AC na tabela integrations
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szyrzxvlptqqheizyrxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXJ6eHZscHRxcWhlaXp5cnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODkyMjMsImV4cCI6MjA3OTc2NTIyM30.nfzDHPWE7gjEztY9wY7sh_hSyu_xNZlkFqrYZ3KKQsw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fix() {
  console.log('\n🔧 CRIANDO REGISTRO DE INTEGRAÇÃO\n');

  // Verificar se já existe
  const { data: existing } = await supabase
    .from('integrations')
    .select('id')
    .eq('provider', 'active_campaign')
    .single();

  if (existing) {
    console.log('✅ Registro já existe:', existing.id);
    return;
  }

  // Criar novo registro
  const { data, error } = await supabase
    .from('integrations')
    .insert({
      provider: 'active_campaign',
      is_active: true,
      config: {
        name: 'ActiveCampaign',
        description: 'Integração com ActiveCampaign para sincronização de deals e contatos'
      }
    })
    .select()
    .single();

  if (error) {
    console.log('❌ Erro ao criar:', error.message);
    console.log('\n   Detalhes:', error);
    return;
  }

  console.log('✅ Registro criado com sucesso!');
  console.log('   ID:', data.id);
  console.log('   Provider:', data.provider);
  console.log('   Ativo:', data.is_active);

  console.log('\n📋 PRÓXIMOS PASSOS:\n');
  console.log('   1. Configure o mapeamento de stages em Admin > Integrações');
  console.log('   2. Configure o mapeamento de usuários (owners)');
  console.log('   3. Tente sincronizar novamente\n');
}

fix().catch(console.error);
