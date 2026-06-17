
"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Loader2, 
  Plus, 
  Trash2, 
  FileText, 
  CheckCircle2,
  RefreshCw,
  Info,
  Clock,
  MapPin,
  Sparkles
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { NASKAH_CONFIG, NaskahType, getNextSequenceNumber, CLASSIFICATION_CODES, saveToBukuAgenda } from "@/lib/naskah-dinas-utils"
import { generateNaskahPDF } from "@/lib/pdf-naskah-dinas"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

function EditorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const [type, setType] = useState<NaskahType>("UND")
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPullingNumber, setIsPullingNumber] = useState(false)
  const [selectedCode, setSelectedCode] = useState("000")
  const [locationType, setLocationType] = useState("balai")

  // Document State
  const [formData, setFormData] = useState<any>({
    title: "",
    nomorSurat: "",
    status: "DRAFT",
    sifat: "Biasa",
    waktu: "09:00",
    tempat: "Balai Desa Rungkang",
    menimbang: [""],
    mengingat: [""],
    keputusan: [""],
    petugas: [{ name: "", jabatan: "" }]
  })

  // Fetch Existing Data if Edit Mode
  const naskahRef = useMemoFirebase(() => (db && id) ? doc(db, "naskah_dinas", id) : null, [db, id])
  const { data: initialData, isLoading: isDataLoading } = useDoc(naskahRef)

  // GLOBAL CONFIG: Fetch from village settings document (for Logo)
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      setType(initialData.type as NaskahType)
      if (initialData.classificationCode) setSelectedCode(initialData.classificationCode)
      if (initialData.tempat === "Balai Desa Rungkang") setLocationType("balai")
      else if (initialData.tempat) setLocationType("manual")
    }
  }, [initialData])

  const handlePullNumber = async () => {
    if (!db) return
    setIsPullingNumber(true)
    try {
      const config = NASKAH_CONFIG[type];
      const nextNum = await getNextSequenceNumber(db, config.kategori, selectedCode)
      setFormData((prev: any) => ({ ...prev, nomorSurat: nextNum, classificationCode: selectedCode }))
      toast({ title: "Nomor Berhasil Ditarik", description: nextNum })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Tarik Nomor" })
    } finally {
      setIsPullingNumber(false)
    }
  }

  const handleSave = async (status: 'DRAFT' | 'FINAL') => {
    if (!db || !user) return
    if (!formData.title) {
        toast({ variant: "destructive", title: "Judul Wajib Diisi" })
        return
    }

    setIsSaving(true)
    const docId = id || doc(collection(db, "naskah_dinas")).id
    const payload = {
        ...formData,
        id: docId,
        type,
        status,
        classificationCode: selectedCode,
        createdBy: user.uid,
        updatedAt: new Date().toISOString(),
        createdAt: formData.createdAt || new Date().toISOString()
    }

    try {
        await setDoc(doc(db, "naskah_dinas", docId), payload, { merge: true })
        
        // SINKRON KE BUKU AGENDA JIKA FINAL
        if (status === 'FINAL') {
          const config = NASKAH_CONFIG[type];
          await saveToBukuAgenda(db, {
            kategori: config.kategori,
            nomor: formData.nomorSurat || "-",
            perihal: formData.title,
            userId: user.uid
          });
        }

        toast({ title: "Tersimpan", description: `Naskah dinas telah disimpan sebagai ${status}.` })
        if (!id) router.replace(`/naskah-dinas/editor/?id=${docId}`)
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal Menyimpan" })
    } finally {
        setIsSaving(false)
    }
  }

  const handlePrint = async () => {
    setIsGenerating(true)
    try {
      const pdfBlob = await generateNaskahPDF(type, formData, villageSettings?.logoBase64)
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, "_blank")
      toast({ title: "Berhasil", description: "PDF siap dicetak." })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Gagal PDF" })
    } finally {
      setIsGenerating(false)
    }
  }

  const updateField = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  const renderFormUndangan = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sifat Surat</Label>
            <Select value={formData.sifat || "Biasa"} onValueChange={val => updateField("sifat", val)}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Pilih Sifat..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Umum">Umum</SelectItem>
                <SelectItem value="Biasa">Biasa</SelectItem>
                <SelectItem value="Rahasia">Rahasia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tujuan Undangan</Label>
              <Textarea 
                placeholder="Contoh: &#10;Bapak Ketua RW 01 &#10;Bapak Ketua RT 01" 
                value={formData.tujuan || ""} 
                onChange={e => updateField("tujuan", e.target.value)} 
                className="min-h-[100px] rounded-xl text-sm leading-relaxed"
              />
          </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Hari / Tanggal</Label>
            <Input type="date" value={formData.tanggal || ""} onChange={e => updateField("tanggal", e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2">
              <Clock className="h-3 w-3" /> Pilih Jam
            </Label>
            <Input type="time" value={formData.waktu || "09:00"} onChange={e => updateField("waktu", e.target.value)} className="h-12 rounded-xl" />
          </div>
       </div>

       <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2">
            <MapPin className="h-3 w-3" /> Lokasi Kegiatan
          </Label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl">
              <Button 
                type="button" 
                variant={locationType === 'balai' ? 'default' : 'ghost'} 
                className="rounded-lg h-10 text-[10px] uppercase font-bold"
                onClick={() => {
                  setLocationType('balai');
                  updateField("tempat", "Balai Desa Rungkang");
                }}
              >
                Balai Desa
              </Button>
              <Button 
                type="button" 
                variant={locationType === 'manual' ? 'default' : 'ghost'} 
                className="rounded-lg h-10 text-[10px] uppercase font-bold"
                onClick={() => setLocationType('manual')}
              >
                Input Manual
              </Button>
          </div>
          {locationType === 'manual' && (
            <Input 
              placeholder="Masukkan lokasi..." 
              value={formData.tempat === "Balai Desa Rungkang" ? "" : formData.tempat} 
              onChange={e => updateField("tempat", e.target.value)} 
              className="h-12 rounded-xl animate-in slide-in-from-top-1"
            />
          )}
       </div>

       <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Acara / Agenda</Label>
          <Textarea placeholder="Membahas persiapan HUT RI ke-81" value={formData.agenda || ""} onChange={e => updateField("agenda", e.target.value)} className="rounded-xl" />
       </div>
       <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Catatan Tambahan (Opsional)</Label>
          <Textarea 
            placeholder="Contoh: Hadir tepat waktu." 
            value={formData.catatan || ""} 
            onChange={e => updateField("catatan", e.target.value)} 
            className="rounded-xl min-h-[80px]"
          />
       </div>
    </div>
  )

  const renderFormSK = () => {
    const addListItem = (field: string) => {
        const current = formData[field] || []
        updateField(field, [...current, ""])
    }
    const updateListItem = (field: string, idx: number, val: string) => {
        const current = [...(formData[field] || [])]
        current[idx] = val
        updateField(field, current)
    }
    const removeListItem = (field: string, idx: number) => {
        const current = (formData[field] || []).filter((_: any, i: number) => i !== idx)
        updateField(field, current)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tentang / Perihal SK</Label>
                <Textarea placeholder="Pembentukan Panitia Pengadaan Barang dan Jasa Desa..." value={formData.tentang || ""} onChange={e => updateField("tentang", e.target.value)} className="rounded-xl" />
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Konsideran (Menimbang)</Label>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase rounded-lg" onClick={() => addListItem("menimbang")}><Plus className="h-3 w-3 mr-1"/> Tambah</Button>
                </div>
                {(formData.menimbang || []).map((item: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                        <Textarea className="min-h-[80px] rounded-xl text-sm" value={item} onChange={e => updateListItem("menimbang", idx, e.target.value)} />
                        <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 shrink-0" onClick={() => removeListItem("menimbang", idx)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Dasar Hukum (Mengingat)</Label>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase rounded-lg" onClick={() => addListItem("mengingat")}><Plus className="h-3 w-3 mr-1"/> Tambah</Button>
                </div>
                {(formData.mengingat || []).map((item: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                        <Textarea className="min-h-[60px] rounded-xl text-sm" value={item} onChange={e => updateListItem("mengingat", idx, e.target.value)} />
                        <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 shrink-0" onClick={() => removeListItem("mengingat", idx)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Diktum Keputusan (Menetapkan)</Label>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase rounded-lg" onClick={() => addListItem("keputusan")}><Plus className="h-3 w-3 mr-1"/> Tambah</Button>
                </div>
                {(formData.keputusan || []).map((item: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <Badge variant="secondary" className="text-[8px] font-black uppercase">DIKTUM KE-{idx + 1}</Badge>
                            <Textarea className="min-h-[100px] rounded-xl text-sm" value={item} onChange={e => updateListItem("keputusan", idx, e.target.value)} />
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 shrink-0 mt-6" onClick={() => removeListItem("keputusan", idx)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                ))}
            </div>
        </div>
    )
  }

  const renderFormBA = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Hari / Tanggal</Label>
                <Input type="date" value={formData.tanggal || ""} onChange={e => updateField("tanggal", e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tempat</Label>
                <Input placeholder="Balai Desa Rungkang" value={formData.tempat || ""} onChange={e => updateField("tempat", e.target.value)} className="h-12 rounded-xl" />
            </div>
        </div>
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Isi Berita Acara (Narasi)</Label>
            <Textarea className="min-h-[200px] rounded-xl text-sm leading-relaxed" placeholder="Bahwa pada hari ini telah dilakukan serah terima..." value={formData.isi || ""} onChange={e => updateField("isi", e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Kesimpulan / Tindak Lanjut</Label>
            <Textarea placeholder="Para pihak sepakat untuk..." value={formData.kesimpulan || ""} onChange={e => updateField("kesimpulan", e.target.value)} className="rounded-xl" />
        </div>
    </div>
  )

  const renderFormST = () => {
    const addPetugas = () => updateField("petugas", [...(formData.petugas || []), { name: "", jabatan: "" }])
    const updatePetugas = (idx: number, f: string, v: string) => {
        const current = [...(formData.petugas || [])]
        current[idx] = { ...current[idx], [f]: v }
        updateField("petugas", current)
    }
    const removePetugas = (idx: number) => updateField("petugas", (formData.petugas || []).filter((_: any, i: number) => i !== idx))

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Dasar Penugasan</Label>
                <Textarea placeholder="Peraturan Desa Nomor 01 Tahun 2026..." value={formData.dasar || ""} onChange={e => updateField("dasar", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Daftar Petugas</Label>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase rounded-lg" onClick={addPetugas}><Plus className="h-3 w-3 mr-1"/> Tambah</Button>
                </div>
                {(formData.petugas || []).map((p: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-xl bg-slate-50 relative group">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePetugas(idx)}><Trash2 className="h-4 w-4"/></Button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-bold uppercase text-slate-400">Nama Lengkap</Label>
                                <Input className="h-10 bg-white rounded-lg font-bold" placeholder="SUDARSONO" value={p.name} onChange={e => updatePetugas(idx, "name", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-bold uppercase text-slate-400">Jabatan</Label>
                                <Input className="h-10 bg-white rounded-lg font-bold" placeholder="Kasi Pemerintahan" value={p.jabatan} onChange={e => updatePetugas(idx, "jabatan", e.target.value)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Maksud / Tujuan Tugas</Label>
                <Textarea placeholder="Menghadiri rapat koordinasi sinkronisasi data kependudukan..." value={formData.tujuanTugas || ""} onChange={e => updateField("tujuanTugas", e.target.value)} className="rounded-xl" />
            </div>
        </div>
    )
  }

  if (isDataLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/naskah-dinas/"><ArrowLeft className="h-6 w-6" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-black text-primary uppercase tracking-tight">Editor Naskah Dinas</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{id ? "Sunting Dokumen" : "Buat Dokumen Baru"}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Judul Dokumen (Arsip Internal)</Label>
                        <Input 
                            placeholder="Contoh: Undangan Rapat RUT RI" 
                            className="h-12 text-lg font-black bg-transparent border-none focus-visible:ring-0 px-0" 
                            value={formData.title || ""} 
                            onChange={e => updateField("title", e.target.value)}
                        />
                    </div>
                    {!id && (
                        <div className="shrink-0 flex gap-1.5 p-1 bg-white rounded-xl border">
                            {(Object.keys(NASKAH_CONFIG) as NaskahType[]).map(t => (
                                <Button 
                                    key={t}
                                    variant={type === t ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setType(t)}
                                    className={cn(
                                        "h-9 px-4 rounded-lg font-black text-[10px] uppercase transition-all",
                                        type === t ? "shadow-md" : "text-slate-400"
                                    )}
                                >
                                    {t}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
               <div className="space-y-6 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Pilih Kode Klasifikasi</Label>
                            <Select value={selectedCode} onValueChange={setSelectedCode}>
                                <SelectTrigger className="h-12 bg-white rounded-xl border-primary/20">
                                    <SelectValue placeholder="Pilih Kode..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-[250px]">
                                        {CLASSIFICATION_CODES.map(c => (
                                            <SelectItem key={c.code} value={c.code} className="text-xs font-bold">
                                                {c.code} - {c.label}
                                            </SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Nomor Surat Resmi</Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="000 / No / 04 / 2026" 
                                    className="h-12 font-mono text-sm font-bold bg-white border-primary/20" 
                                    value={formData.nomorSurat || ""} 
                                    onChange={e => updateField("nomorSurat", e.target.value)}
                                />
                                <Button 
                                    onClick={handlePullNumber} 
                                    disabled={isPullingNumber}
                                    variant="outline" 
                                    className="h-12 rounded-xl bg-white border-primary/20 text-primary font-black uppercase text-[9px] gap-2 shadow-sm shrink-0 px-4"
                                >
                                    {isPullingNumber ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4" />}
                                    Tarik
                                </Button>
                            </div>
                        </div>
                    </div>
               </div>

               <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {type === 'UND' && renderFormUndangan()}
                    {type === 'SK' && renderFormSK()}
                    {type === 'BA' && renderFormBA()}
                    {type === 'ST' && renderFormST()}
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white sticky top-24 overflow-hidden border-t-8 border-primary">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2 tracking-tight">
                        <Info className="h-4 w-4 text-primary" /> Kontrol Dokumen
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button 
                        onClick={() => handleSave('DRAFT')} 
                        disabled={isSaving}
                        variant="outline" 
                        className="w-full h-12 rounded-xl gap-2 font-bold uppercase text-[10px] border-slate-200"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                        Simpan Draft
                    </Button>
                    <Button 
                        onClick={() => handleSave('FINAL')} 
                        disabled={isSaving}
                        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 gap-2 font-black uppercase text-[10px] text-white"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Finalkan Arsip
                    </Button>
                    <div className="h-px bg-slate-100 my-4" />
                    <Button 
                        onClick={handlePrint}
                        disabled={isGenerating}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-3 font-black uppercase tracking-tight text-white transition-all active:scale-95"
                    >
                        {isGenerating ? <Loader2 className="h-6 w-6 animate-spin"/> : <Printer className="h-6 w-6" />}
                        Cetak PDF
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

export default function NaskahDinasEditor() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>}>
            <EditorContent />
        </Suspense>
    )
}
