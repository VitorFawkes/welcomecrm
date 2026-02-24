import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useMemo } from 'react'
import type { DocumentType } from './useDocumentTypes'

export type DocumentModo = 'dados' | 'arquivo' | 'ambos'

export interface DocumentRequirement {
  id: string
  card_id: string
  document_type_id: string
  contato_id: string
  status: 'pendente' | 'recebido'
  modo: DocumentModo
  arquivo_id: string | null
  data_value: string | null
  notas: string | null
  recebido_em: string | null
  recebido_por: string | null
  created_at: string
  document_type: DocumentType
  contato: {
    id: string
    nome: string
    sobrenome: string | null
    cpf_normalizado: string | null
    rg: string | null
    passaporte_validade: string | null
  }
}

export interface DocumentProgress {
  total: number
  completed: number
  percentage: number
}

// Mapeamento campo_contato → coluna real do contato
export const CAMPO_CONTATO_MAP: Record<string, string> = {
  cpf: 'cpf_normalizado',
  rg: 'rg',
  // passaporte → passaporte_validade é data de validade (não número), então não auto-preenche
}

export interface ContactDocuments {
  contato: { id: string; nome: string; sobrenome: string | null; cpf_normalizado: string | null; rg: string | null; passaporte_validade: string | null }
  requirements: DocumentRequirement[]
  completed: number
  total: number
}

