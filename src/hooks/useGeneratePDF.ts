import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface GeneratePDFResult {
    success: boolean
    proposal: {
        id: string
        title: string
        status: string
    }
    html: string
    totals: {
        base: number
        optional: number
        total: number
    }
    sections: number
    items: number
}

export function useGeneratePDF() {
    return useMutation({
        mutationFn: async ({
            proposalId,
            format = 'html',
        }: {
            proposalId: string
            format?: 'html' | 'json'
        }): Promise<GeneratePDFResult | string> => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                throw new Error('Usuário não autenticado')
            }

            const response = await supabase.functions.invoke('generate-proposal-pdf', {
                body: { proposalId, format },
            })

            if (response.error) {
                throw new Error(response.error.message || 'Erro ao gerar PDF')
            }

            return response.data
        },
        onError: (error: Error) => {
            toast.error('Erro ao gerar PDF', {
                description: error.message,
            })
        },
    })
}

export function useOpenPDFPreview() {
    const generatePDF = useGeneratePDF()

    const openPreview = async (proposalId: string) => {
        toast.loading('Gerando prévia...', { id: 'pdf-preview' })

        try {
            const result = await generatePDF.mutateAsync({
                proposalId,
                format: 'json',
            })

            if (typeof result === 'string') {
                throw new Error('Formato inesperado de resposta')
            }

            // Open HTML in new window for print/save as PDF
            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(result.html)
                printWindow.document.close()
                toast.success('Prévia aberta!', {
                    id: 'pdf-preview',
                    description: 'Use Ctrl+P para imprimir ou salvar como PDF',
                })
            } else {
                throw new Error('Popup bloqueado pelo navegador')
            }
        } catch (error) {
            toast.error('Erro ao gerar prévia', {
                id: 'pdf-preview',
                description: (error as Error).message,
            })
        }
    }

    return {
        openPreview,
        isPending: generatePDF.isPending,
    }
}
