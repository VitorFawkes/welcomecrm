import { useState, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, Plus, FileCheck, Users, ListChecks, X, FileText, Upload, Check as CheckIcon } from 'lucide-react'
import { useDocumentTypes } from '../../../hooks/useDocumentTypes'
import { useCardPeople } from '../../../hooks/useCardPeople'
import { cn } from '../../../lib/utils'
import type { DocumentType } from '../../../hooks/useDocumentTypes'
import type { DocumentModo } from '../../../hooks/useDocumentCollection'

interface DocumentSetupModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string
  existingAssignments: Map<string, Set<string>>
  onConfirm: (assignments: Array<{ typeId: string; contatoId: string; modo: DocumentModo }>) => Promise<void>
}

interface TypeAssignment {
  contatoIds: Set<string>
  modo: DocumentModo
}

/** Derive default modo from the document_type flags */
function getDefaultModo(type: DocumentType): DocumentModo {
  if (type.requires_file && type.has_data_field) return 'ambos'
  if (type.requires_file) return 'arquivo'
  if (type.has_data_field) return 'dados'
  return 'ambos'
}

const MODO_OPTIONS: Array<{ value: DocumentModo; label: string; icon: typeof FileText }> = [
  { value: 'dados', label: 'Dados', icon: FileText },
  { value: 'arquivo', label: 'Arquivo', icon: Upload },
  { value: 'ambos', label: 'Ambos', icon: FileCheck },
]

