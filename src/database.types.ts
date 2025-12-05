export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          tipo_vinculo: string | null
        }
        Insert: {
          card_id: string
          contato_id: string
          created_at?: string | null
          tipo_vinculo?: string | null
        }
        Update: {
          card_id?: string
          contato_id?: string
          created_at?: string | null
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
          created_at: string | null
          created_by: string | null
          email: string | null
          empresa: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
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
          created_at: string | null
          id: string
          pipeline_id: string
          updated_at: string | null
          visible_fields: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          pipeline_id: string
          updated_at?: string | null
          visible_fields?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          pipeline_id?: string
          updated_at?: string | null
          visible_fields?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_card_settings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
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
          titulo?: string
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
          id: string | null
          moeda: string | null
          motivo_perda_id: string | null
          pessoa_principal_id: string | null
          pipeline_id: string | null
          pipeline_stage_id: string | null
          pos_owner_id: string | null
          prioridade: string | null
          produto: Database["public"]["Enums"]["app_product"] | null
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
          titulo: string | null
          updated_at: string | null
          updated_by: string | null
          valor_estimado: number | null
          valor_final: number | null
          vendas_owner_id: string | null
          // Manually adding missing columns from view definition
          fase: string | null
          etapa_nome: string | null
          etapa_ordem: number | null
          pipeline_nome: string | null
          pessoa_nome: string | null
          dono_atual_nome: string | null
          dono_atual_email: string | null
          proxima_tarefa: Json | null
          tarefas_pendentes: number | null
          ultima_interacao: Json | null
          tempo_sem_contato: number | null
          status_taxa: string | null
          dias_ate_viagem: number | null
          urgencia_viagem: number | null
          tempo_etapa_dias: number | null
          urgencia_tempo_etapa: number | null
          destinos: string | null
          orcamento: string | null
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
      process_task_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