export function useDocumentCollection(cardId: string) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['document-collection', cardId],
    queryFn: async () => {
      const { data, error } = await supabase.from('card_document_requirements')
        .select(`
          *,
          document_type:document_types (*),
          contato:contatos (id, nome, sobrenome, cpf_normalizado, rg, passaporte_validade)
        `)
        .eq('card_id', cardId)
        .order('created_at')

      if (error) throw error
      return (data || []) as unknown as DocumentRequirement[]
    },
    enabled: !!cardId,
  })

  const progress: DocumentProgress = useMemo(() => {
    const total = requirements.length
    const completed = requirements.filter(r => r.status === 'recebido').length
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [requirements])

  const byContact: ContactDocuments[] = useMemo(() => {
    const map = new Map<string, ContactDocuments>()

    for (const req of requirements) {
      if (!req.contato) continue
      const key = req.contato.id
      if (!map.has(key)) {
        map.set(key, {
          contato: req.contato,
          requirements: [],
          completed: 0,
          total: 0,
        })
      }
      const entry = map.get(key)!
      entry.requirements.push(req)
      entry.total++
      if (req.status === 'recebido') entry.completed++
    }

    return Array.from(map.values())
  }, [requirements])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['document-collection', cardId] })
    queryClient.invalidateQueries({ queryKey: ['cards'] })
  }

  // --- Mutations ---

  const addRequirements = useMutation({
    mutationFn: async (params: { assignments: Array<{ typeId: string; contatoId: string; modo: DocumentModo }> }) => {
      const rows = params.assignments.map(a => ({
        card_id: cardId,
        document_type_id: a.typeId,
        contato_id: a.contatoId,
        status: 'pendente' as const,
        modo: a.modo,
      }))

      if (rows.length === 0) return

      const { error } = await supabase.from('card_document_requirements')
        .upsert(rows, { onConflict: 'card_id,document_type_id,contato_id', ignoreDuplicates: true })

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  const markReceived = useMutation({
    mutationFn: async (params: { requirementId: string; arquivoId?: string; dataValue?: string }) => {
      const { error } = await supabase.from('card_document_requirements')
        .update({
          status: 'recebido',
          arquivo_id: params.arquivoId ?? null,
          data_value: params.dataValue ?? null,
          recebido_em: new Date().toISOString(),
          recebido_por: user?.id ?? null,
        })
        .eq('id', params.requirementId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  const undoReceived = useMutation({
    mutationFn: async (requirementId: string) => {
      const { error } = await supabase.from('card_document_requirements')
        .update({
          status: 'pendente',
          recebido_em: null,
          recebido_por: null,
        })
        .eq('id', requirementId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  const removeRequirement = useMutation({
    mutationFn: async (requirementId: string) => {
      const { error } = await supabase.from('card_document_requirements')
        .delete()
        .eq('id', requirementId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  // Remove all requirements of a specific document type (across all contacts)
  const removeByType = useMutation({
    mutationFn: async (documentTypeId: string) => {
      const { error } = await supabase.from('card_document_requirements')
        .delete()
        .eq('card_id', cardId)
        .eq('document_type_id', documentTypeId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  // Remove all requirements for a specific contact
  const removeByContact = useMutation({
    mutationFn: async (contatoId: string) => {
      const { error } = await supabase.from('card_document_requirements')
        .delete()
        .eq('card_id', cardId)
        .eq('contato_id', contatoId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  // Update notes on a requirement
  const updateNotes = useMutation({
    mutationFn: async (params: { requirementId: string; notas: string | null }) => {
      const { error } = await supabase.from('card_document_requirements')
        .update({ notas: params.notas })
        .eq('id', params.requirementId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  // Update data_value on a requirement (inline editing)
  const updateDataValue = useMutation({
    mutationFn: async (params: { requirementId: string; dataValue: string | null }) => {
      const { error } = await supabase.from('card_document_requirements')
        .update({ data_value: params.dataValue })
        .eq('id', params.requirementId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  // Update modo on a requirement
  const updateModo = useMutation({
    mutationFn: async (params: { requirementId: string; modo: DocumentModo }) => {
      const { error } = await supabase.from('card_document_requirements')
        .update({ modo: params.modo })
        .eq('id', params.requirementId)

      if (error) throw error
    },
    onSuccess: invalidateAll,
  })

  const uploadDocument = useMutation({
    mutationFn: async (params: { requirementId: string; file: File; contatoId: string; documentTypeSlug: string; dataValue?: string }) => {
      const ext = params.file.name.split('.').pop() || 'bin'
      const path = `${cardId}/${params.contatoId}/${params.documentTypeSlug}_${Date.now()}.${ext}`

      // 1. Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('card-documents')
        .upload(path, params.file, { upsert: true })

      if (uploadError) throw uploadError

      // 2. Create arquivos record
      const { data: arquivo, error: arquivoError } = await supabase
        .from('arquivos')
        .insert({
          card_id: cardId,
          pessoa_id: params.contatoId,
          caminho_arquivo: uploadData.path,
          nome_original: params.file.name,
          mime_type: params.file.type,
          tamanho_bytes: params.file.size,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single()

      if (arquivoError) throw arquivoError

      // 3. Mark requirement as received
      const { error: updateError } = await supabase.from('card_document_requirements')
        .update({
          status: 'recebido',
          arquivo_id: arquivo.id,
          data_value: params.dataValue ?? null,
          recebido_em: new Date().toISOString(),
          recebido_por: user?.id ?? null,
        })
        .eq('id', params.requirementId)

      if (updateError) throw updateError
    },
    onSuccess: invalidateAll,
  })

  const createCollectionTask = async (responsavelId: string) => {
    const pending = progress.total - progress.completed
    const { error } = await supabase
      .from('tarefas')
      .insert({
        card_id: cardId,
        tipo: 'coleta_documentos',
        titulo: `Coletar documentos (${pending} pendente${pending !== 1 ? 's' : ''})`,
        responsavel_id: responsavelId,
        status: 'pendente',
        concluida: false,
        created_by: user?.id ?? null,
      })

    if (error) throw error

    queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
  }

  return {
    requirements,
    progress,
    byContact,
    isLoading,
    addRequirements: addRequirements.mutateAsync,
    isAdding: addRequirements.isPending,
    markReceived: markReceived.mutateAsync,
    undoReceived: undoReceived.mutateAsync,
    removeRequirement: removeRequirement.mutateAsync,
    removeByType: removeByType.mutateAsync,
    removeByContact: removeByContact.mutateAsync,
    updateNotes: updateNotes.mutateAsync,
    updateDataValue: updateDataValue.mutateAsync,
    updateModo: updateModo.mutateAsync,
    uploadDocument: uploadDocument.mutateAsync,
    isUploading: uploadDocument.isPending,
    createCollectionTask,
  }
}
