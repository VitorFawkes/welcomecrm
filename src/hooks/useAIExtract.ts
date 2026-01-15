import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface ExtractedItem {
    title: string
    description?: string
    price?: number
    currency?: string
    dates?: string
    location?: string
    category?: 'hotel' | 'flight' | 'transfer' | 'experience' | 'service' | 'insurance' | 'custom'
    details?: Record<string, unknown>
}

export interface ExtractionResult {
    success: boolean
    items: ExtractedItem[]
    rawText?: string
    confidence?: number
    suggestedCategory?: string
}

export function useAIExtractImage() {
    return useMutation({
        mutationFn: async ({
            image,
            imageUrl,
        }: {
            image?: string // base64
            imageUrl?: string
        }): Promise<ExtractionResult> => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                throw new Error('Usuário não autenticado')
            }

            const response = await supabase.functions.invoke('ai-extract-image', {
                body: { image, imageUrl },
            })

            if (response.error) {
                throw new Error(response.error.message || 'Erro ao processar imagem')
            }

            return response.data as ExtractionResult
        },
        onError: (error: Error) => {
            toast.error('Erro ao extrair dados da imagem', {
                description: error.message,
            })
        },
    })
}

// Helper to convert File to base64
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            // Remove the data:image/xxx;base64, prefix
            const base64 = result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// Map extracted category to proposal item type
export function mapCategoryToItemType(category?: string): string {
    const mapping: Record<string, string> = {
        hotel: 'hotel',
        flight: 'flight',
        transfer: 'transfer',
        experience: 'experience',
        service: 'service',
        insurance: 'insurance',
        custom: 'custom',
    }
    return mapping[category || ''] || 'custom'
}
