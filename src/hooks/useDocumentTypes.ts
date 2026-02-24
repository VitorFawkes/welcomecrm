import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface DocumentType {
  id: string
  nome: string
  slug: string
  descricao: string | null
  requires_file: boolean
  has_data_field: boolean
  data_field_label: string | null
  campo_contato: string | null
  ativo: boolean
  ordem: number
  created_at: string
  created_by: string | null
}

export function useDocumentTypes() {
  const queryClient = useQueryClient()

  const { data: documentTypes = [], isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('ativo', true)
        .order('ordem')

      if (error) throw error
      return (data || []) as DocumentType[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const createDocumentType = useMutation({
    mutationFn: async (params: { nome: string; requires_file?: boolean; has_data_field?: boolean; data_field_label?: string }) => {
      const slug = params.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')

      const maxOrdem = documentTypes.length > 0
        ? Math.max(...documentTypes.map(d => d.ordem)) + 1
        : 0

      const { data, error } = await supabase
        .from('document_types')
        .insert({
          nome: params.nome,
          slug,
          requires_file: params.requires_file ?? true,
          has_data_field: params.has_data_field ?? false,
          data_field_label: params.data_field_label ?? null,
          ordem: maxOrdem,
        })
        .select()
        .single()

      if (error) throw error
      return data as DocumentType
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] })
    },
  })

  return {
    documentTypes,
    isLoading,
    createDocumentType: createDocumentType.mutateAsync,
    isCreating: createDocumentType.isPending,
  }
}
