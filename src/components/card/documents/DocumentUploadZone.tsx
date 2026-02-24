import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Image, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface DocumentUploadZoneProps {
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
  currentFileName?: string | null
  accept?: string
}

export default function DocumentUploadZone({
  onUpload,
  isUploading,
  currentFileName,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Máximo 10MB.')
      return
    }
    await onUpload(file)
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (currentFileName) {
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(currentFileName)
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
        {isImage ? <Image className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{currentFileName}</span>
      </div>
    )
  }

  if (isUploading) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-teal-300 rounded-lg bg-teal-50 text-xs text-teal-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Enviando...
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer transition-colors text-xs",
        isDragOver
          ? "border-teal-400 bg-teal-50 text-teal-700"
          : "border-gray-300 bg-gray-50 text-gray-500 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-600"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-3.5 w-3.5" />
      <span>Enviar arquivo</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
