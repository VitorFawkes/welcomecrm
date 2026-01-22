import { useEffect, useCallback } from 'react'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { toast } from 'sonner'

/**
 * useBuilderKeyboardShortcuts - Keyboard shortcuts for the proposal builder
 * 
 * Shortcuts:
 * - ⌘/Ctrl + S: Save proposal
 * - ⌘/Ctrl + P: Toggle preview mode
 * - Escape: Deselect / Close drawers
 */

interface UseBuilderKeyboardShortcutsOptions {
    isPreviewMode: boolean
    onTogglePreview: () => void
    onEscape?: () => void
    enabled?: boolean
}

export function useBuilderKeyboardShortcuts({
    isPreviewMode,
    onTogglePreview,
    onEscape,
    enabled = true,
}: UseBuilderKeyboardShortcutsOptions) {
    const { save, isSaving, isDirty } = useProposalBuilder()

    const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
        if (!enabled) return

        const isMeta = e.metaKey || e.ctrlKey

        // ⌘/Ctrl + S: Save
        if (isMeta && e.key === 's') {
            e.preventDefault()
            if (isDirty && !isSaving) {
                toast.promise(save(), {
                    loading: 'Salvando...',
                    success: 'Proposta salva!',
                    error: 'Erro ao salvar',
                })
            } else if (!isDirty) {
                toast.info('Nenhuma alteração para salvar')
            }
            return
        }

        // ⌘/Ctrl + P: Toggle Preview
        if (isMeta && e.key === 'p') {
            e.preventDefault()
            onTogglePreview()
            toast.info(isPreviewMode ? 'Modo Edição' : 'Modo Preview')
            return
        }

        // Escape: Deselect / Close
        if (e.key === 'Escape') {
            onEscape?.()
            return
        }
    }, [enabled, isDirty, isSaving, save, isPreviewMode, onTogglePreview, onEscape])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
}

export default useBuilderKeyboardShortcuts
