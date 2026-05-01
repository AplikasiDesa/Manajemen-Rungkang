"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Archive, FileText, Scale, Loader2, Plus, Search, ExternalLink, Trash2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, orderBy, query } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { GOOGLE_CONFIG } from "@/lib/google-config"

export default function ArsipDokumenPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Form states for SPJ
  const [spjKegiatan, setSpjKegiatan] = useState("")
  const [spjSumber, setSpjSumber] = useState("")
  const [spjBulan, setSpjBulan] = useState("")

  // Form states for Produk Hukum
  const [phNamaDokumen, setPhNamaDokumen] = useState("")
  const [phJenis, setPhJenis] = useState("")
  const [phJenisManual, setPhPhJenisManual] = useState("")
  const [phNomor, setPhNomor] = useState("")

  // Data fetching
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])
  const { data: userData } = useDoc(userDocRef)

  const spjRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "spjDesa"), orderBy("createdAt", "desc"))
  }, [db, user])
  
  const phRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "produkHukum"), orderBy("createdAt", "desc"))
  }, [db, user])

  const { data: spjList, isLoading: isSpjLoading } = useCollection(spjRef)
  const { data: phList, isLoading: isPhLoading } = useCollection(phRef)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ variant: "destructive", title: "Format Salah", description: "Hanya file PDF yang diperbolehkan." })
        return
      }
      setSelectedFile(file)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  const uploadToDrive = async (fileName: string, targetFolderId: string) => {
    if (!selectedFile) return null
    if (!targetFolderId) {
        toast({ variant: "destructive", title: "Folder Belum Diatur", description: "Silakan atur folder penyimpanan di halaman Pengaturan." })
        return null
    }

    const base64 = await fileToBase64(selectedFile)
    const payload = {
      action: 'uploadArchiveFile',
      folderId: targetFolderId,
      fileName,
      fileData: {
        type: selectedFile.type,
        base64: base64
      }
    }

    try {
        const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        const result = await response.json()
        return result.success ? result : null
    } catch (e) {
        return null
    }
  }

  const handleSaveSpj = async () => {
    if (!user || !spjKegiatan || !spjSumber || !spjBulan || !selectedFile) {
      toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Mohon isi semua bidang dan pilih file PDF." })
      return
    }

    const targetFolderId = userData?.spjFolderId;
    if (!targetFolderId) {
        toast({ variant: "destructive", title: "Folder Belum Diatur", description: "ID Folder SPJ belum diisi di Pengaturan." })
        return
    }

    setIsUploading(true)
    try {
      const fileName = `${spjKegiatan} | ${spjSumber} | ${spjBulan}.pdf`
      const driveResult = await uploadToDrive(fileName, targetFolderId)
      
      if (driveResult) {
        const docData = {
          userId: user.uid,
          kegiatan: spjKegiatan,
          sumberAnggaran: spjSumber,
          bulan: spjBulan,
          fileUrl: driveResult.fileUrl,
          driveFileId: driveResult.fileId,
          createdAt: new Date().toISOString()
        }
        const ref = collection(db, "users", user.uid, "spjDesa")
        addDocumentNonBlocking(ref, docData)
        toast({ title: "Berhasil", description: "SPJ Desa telah diarsipkan." })
        setSpjKegiatan(""); setSpjSumber(""); setSpjBulan(""); setSelectedFile(null)
      } else {
        throw new Error("Gagal unggah ke Drive. Cek izin akses folder.")
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: e.message })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSavePh = async () => {
    const finalJenis = phJenis === "Lainnya" ? phJenisManual : phJenis
    if (!user || !phNamaDokumen || !finalJenis || !phNomor || !selectedFile) {
      toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Mohon isi semua bidang dan pilih file PDF." })
      return
    }

    const targetFolderId = userData?.produkHukumFolderId;
    if (!targetFolderId) {
        toast({ variant: "destructive", title: "Folder Belum Diatur", description: "ID Folder Produk Hukum belum diisi di Pengaturan." })
        return
    }

    setIsUploading(true)
    try {
      const fileName = `${phNamaDokumen} | ${finalJenis} No ${phNomor}.pdf`
      const driveResult = await uploadToDrive(fileName, targetFolderId)
      
      if (driveResult) {
        const docData = {
          userId: user.uid,
          namaDokumen: phNamaDokumen,
          jenisDok: finalJenis,
          nomorDok: phNomor,
          fileUrl: driveResult.fileUrl,
          driveFileId: driveResult.fileId,
          createdAt: new Date().toISOString()
        }
        const ref = collection(db, "users", user.uid, "produkHukum")
        addDocumentNonBlocking(ref, docData)
        toast({ title: "Berhasil", description: "Produk Hukum telah diarsipkan." })
        setPhNamaDokumen(""); setPhJenis(""); setPhPhJenisManual(""); setPhNomor(""); setSelectedFile(null)
      } else {
        throw new Error("Gagal unggah ke Drive. Cek izin akses folder.")
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: e.message })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = (id: string, collectionName: "spjDesa" | "produkHukum") => {
    if (!user) return
    const docRef = doc(db, "users", user.uid, collectionName, id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "Dihapus", description: "Dokumen telah dihapus dari arsip." })
  }

  const filteredSpj = (spjList || []).filter(item => item.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredPh = (phList || []).filter(item => 
    (item.namaDokumen || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.nomorDok || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.jenisDok || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Archive className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Arsip Dokumen Desa</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">Manajemen Digital SPJ & Produk Hukum</p>
        </div>
      </header>

      {(!userData?.spjFolderId || !userData?.produkHukumFolderId) && (
        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-xs font-bold text-yellow-800">
                Folder penyimpanan belum diatur. Silakan ke menu <Link href="/settings/" className="underline">Pengaturan</Link> untuk mengisi ID Folder Drive.
            </p>
        </div>
      )}

      <Tabs defaultValue="spj" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1.5 rounded-2xl mb-8">
          <TabsTrigger value="spj" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-white">
            <FileText className="h-4 w-4" />
            SPJ DESA
          </TabsTrigger>
          <TabsTrigger value="ph" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-white">
            <Scale className="h-4 w-4" />
            PRODUK HUKUM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spj" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary/5 p-8">
              <CardTitle className="text-lg font-black uppercase">Input SPJ Desa</CardTitle>
              <CardDescription>Arsipkan dokumen pertanggungjawaban kegiatan desa.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Nama Kegiatan</Label>
                  <Input placeholder="Contoh: Pembangunan JUT" value={spjKegiatan} onChange={(e) => setSpjKegiatan(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Sumber Anggaran</Label>
                  <Select value={spjSumber} onValueChange={setSpjSumber}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Pilih Sumber..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["ADD", "DD", "BHP-BHR", "PPL", "PBP", "PBH", "PAD", "SWD"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Pilih Bulan</Label>
                  <Select value={spjBulan} onValueChange={setSpjBulan}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Pilih Bulan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Upload Dokumen PDF</Label>
                  <Input type="file" accept=".pdf" onChange={handleFileChange} className="h-12 pt-2.5 rounded-xl border-dashed" />
                </div>
              </div>
              <Button 
                className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-primary/20 gap-2" 
                disabled={isUploading || !userData?.spjFolderId} 
                onClick={handleSaveSpj}
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Arsipkan SPJ
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="font-black text-primary uppercase text-sm">Daftar Arsip SPJ</h3>
                <div className="relative w-48 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cari kegiatan..." className="pl-9 h-9 text-xs rounded-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="grid gap-3">
                {isSpjLoading ? (
                    <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" /></div>
                ) : filteredSpj.length > 0 ? (
                    filteredSpj.map((item) => (
                        <div key={item.id} className="p-4 bg-white border rounded-2xl shadow-sm flex items-center justify-between gap-4 group hover:border-primary/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{item.kegiatan}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">{item.sumberAnggaran} • {item.bulan}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2" asChild>
                                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Lihat</span>
                                    </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(item.id, "spjDesa")}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground">Belum ada arsip SPJ.</div>
                )}
             </div>
          </div>
        </TabsContent>

        <TabsContent value="ph" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary/5 p-8">
              <CardTitle className="text-lg font-black uppercase">Input Produk Hukum</CardTitle>
              <CardDescription>Arsipkan SK, Perdes, Perkades, dan dokumen hukum lainnya.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Nama Dokumen</Label>
                  <Input placeholder="Contoh: SK Pengangkatan Perangkat Desa" value={phNamaDokumen} onChange={(e) => setPhNamaDokumen(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Jenis Dokumen</Label>
                  <Select value={phJenis} onValueChange={setPhJenis}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Pilih Jenis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["SK", "Perdes", "Perkades", "BA", "Lainnya"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {phJenis === "Lainnya" && (
                    <div className="space-y-2 animate-in slide-in-from-top-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Nama Dokumen Manual</Label>
                        <Input placeholder="Ketik jenis dokumen..." value={phJenisManual} onChange={(e) => setPhPhJenisManual(e.target.value)} className="h-12 rounded-xl" />
                    </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Nomor Dokumen</Label>
                  <Input placeholder="Contoh: 141/02/2026" value={phNomor} onChange={(e) => setPhNomor(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Upload Dokumen PDF</Label>
                  <Input type="file" accept=".pdf" onChange={handleFileChange} className="h-12 pt-2.5 rounded-xl border-dashed" />
                </div>
              </div>
              <Button 
                className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-primary/20 gap-2" 
                disabled={isUploading || !userData?.produkHukumFolderId} 
                onClick={handleSavePh}
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Arsipkan Produk Hukum
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="font-black text-primary uppercase text-sm">Daftar Arsip Produk Hukum</h3>
                <div className="relative w-48 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cari nama/nomor/jenis..." className="pl-9 h-9 text-xs rounded-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="grid gap-3">
                {isPhLoading ? (
                    <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" /></div>
                ) : filteredPh.length > 0 ? (
                    filteredPh.map((item) => (
                        <div key={item.id} className="p-4 bg-white border rounded-2xl shadow-sm flex items-center justify-between gap-4 group hover:border-primary/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                                    <Scale className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{item.namaDokumen}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">{item.jenisDok} • {item.nomorDok}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2" asChild>
                                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Lihat</span>
                                    </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(item.id, "produkHukum")}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground">Belum ada arsip Produk Hukum.</div>
                )}
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
