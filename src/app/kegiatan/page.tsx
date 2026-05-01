
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronLeft, 
  Loader2, 
  AlertTriangle, 
  FileText, 
  ImageIcon, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  User, 
  BookOpen, 
  Share2, 
  Trash2,
  FileCheck
} from "lucide-react"
import Link from "next/link"
import { KegiatanCard } from "@/components/kegiatan/KegiatanCard"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { KegiatanUpload } from "@/components/kegiatan/KegiatanUpload"
import { useCollection, useUser, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default function KegiatanPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState<any>(null)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  
  const { user, isUserLoading: isAuthLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const kegiatanQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "users", user.uid, "kegiatans")
  }, [db, user])

  const { data: kegiatans, isLoading } = useCollection(kegiatanQuery)

  const filtered = (kegiatans || []).filter(k => {
    const title = k.title || ""
    const desc = k.description || ""
    const s = searchTerm.toLowerCase()
    return title.toLowerCase().includes(s) || desc.toLowerCase().includes(s)
  }).sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime())

  const handleDelete = () => {
    if (!user || !selectedForDelete || !db) return
    const docRef = doc(db, "users", user.uid, "kegiatans", selectedForDelete.id)
    deleteDocumentNonBlocking(docRef)
    toast({
      title: "Kegiatan Dihapus",
      description: "Laporan kegiatan telah berhasil dihapus dari sistem."
    })
    setSelectedForDelete(null)
    setSelectedActivity(null)
  }

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4 p-4 text-center">
        <h2 className="text-xl font-bold">Akses Dibatasi</h2>
        <p className="text-muted-foreground">Silakan login untuk melihat riwayat kegiatan Anda.</p>
        <Button asChild>
          <Link href="/login">Login Sekarang</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 overflow-x-hidden">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div>
            <h1 className="text-xl font-black text-primary uppercase tracking-tight leading-none">Riwayat Laporan</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Dokumentasi Digital Desa Rungkang</p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari laporan..." 
              className="pl-9 h-12 rounded-xl bg-muted/30 border-none shadow-inner" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl bg-muted/30 border-none">
            <Filter className="h-5 w-5 text-primary" />
          </Button>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-14 gap-3 text-base font-black uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 rounded-2xl">
              <Plus className="h-6 w-6" />
              Upload Laporan Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 rounded-[2.5rem] border shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary uppercase">Input Laporan</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase text-muted-foreground">
                Dokumentasikan kegiatan Anda ke server desa.
              </DialogDescription>
            </DialogHeader>
            <KegiatanUpload onSuccess={() => setIsUploadOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sinkronisasi Laporan...</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <KegiatanCard 
                key={item.id} 
                kegiatan={{
                  id: item.id,
                  title: item.title || "Tanpa Judul",
                  description: item.description || "Tidak ada deskripsi",
                  date: item.date || item.uploadDate || "-",
                  location: item.location || "Balai Desa",
                  category: item.category || "Internal",
                  imageUrl: (item.imageUrls && item.imageUrls.length > 0 && item.imageUrls[0] !== "Tersimpan di Drive") 
                    ? item.imageUrls[0] 
                    : `https://picsum.photos/seed/${item.id}/600/400`
                }} 
                onDelete={(e) => {
                  e.stopPropagation();
                  setSelectedForDelete(item);
                }}
                onClick={() => setSelectedActivity(item)}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/5 border-muted/50">
              <p className="font-black text-muted-foreground uppercase text-sm">Belum Ada Laporan Tersimpan</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Silakan unggah kegiatan pertama Anda.</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 rounded-[2.5rem] shadow-2xl border-none">
          <DialogHeader className="p-0">
            <DialogTitle className="sr-only">{selectedActivity?.title || "Detail Laporan"}</DialogTitle>
            <DialogDescription className="sr-only">Rincian lengkap dokumen dan deskripsi hasil kegiatan.</DialogDescription>
          </DialogHeader>
          
          {selectedActivity && (
            <div className="space-y-0 relative">
              <div className="relative aspect-video w-full">
                 <Image
                    src={(selectedActivity.imageUrls && selectedActivity.imageUrls.length > 0 && selectedActivity.imageUrls[0] !== "Tersimpan di Drive") 
                        ? selectedActivity.imageUrls[0] 
                        : `https://picsum.photos/seed/${selectedActivity.id}/600/400`}
                    alt="Cover"
                    fill
                    className="object-cover"
                    unoptimized
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                 <div className="absolute bottom-6 left-6 right-6">
                    <Badge className="mb-2 bg-primary/90 border-none text-[10px] font-black uppercase tracking-widest">{selectedActivity.category}</Badge>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{selectedActivity.title}</h2>
                 </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-[8px] font-black text-muted-foreground uppercase">Tanggal</p>
                            <p className="text-xs font-bold">{selectedActivity.date}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-[8px] font-black text-muted-foreground uppercase">Lokasi</p>
                            <p className="text-xs font-bold truncate">{selectedActivity.location}</p>
                        </div>
                    </div>
                    {selectedActivity.officialName && (
                        <div className="col-span-2 flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                            <User className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-[8px] font-black text-primary uppercase">Pelaksana Kegiatan</p>
                                <p className="text-xs font-bold uppercase">{selectedActivity.officialName}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <FileText className="h-3 w-3" /> Ringkasan / Notulensi
                    </h4>
                    <div className="p-5 bg-white border rounded-3xl shadow-sm text-sm leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                        {selectedActivity.description}
                    </div>
                </div>

                {selectedActivity.imageUrls && selectedActivity.imageUrls.length > 0 && selectedActivity.imageUrls[0] !== "Tersimpan di Drive" && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                            <ImageIcon className="h-3 w-3" /> Foto Dokumentasi
                        </h4>
                        <ScrollArea className="w-full">
                            <div className="flex gap-3 pb-2">
                                {selectedActivity.imageUrls.map((url: string, i: number) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative h-24 w-32 shrink-0 rounded-xl overflow-hidden border shadow-sm group">
                                        <Image src={url} alt={`Foto ${i}`} fill className="object-cover group-hover:scale-110 transition-transform" unoptimized />
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExternalLink className="h-4 w-4 text-white" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Share2 className="h-3 w-3" /> Dokumen Terlampir (Drive)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedActivity.driveUrls?.notulen && (
                            <Button variant="outline" className="h-14 rounded-2xl justify-between gap-3 border-primary/20 hover:bg-primary/5 group transition-all" asChild>
                                <a href={selectedActivity.driveUrls.notulen} target="_blank" rel="noopener noreferrer">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-red-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tight">PDF Notulen</span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </Button>
                        )}
                        {selectedActivity.driveUrls?.bast && (
                            <Button variant="outline" className="h-14 rounded-2xl justify-between gap-3 border-primary/20 hover:bg-primary/5 group transition-all" asChild>
                                <a href={selectedActivity.driveUrls.bast} target="_blank" rel="noopener noreferrer">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <FileCheck className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tight">PDF BAST</span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </Button>
                        )}
                        {selectedActivity.driveUrls?.undangan && (
                            <Button variant="outline" className="h-14 rounded-2xl justify-between gap-3 border-primary/20 hover:bg-primary/5 group transition-all" asChild>
                                <a href={selectedActivity.driveUrls.undangan} target="_blank" rel="noopener noreferrer">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <BookOpen className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tight">Undangan</span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </Button>
                        )}
                        {selectedActivity.driveUrls?.materials && (Array.isArray(selectedActivity.driveUrls.materials) ? selectedActivity.driveUrls.materials.length > 0 : !!selectedActivity.driveUrls.materials) && (
                            <Button variant="outline" className="h-14 rounded-2xl justify-between gap-3 border-primary/20 hover:bg-primary/5 group transition-all" asChild>
                                <a href={Array.isArray(selectedActivity.driveUrls.materials) ? selectedActivity.driveUrls.materials[0] : selectedActivity.driveUrls.materials} target="_blank" rel="noopener noreferrer">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <Share2 className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tight">
                                            Materi {Array.isArray(selectedActivity.driveUrls.materials) ? `(${selectedActivity.driveUrls.materials.length})` : ''}
                                        </span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
                    <Button variant="destructive" className="flex-1 h-14 rounded-2xl font-black uppercase gap-2 shadow-lg shadow-destructive/20" onClick={() => setSelectedForDelete(selectedActivity)}>
                        <Trash2 className="h-5 w-5" /> Hapus Laporan
                    </Button>
                    <Button variant="secondary" className="flex-1 h-14 rounded-2xl font-black uppercase border-none bg-muted/50 text-muted-foreground hover:bg-muted" onClick={() => setSelectedActivity(null)}>
                        Tutup
                    </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!selectedForDelete} onOpenChange={(open) => !open && setSelectedForDelete(null)}>
        <DialogContent className="w-[90vw] sm:max-w-[400px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div>
                <DialogTitle className="text-xl font-black text-destructive uppercase">Hapus Laporan?</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase mt-1 leading-relaxed">
                Tindakan ini akan menghapus <strong>{selectedForDelete?.title}</strong> dari sistem secara permanen.
                </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button variant="ghost" onClick={() => setSelectedForDelete(null)} className="w-full sm:flex-1 h-12 rounded-2xl font-bold uppercase">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="w-full sm:flex-1 h-12 rounded-2xl font-black uppercase shadow-lg shadow-destructive/20">
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
