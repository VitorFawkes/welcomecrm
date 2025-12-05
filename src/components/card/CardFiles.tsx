import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { FileText, Download } from 'lucide-react'

interface CardFilesProps {
    cardId: string
}

export default function CardFiles({ cardId }: CardFilesProps) {
    const { data: files, isLoading } = useQuery({
        queryKey: ['card-files', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('arquivos')
                .select('*')
                .eq('card_id', cardId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        }
    })

    if (isLoading) return <div className="p-4 text-center text-sm text-gray-500">Carregando arquivos...</div>

    if (!files || files.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum arquivo</h3>
                <p className="mt-1 text-sm text-gray-500">Faça upload de documentos relacionados a este card.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                            <h4 className="truncate text-sm font-medium text-gray-900">{file.nome_original}</h4>
                            <p className="text-xs text-gray-500">
                                {(file.tamanho_bytes ? (file.tamanho_bytes / 1024).toFixed(1) + ' KB' : 'Tamanho desconhecido')}
                            </p>
                        </div>
                    </div>

                    <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}
