"use client"

import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, deleteDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileStack, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Settings2,
  FileText
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function DokumenFisikDashboard() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")

  const activitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "physical_activities"),
      orderBy("createdAt", "desc")
    )
  }, [db, user])

  const { data: activities, isLoading } = useCollection(activitiesQuery)

  const filtered = (activities || []).filter(item => 
    (item.namaKegiatan || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.lokasi || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Hapus data kegiatan ini beserta seluruh akses otomatisasinya?")) return
    try {
      await deleteDoc(doc(db, "physical_activities", id))
      toast({ title: "Terhapus", description: "Data inventaris fisik telah dihapus." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan." })
    }
  }

  if (isUserLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileStack className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Inventaris Dokumen Fisik</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase">Otomatisasi Berkas Proyek & Pembangunan Desa</p>
          </div>
        </div>
        <Button asChild className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase shadow-lg gap-2">
          <Link href="/dokumen-fisik/editor/">
            <Plus className="h-5 w-5" /> Buat Proyek Baru
          </Link>
        </Button>
      </header>

      <section className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Cari nama kegiatan atau lokasi..." 
            className="pl-11 h-14 rounded-2xl bg-white border-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" />
              <p className="text-xs font-bold text-muted-foreground uppercase mt-4">Memuat data proyek...</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <Link key={item.id} href={`/dokumen-fisik/generate/${item.id}/`}>
                <Card className="border-none shadow-md hover:shadow-xl transition-all group rounded-[2rem] overflow-hidden bg-white cursor-pointer active:scale-[0.98]">
                  <CardHeader className="bg-primary/5 p-6 border-b border-primary/5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">TA {item.tahunAnggaran}</p>
                        <CardTitle className="text-base font-black text-slate-800 uppercase line-clamp-2 leading-tight">
                          {item.namaKegiatan}
                        </CardTitle>
                      </div>
                      <Settings2 className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                        <MapPin className="h-3.5 w-3.5 text-primary/60" />
                        <span className="truncate">{item.lokasi}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                        <DollarSign className="h-3.5 w-3.5 text-primary/60" />
                        <span>Rp {new Intl.NumberFormat('id-ID').format(item.anggaran)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{item.tanggalKegiatan}</span>
                       </div>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-full hover:bg-destructive/10" onClick={(e) => handleDelete(e, item.id)}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest pt-2 border-t border-slate-50 group-hover:gap-3 transition-all">
                       Generate Dokumen <ChevronRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-32 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
              <FileStack className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada proyek fisik tercatat</p>
              <Button asChild variant="outline" className="mt-6 rounded-xl border-primary/20 text-primary font-black uppercase text-xs">
                <Link href="/dokumen-fisik/editor/"><Plus className="h-3.5 w-3.5 mr-2" /> Mulai Proyek Pertama</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
