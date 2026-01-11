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
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_categories: {
        Row: {
          created_at: string | null
          key: string
          label: string
          ordem: number | null
          scope: string
          visible: boolean | null
        }
        Insert: {
          created_at?: string | null
          key: string
          label: string
          ordem?: number | null
          scope: string
          visible?: boolean | null
        }
        Update: {
          created_at?: string | null
          key?: string
          label?: string
          ordem?: number | null
          scope?: string
          visible?: boolean | null
        }
        Relationships: []
      }
      integration_catalog: {
        Row: {
          id: string
          integration_id: string
          entity_type: string
          external_id: string
          external_name: string
          parent_external_id: string | null
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          entity_type: string
          external_id: string
          external_name: string
          parent_external_id?: string | null
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          entity_type?: string
          external_id?: string
          external_name?: string
          parent_external_id?: string | null
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_events: {
        Row: {
          id: string
          integration_id: string
          source: string
          entity_type: string
          event_type: string
          external_id: string | null
          payload: Json
          status: string
          processing_log: string | null
          error_log: string | null
          attempts: number
          created_at: string
          updated_at: string
          row_key: string | null
        }
        Insert: {
          id?: string
          integration_id: string
          source: string
          entity_type: string
          event_type: string
          external_id?: string | null
          payload: Json
          status?: string
          processing_log?: string | null
          error_log?: string | null
          attempts?: number
          created_at?: string
          updated_at?: string
          row_key?: string | null
        }
        Update: {
          id?: string
          integration_id?: string
          source?: string
          entity_type?: string
          event_type?: string
          external_id?: string | null
          payload?: Json
          status?: string
          processing_log?: string | null
          error_log?: string | null
          attempts?: number
          created_at?: string
          updated_at?: string
          row_key?: string | null
        }
        Relationships: []
      }
      integration_outbox: {
        Row: {
          id: string
          integration_id: string
          destination: string
          entity_type: string
          action: string
          internal_id: string
          payload: Json
          status: string
          retry_count: number
          error_log: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          destination: string
          entity_type: string
          action: string
          internal_id: string
          payload: Json
          status?: string
          retry_count?: number
          error_log?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          destination?: string
          entity_type?: string
          action?: string
          internal_id?: string
          payload?: Json
          status?: string
          retry_count?: number
          error_log?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_router_config: {
        Row: {
          id: string
          integration_id: string
          pipeline_id: string
          external_pipeline_id: string | null
          external_list_id: string | null
          business_unit: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          pipeline_id: string
          external_pipeline_id?: string | null
          external_list_id?: string | null
          business_unit: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          pipeline_id?: string
          external_pipeline_id?: string | null
          external_list_id?: string | null
          business_unit?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      integration_field_map: {
        Row: {
          id: string
          integration_id: string
          entity_type: string
          local_field_key: string
          external_field_id: string
          direction: string
          source: string
        }
        Insert: {
          id?: string
          integration_id: string
          entity_type: string
          local_field_key: string
          external_field_id: string
          direction: string
          source: string
        }
        Update: {
          id?: string
          integration_id?: string
          entity_type?: string
          local_field_key?: string
          external_field_id?: string
          direction?: string
          source?: string
        }
        Relationships: []
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
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
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
          briefing_inicial: Json | null
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
          group_capacity: number | null
          group_total_pax: number | null
          group_total_revenue: number | null
          id: string
          is_group_parent: boolean | null
          marketing_data: Json | null
          moeda: string | null
          motivo_perda_id: string | null
          origem: string | null
          parent_card_id: string | null
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
          stage_entered_at: string | null
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
          group_capacity?: number | null
          group_total_pax?: number | null
          group_total_revenue?: number | null
          id?: string
          is_group_parent?: boolean | null
          marketing_data?: Json | null
          moeda?: string | null
          motivo_perda_id?: string | null
          origem?: string | null
          parent_card_id?: string | null
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
          stage_entered_at?: string | null
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
          data_viagem_fim?: string | null
          data_viagem_inicio?: string | null
          dono_atual_id?: string | null
          estado_operacional?: string | null
          external_id?: string | null
          external_source?: string | null
          forma_pagamento?: string | null
          group_capacity?: number | null
          group_total_pax?: number | null
          group_total_revenue?: number | null
          id?: string
          is_group_parent?: boolean | null
          marketing_data?: Json | null
          moeda?: string | null
          motivo_perda_id?: string | null
          origem?: string | null
          parent_card_id?: string | null
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
          stage_entered_at?: string | null
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
            foreignKeyName: "cards_parent_card_id_fkey"
            columns: ["parent_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_parent_card_id_fkey"
            columns: ["parent_card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_parent_card_id_fkey"
            columns: ["parent_card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
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
      contact_stats: {
        Row: {
          contact_id: string
          is_group_leader: boolean | null
          last_trip_date: string | null
          next_trip_date: string | null
          top_destinations: Json | null
          total_spend: number | null
          total_trips: number | null
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          is_group_leader?: boolean | null
          last_trip_date?: string | null
          next_trip_date?: string | null
          top_destinations?: Json | null
          total_spend?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          is_group_leader?: boolean | null
          last_trip_date?: string | null
          next_trip_date?: string | null
          top_destinations?: Json | null
          total_spend?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_stats_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          chatpro_session_id: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          endereco: Json | null
          id: string
          last_whatsapp_sync: string | null
          nome: string
          observacoes: string | null
          passaporte: string | null
          responsavel_id: string | null
          tags: string[] | null
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa_enum"]
          updated_at: string
        }
        Insert: {
          chatpro_session_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          last_whatsapp_sync?: string | null
          nome: string
          observacoes?: string | null
          passaporte?: string | null
          responsavel_id?: string | null
          tags?: string[] | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"]
          updated_at?: string
        }
        Update: {
          chatpro_session_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          last_whatsapp_sync?: string | null
          nome?: string
          observacoes?: string | null
          passaporte?: string | null
          responsavel_id?: string | null
          tags?: string[] | null
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
        Relationships: []
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
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
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

      integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          provider: string
          transformer_rules: Json
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          provider?: string
          transformer_rules?: Json
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
          transformer_rules?: Json
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_stage_map: {
        Row: {
          created_at: string | null
          external_stage_id: string
          external_stage_name: string
          id: string
          integration_id: string
          internal_stage_id: string
          pipeline_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_stage_id: string
          external_stage_name: string
          id?: string
          integration_id: string
          internal_stage_id: string
          pipeline_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_stage_id?: string
          external_stage_name?: string
          id?: string
          integration_id?: string
          internal_stage_id?: string
          pipeline_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_stage_map_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_stage_map_internal_stage_id_fkey"
            columns: ["internal_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_user_map: {
        Row: {
          created_at: string | null
          external_user_id: string
          id: string
          integration_id: string
          internal_user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_user_id: string
          id?: string
          integration_id: string
          internal_user_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_user_id?: string
          id?: string
          integration_id?: string
          internal_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_user_map_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_user_map_internal_user_id_fkey"
            columns: ["internal_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
        ]
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
      pipeline_phases: {
        Row: {
          active: boolean
          color: string
          created_at: string | null
          id: string
          label: string
          name: string
          order_index: number
          slug: string | null
          updated_at: string | null
          visible_in_card: boolean | null
        }
        Insert: {
          active?: boolean
          color: string
          created_at?: string | null
          id?: string
          label: string
          name: string
          order_index?: number
          slug?: string | null
          updated_at?: string | null
          visible_in_card?: boolean | null
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string | null
          id?: string
          label?: string
          name?: string
          order_index?: number
          slug?: string | null
          updated_at?: string | null
          visible_in_card?: boolean | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          ativo: boolean | null
          description: string | null
          fase: string | null
          id: string
          is_frozen: boolean | null
          is_lost: boolean | null
          is_won: boolean | null
          nome: string
          ordem: number
          phase_id: string | null
          pipeline_id: string
          sla_hours: number | null
          target_role: string | null
          tipo_responsavel: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          ativo?: boolean | null
          description?: string | null
          fase?: string | null
          id?: string
          is_frozen?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          nome: string
          ordem: number
          phase_id?: string | null
          pipeline_id: string
          sla_hours?: number | null
          target_role?: string | null
          tipo_responsavel: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          ativo?: boolean | null
          description?: string | null
          fase?: string | null
          id?: string
          is_frozen?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          nome?: string
          ordem?: number
          phase_id?: string | null
          pipeline_id?: string
          sla_hours?: number | null
          target_role?: string | null
          tipo_responsavel?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "pipeline_phases"
            referencedColumns: ["id"]
          },
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
          department_id: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          nome: string | null
          produtos: Database["public"]["Enums"]["app_product"][] | null
          role: Database["public"]["Enums"]["app_role"] | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          nome?: string | null
          produtos?: Database["public"]["Enums"]["app_product"][] | null
          role?: Database["public"]["Enums"]["app_role"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          nome?: string | null
          produtos?: Database["public"]["Enums"]["app_product"][] | null
          role?: Database["public"]["Enums"]["app_role"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      proposals_backup_20251223: {
        Row: {
          card_id: string | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string | null
          status: string | null
          updated_at: string | null
          valid_until: string | null
          version: number | null
        }
        Insert: {
          card_id?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Update: {
          card_id?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Relationships: []
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
          sdr_responsavel_id: string | null
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
          sdr_responsavel_id?: string | null
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
          sdr_responsavel_id?: string | null
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
            foreignKeyName: "reunioes_sdr_responsavel_id_fkey"
            columns: ["sdr_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes_backup_20251223: {
        Row: {
          card_id: string | null
          created_at: string | null
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          feedback: string | null
          id: string | null
          local: string | null
          motivo_cancelamento: string | null
          notas: string | null
          participantes: Json | null
          responsavel_id: string | null
          resultado: string | null
          sdr_responsavel_id: string | null
          status: string | null
          titulo: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          feedback?: string | null
          id?: string | null
          local?: string | null
          motivo_cancelamento?: string | null
          notas?: string | null
          participantes?: Json | null
          responsavel_id?: string | null
          resultado?: string | null
          sdr_responsavel_id?: string | null
          status?: string | null
          titulo?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          feedback?: string | null
          id?: string | null
          local?: string | null
          motivo_cancelamento?: string | null
          notas?: string | null
          participantes?: Json | null
          responsavel_id?: string | null
          resultado?: string | null
          sdr_responsavel_id?: string | null
          status?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      stage_field_config: {
        Row: {
          created_at: string | null
          custom_label: string | null
          field_key: string | null
          id: string
          is_required: boolean | null
          is_visible: boolean | null
          order: number | null
          show_in_header: boolean | null
          stage_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_label?: string | null
          field_key?: string | null
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          order?: number | null
          show_in_header?: boolean | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_label?: string | null
          field_key?: string | null
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          order?: number | null
          show_in_header?: boolean | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_field_config_field_key_fkey"
            columns: ["field_key"]
            isOneToOne: false
            referencedRelation: "system_fields"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "stage_field_config_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
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
          {
            foreignKeyName: "stage_fields_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      system_fields: {
        Row: {
          active: boolean | null
          created_at: string | null
          is_system: boolean | null
          key: string
          label: string
          options: Json | null
          section: string | null
          type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          is_system?: boolean | null
          key: string
          label: string
          options?: Json | null
          section?: string | null
          type: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          is_system?: boolean | null
          key?: string
          label?: string
          options?: Json | null
          section?: string | null
          type?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          card_id: string
          categoria_outro: string | null
          concluida: boolean
          concluida_em: string | null
          concluido_por: string | null
          created_at: string | null
          created_by: string | null
          data_conclusao: string | null
          data_vencimento: string | null
          deleted_at: string | null
          descricao: string | null
          feedback: string | null
          id: string
          metadata: Json | null
          motivo_cancelamento: string | null
          participantes_externos: string[] | null
          prioridade: string | null
          rescheduled_from_id: string | null
          rescheduled_to_id: string | null
          responsavel_id: string
          resultado: string | null
          started_at: string | null
          status: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          card_id: string
          categoria_outro?: string | null
          concluida?: boolean
          concluida_em?: string | null
          concluido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          feedback?: string | null
          id?: string
          metadata?: Json | null
          motivo_cancelamento?: string | null
          participantes_externos?: string[] | null
          prioridade?: string | null
          rescheduled_from_id?: string | null
          rescheduled_to_id?: string | null
          responsavel_id: string
          resultado?: string | null
          started_at?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          card_id?: string
          categoria_outro?: string | null
          concluida?: boolean
          concluida_em?: string | null
          concluido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          feedback?: string | null
          id?: string
          metadata?: Json | null
          motivo_cancelamento?: string | null
          participantes_externos?: string[] | null
          prioridade?: string | null
          rescheduled_from_id?: string | null
          rescheduled_to_id?: string | null
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
            foreignKeyName: "tarefas_rescheduled_from_id_fkey"
            columns: ["rescheduled_from_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_rescheduled_from_id_fkey"
            columns: ["rescheduled_from_id"]
            isOneToOne: false
            referencedRelation: "view_agenda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_rescheduled_to_id_fkey"
            columns: ["rescheduled_to_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_rescheduled_to_id_fkey"
            columns: ["rescheduled_to_id"]
            isOneToOne: false
            referencedRelation: "view_agenda"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_backup_20251223: {
        Row: {
          card_id: string | null
          concluida: boolean | null
          concluida_em: string | null
          concluido_por: string | null
          created_at: string | null
          created_by: string | null
          data_conclusao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string | null
          metadata: Json | null
          prioridade: string | null
          responsavel_id: string | null
          resultado: string | null
          started_at: string | null
          status: string | null
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          card_id?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string | null
          metadata?: Json | null
          prioridade?: string | null
          responsavel_id?: string | null
          resultado?: string | null
          started_at?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          card_id?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string | null
          metadata?: Json | null
          prioridade?: string | null
          responsavel_id?: string | null
          resultado?: string | null
          started_at?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: []
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
            foreignKeyName: "task_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          source?: string | null
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string | null
          direction: string | null
          external_id: string | null
          id: string
          media_url: string | null
          metadata: Json | null
          processed_at: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          external_id?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json | null
          processed_at?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          external_id?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json | null
          processed_at?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_agenda: {
        Row: {
          card_id: string | null
          created_at: string | null
          data: string | null
          entity_type: string | null
          id: string | null
          responsavel_id: string | null
          status: string | null
          titulo: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          data?: string | null
          entity_type?: string | null
          id?: string | null
          responsavel_id?: string | null
          status?: string | null
          titulo?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          data?: string | null
          entity_type?: string | null
          id?: string | null
          responsavel_id?: string | null
          status?: string | null
          titulo?: string | null
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
        ]
      }
      view_cards_acoes: {
        Row: {
          briefing_inicial: Json | null
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
          is_group_parent: boolean | null
          marketing_data: Json | null
          moeda: string | null
          orcamento: Json | null
          origem: string | null
          parent_card_id: string | null
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
            foreignKeyName: "cards_parent_card_id_fkey"
            columns: ["parent_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_parent_card_id_fkey"
            columns: ["parent_card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_parent_card_id_fkey"
            columns: ["parent_card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
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
      find_jsonb_diffs: {
        Args: { p_new: Json; p_old: Json; p_path: string }
        Returns: Database["public"]["CompositeTypes"]["jsonb_diff_record"][]
        SetofOptions: {
          from: "*"
          to: "jsonb_diff_record"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_invite: {
        Args: {
          p_created_by: string
          p_email: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_team_id: string
        }
        Returns: string
      }
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
      match_documents_v2: {
        Args: {
          filter: Json
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          char_end: number
          char_start: number
          chunk_id: string
          content: string
          document_id: string
          metadata: Json
          similarity: number
        }[]
      }
      mover_card: {
        Args: {
          p_card_id: string
          p_motivo_perda_id?: string
          p_nova_etapa_id: string
        }
        Returns: undefined
      }
      normalize_phone: { Args: { phone_number: string }; Returns: string }
      pode_avancar_etapa: {
        Args: { p_card_id: string; p_nova_etapa_id: string }
        Returns: boolean
      }
      process_task_queue: { Args: never; Returns: number }
      set_card_primary_contact: {
        Args: { p_card_id: string; p_contact_id: string }
        Returns: undefined
      }
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
      jsonb_diff_record: {
        path: string | null
        old_value: string | null
        new_value: string | null
      }
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
