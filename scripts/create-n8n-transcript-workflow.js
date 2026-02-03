#!/usr/bin/env node
/**
 * Script para criar o workflow "Welcome CRM - Atualização Campo Reuniões" no n8n
 *
 * Uso: N8N_API_KEY=xxx node scripts/create-n8n-transcript-workflow.js
 */

const N8N_API_URL = 'https://n8n-n8n.ymnmx7.easypanel.host';
const API_KEY = process.env.N8N_API_KEY;

if (!API_KEY) {
  console.error('❌ Erro: N8N_API_KEY não definida');
  console.error('Uso: N8N_API_KEY=xxx node scripts/create-n8n-transcript-workflow.js');
  process.exit(1);
}

// Gerar UUIDs simples
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const workflow = {
  name: "Welcome CRM - Atualização Campo Reuniões",
  nodes: [
    // 1. Webhook Trigger
    {
      parameters: {
        httpMethod: "POST",
        path: "transcript-process",
        options: {
          responseMode: "lastNode"
        }
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [224, 304],
      id: uuid(),
      name: "1. Webhook Trigger"
    },

    // 2. Salvar Transcrição na Reunião
    {
      parameters: {
        method: "PATCH",
        url: "=https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/reunioes?id=eq.{{ $json.body.meeting_id }}",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: '={{ JSON.stringify({ transcricao: $json.body.transcription }) }}',
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [448, 304],
      id: uuid(),
      name: "2. Salvar Transcrição"
    },

    // 3. Buscar Card
    {
      parameters: {
        url: "=https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/cards?id=eq.{{ $('1. Webhook Trigger').item.json.body.card_id }}&select=id,titulo,produto_data,briefing_inicial,pipeline_stage_id,pipeline_stages(fase)",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [672, 304],
      id: uuid(),
      name: "3. Busca Card"
    },

    // 4. Monta Contexto
    {
      parameters: {
        jsCode: `// Dados do card
const cardData = $('3. Busca Card').first().json || {};
const produtoData = cardData.produto_data || {};
const briefingData = cardData.briefing_inicial || {};

// Fase do card (SDR, Planner, Pós-venda)
const fase = cardData.pipeline_stages?.fase || 'SDR';

// Transcrição recebida via webhook
const transcricao = $('1. Webhook Trigger').first().json.body.transcription || '';
const meetingId = $('1. Webhook Trigger').first().json.body.meeting_id;

if (!transcricao || transcricao.trim().length === 0) {
  return [{
    json: {
      card_id: cardData.id,
      meeting_id: meetingId,
      titulo: cardData.titulo,
      fase: fase,
      campos_atuais: {},
      transcricao: "(Nenhuma transcrição recebida)",
      total_caracteres: 0,
      error: "Transcrição vazia"
    }
  }];
}

// Campos atuais baseado na FASE
let tripSource = {};
let obsSource = {};

if (fase === 'SDR') {
  tripSource = briefingData;
  obsSource = briefingData.observacoes || {};
} else if (fase === 'Planner') {
  tripSource = produtoData;
  obsSource = produtoData.observacoes_criticas || {};
} else {
  tripSource = produtoData;
  obsSource = produtoData.observacoes_pos_venda || {};
}

const camposAtuais = {
  destinos: tripSource.destinos || null,
  epoca_viagem: tripSource.epoca_viagem || null,
  motivo: tripSource.motivo || null,
  duracao_viagem: tripSource.duracao_viagem || null,
  orcamento: tripSource.orcamento || null,
  quantidade_viajantes: tripSource.quantidade_viajantes || null,
  servico_contratado: tripSource.servico_contratado || null,
  qual_servio_contratado: tripSource.qual_servio_contratado || null,
  momento_viagem: tripSource.momento_viagem || null,
  prioridade_viagem: obsSource.prioridade_viagem || null,
  o_que_e_importante: obsSource.o_que_e_importante || null,
  algo_especial_viagem: obsSource.algo_especial_viagem || null,
  receio_ou_medo: obsSource.receio_ou_medo || null,
  frequencia_viagem: obsSource.frequencia_viagem || null,
  usa_agencia: obsSource.usa_agencia || null,
};

return [{
  json: {
    card_id: cardData.id,
    meeting_id: meetingId,
    titulo: cardData.titulo,
    fase: fase,
    campos_atuais: camposAtuais,
    transcricao: transcricao,
    total_caracteres: transcricao.length
  }
}];
`
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [880, 304],
      id: uuid(),
      name: "4. Monta Contexto"
    },

    // 5. AI Extrator
    {
      parameters: {
        promptType: "define",
        text: `# TAREFA: Extrair informações da TRANSCRIÇÃO DE REUNIÃO para o CRM

## DADOS ATUAIS DO CARD
Título: {{ $json.titulo }}
Campos já preenchidos:
{{ JSON.stringify($json.campos_atuais, null, 2) }}

## TRANSCRIÇÃO DA REUNIÃO ({{ $json.total_caracteres }} caracteres)
{{ $json.transcricao }}

---

# INSTRUÇÕES DE EXTRAÇÃO

Analise a transcrição acima e extraia informações que o **CLIENTE** mencionou.
Em uma reunião, identifique quem é o cliente (geralmente quem NÃO é da Welcome Trips/agência).
Extraia APENAS informações ditas pelo cliente.

Retorne um JSON com APENAS os campos que você conseguir preencher com informação NOVA e CONFIÁVEL.

---

# CAMPOS DISPONÍVEIS

## 1. destinos - Array de strings com destinos ["Itália", "Paris"]
## 2. epoca_viagem - String: "Janeiro 2026", "Férias de julho"
## 3. motivo - String: "Lua de mel", "Aniversário de casamento"
## 4. duracao_viagem - Número de dias: 10, 15, 21
## 5. orcamento - Número em reais: 50000, 100000
## 6. quantidade_viajantes - Número: 2, 4, 6
## 7. servico_contratado - Boolean: true/false
## 8. qual_servio_contratado - String: "Voos", "Hospedagem"
## 9. momento_viagem - String: "Comemorando 10 anos de casamento"
## 10. prioridade_viagem - Array: ["viagem_alto_padrão", "melhor_custo_x_benefício"]
## 11. o_que_e_importante - String livre
## 12. algo_especial_viagem - String livre
## 13. receio_ou_medo - String livre
## 14. frequencia_viagem - "1x_ao_ano" | "2x_a_3x_ao_ano" | "mais_de_3x_ao_ano"
## 15. usa_agencia - "sim" | "não"

---

# REGRAS

1. EXTRAIA APENAS do CLIENTE
2. NÃO INVENTE informações
3. USE FORMATOS EXATOS
4. NÃO REPITA valores existentes
5. RETORNE APENAS JSON válido
6. Se nada novo: {}

Exemplo: {"destinos": ["Itália"], "quantidade_viajantes": 2, "motivo": "Lua de mel"}`,
        options: {
          systemMessage: `Você extrai dados de transcrições de reuniões para o CRM da Welcome Trips.
REGRAS:
1. Extraia APENAS do CLIENTE (não do consultor)
2. Retorne APENAS JSON válido
3. Se não houver dados novos: {}
4. Use formatos exatos especificados`
        }
      },
      type: "@n8n/n8n-nodes-langchain.agent",
      typeVersion: 2.2,
      position: [1104, 304],
      id: uuid(),
      name: "5. AI Extrator"
    },

    // GPT Model
    {
      parameters: {
        model: {
          __rl: true,
          value: "gpt-4o",
          mode: "list"
        },
        options: {
          responseFormat: "json_object",
          temperature: 0.1
        }
      },
      type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      typeVersion: 1.2,
      position: [1104, 528],
      id: uuid(),
      name: "GPT-4o"
    },

    // 6. Valida Output
    {
      parameters: {
        jsCode: `const aiOutput = $('5. AI Extrator').first().json.output || '{}';

let extracted = {};
try {
  let cleanOutput = aiOutput;
  if (typeof cleanOutput === 'string') {
    cleanOutput = cleanOutput.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`\\n?/g, '').trim();
    extracted = JSON.parse(cleanOutput);
  } else {
    extracted = cleanOutput;
  }
} catch (e) {
  extracted = {};
}

const camposValidos = [
  'destinos', 'epoca_viagem', 'motivo', 'duracao_viagem', 'orcamento',
  'quantidade_viajantes', 'servico_contratado', 'qual_servio_contratado',
  'momento_viagem', 'degustacao_tp', 'taxa_planejamento',
  'origem_lead', 'prioridade_viagem', 'o_que_e_importante',
  'algo_especial_viagem', 'receio_ou_medo', 'frequencia_viagem', 'usa_agencia'
];

const produtoDataUpdate = {};
for (const campo of camposValidos) {
  const valor = extracted[campo];
  if (valor !== undefined && valor !== null && valor !== '') {
    if (campo === 'destinos') {
      if (typeof valor === 'string') {
        const destinos = valor.split(/[,e]/).map(d => d.trim()).filter(d => d.length > 0);
        if (destinos.length > 0) produtoDataUpdate[campo] = destinos;
      } else if (Array.isArray(valor) && valor.length > 0) {
        produtoDataUpdate[campo] = valor;
      }
    } else if (['duracao_viagem', 'quantidade_viajantes', 'orcamento'].includes(campo)) {
      const num = Number(valor);
      if (!isNaN(num) && num > 0) produtoDataUpdate[campo] = num;
    } else if (['servico_contratado', 'degustacao_tp'].includes(campo)) {
      if (typeof valor === 'boolean') produtoDataUpdate[campo] = valor;
    } else {
      produtoDataUpdate[campo] = valor;
    }
  }
}

return [{
  json: {
    card_id: $('4. Monta Contexto').first().json.card_id,
    meeting_id: $('4. Monta Contexto').first().json.meeting_id,
    tem_atualizacao: Object.keys(produtoDataUpdate).length > 0,
    campos_extraidos: produtoDataUpdate,
    total_campos: Object.keys(produtoDataUpdate).length,
    ai_raw_output: aiOutput
  }
}];
`
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1376, 304],
      id: uuid(),
      name: "6. Valida Output"
    },

    // 7. IF Tem Atualização
    {
      parameters: {
        conditions: {
          boolean: [
            {
              value1: "={{ $json.tem_atualizacao }}",
              value2: true
            }
          ]
        }
      },
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [1552, 304],
      id: uuid(),
      name: "7. Tem Atualização?"
    },

    // 8. Busca produto_data Atual
    {
      parameters: {
        url: "=https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/cards?id=eq.{{ $json.card_id }}&select=produto_data,briefing_inicial,pipeline_stages(fase)",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1760, 208],
      id: uuid(),
      name: "8. Busca produto_data Atual"
    },

    // 9. Merge Dados
    {
      parameters: {
        jsCode: `const camposExtraidos = $('6. Valida Output').first().json.campos_extraidos;
const cardId = $('6. Valida Output').first().json.card_id;
const meetingId = $('6. Valida Output').first().json.meeting_id;
const fase = $('4. Monta Contexto').first().json.fase;

const currentCard = $('8. Busca produto_data Atual').first().json;
const currentProdutoData = currentCard.produto_data || {};
const currentBriefing = currentCard.briefing_inicial || {};

const tripInfoFields = [
  'destinos', 'epoca_viagem', 'motivo', 'duracao_viagem', 'orcamento',
  'quantidade_viajantes', 'servico_contratado', 'qual_servio_contratado',
  'momento_viagem', 'degustacao_tp', 'taxa_planejamento'
];

const observacoesFields = [
  'prioridade_viagem', 'o_que_e_importante', 'algo_especial_viagem',
  'receio_ou_medo', 'frequencia_viagem', 'usa_agencia', 'origem_lead'
];

const tripInfoUpdate = {};
const observacoesUpdate = {};

for (const [key, value] of Object.entries(camposExtraidos)) {
  if (tripInfoFields.includes(key)) {
    tripInfoUpdate[key] = value;
  } else if (observacoesFields.includes(key)) {
    observacoesUpdate[key] = value;
  }
}

let produtoDataFinal = { ...currentProdutoData };
let briefingFinal = { ...currentBriefing };

if (fase === 'SDR') {
  briefingFinal = { ...briefingFinal, ...tripInfoUpdate };
  const currentObs = currentBriefing.observacoes || {};
  briefingFinal.observacoes = { ...currentObs, ...observacoesUpdate };
} else if (fase === 'Planner') {
  produtoDataFinal = { ...produtoDataFinal, ...tripInfoUpdate };
  const currentObs = currentProdutoData.observacoes_criticas || {};
  produtoDataFinal.observacoes_criticas = { ...currentObs, ...observacoesUpdate };
} else {
  produtoDataFinal = { ...produtoDataFinal, ...tripInfoUpdate };
  const currentObs = currentProdutoData.observacoes_pos_venda || {};
  produtoDataFinal.observacoes_pos_venda = { ...currentObs, ...observacoesUpdate };
}

return [{
  json: {
    card_id: cardId,
    meeting_id: meetingId,
    fase: fase,
    produto_data: produtoDataFinal,
    briefing_inicial: briefingFinal,
    campos_atualizados: Object.keys(camposExtraidos)
  }
}];
`
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1984, 208],
      id: uuid(),
      name: "9. Merge Dados"
    },

    // 10. Atualiza Card
    {
      parameters: {
        method: "PATCH",
        url: "=https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/cards?id=eq.{{ $json.card_id }}",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({ produto_data: $json.produto_data, briefing_inicial: $json.briefing_inicial }) }}",
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [2208, 208],
      id: uuid(),
      name: "10. Atualiza Card"
    },

    // 11. Atualiza Metadata Reunião
    {
      parameters: {
        method: "PATCH",
        url: "=https://szyrzxvlptqqheizyrxu.supabase.co/rest/v1/reunioes?id=eq.{{ $('9. Merge Dados').item.json.meeting_id }}",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ JSON.stringify({ transcricao_metadata: { processed_at: new Date().toISOString(), campos_extraidos: $('9. Merge Dados').item.json.campos_atualizados } }) }}`,
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [2432, 208],
      id: uuid(),
      name: "11. Atualiza Metadata"
    },

    // 12. Resposta Sucesso
    {
      parameters: {
        assignments: {
          assignments: [
            { id: "status", name: "status", value: "success", type: "string" },
            { id: "message", name: "message", value: "Transcrição processada com sucesso", type: "string" }
          ]
        },
        options: {}
      },
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [2656, 208],
      id: uuid(),
      name: "12. Sucesso"
    },

    // 13. Sem Atualização
    {
      parameters: {
        assignments: {
          assignments: [
            { id: "status", name: "status", value: "no_update", type: "string" },
            { id: "message", name: "message", value: "Nenhuma informação nova extraída", type: "string" }
          ]
        },
        options: {}
      },
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [1760, 400],
      id: uuid(),
      name: "13. Sem Atualização"
    }
  ],
  connections: {
    "1. Webhook Trigger": {
      main: [[{ node: "2. Salvar Transcrição", type: "main", index: 0 }]]
    },
    "2. Salvar Transcrição": {
      main: [[{ node: "3. Busca Card", type: "main", index: 0 }]]
    },
    "3. Busca Card": {
      main: [[{ node: "4. Monta Contexto", type: "main", index: 0 }]]
    },
    "4. Monta Contexto": {
      main: [[{ node: "5. AI Extrator", type: "main", index: 0 }]]
    },
    "5. AI Extrator": {
      main: [[{ node: "6. Valida Output", type: "main", index: 0 }]]
    },
    "GPT-4o": {
      ai_languageModel: [[{ node: "5. AI Extrator", type: "ai_languageModel", index: 0 }]]
    },
    "6. Valida Output": {
      main: [[{ node: "7. Tem Atualização?", type: "main", index: 0 }]]
    },
    "7. Tem Atualização?": {
      main: [
        [{ node: "8. Busca produto_data Atual", type: "main", index: 0 }],
        [{ node: "13. Sem Atualização", type: "main", index: 0 }]
      ]
    },
    "8. Busca produto_data Atual": {
      main: [[{ node: "9. Merge Dados", type: "main", index: 0 }]]
    },
    "9. Merge Dados": {
      main: [[{ node: "10. Atualiza Card", type: "main", index: 0 }]]
    },
    "10. Atualiza Card": {
      main: [[{ node: "11. Atualiza Metadata", type: "main", index: 0 }]]
    },
    "11. Atualiza Metadata": {
      main: [[{ node: "12. Sucesso", type: "main", index: 0 }]]
    }
  },
  settings: {
    executionOrder: "v1"
  }
};

async function createWorkflow() {
  console.log('🚀 Criando workflow no n8n...');
  console.log(`📍 URL: ${N8N_API_URL}`);
  console.log(`📋 Nome: ${workflow.name}`);

  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': API_KEY
      },
      body: JSON.stringify(workflow)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('');
    console.log('✅ Workflow criado com sucesso!');
    console.log(`📌 ID: ${result.id}`);
    console.log(`🔗 URL: ${N8N_API_URL}/workflow/${result.id}`);
    console.log('');
    console.log('⚠️  PRÓXIMOS PASSOS:');
    console.log('   1. Acesse o workflow no n8n');
    console.log('   2. Configure as credenciais do Supabase nos nodes HTTP');
    console.log('   3. Configure as credenciais do OpenAI no node GPT-4o');
    console.log('   4. Ative o workflow');
    console.log('');
    console.log(`🌐 Webhook URL: ${N8N_API_URL}/webhook/transcript-process`);

    return result;
  } catch (error) {
    console.error('❌ Erro ao criar workflow:', error.message);
    process.exit(1);
  }
}

createWorkflow();
