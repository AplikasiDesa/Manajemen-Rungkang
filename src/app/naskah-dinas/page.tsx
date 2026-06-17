"use client"

import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  Trash2, 
  Printer, 
  MoreVertical,
  Download,
  Copy,
  ChevronRight
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { NASKAH_CONFIG } from "@/lib/naskah-dinas-utils"
import { cn } from "@/lib/utils"

export default function NaskahDinasPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  const naskahQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "naskah_dinas"), orderBy("createdAt", "desc"))
  }, [db, user])

  const { data: naskahList, isLoading } = useCollection(naskahQuery)

  const filtered = (naskahList || []).filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.nomorSurat?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || item.type === filterType
    return matchesSearch && matchesType
  })

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus naskah ini dari arsip?")) {
      deleteDocumentNonBlocking(doc(db, "naskah_dinas", id))
      toast({ title: "Terhapus", description: "Dokumen telah dihapus dari arsip." })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Naskah Dinas</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">Manajemen & Arsip Dokumen Resmi Desa</p>
        </div>
        <Button asChild className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase shadow-lg shadow-primary/20 gap-2">
          <Link href="/naskah-dinas/editor/">
            <Plus className="h-5 w-5" /> Buat Naskah Baru
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-4 items-end">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pencarian</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari judul atau nomor surat..." 
              className="pl-9 h-12 rounded-xl border-none bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Filter Jenis</label>
          <select 
            className="w-full h-12 rounded-xl border-none bg-white shadow-sm px-4 text-sm font-bold appearance-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Semua Jenis</option>
            {Object.entries(NASKAH_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </section>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400">Judul & Nomor</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400">Jenis</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400">Tanggal</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" />
                    </td>
                  </tr>
                ) : filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-800 text-sm line-clamp-1">{item.title}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.nomorSurat}</p>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary uppercase">
                        {NASKAH_CONFIG[item.type as keyof typeof NASKAH_CONFIG]?.label || item.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-slate-500">
                        {format(new Date(item.createdAt), "d MMM yyyy", { locale: localeID })}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase",
                        item.status === 'FINAL' ? "bg-green-500" : "bg-amber-500"
                      )}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/5 hover:text-primary">
                          <Link href={`/naskah-dinas/editor/?id=${item.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl font-bold">
                            <DropdownMenuItem className="gap-2 cursor-pointer" asChild>
                               <Link href={`/naskah-dinas/editor/?id=${item.id}`}>
                                 <FileText className="h-4 w-4 text-blue-500" /> Buka Editor
                               </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4" /> Hapus Arsip
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 italic text-sm">
                      Belum ada arsip naskah dinas ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}