export default function DocumentSetupModal({
  isOpen,
  onClose,
  cardId,
  existingAssignments,
  onConfirm,
}: DocumentSetupModalProps) {
  const { documentTypes, isLoading: loadingTypes, createDocumentType, isCreating } = useDocumentTypes()
  const { people = [], isLoading: isLoadingPeople } = useCardPeople(cardId)

  // Map<typeId, { contatoIds, modo }> — granular assignments with collection mode
  const [assignments, setAssignments] = useState<Map<string, TypeAssignment>>(new Map())
  const [search, setSearch] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [showNewTypeForm, setShowNewTypeForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when modal opens
  const prevOpen = useRef(false)
  if (isOpen && !prevOpen.current) {
    // Entered from closed → reset
    if (assignments.size > 0) setAssignments(new Map())
    if (search) setSearch('')
    if (showNewTypeForm) setShowNewTypeForm(false)
  }
  prevOpen.current = isOpen

  // Filter types by search — only hide if ALL people already have this type
  const filteredTypes = useMemo(() => {
    const q = search.toLowerCase()
    return documentTypes.filter(t => {
      // Hide type only if every person already has it assigned
      const assignedContacts = existingAssignments.get(t.id)
      if (assignedContacts && people.length > 0 && people.every(p => assignedContacts.has(p.id))) {
        return false
      }
      if (!q) return true
      return t.nome.toLowerCase().includes(q)
    })
  }, [documentTypes, search, existingAssignments, people])

  const toggleType = (typeId: string) => {
    setAssignments(prev => {
      const next = new Map(prev)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        const type = documentTypes.find(t => t.id === typeId)
        // Only pre-select people who don't already have this type
        const alreadyAssigned = existingAssignments.get(typeId)
        const availablePeople = alreadyAssigned
          ? people.filter(p => !alreadyAssigned.has(p.id))
          : people
        next.set(typeId, {
          contatoIds: new Set(availablePeople.map(p => p.id)),
          modo: type ? getDefaultModo(type) : 'ambos',
        })
      }
      return next
    })
  }

  const togglePerson = (typeId: string, contatoId: string) => {
    setAssignments(prev => {
      const next = new Map(prev)
      const current = next.get(typeId)
      if (!current) return prev

      const updated = new Set(current.contatoIds)
      if (updated.has(contatoId)) {
        updated.delete(contatoId)
      } else {
        updated.add(contatoId)
      }

      // If no people left, remove the type entirely
      if (updated.size === 0) {
        next.delete(typeId)
      } else {
        next.set(typeId, { ...current, contatoIds: updated })
      }
      return next
    })
  }

  const setModo = (typeId: string, modo: DocumentModo) => {
    setAssignments(prev => {
      const next = new Map(prev)
      const current = next.get(typeId)
      if (!current) return prev
      next.set(typeId, { ...current, modo })
      return next
    })
  }

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return
    try {
      const newType = await createDocumentType({ nome: newTypeName.trim() })
      // Auto-select new type with all people, default modo
      setAssignments(prev => {
        const next = new Map(prev)
        next.set(newType.id, {
          contatoIds: new Set(people.map(p => p.id)),
          modo: getDefaultModo(newType),
        })
        return next
      })
      setNewTypeName('')
      setShowNewTypeForm(false)
    } catch (err) {
      console.error('Error creating document type:', err)
    }
  }

  // Build flat assignments array from Map (now includes modo)
  const flatAssignments = useMemo(() => {
    const result: Array<{ typeId: string; contatoId: string; modo: DocumentModo }> = []
    assignments.forEach(({ contatoIds, modo }, typeId) => {
      contatoIds.forEach(contatoId => {
        result.push({ typeId, contatoId, modo })
      })
    })
    return result
  }, [assignments])

  const handleConfirm = async () => {
    if (flatAssignments.length === 0) return
    setIsSubmitting(true)
    try {
      await onConfirm(flatAssignments)
      onClose()
    } catch (err) {
      console.error('Error adding document requirements:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const personName = (p: { nome: string; sobrenome?: string | null }) =>
    [p.nome, p.sobrenome].filter(Boolean).join(' ')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-teal-600" />
            Definir Documentos Necessários
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Travelers info */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-700">
              {isLoadingPeople ? 'Carregando...' : (
                people.length > 0
                  ? `${people.length} viajante${people.length > 1 ? 's' : ''}: ${people.map(personName).join(', ')}`
                  : 'Nenhum viajante vinculado ao card'
              )}
            </span>
          </div>

          {people.length === 0 && !isLoadingPeople && (
            <p className="text-xs text-amber-600 px-1">
              Vincule contatos ao card antes de definir documentos.
            </p>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tipo de documento..."
              className="pl-9"
            />
          </div>

          {/* Document type list */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
            {loadingTypes ? (
              <div className="py-8 text-center text-sm text-gray-500">Carregando tipos...</div>
            ) : filteredTypes.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                {search ? 'Nenhum tipo encontrado' : 'Todos os tipos já foram adicionados'}
              </div>
            ) : (
              filteredTypes.map(type => {
                const isSelected = assignments.has(type.id)
                const assignment = assignments.get(type.id)
                return (
                  <div key={type.id} className={cn(
                    "rounded-lg border transition-all",
                    isSelected
                      ? "bg-teal-50 border-teal-300 ring-1 ring-teal-300"
                      : "bg-white border-gray-200 hover:border-teal-200 hover:bg-teal-50/30"
                  )}>
                    {/* Type row — click to toggle */}
                    <button
                      onClick={() => toggleType(type.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-teal-600 border-teal-600"
                          : "border-gray-300"
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{type.nome}</span>
                        {!isSelected && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {type.requires_file && (
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Arquivo</span>
                            )}
                            {type.has_data_field && (
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{type.data_field_label || 'Dados'}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {isSelected && assignment && (() => {
                        const alreadyCount = existingAssignments.get(type.id)?.size ?? 0
                        const availableCount = people.length - alreadyCount
                        return (
                          <span className="text-[10px] font-medium text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full shrink-0">
                            {assignment.contatoIds.size}/{availableCount}
                          </span>
                        )
                      })()}
                    </button>

                    {/* Expanded section when selected */}
                    {isSelected && (
                      <div className="px-3 pb-3 pl-11 space-y-2">
                        {/* Mode selector — segmented control */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-teal-700 font-medium mr-1">Coleta:</span>
                          {MODO_OPTIONS.map(opt => {
                            const Icon = opt.icon
                            const isActive = assignment?.modo === opt.value
                            return (
                              <button
                                key={opt.value}
                                onClick={(e) => { e.stopPropagation(); setModo(type.id, opt.value) }}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border",
                                  isActive
                                    ? "bg-teal-600 text-white border-teal-600"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-teal-300 hover:text-teal-600"
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>

                        {/* Traveler chips */}
                        {people.length > 1 && (
                          <div className="flex flex-wrap gap-1.5">
                            {people.map(p => {
                              const isAssigned = assignment?.contatoIds.has(p.id) ?? false
                              const alreadyExists = existingAssignments.get(type.id)?.has(p.id) ?? false
                              return (
                                <button
                                  key={p.id}
                                  onClick={(e) => { e.stopPropagation(); if (!alreadyExists) togglePerson(type.id, p.id) }}
                                  disabled={alreadyExists}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border",
                                    alreadyExists
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                      : isAssigned
                                        ? "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200"
                                        : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-500"
                                  )}
                                  title={alreadyExists ? 'Já adicionado anteriormente' : undefined}
                                >
                                  {personName(p)}
                                  {alreadyExists && <CheckIcon className="h-3 w-3 text-green-500" />}
                                  {isAssigned && !alreadyExists && <X className="h-3 w-3" />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Create new type */}
          {showNewTypeForm ? (
            <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg border border-teal-200">
              <Input
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                placeholder="Nome do novo tipo..."
                className="flex-1 h-8 text-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateType()}
              />
              <Button
                size="sm"
                onClick={handleCreateType}
                disabled={!newTypeName.trim() || isCreating}
                className="h-8 bg-teal-600 hover:bg-teal-700"
              >
                {isCreating ? '...' : 'Criar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowNewTypeForm(false); setNewTypeName('') }}
                className="h-8"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTypeForm(true)}
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium px-1"
            >
              <Plus className="h-4 w-4" />
              Criar novo tipo de documento
            </button>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            {flatAssignments.length > 0 && `${assignments.size} tipo${assignments.size > 1 ? 's' : ''}, ${flatAssignments.length} ite${flatAssignments.length > 1 ? 'ns' : 'm'}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={flatAssignments.length === 0 || isSubmitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <FileCheck className="h-4 w-4 mr-1.5" />
              {isSubmitting ? 'Adicionando...' : 'Adicionar Documentos'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
