
"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { doc, setDoc, collection } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Printer, 
  Loader2, 
  Coins, 
  FileCheck, 
  ShieldCheck, 
  Edit,
  History,
  Archive,
  FolderOpen,
  FileText,
  Download,
  AlertTriangle,
  RefreshCw,
  Save,
  Users,
  Calendar,
  Briefcase,
  Sparkles,
  ExternalLink,
  Camera,
  ImagePlus,
  CloudUpload,
  Banknote,
  ClipboardList
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { generatePhysicalDocPDF } from "@/lib/pdf-physical-docs"
import { cn } from "@/lib/utils"
import { getNextSequenceNumber, saveToBukuAgenda } from "@/lib/naskah-dinas-utils"
import { terbilang } from "@/lib/pdf-utils"
import { ImageUploader } from "@/components/ui/image-uploader"
import { callAppsScript } from "@/app/agenda/actions"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function GenerateHubPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [isSavingRPD, setIsSavingRPD] = useState(false)
  const [isSavingPencairan, setIsSavingPencairan] = useState(false)
  const [isSavingPBJ, setIsSavingPBJ] = useState(false)
  const [isSavingSPJ, setIsSavingSPJ] = useState(false)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [isGeneratingDocx, setIsGeneratingDocx] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isFetchingNumber, setIsFetchingNumber] = useState<string | null>(null)
  const [isSavingToAgenda, setIsSavingToAgenda] = useState<string | null>(null)

  // 1. Fetch Main Data
  const activityRef = useMemoFirebase(() => (db && id) ? doc(db, "physical_activities", id) : null, [db, id])
  const { data: activity, isLoading: isDataLoading } = useDoc(activityRef)

  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  // 2. Fetch Personnel for Dropdowns
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: officials } = useCollection(personnelRef)

  // 3. Form States
  const [rpdData, setRpdData] = useState<any>({
    nomor_rpd: "",
    tanggal_rpd: format(new Date(), "yyyy-MM-dd"),
    catatan_rpd: ""
  })

  const [pencairanData, setPencairanData] = useState<any>({
    nomor_pencairan: "",
    tanggal_pencairan: format(new Date(), "yyyy-MM-dd"),
    perihal_pencairan: ""
  })

  const [pbjData, setPbjData] = useState<any>({
    nama_ketua_tpk: "", nama_sekretaris_tpk: "", nama_anggota_tpk: "",
    nomor_und_permintaan_penawaran: "", tanggal_und_permintaan_penawaran: "",
    pengumuman_permintaan_penawaran: "",
    pendaftaran_dan_pengambilan_dokumen_pengadaan_permintaan_penawaran: "",
    pemasukan_dokumen_enawaran_permintaan_penawaran: "", evaluasi_Penawaran_permintaan_penawaran: "",
    Penetapan_Pemenang_permintaan_penawaran: "",
    nama_cv1: "", nama_pemilik_cv1: "", alamat_cv1: "", no_identitas_pemilik_cv1: "", no_telepon_pemilik_cv1: "", email_pemilik_cv1: "",
    no_ijin_usaha_cv1: "", masa_berlaku_usaha_cv1: "2026", instansi_pemberi_ijin_cv1: "Pemerintah Kabupaten Cilacap", npwp_cv1: "",
    lapor_pajak_terakhir_cv1: "", nominal_cv1: 0, nominal_cv1_terbilang: "", no_penawaran_cv1: "", tanggal_penawaran_harga_cv1: "",
    nama_cv2: "", nama_pemilik_cv2: "", alamat_cv2: "", no_identitas_pemilik_cv2: "", no_telepon_pemilik_cv2: "", email_pemilik_cv2: "",
    no_ijin_usaha_cv2: "", masa_berlaku_usaha_cv2: "2026", instansi_pemberi_ijin_cv2: "Pemerintah Kabupaten Cilacap", npwp_cv2: "",
    lapor_pajak_terakhir_cv2: "", nominal_cv2: 0, nominal_cv2_terbilang: "", no_penawaran_cv2: "", tanggal_penawaran_harga_cv2: "",
    pemenang_selection: "none",
    nama_cvpemenang: "", nama_pemilik_cvpemenang: "", alamat_cvpemenang: "", nominal_cvpemenang: 0, nominal_cvpemenang_hanya_terbilang: "",
    no_penawaran_cvpemenang: "", tanggal_penawaran_cvpemenang: "",
    nomor_ba_pembahasan_pengadaan: "", tanggal_ba_pembahasan_pengadaan: "", pukul_ba_pembahasan_pengadaan: "Pukul 09.00 WIB",
    tempat_ba: "Balai Desa Rungkang", perwakilan_bpd: "", tanggal_paktaintegritas_tpk: "",
    nomor_perjanjian_kerja: "", nomor_spk: "", tanggal_spk: "", no_pengumuman_pemenang_bpj: ""
  })

  const [spjData, setSpjData] = useState<any>({
    physicalPhotos: { p0: [], p50: [], p100: [] },
    nomor_bast: "",
    tanggal_bast: format(new Date(), "yyyy-MM-dd")
  })

  useEffect(() => {
    if (activity) {
      setRpdData((prev: any) => ({ ...prev, ...activity }))
      setPencairanData((prev: any) => ({ ...prev, ...activity }))
      setPbjData((prev: any) => ({ ...prev, ...activity }))
      setSpjData((prev: any) => ({ 
        ...prev, 
        physicalPhotos: activity.physicalPhotos || { p0: [], p50: [], p100: [] },
        nomor_bast: activity.nomor_bast || "",
        tanggal_bast: activity.tanggal_bast || format(new Date(), "yyyy-MM-dd")
      }))
    }
  }, [activity])

  const updatePbjField = (key: string, value: any) => {
    setPbjData((prev: any) => {
      const updated = { ...prev, [key]: value };
      const toTitleCase = (str: string) => {
        if (!str) return "";
        return str.toLowerCase().split(' ').filter(word => word !== "").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };
      if (key === 'nominal_cv1') {
        const num = Number(value) || 0;
        const words = terbilang(num);
        updated.nominal_cv1_terbilang = words ? toTitleCase(words + " Rupiah") : "";
      }
      if (key === 'nominal_cv2') {
        const num = Number(value) || 0;
        const words = terbilang(num);
        updated.nominal_cv2_terbilang = words ? toTitleCase(words + " Rupiah") : "";
      }
      if (key === 'pemenang_selection') {
        if (value === 'cv1') {
          updated.nama_cvpemenang = prev.nama_cv1;
          updated.nama_pemilik_cvpemenang = prev.nama_pemilik_cv1;
          updated.alamat_cvpemenang = prev.alamat_cv1;
          updated.nominal_cvpemenang = prev.nominal_cv1;
          const words = terbilang(Number(prev.nominal_cv1));
          updated.nominal_cvpemenang_hanya_terbilang = words ? toTitleCase(words + " Rupiah") : "";
          updated.no_penawaran_cvpemenang = prev.no_penawaran_cv1;
          updated.tanggal_penawaran_cvpemenang = prev.tanggal_penawaran_harga_cv1;
        } else if (value === 'cv2') {
          updated.nama_cvpemenang = prev.nama_cv2;
          updated.nama_pemilik_cvpemenang = prev.nama_pemilik_cv2;
          updated.alamat_cvpemenang = prev.alamat_cv2;
          updated.nominal_cvpemenang = prev.nominal_cv2;
          const words = terbilang(Number(prev.nominal_cv2));
          updated.nominal_cvpemenang_hanya_terbilang = words ? toTitleCase(words + " Rupiah") : "";
          updated.no_penawaran_cvpemenang = prev.no_penawaran_cv2;
          updated.tanggal_penawaran_cvpemenang = prev.tanggal_penawaran_harga_cv2;
        }
      }
      return updated;
    })
  }

  const handlePullNumber = async (field: string, subCode: string) => {
    if (!db || !user) return
    setIsFetchingNumber(field)
    try {
      const year = new Date().getFullYear();
      const rawNumString = await getNextSequenceNumber(db, "surat_keluar", "027");
      const match = rawNumString.match(/\/(\d+)\//) || rawNumString.match(/(\d{3})/);
      const seq = match ? (match[1].length === 3 ? match[1] : match[1].padStart(3, '0')) : "001";
      const finalNum = `027/${seq}/${subCode}/${year}`;
      
      if (field === "nomor_bast") setSpjData((p:any) => ({ ...p, [field]: finalNum }));
      else if (field === "nomor_rpd") setRpdData((p:any) => ({ ...p, [field]: finalNum }));
      else if (field === "nomor_pencairan") setPencairanData((p:any) => ({ ...p, [field]: finalNum }));
      else updatePbjField(field, finalNum);

      toast({ title: "Nomor Ditarik", description: finalNum });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Tarik Nomor" });
    } finally {
      setIsFetchingNumber(null)
    }
  }

  const handleSaveToAgenda = async (field: string, subCode: string) => {
    let value = "";
    if (field === "nomor_bast") value = spjData[field];
    else if (field === "nomor_rpd") value = rpdData[field];
    else if (field === "nomor_pencairan") value = pencairanData[field];
    else value = pbjData[field];

    if (!db || !user || !value) {
      toast({ variant: "destructive", title: "Nomor Kosong" });
      return;
    }
    setIsSavingToAgenda(field);
    try {
      await saveToBukuAgenda(db, {
        kategori: "surat_keluar",
        nomor: value,
        perihal: `${subCode}: ${activity?.namaKegiatan || 'Kegiatan Fisik'}`,
        userId: user.uid
      });
      toast({ title: "Tersimpan ke Agenda", description: value });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan" });
    } finally {
      setIsSavingToAgenda(null);
    }
  }

  const handleGenericSave = async (data: any, setLoading: (b: boolean) => void) => {
    if (!db || !id) return
    setLoading(true)
    try {
      await setDoc(doc(db, "physical_activities", id), {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      toast({ title: "Perubahan Tersimpan" })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Simpan" })
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async (docType: string, label: string) => {
    if (!activity) return
    setIsGenerating(docType)
    try {
      const pdfBlob = await generatePhysicalDocPDF(docType, { ...activity, ...pbjData, ...spjData, ...rpdData, ...pencairanData }, villageSettings?.logoBase64)
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, "_blank")
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal PDF" })
    } finally {
      setIsGenerating(null)
    }
  }

  const handleDownloadDocx = async (docType: string, label: string) => {
    if (!activity) return
    setIsGeneratingDocx(docType)
    setLastError(null)
    try {
      let actualTemplate = docType;
      if (docType === 'rpd_sistem') actualTemplate = '1. RPD Sisiem.docx';
      if (docType === 'pencairan_sistem') actualTemplate = '2. Pencairan Sistem.docx';
      if (docType === 'pbj_sistem') actualTemplate = 'PBJ SISTEM.docx';

      const response = await fetch('/api/generate-docx/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { ...activity, ...pbjData, ...spjData, ...rpdData, ...pencairanData }, type: actualTemplate }),
      });
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Gagal menghubungi server generator.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.body.appendChild(document.createElement('a'));
      link.href = url;
      link.download = `${label.replace(/\s+/g, '_')}.docx`;
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Unduh Berhasil" })
    } catch (e: any) {
      setLastError(e.message);
      toast({ variant: "destructive", title: "Error Generator" })
    } finally {
      setIsGeneratingDocx(null)
    }
  }

  const LabelDocx = ({ label, placeholder, onTarik, isTarikLoading, onSimpan, isSimpanLoading }: any) => (
    <div className="flex items-center justify-between mb-1.5 px-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">{label}</Label>
          {placeholder && <code className="text-[9px] font-bold text-primary/40">{"{{"}{placeholder}{"}}"}</code>}
        </div>
        <div className="flex items-center gap-3">
            {onTarik && (
              <button type="button" onClick={onTarik} disabled={isTarikLoading || isSimpanLoading} className="text-[9px] font-black text-primary uppercase hover:underline flex items-center gap-1 shrink-0">
                {isTarikLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />} Tarik Nomor
              </button>
            )}
            {onSimpan && (
              <button type="button" onClick={onSimpan} disabled={isTarikLoading || isSimpanLoading} className="text-[9px] font-black text-emerald-600 uppercase hover:underline flex items-center gap-1 shrink-0">
                {isSimpanLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />} Simpan
              </button>
            )}
        </div>
    </div>
  );

  if (isDataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>

  const sections = [
    { id: "rpd", label: "RPD", icon: Coins, color: "text-blue-600" },
    { id: "pencairan", label: "Dok Pencairan", icon: Banknote, color: "text-teal-600" },
    { id: "spj", label: "SPJ", icon: FileCheck, color: "text-orange-600" },
    { id: "pbj", label: "PBJ", icon: ShieldCheck, color: "text-purple-600" }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm h-12 w-12">
            <Link href="/dokumen-fisik/"><ArrowLeft className="h-6 w-6 text-primary" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">{activity?.namaKegiatan}</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Otomatisasi Dokumen TA {activity?.tahunAnggaran}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-11 rounded-xl gap-2 font-black uppercase text-[10px] border-primary/20 bg-white">
          <Link href={`/dokumen-fisik/editor/?id=${id}`}><Edit className="h-4 w-4" /> Edit Master Data</Link>
        </Button>
      </header>

      {lastError && (
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-[2.5rem] flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div className="space-y-1">
                <p className="text-sm font-black text-red-900 uppercase">Gagal Memproses Template Word</p>
                <p className="text-xs font-bold text-red-700 leading-relaxed uppercase">{lastError}</p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-primary text-primary-foreground overflow-hidden">
                <CardHeader className="p-8 pb-4"><CardTitle className="text-xs font-black uppercase flex items-center gap-2 opacity-80 tracking-widest"><History className="h-4 w-4" /> Ringkasan Proyek</CardTitle></CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                    <div className="space-y-1"><p className="text-[9px] font-black uppercase opacity-60">Lokasi</p><p className="text-xs font-bold leading-tight uppercase">{activity?.lokasi}</p></div>
                    <div className="space-y-1"><p className="text-[9px] font-black uppercase opacity-60">Anggaran</p><p className="text-2xl font-black tracking-tight">Rp {new Intl.NumberFormat('id-ID').format(pbjData.nominal_cvpemenang || activity?.anggaran || 0)}</p></div>
                </CardContent>
            </Card>
        </aside>

        <div className="lg:col-span-3">
            <Tabs defaultValue="rpd" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-20 bg-muted/50 p-2 rounded-2xl mb-10 shadow-inner gap-2">
                    {sections.map((s) => (
                        <TabsTrigger key={s.id} value={s.id} className="flex flex-col gap-1 text-[9px] font-black uppercase rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                            <s.icon className="h-4 w-4" /><span>{s.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* TAB 1: RPD */}
                <TabsContent value="rpd" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-blue-600">
                        <CardHeader className="p-8 bg-blue-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Coins className="h-6 w-6 text-blue-600" /> Formulir Teknis RPD</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-8 pb-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <LabelDocx label="Nomor RPD" placeholder="nomor_rpd" onTarik={() => handlePullNumber("nomor_rpd", "RPD")} isTarikLoading={isFetchingNumber === "nomor_rpd"} onSimpan={() => handleSaveToAgenda("nomor_rpd", "RPD")} isSimpanLoading={isSavingToAgenda === "nomor_rpd"} />
                                            <Input value={rpdData.nomor_rpd} onChange={e => setRpdData({...rpdData, nomor_rpd: e.target.value})} className="font-mono text-xs" />
                                        </div>
                                        <div className="space-y-2">
                                            <LabelDocx label="Tanggal RPD" placeholder="tanggal_rpd" />
                                            <Input type="date" value={rpdData.tanggal_rpd} onChange={e => setRpdData({...rpdData, tanggal_rpd: e.target.value})} />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <LabelDocx label="Catatan / Keperluan" placeholder="catatan_rpd" />
                                            <Input value={rpdData.catatan_rpd} onChange={e => setRpdData({...rpdData, catatan_rpd: e.target.value})} placeholder="Pencairan Tahap I / 100%..." />
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                            <div className="pt-6 border-t flex flex-col sm:flex-row gap-4">
                                <Button onClick={() => handleGenericSave(rpdData, setIsSavingRPD)} disabled={isSavingRPD} className="h-14 flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase shadow-xl gap-3">
                                    {isSavingRPD ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Isian RPD
                                </Button>
                                <Button onClick={() => handleDownloadDocx('rpd_sistem', 'RPD Sistem')} disabled={!!isGeneratingDocx} variant="outline" className="h-14 flex-1 rounded-2xl border-blue-200 text-blue-600 font-black uppercase gap-2">
                                    {isGeneratingDocx === 'rpd_sistem' ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />} UNDUH DOCX RPD
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: DOK PENCAIRAN */}
                <TabsContent value="pencairan" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-teal-600">
                        <CardHeader className="p-8 bg-teal-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Banknote className="h-6 w-6 text-teal-600" /> Formulir Dokumen Pencairan</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-8 pb-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <LabelDocx label="Nomor Surat Pencairan" placeholder="nomor_pencairan" onTarik={() => handlePullNumber("nomor_pencairan", "CAIR")} isTarikLoading={isFetchingNumber === "nomor_pencairan"} onSimpan={() => handleSaveToAgenda("nomor_pencairan", "CAIR")} isSimpanLoading={isSavingToAgenda === "nomor_pencairan"} />
                                            <Input value={pencairanData.nomor_pencairan} onChange={e => setPencairanData({...pencairanData, nomor_pencairan: e.target.value})} className="font-mono text-xs" />
                                        </div>
                                        <div className="space-y-2">
                                            <LabelDocx label="Tanggal Surat" placeholder="tanggal_pencairan" />
                                            <Input type="date" value={pencairanData.tanggal_pencairan} onChange={e => setPencairanData({...pencairanData, tanggal_pencairan: e.target.value})} />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <LabelDocx label="Perihal Pencairan" placeholder="perihal_pencairan" />
                                            <Input value={pencairanData.perihal_pencairan} onChange={e => setPencairanData({...pencairanData, perihal_pencairan: e.target.value})} placeholder="Permohonan Pencairan Dana Tahap 1..." />
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                            <div className="pt-6 border-t flex flex-col sm:flex-row gap-4">
                                <Button onClick={() => handleGenericSave(pencairanData, setIsSavingPencairan)} disabled={isSavingPencairan} className="h-14 flex-1 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black uppercase shadow-xl gap-3">
                                    {isSavingPencairan ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Isian Pencairan
                                </Button>
                                <Button onClick={() => handleDownloadDocx('pencairan_sistem', 'Pencairan Sistem')} disabled={!!isGeneratingDocx} variant="outline" className="h-14 flex-1 rounded-2xl border-teal-200 text-teal-600 font-black uppercase gap-2">
                                    {isGeneratingDocx === 'pencairan_sistem' ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />} UNDUH DOCX PENCAIRAN
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: SPJ */}
                <TabsContent value="spj" className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="border-none shadow-xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-orange-600">
                        <CardHeader className="p-8 bg-orange-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Camera className="h-6 w-6 text-orange-600" /> 1. Cetak Foto Fisik</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <Badge className="bg-orange-600 font-black">HALAMAN 1 (0%)</Badge>
                                    <ImageUploader label="Foto 0%" onUploadComplete={(urls) => setSpjData((p:any) => ({ ...p, physicalPhotos: { ...p.physicalPhotos, p0: [...p.physicalPhotos.p0, ...urls] } }))} />
                                </div>
                                <div className="space-y-4">
                                    <Badge className="bg-orange-600 font-black">HALAMAN 2 (50%)</Badge>
                                    <ImageUploader label="Foto 50%" onUploadComplete={(urls) => setSpjData((p:any) => ({ ...p, physicalPhotos: { ...p.physicalPhotos, p50: [...p.physicalPhotos.p50, ...urls] } }))} />
                                </div>
                                <div className="space-y-4">
                                    <Badge className="bg-orange-600 font-black">HALAMAN 3 (100%)</Badge>
                                    <ImageUploader label="Foto 100%" onUploadComplete={(urls) => setSpjData((p:any) => ({ ...p, physicalPhotos: { ...p.physicalPhotos, p100: [...p.physicalPhotos.p100, ...urls] } }))} />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6 border-t">
                                <Button onClick={() => handleGenericSave(spjData, setIsSavingSPJ)} disabled={isSavingSPJ} className="h-14 flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase shadow-xl gap-3">
                                    {isSavingSPJ ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Foto
                                </Button>
                                <Button onClick={() => handleGeneratePDF('spj_foto_fisik', 'Foto Fisik')} disabled={!!isGenerating} variant="outline" className="h-14 flex-1 rounded-2xl border-orange-200 text-orange-600 font-black uppercase">
                                    {isGenerating === 'spj_foto_fisik' ? <Loader2 className="animate-spin h-5 w-5" /> : <Printer className="h-5 w-5 mr-2" />} Cetak PDF Progres
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-orange-600">
                        <CardHeader className="p-8 bg-orange-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><FileCheck className="h-6 w-6 text-orange-600" /> 2. Berita Acara Serah Terima (BAST)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <LabelDocx label="Nomor BAST" onTarik={() => handlePullNumber("nomor_bast", "BAST")} isTarikLoading={isFetchingNumber === "nomor_bast"} onSimpan={() => handleSaveToAgenda("nomor_bast", "BAST")} isSimpanLoading={isSavingToAgenda === "nomor_bast"} />
                                  <Input value={spjData.nomor_bast} onChange={e => setSpjData({...spjData, nomor_bast: e.target.value})} className="h-12 font-mono text-sm" placeholder="Otomatis Tarik Nomor..." />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Pilih Tanggal BAST</Label>
                                  <Input type="date" value={spjData.tanggal_bast} onChange={e => setSpjData({...spjData, tanggal_bast: e.target.value})} className="h-12" />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4 border-t">
                                <Button onClick={() => handleGenericSave(spjData, setIsSavingSPJ)} disabled={isSavingSPJ} className="h-14 flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase shadow-xl gap-3">
                                    {isSavingSPJ ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Data BAST
                                </Button>
                                <Button 
                                  onClick={() => handleGeneratePDF('spj_bast_full', 'BAST 100%')} 
                                  disabled={!!isGenerating || !spjData.nomor_bast} 
                                  variant="outline" 
                                  className="h-14 flex-1 rounded-2xl border-orange-200 text-orange-600 font-black uppercase gap-2"
                                >
                                    {isGenerating === 'spj_bast_full' ? <Loader2 className="animate-spin h-5 w-5" /> : <Download className="h-5 w-5" />} 
                                    Unduh BAST (PDF)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: PBJ */}
                <TabsContent value="pbj" className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-purple-600">
                        <CardHeader className="p-8 bg-purple-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-purple-600" /> Formulir Teknis PBJ</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                          <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-12 pb-10">
                              <div className="space-y-6">
                                  <h3 className="text-xs font-black uppercase text-purple-600 flex items-center gap-2"><Users className="h-4 w-4" /> 1. TIM TPK</h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                      <div className="space-y-2"><LabelDocx label="Ketua" placeholder="nama_ketua_tpk" /><Input value={pbjData.nama_ketua_tpk} onChange={e => updatePbjField("nama_ketua_tpk", e.target.value)} /></div>
                                      <div className="space-y-2"><LabelDocx label="Sekretaris" placeholder="nama_sekretaris_tpk" /><Input value={pbjData.nama_sekretaris_tpk} onChange={e => updatePbjField("nama_sekretaris_tpk", e.target.value)} /></div>
                                      <div className="space-y-2"><LabelDocx label="Anggota" placeholder="nama_anggota_tpk" /><Input value={pbjData.nama_anggota_tpk} onChange={e => updatePbjField("nama_anggota_tpk", e.target.value)} /></div>
                                  </div>
                              </div>
                              <div className="space-y-6">
                                  <h3 className="text-xs font-black uppercase text-purple-600 flex items-center gap-2"><FileText className="h-4 w-4" /> 2. PENOMORAN & TANGGAL UNDANGAN</h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                      <div className="space-y-2"><LabelDocx label="No. Undangan PP" onTarik={() => handlePullNumber("nomor_und_permintaan_penawaran", "UND-PP")} isTarikLoading={isFetchingNumber === "nomor_und_permintaan_penawaran"} onSimpan={() => handleSaveToAgenda("nomor_und_permintaan_penawaran", "UND-PP")} isSimpanLoading={isSavingToAgenda === "nomor_und_permintaan_penawaran"} /><Input value={pbjData.nomor_und_permintaan_penawaran} onChange={e => updatePbjField("nomor_und_permintaan_penawaran", e.target.value)} className="font-mono text-xs" /></div>
                                      <div className="space-y-2"><LabelDocx label="Tgl Undangan" placeholder="tanggal_und_permintaan_penawaran" /><Input type="date" value={pbjData.tanggal_und_permintaan_penawaran} onChange={e => updatePbjField("tanggal_und_permintaan_penawaran", e.target.value)} /></div>
                                  </div>
                              </div>
                              <div className="space-y-6">
                                  <h3 className="text-xs font-black uppercase text-purple-600 flex items-center gap-2"><Briefcase className="h-4 w-4" /> 3. DATA SUPLIYER 1</h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 border rounded-2xl bg-slate-50/30">
                                      <div className="space-y-2"><LabelDocx label="Nama CV/Toko" placeholder="nama_cv1" /><Input value={pbjData.nama_cv1} onChange={e => updatePbjField("nama_cv1", e.target.value)} /></div>
                                      <div className="space-y-2"><LabelDocx label="Nama Pemilik" placeholder="nama_pemilik_cv1" /><Input value={pbjData.nama_pemilik_cv1} onChange={e => updatePbjField("nama_pemilik_cv1", e.target.value)} /></div>
                                      <div className="space-y-2"><LabelDocx label="Nominal Penawaran" placeholder="nominal_cv1" /><Input type="number" value={pbjData.nominal_cv1} onChange={e => updatePbjField("nominal_cv1", e.target.value)} /></div>
                                  </div>
                              </div>
                              <div className="space-y-6">
                                  <h3 className="text-xs font-black uppercase text-purple-600 flex items-center gap-2"><Briefcase className="h-4 w-4" /> 4. DATA SUPLIYER 2</h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 border rounded-2xl bg-slate-50/30">
                                      <div className="space-y-2"><LabelDocx label="Nama CV/Toko" placeholder="nama_cv2" /><Input value={pbjData.nama_cv2} onChange={e => updatePbjField("nama_cv2", e.target.value)} /></div>
                                      <div className="space-y-2"><LabelDocx label="Nama Pemilik" placeholder="nama_pemilik_cv2" /><Input value={pbjData.nama_pemilik_cv2} onChange={e => updatePbjField("nama_pemilik_cv2", e.target.value)} /></div>
                                      <div className="space-y-2"><LabelDocx label="Nominal Penawaran" placeholder="nominal_cv2" /><Input type="number" value={pbjData.nominal_cv2} onChange={e => updatePbjField("nominal_cv2", e.target.value)} /></div>
                                  </div>
                              </div>
                              <div className="space-y-6">
                                  <h3 className="text-xs font-black uppercase text-purple-600 flex items-center gap-2"><Sparkles className="h-4 w-4" /> 5. PENETAPAN PEMENANG</h3>
                                  <div className="p-6 bg-purple-50 rounded-2xl space-y-4">
                                      <Label className="text-[10px] font-black uppercase text-purple-700">Pilih Supplier Pemenang</Label>
                                      <Select value={pbjData.pemenang_selection} onValueChange={v => updatePbjField("pemenang_selection", v)}>
                                          <SelectTrigger className="h-12 bg-white border-purple-200">
                                              <SelectValue placeholder="Pilih Pemenang..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="none">Belum Dipilih</SelectItem>
                                              <SelectItem value="cv1">{pbjData.nama_cv1 || "Supplier 1"}</SelectItem>
                                              <SelectItem value="cv2">{pbjData.nama_cv2 || "Supplier 2"}</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                            </div>
                          </ScrollArea>
                          <div className="pt-6 border-t flex flex-col sm:flex-row gap-4">
                              <Button onClick={() => handleGenericSave(pbjData, setIsSavingPBJ)} disabled={isSavingPBJ} className="h-14 flex-1 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase shadow-xl gap-3">
                                  {isSavingPBJ ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Isian PBJ
                              </Button>
                              <Button onClick={() => handleDownloadDocx('pbj_sistem', 'PBJ Sistem Lengkap')} disabled={!!isGeneratingDocx} variant="outline" className="h-14 flex-1 rounded-2xl border-purple-200 text-purple-600 font-black uppercase gap-2">
                                  {isGeneratingDocx === 'pbj_sistem' ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />} UNDUH DOCX PBJ
                              </Button>
                          </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  )
}
