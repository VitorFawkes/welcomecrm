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
          tipo: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          created_by?: string | null
          descricao: string
          id?: string
          metadata?: Json | null
          tipo: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          id?: string
          metadata?: Json | null
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
      atividades: {
        Row: {
          card_id: string
          created_at: string | null
          created_by: string | null
          data_ocorrencia: string
          descricao: string | null
          id: string
          tipo: string
          titulo: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          created_by?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          id?: string
          tipo: string
          titulo: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo?: string
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
          delay_minutes: number
          id: string
          pipeline_id: string
          stage_id: string
          task_priority: string
          task_title: string
          task_type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          delay_minutes?: number
          id?: string
          pipeline_id: string
          stage_id: string
          task_priority?: string
          task_title: string
          task_type: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          delay_minutes?: number
          id?: string
          pipeline_id?: string
          stage_id?: string
          task_priority?: string
          task_title?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
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
          id: string
          new_owner_id: string | null
          old_owner_id: string | null
          role_type: string
          transferred_at: string | null
          transferred_by: string | null
        }
        Insert: {
          card_id: string
          id?: string
          new_owner_id?: string | null
          old_owner_id?: string | null
          role_type: string
          transferred_at?: string | null
          transferred_by?: string | null
        }
        Update: {
          card_id?: string
          id?: string
          new_owner_id?: string | null
          old_owner_id?: string | null
          role_type?: string
          transferred_at?: string | null
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
        ]
      }
      cards: {
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
          dono_atual_id: string | null
          estado_operacional: string | null
          forma_pagamento: string | null
          id: string
          moeda: string | null
          motivo_perda_id: string | null
          pessoa_principal_id: string | null
          pipeline_id: string
          pipeline_stage_id: string
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
          forma_pagamento?: string | null
          id?: string
          moeda?: string | null
          motivo_perda_id?: string | null
          pessoa_principal_id?: string | null
          pipeline_id: string
          pipeline_stage_id: string
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
          forma_pagamento?: string | null
          id?: string
          moeda?: string | null
          motivo_perda_id?: string | null
          pessoa_principal_id?: string | null
          pipeline_id?: string
          pipeline_stage_id?: string
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
            referencedRelation: "pessoas"
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
          created_at: string | null
          id: string
          ordem: number
          tipo_viajante: Database["public"]["Enums"]["tipo_viajante_enum"] | null
          tipo_vinculo: string | null
        }
        Insert: {
          card_id: string
          contato_id: string
          created_at?: string | null
          id?: string
          ordem?: number
          tipo_viajante?: Database["public"]["Enums"]["tipo_viajante_enum"] | null
          tipo_vinculo?: string | null
        }
        Update: {
          card_id?: string
          contato_id?: string
          created_at?: string | null
          id?: string
          ordem?: number
          tipo_viajante?: Database["public"]["Enums"]["tipo_viajante_enum"] | null
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
          active: boolean | null
          created_at: string | null
          currency: string
          description: string | null
          id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          updated_at?: string | null
          value: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      contatos: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          empresa: string | null
          id: string
          nome: string
          observacoes: string | null
          passaporte: string | null
          responsavel_id: string | null
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          updated_at: string | null
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          passaporte?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          updated_at?: string | null
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          passaporte?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          arquivo_url: string | null
          card_id: string
          created_at: string | null
          created_by: string | null
          data_assinatura: string | null
          id: string
          status: string | null
          tipo: string
          valor_total: number | null
        }
        Insert: {
          arquivo_url?: string | null
          card_id: string
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          id?: string
          status?: string | null
          tipo: string
          valor_total?: number | null
        }
        Update: {
          arquivo_url?: string | null
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          id?: string
          status?: string | null
          tipo?: string
          valor_total?: number | null
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
          card_id: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          email_cobranca: string | null
          endereco_completo: string | null
          id: string
          pessoa_id: string | null
          rg: string | null
          telefone_cobranca: string | null
          updated_at: string | null
        }
        Insert: {
          card_id?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email_cobranca?: string | null
          endereco_completo?: string | null
          id?: string
          pessoa_id?: string | null
          rg?: string | null
          telefone_cobranca?: string | null
          updated_at?: string | null
        }
        Update: {
          card_id?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email_cobranca?: string | null
          endereco_completo?: string | null
          id?: string
          pessoa_id?: string | null
          rg?: string | null
          telefone_cobranca?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_cadastrais_pf_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_cadastrais_pj: {
        Row: {
          card_id: string | null
          cnpj: string | null
          contato_financeiro_email: string | null
          contato_financeiro_nome: string | null
          contato_financeiro_telefone: string | null
          created_at: string | null
          dados_bancarios: string | null
          endereco_cobranca: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          razao_social: string | null
          updated_at: string | null
        }
        Insert: {
          card_id?: string | null
          cnpj?: string | null
          contato_financeiro_email?: string | null
          contato_financeiro_nome?: string | null
          contato_financeiro_telefone?: string | null
          created_at?: string | null
          dados_bancarios?: string | null
          endereco_cobranca?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          updated_at?: string | null
        }
        Update: {
          card_id?: string | null
          cnpj?: string | null
          contato_financeiro_email?: string | null
          contato_financeiro_nome?: string | null
          contato_financeiro_telefone?: string | null
          created_at?: string | null
          dados_bancarios?: string | null
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
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_cadastrais_pj_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_cadastrais_pj_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "view_cards_contatos_summary"
            referencedColumns: ["card_id"]
          },
        ]
      }
      historico_fases: {
        Row: {
          card_id: string | null
          data_entrada: string | null
          data_saida: string | null
          duracao_horas: number | null
          id: string
          stage_id: string | null
        }
        Insert: {
          card_id?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          duracao_horas?: number | null
          id?: string
          stage_id?: string | null
        }
        Update: {
          card_id?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          duracao_horas?: number | null
          id?: string
          stage_id?: string | null
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
            foreignKeyName: "historico_fases_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          anexos: Json | null
          canal: string
          card_id: string
          conteudo: string
          created_at: string | null
          created_by: string | null
          data_envio: string | null
          direcao: string
          id: string
          lida: boolean | null
        }
        Insert: {
          anexos?: Json | null
          canal: string
          card_id: string
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          data_envio?: string | null
          direcao: string
          id?: string
          lida?: boolean | null
        }
        Update: {
          anexos?: Json | null
          canal?: string
          card_id?: string
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          data_envio?: string | null
          direcao?: string
          id?: string
          lida?: boolean | null
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
          active: boolean | null
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      notas: {
        Row: {
          card_id: string
          conteudo: string
          created_at: string | null
          created_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          card_id: string
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          card_id?: string
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
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
        ]
      }
      participacoes: {
        Row: {
          card_id: string | null
          comissao_percentual: number | null
          comissao_valor: number | null
          created_at: string | null
          funcao: string
          id: string
          usuario_id: string | null
        }
        Insert: {
          card_id?: string | null
          comissao_percentual?: number | null
          comissao_valor?: number | null
          created_at?: string | null
          funcao: string
          id?: string
          usuario_id?: string | null
        }
        Update: {
          card_id?: string | null
          comissao_percentual?: number | null
          comissao_valor?: number | null
          created_at?: string | null
          funcao?: string
          id?: string
          usuario_id?: string | null
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
      pessoas: {
        Row: {
          cpf: string | null
          created_at: string | null
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          passaporte: string | null
          passaporte_validade: string | null
          rg: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          updated_at: string | null
          visto_americano: boolean | null
          visto_americano_validade: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          passaporte?: string | null
          passaporte_validade?: string | null
          rg?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          updated_at?: string | null
          visto_americano?: boolean | null
          visto_americano_validade?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          passaporte?: string | null
          passaporte_validade?: string | null
          rg?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pessoa_enum"] | null
          updated_at?: string | null
          visto_americano?: boolean | null
          visto_americano_validade?: string | null
        }
        Relationships: []
      }
      pipeline_card_settings: {
        Row: {
          campos_kanban: Json | null
          campos_visiveis: Json
          created_at: string | null
          fase: string
          id: string
          ordem_campos: Json
          ordem_kanban: Json | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          campos_kanban?: Json | null
          campos_visiveis?: Json
          created_at?: string | null
          fase: string
          id?: string
          ordem_campos?: Json
          ordem_kanban?: Json | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          campos_kanban?: Json | null
          campos_visiveis?: Json
          created_at?: string | null
          fase?: string
          id?: string
          ordem_campos?: Json
          ordem_kanban?: Json | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_card_settings_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_config: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          pipeline_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          pipeline_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          pipeline_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          cor: string | null
          fase: string | null
          id: string
          nome: string
          ordem: number
          pipeline_id: string
        }
        Insert: {
          cor?: string | null
          fase?: string | null
          id?: string
          nome: string
          ordem: number
          pipeline_id: string
        }
        Update: {
          cor?: string | null
          fase?: string | null
          id?: string
          nome?: string
          ordem?: number
          pipeline_id?: string
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
          active: boolean | null
          created_at: string | null
          id: string
          nome: string
          produto: Database["public"]["Enums"]["app_product"]
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          produto: Database["public"]["Enums"]["app_product"]
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          produto?: Database["public"]["Enums"]["app_product"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
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
        ]
      }
      reunioes: {
        Row: {
          card_id: string
          created_at: string | null
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          local: string | null
          notas: string | null
          participantes: Json | null
          status: string | null
          titulo: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          local?: string | null
          notas?: string | null
          participantes?: Json | null
          status?: string | null
          titulo: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          local?: string | null
          notas?: string | null
          participantes?: Json | null
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
        Relationships: [
          {
            foreignKeyName: "stage_obligations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_obligations_stage_id_fkey"
            columns: ["stage_id"]
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
          created_at: string | null
          created_by: string | null
          data_vencimento: string
          descricao: string | null
          id: string
          prioridade: string | null
          responsavel_id: string | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          card_id: string
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_vencimento: string
          descricao?: string | null
          id?: string
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          card_id?: string
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_vencimento?: string
          descricao?: string | null
          id?: string
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
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
      task_queue: {
        Row: {
          card_id: string
          created_at: string | null
          error_log: string | null
          id: string
          processed: boolean | null
          processed_at: string | null
          rule_id: string
          scheduled_for: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          error_log?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          rule_id: string
          scheduled_for: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          error_log?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          rule_id?: string
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
    }
    Views: {
      view_cards_acoes: {
        Row: {
          cliente_recorrente: boolean | null
          concierge_nome: string | null
          concierge_owner_id: string | null
          condicoes_pagamento: string | null
          created_at: string | null
          destinos: string | null
          dias_ate_viagem: number | null
          dono_atual_email: string | null
          dono_atual_id: string | null
          dono_atual_nome: string | null
          estado_operacional: string | null
          etapa_nome: string | null
          etapa_ordem: number | null
          fase: string | null
          forma_pagamento: string | null
          id: string
          moeda: string | null
          orcamento: string | null
          pessoa_nome: string | null
          pessoa_principal_id: string | null
          pipeline_id: string
          pipeline_nome: string | null
          pipeline_stage_id: string
          pos_nome: string | null
          pos_owner_id: string | null
          prioridade: string | null
          produto: Database["public"]["Enums"]["app_product"]
          produto_data: Json | null
          pronto_para_contrato: boolean | null
          pronto_para_erp: boolean | null
          proxima_tarefa: Json | null
          sdr_nome: string | null
          sdr_owner_id: string | null
          status_comercial: string | null
          status_taxa: string | null
          tarefas_pendentes: number | null
          taxa_status: string | null
          taxa_valor: number | null
          tempo_etapa_dias: number | null
          tempo_sem_contato: number | null
          titulo: string
          ultima_interacao: Json | null
          updated_at: string | null
          urgencia_tempo_etapa: number | null
          urgencia_viagem: number | null
          valor_estimado: number | null
          valor_final: number | null
          vendas_nome: string | null
          vendas_owner_id: string | null
          data_viagem_inicio: string | null
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
            referencedRelation: "pessoas"
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
          total_adultos: number | null
          total_criancas: number | null
          total_viajantes: number | null
        }
        Relationships: []
      }
      view_dashboard_funil: {
        Row: {
          count: number | null
          pipeline_id: string | null
          stage_id: string | null
          stage_name: string | null
          total_value: number | null
        }
        Relationships: []
      }
      cards_historico: {
        Row: {
          id: string
          card_id: string
          fase_anterior: string | null
          fase_nova: string | null
          created_at: string | null
          created_by: string | null
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_card_owner: {
        Args: {
          p_card_id: string
        }
        Returns: boolean
      }
      is_financeiro: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_gestor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_operational: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mover_card: {
        Args: {
          p_card_id: string
          p_nova_etapa_id: string
          p_motivo_perda_id?: string
        }
        Returns: undefined
      }
      process_task_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_product: "TRIPS" | "WEDDING" | "CORP"
      app_role: "admin" | "gestor" | "sdr" | "vendas" | "pos_venda" | "concierge" | "financeiro"
      tipo_pessoa_enum: "adulto" | "crianca"
      tipo_viajante_enum: "titular" | "acompanhante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

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
