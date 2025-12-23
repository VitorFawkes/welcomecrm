export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          card_id: string
          created_at: string | null
          created_by: string | null
          descricao: string
          id: string
          metadata: Json | null
          party_type: string | null
          tipo: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          created_by?: string | null
          descricao: string
          id?: string
          metadata?: Json | null
          party_type?: string | null
          tipo: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          id?: string
          metadata?: Json | null
          party_type?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "activities_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos: {
        Row: {
          caminho_arquivo: string
          card_id: string
          created_at: string | null
          created_by: string | null
          id: string
          mime_type: string | null
          nome_original: string
          pessoa_id: string | null
          tamanho_bytes: number | null
        }
        Insert: {
          caminho_arquivo: string
          card_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mime_type?: string | null
          nome_original: string
          pessoa_id?: string | null
          tamanho_bytes?: number | null
        }
        Update: {
          caminho_arquivo?: string
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mime_type?: string | null
          nome_original?: string
          pessoa_id?: string | null
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "arquivos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          card_id: string
          created_at: string | null
          created_by: string | null
          data_ocorrencia: string | null
          descricao: string | null
          id: string
          pessoa_id: string | null
          tipo: string
          titulo: string | null
        }
        Insert: {
          card_id: string
          created_at?: string | null
          created_by?: string | null
          data_ocorrencia?: string | null
          descricao?: string | null
          id?: string
          pessoa_id?: string | null
          tipo: string
          titulo?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          data_ocorrencia?: string | null
          descricao?: string | null
          id?: string
          pessoa_id?: string | null
          tipo?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "atividades_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          active: boolean | null
          created_at: string | null
          delay_minutes: number | null
          id: string
          pipeline_id: string
          stage_id: string
          task_priority: string | null
          task_title: string
          task_type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          pipeline_id: string
          stage_id: string
          task_priority?: string | null
          task_title: string
          task_type: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          pipeline_id?: string
          stage_id?: string
          task_priority?: string | null
          task_title?: string
          task_type?: string
        }
        Relationships: []
      }
      card_obligations: {
        Row: {
          card_id: string
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          id: string
          obligation_id: string
        }
        Insert: {
          card_id: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          obligation_id: string
        }
        Update: {
          card_id?: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          obligation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_obligations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_obligations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_obligations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "card_obligations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_obligations_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "stage_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      card_owner_history: {
        Row: {
          card_id: string
          created_at: string | null
          ended_at: string | null
          fase: string
          id: string
          owner_id: string
          started_at: string
          transfer_reason: string | null
          transferred_by: string | null
        }
        Insert: {
          card_id: string
          created_at?: string | null
          ended_at?: string | null
          fase: string
          id?: string
          owner_id: string
          started_at?: string
          transfer_reason?: string | null
          transferred_by?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string | null
          ended_at?: string | null
          fase?: string
          id?: string
          owner_id?: string
          started_at?: string
          transfer_reason?: string | null
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_owner_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_owner_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_owner_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "card_owner_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_owner_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_owner_history_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          campaign_id: string | null
          cliente_recorrente: boolean | null
          codigo_cliente_erp: string | null
          codigo_projeto_erp: string | null
          concierge_owner_id: string | null
          condicoes_pagamento: string | null
          created_at: string | null
          created_by: string | null
          data_pronto_erp: string | null
          data_viagem_fim: string | null
          data_viagem_inicio: string | null
          dono_atual_id: string | null
          estado_operacional: string | null
          external_id: string | null
          external_source: string | null
          forma_pagamento: string | null
          id: string
          moeda: string | null
          motivo_perda_id: string | null
          origem: string | null
          pessoa_principal_id: string | null
          pipeline_id: string
          pipeline_stage_id: string | null
          pos_owner_id: string | null
          prioridade: string | null
          produto: Database["public"]["Enums"]["app_product"]
          produto_data: Json | null
          pronto_para_contrato: boolean | null
          pronto_para_erp: boolean | null
          sdr_owner_id: string | null
          status_comercial: string | null
          taxa_alterado_por: string | null
          taxa_ativa: boolean | null
          taxa_codigo_transacao: string | null
          taxa_data_status: string | null
          taxa_meio_pagamento: string | null
          taxa_status: string | null
          taxa_valor: number | null
          titulo: string
          updated_at: string | null
          updated_by: string | null
          valor_estimado: number | null
          valor_final: number | null
          vendas_owner_id: string | null
        }
        Insert: {
          briefing_inicial?: Json | null
          campaign_id?: string | null
          cliente_recorrente?: boolean | null
          codigo_cliente_erp?: string | null
          codigo_projeto_erp?: string | null
          concierge_owner_id?: string | null
          condicoes_pagamento?: string | null
          created_at?: string | null
          created_by?: string | null
          data_pronto_erp?: string | null
          data_viagem_fim?: string | null
          data_viagem_inicio?: string | null
          dono_atual_id?: string | null
          estado_operacional?: string | null
          external_id?: string | null
          external_source?: string | null
          forma_pagamento?: string | null
          id?: string
          moeda?: string | null
          motivo_perda_id?: string | null
          origem?: string | null
          pessoa_principal_id?: string | null
          pipeline_id: string
          pipeline_stage_id?: string | null
          pos_owner_id?: string | null
          prioridade?: string | null
          produto: Database["public"]["Enums"]["app_product"]
          produto_data?: Json | null
          pronto_para_contrato?: boolean | null
          pronto_para_erp?: boolean | null
          sdr_owner_id?: string | null
          status_comercial?: string | null
          taxa_alterado_por?: string | null
          taxa_ativa?: boolean | null
          taxa_codigo_transacao?: string | null
          taxa_data_status?: string | null
          taxa_meio_pagamento?: string | null
          taxa_status?: string | null
          taxa_valor?: number | null
          titulo: string
          updated_at?: string | null
          updated_by?: string | null
          valor_estimado?: number | null
          valor_final?: number | null
          vendas_owner_id?: string | null
        }
        Update: {
          briefing_inicial?: Json | null
          campaign_id?: string | null
          cliente_recorrente?: boolean | null
          codigo_cliente_erp?: string | null
          codigo_projeto_erp?: string | null
          concierge_owner_id?: string | null
          condicoes_pagamento?: string | null
          created_at?: string | null
          created_by?: string | null
          data_pronto_erp?: string | null
          data_viagem_inicio?: string | null
          dono_atual_id?: string | null
          estado_operacional?: string | null
          external_id?: string | null
          external_source?: string | null
          forma_pagamento?: string | null
          id?: string
          moeda?: string | null
          motivo_perda_id?: string | null
          origem?: string | null
          pessoa_principal_id?: string | null
          pipeline_id?: string
          pipeline_stage_id?: string | null
          pos_owner_id?: string | null
          prioridade?: string | null
          produto?: Database["public"]["Enums"]["app_product"]
          produto_data?: Json | null
          pronto_para_contrato?: boolean | null
          pronto_para_erp?: boolean | null
          sdr_owner_id?: string | null
          status_comercial?: string | null
          taxa_alterado_por?: string | null
          taxa_ativa?: boolean | null
          taxa_codigo_transacao?: string | null
          taxa_data_status?: string | null
          taxa_meio_pagamento?: string | null
          taxa_status?: string | null
          taxa_valor?: number | null
          titulo?: string
          updated_at?: string | null
          updated_by?: string | null
          valor_estimado?: number | null
          valor_final?: number | null
          vendas_owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_etapa_funil_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pessoa_principal_id_fkey"
            columns: ["pessoa_principal_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      cards_contatos: {
        Row: {
          card_id: string
          contato_id: string
          created_at: string
          id: string
          ordem: number
          tipo_viajante: Database["public"]["Enums"]["tipo_viajante_enum"]
          tipo_vinculo: string | null
        }
        Insert: {
          card_id: string
          contato_id: string
          created_at?: string
          id?: string
          ordem?: number
          tipo_viajante?: Database["public"]["Enums"]["tipo_viajante_enum"]
          tipo_vinculo?: string | null
        }
        Update: {
          card_id?: string
          contato_id?: string
          created_at?: string
          id?: string
          ordem?: number
          tipo_viajante?: Database["public"]["Enums"]["tipo_viajante_enum"]
          tipo_vinculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_contatos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_contatos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_contatos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "cards_contatos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_taxa_trips: {
        Row: {
          ativo_global: boolean | null
          id: string
          texto_explicativo: string | null
          updated_at: string | null
          updated_by: string | null
          valor_padrao: number | null
        }
        Insert: {
          ativo_global?: boolean | null
          id?: string
          texto_explicativo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor_padrao?: number | null
        }
        Update: {
          ativo_global?: boolean | null
          id?: string
          texto_explicativo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor_padrao?: number | null
        }
        Relationships: []
      }
      contatos: {
        Row: {
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: Json | null
          id: string
          nome: string
          observacoes: string | null
          passaporte: string | null
          responsavel_id: string | null
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa_enum"]
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          nome: string
          observacoes?: string | null
          passaporte?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"]
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          nome?: string
          observacoes?: string | null
          passaporte?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          card_id: string
          created_at: string | null
          data_assinatura: string | null
          data_criacao: string | null
          data_envio: string | null
          id: string
          moeda: string | null
          nome_contrato: string
          observacoes: string | null
          plataforma: string | null
          responsavel_id: string | null
          status: string | null
          tipo: Database["public"]["Enums"]["app_product"]
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          card_id: string
          created_at?: string | null
          data_assinatura?: string | null
          data_criacao?: string | null
          data_envio?: string | null
          id?: string
          moeda?: string | null
          nome_contrato: string
          observacoes?: string | null
          plataforma?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo: Database["public"]["Enums"]["app_product"]
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          card_id?: string
          created_at?: string | null
          data_assinatura?: string | null
          data_criacao?: string | null
          data_envio?: string | null
          id?: string
          moeda?: string | null
          nome_contrato?: string
          observacoes?: string | null
          plataforma?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: Database["public"]["Enums"]["app_product"]
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "contratos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_cadastrais_pf: {
        Row: {
          cpf: string | null
          created_at: string | null
          dados_bancarios: string | null
          data_nascimento: string | null
          email_cobranca: string | null
          endereco_completo: string | null
          id: string
          pessoa_id: string
          rg: string | null
          telefone_cobranca: string | null
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          dados_bancarios?: string | null
          data_nascimento?: string | null
          email_cobranca?: string | null
          endereco_completo?: string | null
          id?: string
          pessoa_id: string
          rg?: string | null
          telefone_cobranca?: string | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          dados_bancarios?: string | null
          data_nascimento?: string | null
          email_cobranca?: string | null
          endereco_completo?: string | null
          id?: string
          pessoa_id?: string
          rg?: string | null
          telefone_cobranca?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_cadastrais_pf_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: true
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_cadastrais_pj: {
        Row: {
          card_id: string
          cnpj: string | null
          contato_financeiro_email: string | null
          contato_financeiro_nome: string | null
          contato_financeiro_telefone: string | null
          created_at: string | null
          endereco_cobranca: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          razao_social: string | null
          updated_at: string | null
        }
        Insert: {
          card_id: string
          cnpj?: string | null
          contato_financeiro_email?: string | null
          contato_financeiro_nome?: string | null
          contato_financeiro_telefone?: string | null
          created_at?: string | null
          endereco_cobranca?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          updated_at?: string | null
        }
        Update: {
          card_id?: string
          cnpj?: string | null
          contato_financeiro_email?: string | null
          contato_financeiro_nome?: string | null
          contato_financeiro_telefone?: string | null
          created_at?: string | null
          endereco_cobranca?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_cadastrais_pj_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_cadastrais_pj_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_cadastrais_pj_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "dados_cadastrais_pj_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_fases: {
        Row: {
          card_id: string
          data_mudanca: string | null
          etapa_anterior_id: string | null
          etapa_nova_id: string
          id: string
          mudado_por: string | null
          tempo_na_etapa_anterior: unknown
        }
        Insert: {
          card_id: string
          data_mudanca?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id: string
          id?: string
          mudado_por?: string | null
          tempo_na_etapa_anterior?: unknown
        }
        Update: {
          card_id?: string
          data_mudanca?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id?: string
          id?: string
          mudado_por?: string | null
          tempo_na_etapa_anterior?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "historico_fases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_fases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_fases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "historico_fases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_fases_etapa_anterior_id_fkey"
            columns: ["etapa_anterior_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_fases_etapa_nova_id_fkey"
            columns: ["etapa_nova_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          assunto: string | null
          canal: string
          card_id: string
          conteudo: string | null
          created_at: string | null
          data_hora: string | null
          id: string
          lado: string
          metadados: Json | null
          pessoa_id: string | null
          remetente_interno_id: string | null
        }
        Insert: {
          assunto?: string | null
          canal: string
          card_id: string
          conteudo?: string | null
          created_at?: string | null
          data_hora?: string | null
          id?: string
          lado: string
          metadados?: Json | null
          pessoa_id?: string | null
          remetente_interno_id?: string | null
        }
        Update: {
          assunto?: string | null
          canal?: string
          card_id?: string
          conteudo?: string | null
          created_at?: string | null
          data_hora?: string | null
          id?: string
          lado?: string
          metadados?: Json | null
          pessoa_id?: string | null
          remetente_interno_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "mensagens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_perda: {
        Row: {
          ativo: boolean | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      notas: {
        Row: {
          autor_id: string
          card_id: string
          created_at: string | null
          id: string
          pinned: boolean | null
          texto: string
          updated_at: string | null
        }
        Insert: {
          autor_id: string
          card_id: string
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          texto: string
          updated_at?: string | null
        }
        Update: {
          autor_id?: string
          card_id?: string
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          texto?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "notas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
        ]
      }
      participacoes: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          observacoes: string | null
          papel: string
          pessoa_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          papel: string
          pessoa_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          papel?: string
          pessoa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participacoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participacoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participacoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "participacoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participacoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          cidade: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          estado: string | null
          id: string
          nome: string
          origem: string | null
          pais: string | null
          status_relacionamento: string | null
          telefone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          cidade?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          nome: string
          origem?: string | null
          pais?: string | null
          status_relacionamento?: string | null
          telefone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          cidade?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          nome?: string
          origem?: string | null
          pais?: string | null
          status_relacionamento?: string | null
          telefone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pipeline_card_settings: {
        Row: {
          campos_kanban: Json
          campos_visiveis: Json | null
          created_at: string | null
          fase: string
          id: string
          ordem_campos: Json | null
          ordem_kanban: Json
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          campos_kanban?: Json
          campos_visiveis?: Json | null
          created_at?: string | null
          fase: string
          id?: string
          ordem_campos?: Json | null
          ordem_kanban?: Json
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          campos_kanban?: Json
          campos_visiveis?: Json | null
          created_at?: string | null
          fase?: string
          id?: string
          ordem_campos?: Json | null
          ordem_kanban?: Json
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_card_settings_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_config: {
        Row: {
          actions: Json | null
          ativo: boolean | null
          conditions: Json | null
          config_type: string
          created_at: string | null
          from_stage_id: string | null
          id: string
          pipeline_id: string
          to_stage_id: string | null
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          ativo?: boolean | null
          conditions?: Json | null
          config_type: string
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          pipeline_id: string
          to_stage_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          ativo?: boolean | null
          conditions?: Json | null
          config_type?: string
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          pipeline_id?: string
          to_stage_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_config_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_config_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          ativo: boolean | null
          description: string | null
          fase: string | null
          id: string
          nome: string
          ordem: number
          pipeline_id: string
          sla_hours: number | null
          tipo_responsavel: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          ativo?: boolean | null
          description?: string | null
          fase?: string | null
          id?: string
          nome: string
          ordem: number
          pipeline_id: string
          sla_hours?: number | null
          tipo_responsavel: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          ativo?: boolean | null
          description?: string | null
          fase?: string | null
          id?: string
          nome?: string
          ordem?: number
          pipeline_id?: string
          sla_hours?: number | null
          tipo_responsavel?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          produto: Database["public"]["Enums"]["app_product"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          produto: Database["public"]["Enums"]["app_product"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          produto?: Database["public"]["Enums"]["app_product"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          nome: string | null
          produtos: Database["public"]["Enums"]["app_product"][] | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          nome?: string | null
          produtos?: Database["public"]["Enums"]["app_product"][] | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          nome?: string | null
          produtos?: Database["public"]["Enums"]["app_product"][] | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          card_id: string
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          status: string
          updated_at: string | null
          valid_until: string | null
          version: number | null
        }
        Insert: {
          card_id: string
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Update: {
          card_id?: string
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "proposals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          card_id: string
          created_at: string | null
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          feedback: string | null
          id: string
          local: string | null
          motivo_cancelamento: string | null
          notas: string | null
          participantes: Json | null
          responsavel_id: string | null
          resultado: string | null
          status: string | null
          titulo: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          feedback?: string | null
          id?: string
          local?: string | null
          motivo_cancelamento?: string | null
          notas?: string | null
          participantes?: Json | null
          responsavel_id?: string | null
          resultado?: string | null
          status?: string | null
          titulo: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          feedback?: string | null
          id?: string
          local?: string | null
          motivo_cancelamento?: string | null
          notas?: string | null
          participantes?: Json | null
          responsavel_id?: string | null
          resultado?: string | null
          status?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "reunioes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_fields_settings: {
        Row: {
          created_at: string | null
          field_key: string
          id: string
          label: string
          required: boolean | null
          stage_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          field_key: string
          id?: string
          label: string
          required?: boolean | null
          stage_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          field_key?: string
          id?: string
          label?: string
          required?: boolean | null
          stage_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_fields_settings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_obligations: {
        Row: {
          active: boolean | null
          config: Json | null
          created_at: string | null
          id: string
          pipeline_id: string
          stage_id: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          pipeline_id: string
          stage_id: string
          title: string
          type: string
        }
        Update: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          pipeline_id?: string
          stage_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      stage_transitions: {
        Row: {
          allowed: boolean | null
          created_at: string | null
          id: string
          source_stage_id: string | null
          target_stage_id: string | null
          updated_at: string | null
        }
        Insert: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          source_stage_id?: string | null
          target_stage_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          source_stage_id?: string | null
          target_stage_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_transitions_source_stage_id_fkey"
            columns: ["source_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_target_stage_id_fkey"
            columns: ["target_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          card_id: string
          concluida: boolean | null
          concluida_em: string | null
          concluido_por: string | null
          created_at: string | null
          created_by: string | null
          data_conclusao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          metadata: Json | null
          prioridade: string | null
          responsavel_id: string
          resultado: string | null
          started_at: string | null
          status: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          card_id: string
          concluida?: boolean | null
          concluida_em?: string | null
          concluido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          prioridade?: string | null
          responsavel_id: string
          resultado?: string | null
          started_at?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          card_id?: string
          concluida?: boolean | null
          concluida_em?: string | null
          concluido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          prioridade?: string | null
          responsavel_id?: string
          resultado?: string | null
          started_at?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "tarefas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
        ]
      }
      task_queue: {
        Row: {
          card_id: string
          created_at: string | null
          error_message: string | null
          id: string
          processed: boolean | null
          rule_id: string | null
          scheduled_for: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed?: boolean | null
          rule_id?: string | null
          scheduled_for: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed?: boolean | null
          rule_id?: string | null
          scheduled_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_queue_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_queue_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_queue_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "task_queue_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_cards_acoes: {
        Row: {
          campaign_id: string | null
          cliente_recorrente: boolean | null
          concierge_owner_id: string | null
          condicoes_pagamento: string | null
          created_at: string | null
          data_viagem_inicio: string | null
          destinos: Json | null
          dias_ate_viagem: number | null
          dono_atual_email: string | null
          dono_atual_id: string | null
          dono_atual_nome: string | null
          estado_operacional: string | null
          etapa_nome: string | null
          etapa_ordem: number | null
          external_id: string | null
          fase: string | null
          forma_pagamento: string | null
          id: string | null
          moeda: string | null
          orcamento: Json | null
          origem: string | null
          pessoa_nome: string | null
          pessoa_principal_id: string | null
          pipeline_id: string | null
          pipeline_nome: string | null
          pipeline_stage_id: string | null
          pos_owner_id: string | null
          prioridade: string | null
          produto: Database["public"]["Enums"]["app_product"] | null
          produto_data: Json | null
          proxima_tarefa: Json | null
          sdr_nome: string | null
          sdr_owner_email: string | null
          sdr_owner_id: string | null
          sdr_owner_nome: string | null
          status_comercial: string | null
          status_taxa: string | null
          tarefas_atrasadas: number | null
          tarefas_pendentes: number | null
          tempo_etapa_dias: number | null
          tempo_sem_contato: number | null
          titulo: string | null
          ultima_interacao: Json | null
          updated_at: string | null
          urgencia_tempo_etapa: number | null
          urgencia_viagem: number | null
          valor_estimado: number | null
          valor_final: number | null
          vendas_nome: string | null
          vendas_owner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_etapa_funil_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pessoa_principal_id_fkey"
            columns: ["pessoa_principal_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      view_cards_contatos_summary: {
        Row: {
          card_id: string | null
          contatos: Json | null
          total_adultos: number | null
          total_criancas: number | null
          total_viajantes: number | null
        }
        Relationships: []
      }
      view_cards_detalhes: {
        Row: {
          cliente_recorrente: boolean | null
          codigo_cliente_erp: string | null
          codigo_projeto_erp: string | null
          concierge_owner_id: string | null
          condicoes_pagamento: string | null
          created_at: string | null
          created_by: string | null
          data_pronto_erp: string | null
          data_viagem_inicio: string | null
          dono_atual_email: string | null
          dono_atual_id: string | null
          dono_atual_nome: string | null
          estado_operacional: string | null
          etapa_fase: string | null
          etapa_nome: string | null
          etapa_ordem: number | null
          forma_pagamento: string | null
          id: string | null
          moeda: string | null
          motivo_perda_id: string | null
          motivo_perda_nome: string | null
          pessoa_email: string | null
          pessoa_nome: string | null
          pessoa_principal_id: string | null
          pipeline_id: string | null
          pipeline_nome: string | null
          pipeline_stage_id: string | null
          pos_owner_id: string | null
          prioridade: string | null
          produto: Database["public"]["Enums"]["app_product"] | null
          produto_data: Json | null
          pronto_para_contrato: boolean | null
          pronto_para_erp: boolean | null
          sdr_nome: string | null
          sdr_owner_id: string | null
          status_comercial: string | null
          taxa_alterado_por: string | null
          taxa_ativa: boolean | null
          taxa_codigo_transacao: string | null
          taxa_data_status: string | null
          taxa_meio_pagamento: string | null
          taxa_status: string | null
          taxa_valor: number | null
          titulo: string | null
          updated_at: string | null
          updated_by: string | null
          valor_estimado: number | null
          valor_final: number | null
          vendas_nome: string | null
          vendas_owner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_etapa_funil_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pessoa_principal_id_fkey"
            columns: ["pessoa_principal_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      view_dashboard_funil: {
        Row: {
          etapa_nome: string | null
          etapa_ordem: number | null
          produto: Database["public"]["Enums"]["app_product"] | null
          total_cards: number | null
          total_valor_estimado: number | null
          total_valor_final: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      set_card_primary_contact: {
        Args: {
          p_card_id: string
          p_contact_id: string
        }
        Returns: void
      },
      get_travel_history:
      | {
        Args: { contact_id_param: string }
        Returns: {
          card_id: string
          companions: string[]
          data_viagem: string
          moeda: string
          role: string
          status: string
          titulo: string
          valor: number
        }[]
      }
      | {
        Args: { contact_ids: string[] }
        Returns: {
          card_id: string
          companions: string[]
          data_viagem: string
          moeda: string
          relevant_contacts: string[]
          role: string
          status: string
          titulo: string
          valor: number
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_card_owner: { Args: { p_card_id: string }; Returns: boolean }
      is_gestor: { Args: never; Returns: boolean }
      is_operational: { Args: never; Returns: boolean }
      is_privileged_user: { Args: never; Returns: boolean }
      mover_card: {
        Args: {
          p_card_id: string
          p_motivo_perda_id?: string
          p_nova_etapa_id: string
        }
        Returns: undefined
      }
      pode_avancar_etapa: {
        Args: { p_card_id: string; p_nova_etapa_id: string }
        Returns: boolean
      }
      process_task_queue: { Args: never; Returns: number }
      validate_transition: {
        Args: { p_card_id: string; p_target_stage_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_product: "TRIPS" | "WEDDING" | "CORP"
      app_role:
      | "admin"
      | "gestor"
      | "sdr"
      | "vendas"
      | "pos_venda"
      | "concierge"
      | "financeiro"
      tipo_pessoa_enum: "adulto" | "crianca"
      tipo_viajante_enum: "titular" | "acompanhante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_product: ["TRIPS", "WEDDING", "CORP"],
      app_role: [
        "admin",
        "gestor",
        "sdr",
        "vendas",
        "pos_venda",
        "concierge",
        "financeiro",
      ],
      tipo_pessoa_enum: ["adulto", "crianca"],
      tipo_viajante_enum: ["titular", "acompanhante"],
    },
  },
} as const

export type Contato = Database['public']['Tables']['contatos']['Row'] & {
  tipo_pessoa?: 'adulto' | 'crianca'
}

export type TripsProdutoData = {
  taxa_planejamento?: {
    ativa: boolean
    status: 'pendente' | 'paga' | 'cortesia' | 'nao_aplicavel' | 'nao_ativa'
    valor: number
    data_status?: string
    autorizada_por?: string
    data_envio?: string
    data_pagamento?: string
  }
  motivo?: string
  destinos?: string[]
  epoca_viagem?: {
    inicio: string
    fim: string
    flexivel: boolean
  }
  orcamento?: {
    total: number
    por_pessoa: number
  }
  pessoas?: {
    adultos: number
    criancas: number
    idades_criancas: number[]
  }
}
