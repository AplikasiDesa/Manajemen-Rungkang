
"use client"

import { useState, useEffect, Suspense, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Layers, 
  Building2,
  ChevronRight,
  Coins,
  Calculator,
  Users,
  UserCheck,
  Briefcase
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BIDANG_NAMES } from "@/lib/apbdes-data"

function EditorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const [isSaving, setIsSaving] = useState(false)
  
  // Data Fetching for Personnel
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: officials } = useCollection(personnelRef)

  const kasiKaurList = useMemo(() => (officials || []).filter(o => 
    o.category === "Pemerintah Desa"
  ), [officials])

  const bpdList = useMemo(() => (officials || []).filter(o => o.category === "BPD"), [officials])

  // Master Form State
  const [formData, setFormData] = useState<any>({
    nama_kegiatan: "",
    nama_bidang: "",
    nama_sub_bidang: "",
    lokasi_kegiatan: "Balai Desa Rungkang",
    lingkup_pekerjaan: "",
    tahun_saat_ini: new Date().getFullYear().toString(),
    waktu_pekerjaan: "",
    sumber_dana: "",
    pagu_anggaran: 0,
    swadaya: 0,
    total_pagu: 0,
    volume: "",
    nama_kades: "SUSANTO",
    nama_kasi: "",
    jabatan_kasi: "",
    nama_bendahara: "",
    nama_ketua_bpd: "",
    // TPK Members
    nama_ketua_tpk: "",
    nama_sekretaris_tpk: "",
    nama_anggota_tpk: "",
  })

  // Auto-calculate Total Pagu
  useEffect(() => {
    const total = (Number(formData.pagu_anggaran) || 0) + (Number(formData.swadaya) || 0);
    if (total !== formData.total_pagu) {
      setFormData((prev: any) => ({ ...prev, total_pagu: total }));
    }
  }, [formData.pagu_anggaran, formData.swadaya, formData.total_pagu]);

  // Auto-fill from personnel profile
  useEffect(() => {
    if (officials && !id) {
      const bendahara = officials.find(o => o.jabatan?.includes("KAUR KEUANGAN"))
      if (bendahara) updateField("nama_bendahara", bendahara.name)
      
      const kades = officials.find(o => o.jabatan?.includes("KEPALA DESA"))
      if (kades) updateField("nama_kades", kades.name)
    }
  }, [officials, id])

  // Fetch Existing Data if Edit Mode
  const activityRef = useMemoFirebase(() => (db && id) ? doc(db, "physical_activities", id) : null, [db, id])
  const { data: initialData, isLoading: isDataLoading } = useDoc(activityRef)

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        pagu_anggaran: initialData.pagu_anggaran || 0,
        swadaya: initialData.swadaya || 0,
        total_pagu: initialData.total_pagu || initialData.anggaran || 0,
      })
    }
  }, [initialData])

  const updateField = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!db || !user) return
    if (!formData.nama_kegiatan) {
        toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Nama Kegiatan wajib diisi." })
        return
    }

    setIsSaving(true)
    const docId = id || doc(collection(db, "physical_activities")).id
    
    const payload = {
        ...formData,
        id: docId,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        createdAt: formData.createdAt || new Date().toISOString(),
        namaKegiatan: formData.nama_kegiatan,
        tahunAnggaran: formData.tahun_saat_ini,
        lokasi: formData.lokasi_kegiatan,
        anggaran: formData.total_pagu, // Sync with common field
    }

    try {
        await setDoc(doc(db, "physical_activities", docId), payload, { merge: true })
        toast({ title: "Master Data Tersimpan", description: "Silakan lengkapi detail teknis di masing-masing TAB dokumen." })
        router.push(`/dokumen-fisik/generate/${docId}/`)
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal Menyimpan" })
    } finally {
        setIsSaving(false)
    }
  }

  const SectionHeader = ({ icon: Icon, title, step }: any) => (
    <div className="flex items-center gap-4 mb-8 border-b pb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-800">{title}</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{step}</p>
        </div>
    </div>
  );

  if (isDataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 p-4 md:p-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dokumen-fisik/"><ArrowLeft className="h-6 w-6" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-black text-primary uppercase tracking-tight">Master Data Proyek</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Informasi Utama Pembangunan Desa</p>
        </div>
      </header>

      {/* STEP 1: DATA KEGIATAN */}
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-10 space-y-10">
           <SectionHeader icon={Layers} title="Data Kegiatan" step="STEP 1" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nama Kegiatan / Proyek</Label>
                <Input placeholder="Pembangunan Jalan Lingkungan..." value={formData.nama_kegiatan} onChange={e => updateField("nama_kegiatan", e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Bidang</Label>
                <Select value={formData.nama_bidang} onValueChange={v => updateField("nama_bidang", v)}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none px-4">
                        <SelectValue placeholder="Pilih Bidang..." />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(BIDANG_NAMES).map(([k, v]) => (
                            <SelectItem key={k} value={v}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sub Bidang</Label>
                <Input placeholder="Ketik Sub Bidang..." value={formData.nama_sub_bidang} onChange={e => updateField("nama_sub_bidang", e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Lokasi Kegiatan</Label>
                <Input placeholder="RT 01 RW 02..." value={formData.lokasi_kegiatan} onChange={e => updateField("lokasi_kegiatan", e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Lingkup Pekerjaan</Label>
                <Input placeholder="Pekerjaan Fisik & Pengadaan..." value={formData.lingkup_pekerjaan} onChange={e => updateField("lingkup_pekerjaan", e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tahun Anggaran</Label>
                <Input placeholder="2026" value={formData.tahun_saat_ini} onChange={e => updateField("tahun_saat_ini", e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Waktu Pekerjaan</Label>
                <Input placeholder="Contoh: 5 (lima) hari" value={formData.waktu_pekerjaan} onChange={e => updateField("waktu_pekerjaan", e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Volume Kegiatan</Label>
                <Input placeholder="Contoh: 150 Meter" value={formData.volume} onChange={e => updateField("volume", e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4" />
              </div>
           </div>

           <div className="mt-10 p-8 bg-slate-50 rounded-[2rem] space-y-8 border-2 border-dashed border-slate-200">
                <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h3 className="text-xs font-black uppercase text-slate-600 tracking-widest">Rincian Anggaran Proyek</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sumber Anggaran</Label>
                        <Select value={formData.sumber_dana} onValueChange={v => updateField("sumber_dana", v)}>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm px-4">
                                <SelectValue placeholder="Pilih Sumber..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Dana Desa (DD)">Dana Desa (DD)</SelectItem>
                                <SelectItem value="Alokasi Dana Desa (ADD)">Alokasi Dana Desa (ADD)</SelectItem>
                                <SelectItem value="Pendapatan Bagi Hasil (PBK)">Pendapatan Bagi Hasil (PBK)</SelectItem>
                                <SelectItem value="Lain-lain Pendapatan Desa">Lain-lain Pendapatan Desa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Pagu Anggaran (Rp)</Label>
                        <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type="number" placeholder="0" value={formData.pagu_anggaran} onChange={e => updateField("pagu_anggaran", e.target.value)} className="h-12 pl-10 rounded-xl bg-white border-none shadow-sm font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Swadaya (Rp)</Label>
                        <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type="number" placeholder="0" value={formData.swadaya} onChange={e => updateField("swadaya", e.target.value)} className="h-12 pl-10 rounded-xl bg-white border-none shadow-sm font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1">Total Pagu Kegiatan (Otomatis)</Label>
                        <div className="relative">
                            <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input readOnly value={formData.total_pagu.toLocaleString('id-ID')} className="h-12 pl-10 rounded-xl bg-primary/10 border-none font-black text-primary text-lg" />
                        </div>
                    </div>
                </div>
           </div>
        </CardContent>
      </Card>

      {/* STEP 2: TIM PELAKSANA KEGIATAN (TPK) */}
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-10 space-y-10">
           <SectionHeader icon={Users} title="Tim Pelaksana Kegiatan (TPK)" step="STEP 2" />
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Ketua TPK</Label>
                <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Nama Ketua TPK..." value={formData.nama_ketua_tpk} onChange={e => updateField("nama_ketua_tpk", e.target.value)} className="h-12 pl-10 bg-slate-50 border-none font-bold rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sekretaris TPK</Label>
                <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Nama Sekretaris TPK..." value={formData.nama_sekretaris_tpk} onChange={e => updateField("nama_sekretaris_tpk", e.target.value)} className="h-12 pl-10 bg-slate-50 border-none font-bold rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Anggota TPK</Label>
                <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Nama Anggota TPK..." value={formData.nama_anggota_tpk} onChange={e => updateField("nama_anggota_tpk", e.target.value)} className="h-12 pl-10 bg-slate-50 border-none font-bold rounded-xl" />
                </div>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* STEP 3: DATA PEMERINTAH DESA */}
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-10 space-y-10">
           <SectionHeader icon={Building2} title="Penanggung Jawab Desa" step="STEP 3" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Kepala Desa</Label>
                <Input value={formData.nama_kades} onChange={e => updateField("nama_kades", e.target.value)} className="h-12 bg-slate-50 border-none font-bold rounded-xl px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nama Kasi/Kaur</Label>
                <Select value={formData.nama_kasi} onValueChange={v => {
                    const selected = kasiKaurList.find(o => o.name === v);
                    updateField("nama_kasi", v);
                    if (selected) updateField("jabatan_kasi", selected.jabatan);
                }}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none px-4">
                        <SelectValue placeholder="Pilih Perangkat..." />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[200px]">
                            {kasiKaurList.map(o => (
                                <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Jabatan Kasi/Kaur</Label>
                <Input value={formData.jabatan_kasi} onChange={e => updateField("jabatan_kasi", e.target.value)} className="h-12 bg-slate-50 border-none font-bold rounded-xl px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nama Bendahara</Label>
                <Input value={formData.nama_bendahara} onChange={e => updateField("nama_bendahara", e.target.value)} className="h-12 bg-slate-50 border-none font-bold rounded-xl px-4" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Perwakilan BPD</Label>
                <Select value={formData.nama_ketua_bpd} onValueChange={v => updateField("nama_ketua_bpd", v)}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none px-4">
                        <SelectValue placeholder="Pilih Anggota BPD..." />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[200px]">
                            {bpdList.map(o => (
                                <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 left-0 right-0 z-40 bg-white/80 backdrop-blur-md p-4 rounded-3xl border shadow-2xl flex justify-center max-w-2xl mx-auto border-primary/20">
        <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-base shadow-xl shadow-primary/20 gap-3 transition-all active:scale-[0.98]">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5" />}
            Lanjutkan ke Dashboard Dokumen
        </Button>
      </div>
    </div>
  )
}

export default function DokumenFisikEditor() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>}>
            <EditorContent />
        </Suspense>
    )
}
