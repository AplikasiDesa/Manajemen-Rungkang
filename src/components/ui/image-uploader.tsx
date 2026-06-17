"use client"

import React, { useState, useRef } from "react"
import imageCompression from "browser-image-compression"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CLOUDINARY_CONFIG, getOptimizedCloudinaryUrl } from "@/lib/cloudinary-config"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  onUploadComplete: (urls: string[]) => void
  label: string
  folder?: string
  maxFiles?: number
}

interface UploadingFile {
  id: string
  file: File
  preview: string
  progress: number
  status: 'idle' | 'compressing' | 'uploading' | 'success' | 'error'
  resultUrl?: string
}

export function ImageUploader({ onUploadComplete, label, maxFiles = 5 }: ImageUploaderProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [isOverallLoading, setIsOverallLoading] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    if (files.length + selectedFiles.length > maxFiles) {
      toast({ variant: "destructive", title: "Terlalu Banyak", description: `Maksimal ${maxFiles} foto per kategori.` })
      return
    }

    const newFiles: UploadingFile[] = selectedFiles.map(file => {
      return {
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'idle'
      }
    })

    setFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id)
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview)
      return filtered
    })
  }

  const startUpload = async () => {
    if (files.length === 0) return
    setIsOverallLoading(true)

    const uploadPromises = files.map(async (item) => {
      if (item.status === 'success') return item.resultUrl

      try {
        // 1. Kompresi ke WebP
        updateFileStatus(item.id, { status: 'compressing', progress: 10 })
        const compressionOptions = {
          maxSizeMB: 0.4,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: 'image/webp'
        }
        
        const compressedFile = await imageCompression(item.file, compressionOptions)
        
        // 2. Upload ke Cloudinary via XHR (untuk progress)
        updateFileStatus(item.id, { status: 'uploading', progress: 30 })
        
        const formData = new FormData()
        formData.append("file", compressedFile)
        formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset)
        // Catatan: Parameter "folder" dihapus dari client-side karena sering menyebabkan error 400 
        // pada Unsigned Preset. Atur folder tujuan langsung di Dashboard Cloudinary (Upload Preset settings).

        const xhr = new XMLHttpRequest()
        
        const uploadResult = await new Promise<string>((resolve, reject) => {
          xhr.open("POST", CLOUDINARY_CONFIG.baseUrl, true)
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 70) + 30
              updateFileStatus(item.id, { progress: percent })
            }
          }

          xhr.onload = () => {
            try {
              const response = JSON.parse(xhr.responseText)
              if (xhr.status === 200) {
                const optimized = getOptimizedCloudinaryUrl(response.secure_url)
                updateFileStatus(item.id, { status: 'success', progress: 100, resultUrl: optimized })
                resolve(optimized)
              } else {
                const errorMsg = response.error?.message || "Upload failed"
                reject(new Error(errorMsg))
              }
            } catch (e) {
              reject(new Error("Server responded with invalid JSON"))
            }
          }

          xhr.onerror = () => reject(new Error("Koneksi jaringan terputus"))
          xhr.send(formData)
        })

        return uploadResult

      } catch (error: any) {
        updateFileStatus(item.id, { status: 'error', progress: 0 })
        toast({ 
          variant: "destructive", 
          title: "Upload Gagal", 
          description: `${item.file.name}: ${error.message}` 
        })
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    const successfulUrls = results.filter((url): url is string => !!url)
    
    if (successfulUrls.length > 0) {
      onUploadComplete(successfulUrls)
      toast({ title: "Upload Berhasil", description: `${successfulUrls.length} foto siap disimpan.` })
    }
    
    setIsOverallLoading(false)
  }

  const updateFileStatus = (id: string, updates: Partial<UploadingFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase text-primary tracking-widest">{label}</label>
        {files.length > 0 && files.some(f => f.status !== 'success') && (
          <Button 
            size="sm" 
            onClick={startUpload} 
            disabled={isOverallLoading}
            className="h-8 rounded-lg text-[10px] font-black uppercase gap-2 shadow-lg shadow-primary/20"
          >
            {isOverallLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
            Proses Upload ({files.filter(f => f.status !== 'success').length})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {files.map((item) => (
          <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-muted group bg-slate-50">
            <Image 
              src={item.preview} 
              alt="Preview" 
              fill 
              className={cn("object-cover transition-all", item.status === 'uploading' && "opacity-40 grayscale")}
              unoptimized 
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
              {item.status === 'compressing' && (
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-2 animate-pulse">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
              {item.status === 'uploading' && (
                <div className="w-full space-y-2 px-2">
                  <Progress value={item.progress} className="h-1.5 bg-white/20" />
                  <p className="text-[8px] font-black text-white text-center uppercase drop-shadow-md">{item.progress}%</p>
                </div>
              )}
              {item.status === 'success' && (
                <div className="bg-green-500/90 rounded-full p-1.5 shadow-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              )}
              {item.status === 'error' && (
                <div className="bg-red-500/90 rounded-full p-1.5 shadow-lg">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            {!isOverallLoading && item.status !== 'success' && (
              <button 
                onClick={() => removeFile(item.id)}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-white/90 text-destructive flex items-center justify-center shadow-md hover:bg-destructive hover:text-white transition-all scale-0 group-hover:scale-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {files.length < maxFiles && !isOverallLoading && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
          >
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">Tambah Foto</span>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        multiple 
        accept="image/*" 
        className="hidden" 
      />
      
      <p className="text-[8px] font-bold text-muted-foreground uppercase italic px-1">
        * Pastikan klik simpan setelah upload foto".
      </p>
    </div>
  )
}
