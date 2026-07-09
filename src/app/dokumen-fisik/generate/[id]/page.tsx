
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
  FileText,
  Download,
  AlertTriangle,
  RefreshCw,
  Save,
  Users,
  Calendar,
  Briefcase,
  Sparkles,
  Camera,
  CloudUpload,
  Banknote,
  ClipboardList,
  ShoppingCart,
  Plus,
  Trash2,
  Percent,
  MapPin,
  DollarSign,
  Info,
  Store,
  Scale
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function GenerateHubPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
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

  // 2. Fetch Personnel for Dropdowns and Signature
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: officials } = useCollection(personnelRef)

  const sekdesName = useMemo(() => officials?.find(o => o.jabatan?.includes("SEKRETARIS DESA"))?.name || "WASIMAN", [officials]);

  // 3. Form States
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
    tempat_ba: "Balai Desa Cinangsi", perwakilan_bpd: "", tanggal_paktaintegritas_tpk: "",
    nomor_perjanjian_kerja: "", nomor_spk: "", tanggal_spk: "", no_pengumuman_pemenang_bpj: ""
  })

  const [spjData, setSpjData] = useState<any>({
    photoMode: "fisik", // "fisik" | "non-fisik"
    physicalPhotos: { p0: [], p50: [], p100: [] },
    nonPhysicalPhotos: { f1: [], f2: [] },
    nomor_bast: "",
    tanggal_bast: format(new Date(), "yyyy-MM-dd"),
    // Survey Harga
    num_shops: 3,
    nama_toko1: "",
    nama_toko2: "",
    nama_toko3: "",
    nama_toko4: "",
    survey_items: [{ no: 1, nama: "", satuan: "", h1: "", h2: "", h3: "", h4: "", hps: "", ppn: "0", pph: "0" }],
    // BA HPS
    ba_hps_date: format(new Date(), "yyyy-MM-dd"),
    ba_hps_time: "09:00",
    ba_hps_location: "Balai Desa Cinangsi",
    ba_hps_leader_name: "",
    ba_hps_secretary_name: "",
    ba_hps_narsum1_name: "",
    ba_hps_narsum1_inst: "",
    ba_hps_narsum2_name: "",
    ba_hps_narsum2_inst: "",
    selected_shop_hps: ""
  })

  useEffect(() => {
    if (activity) {
      setPbjData((prev: any) => ({ ...prev, ...activity }))
      setSpjData((prev: any) => ({ 
        ...prev, 
        ...activity,
        photoMode: activity.photoMode || "fisik",
        physicalPhotos: activity.physicalPhotos || { p0: [], p50: [], p100: [] },
        nonPhysicalPhotos: activity.nonPhysicalPhotos || { f1: [], f2: [] },
        nomor_bast: activity.nomor_bast || "",
        tanggal_bast: activity.tanggal_bast || format(new Date(), "yyyy-MM-dd"),
        num_shops: activity.num_shops || 3,
        nama_toko1: activity.nama_toko1 || "",
        nama_toko2: activity.nama_toko2 || "",
        nama_toko3: activity.nama_toko3 || "",
        nama_toko4: activity.nama_toko4 || "",
        survey_items: activity.survey_items && activity.survey_items.length > 0 
          ? activity.survey_items 
          : [{ no: 1, nama: "", satuan: "", h1: "", h2: "", h3: "", h4: "", hps: "", ppn: "0", pph: "0" }],
        ba_hps_date: activity.ba_hps_date || format(new Date(), "yyyy-MM-dd"),
        ba_hps_time: activity.ba_hps_time || "09:00",
        ba_hps_location: activity.ba_hps_location || "Balai Desa Cinangsi",
        ba_hps_leader_name: activity.ba_hps_leader_name || "",
        ba_hps_secretary_name: activity.ba_hps_secretary_name || "",
        ba_hps_narsum1_name: activity.ba_hps_narsum1_name || "",
        ba_hps_narsum1_inst: activity.ba_hps_narsum1_inst || "",
        ba_hps_narsum2_name: activity.ba_hps_narsum2_name || "",
        ba_hps_narsum2_inst: activity.ba_hps_narsum2_inst || "",
        selected_shop_hps: activity.selected_shop_hps || ""
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

  const handleClearPhotoHistory = async () => {
    if (!confirm("Hapus seluruh histori foto yang sudah diunggah? Tindakan ini tidak dapat dibatalkan.")) return;
    
    const clearedData = {
      ...spjData,
      physicalPhotos: { p0: [], p50: [], p100: [] },
      nonPhysicalPhotos: { f1: [], f2: [] }
    };
    
    setSpjData(clearedData);
    await handleGenericSave(clearedData, setIsSavingSPJ);
    toast({ title: "Histori Dihapus", description: "Daftar foto telah dikosongkan." });
  }

  const handleGeneratePDF = async (docType: string, label: string) => {
    if (!activity) return
    setIsGenerating(docType)
    try {
      const pdfBlob = await generatePhysicalDocPDF(docType, { 
        ...activity, 
        ...pbjData, 
        ...spjData, 
        nama_sekdes: sekdesName 
      }, villageSettings?.logoBase64)
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
      if (docType === 'pbj_sistem') actualTemplate = 'PBJ SISTEM.docx';

      const response = await fetch('/api/generate-docx/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: { 
            ...activity, 
            ...pbjData, 
            ...spjData, 
            nama_sekdes: sekdesName 
          }, 
          type: actualTemplate 
        }),
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

  const updateSurveyItem = (index: number, field: string, value: string) => {
    const newItems = [...spjData.survey_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setSpjData({ ...spjData, survey_items: newItems });
  }

  const addSurveyRow = () => {
    const newItems = [...spjData.survey_items];
    newItems.push({ no: newItems.length + 1, nama: "", satuan: "", h1: "", h2: "", h3: "", h4: "", hps: "", ppn: "0", pph: "0" });
    setSpjData({ ...spjData, survey_items: newItems });
  }

  const removeSurveyRow = (index: number) => {
    if (spjData.survey_items.length <= 1) return;
    const newItems = spjData.survey_items.filter((_:any, i:number) => i !== index).map((item:any, i:number) => ({ ...item, no: i + 1 }));
    setSpjData({ ...spjData, survey_items: newItems });
  }

  if (isDataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>

  const sections = [
    { id: "spj", label: "SPJ", icon: FileCheck, color: "text-orange-600" },
    { id: "pbj", label: "PBJ", icon: ShieldCheck, color: "text-purple-600" }
  ]

  const shopOptions = [
    { id: "nama_toko1", name: spjData.nama_toko1 },
    { id: "nama_toko2", name: spjData.nama_toko2 },
    { id: "nama_toko3", name: spjData.nama_toko3 },
    { id: "nama_toko4", name: spjData.nama_toko4 }
  ].filter(s => s.name && s.name.trim() !== "").slice(0, spjData.num_shops || 3);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-32 p-4 md:p-8">
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

      {/* RINGKASAN PROYEK DI ATAS SENDIRI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-xl rounded-[2rem] bg-primary text-primary-foreground overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 opacity-80 tracking-[0.15em]">
              <History className="h-4 w-4" /> Informasi Utama Pembangunan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 flex flex-col sm:flex-row justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase opacity-60 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Lokasi Kegiatan</p>
                <p className="text-sm font-bold uppercase leading-tight">{activity?.lokasi}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase opacity-60 flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Total Anggaran</p>
                <p className="text-3xl font-black tracking-tighter">Rp {new Intl.NumberFormat('id-ID').format(pbjData.nominal_cvpemenang || activity?.anggaran || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <Coins className="h-7 w-7 text-white" />
               </div>
               <div className="space-y-0.5">
                  <p className="text-[8px] font-black uppercase opacity-60">Sumber Dana</p>
                  <p className="text-xs font-black uppercase">{activity?.sumber_dana || 'Dana Desa (DD)'}</p>
               </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-2 gap-4">
           <Card className="border-none shadow-lg rounded-[2rem] bg-white flex flex-col items-center justify-center p-6 text-center border-t-4 border-emerald-500">
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Status Proyek</p>
              <p className="text-xs font-black text-slate-900 uppercase mt-1">SIAP DOKUMEN</p>
           </Card>
           <Card className="border-none shadow-lg rounded-[2rem] bg-white flex flex-col items-center justify-center p-6 text-center border-t-4 border-blue-500">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Tahun Anggaran</p>
              <p className="text-lg font-black text-slate-900">{activity?.tahunAnggaran || '2026'}</p>
           </Card>
        </div>
      </div>

      {lastError && (
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-[2.5rem] flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div className="space-y-1">
                <p className="text-sm font-black text-red-900 uppercase">Gagal Memproses Template Word</p>
                <p className="text-xs font-bold text-red-700 leading-relaxed uppercase">{lastError}</p>
            </div>
        </div>
      )}

      <div className="w-full">
            <Tabs defaultValue="spj" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-20 bg-muted/50 p-2 rounded-2xl mb-10 shadow-inner gap-2">
                    {sections.map((s) => (
                        <TabsTrigger key={s.id} value={s.id} className="flex flex-col gap-1 text-[9px] font-black uppercase rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                            <s.icon className="h-4 w-4" /><span>{s.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* TAB 1: SPJ */}
                <TabsContent value="spj" className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-orange-600">
                        <CardHeader className="p-8 bg-orange-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Camera className="h-6 w-6 text-orange-600" /> 1. Cetak Foto Fisik dan Non Fisik</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-10">
                            <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                <Label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Pilih Mode Dokumentasi</Label>
                                <RadioGroup value={spjData.photoMode} onValueChange={v => setSpjData({...spjData, photoMode: v})} className="flex gap-6">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="fisik" id="mode-fisik" />
                                        <Label htmlFor="mode-fisik" className="font-bold text-sm">FOTO FISIK (PROGRES %)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="non-fisik" id="mode-non-fisik" />
                                        <Label htmlFor="mode-non-fisik" className="font-bold text-sm">FOTO NON FISIK (BUKTI KEGIATAN)</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {spjData.photoMode === "fisik" ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
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
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                                  <div className="space-y-4">
                                      <Badge className="bg-primary font-black">DOKUMENTASI FOTO 1</Badge>
                                      <ImageUploader label="Foto Bukti 1" onUploadComplete={(urls) => setSpjData((p:any) => ({ ...p, nonPhysicalPhotos: { ...p.nonPhysicalPhotos, f1: [...p.nonPhysicalPhotos.f1, ...urls] } }))} />
                                  </div>
                                  <div className="space-y-4">
                                      <Badge className="bg-primary font-black">DOKUMENTASI FOTO 2</Badge>
                                      <ImageUploader label="Foto Bukti 2" onUploadComplete={(urls) => setSpjData((p:any) => ({ ...p, nonPhysicalPhotos: { ...p.nonPhysicalPhotos, f2: [...p.nonPhysicalPhotos.f2, ...urls] } }))} />
                                  </div>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                                <Button onClick={() => handleGenericSave(spjData, setIsSavingSPJ)} disabled={isSavingSPJ} className="h-14 flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase shadow-xl gap-3">
                                    {isSavingSPJ ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Data Foto
                                </Button>
                                <Button onClick={() => handleGeneratePDF('spj_foto_fisik', 'Laporan Dokumentasi Foto')} disabled={!!isGenerating} variant="outline" className="h-14 flex-1 rounded-2xl border-orange-200 text-orange-600 font-black uppercase">
                                    {isGenerating === 'spj_foto_fisik' ? <Loader2 className="h-5 w-5" /> : <Printer className="h-5 w-5 mr-2" />} Cetak PDF Dokumentasi
                                </Button>
                                <Button onClick={handleClearPhotoHistory} disabled={isSavingSPJ} variant="ghost" className="h-14 rounded-2xl text-destructive hover:bg-destructive/10 font-black uppercase gap-2">
                                    <Trash2 className="h-5 w-5" /> Hapus Histori Foto
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-orange-600">
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

                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-orange-600">
                        <CardHeader className="p-8 bg-orange-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><ShoppingCart className="h-6 w-6 text-orange-600" /> 3. Form Survey Harga & HPS</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                                <div className="space-y-2 max-w-xs">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Jumlah Toko Survey</Label>
                                    <Select value={spjData.num_shops?.toString() || "3"} onValueChange={v => setSpjData({...spjData, num_shops: parseInt(v)})}>
                                        <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-black">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2" className="font-bold">2 TOKO</SelectItem>
                                            <SelectItem value="3" className="font-bold">3 TOKO</SelectItem>
                                            <SelectItem value="4" className="font-bold">4 TOKO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500">Nama Toko 1</Label>
                                        <Input placeholder="TOKO A" value={spjData.nama_toko1} onChange={e => setSpjData({...spjData, nama_toko1: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500">Nama Toko 2</Label>
                                        <Input placeholder="TOKO B" value={spjData.nama_toko2} onChange={e => setSpjData({...spjData, nama_toko2: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-white" />
                                    </div>
                                    {(spjData.num_shops >= 3) && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                            <Label className="text-[10px] font-black uppercase text-slate-500">Nama Toko 3</Label>
                                            <Input placeholder="TOKO C" value={spjData.nama_toko3} onChange={e => setSpjData({...spjData, nama_toko3: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-white" />
                                        </div>
                                    )}
                                    {(spjData.num_shops >= 4) && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                            <Label className="text-[10px] font-black uppercase text-slate-500">Nama Toko 4</Label>
                                            <Input placeholder="TOKO D" value={spjData.nama_toko4} onChange={e => setSpjData({...spjData, nama_toko4: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-white" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <ScrollArea className="w-full whitespace-nowrap rounded-2xl border bg-white">
                                    <div className="min-w-[1200px]">
                                        <Table>
                                            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                                                <TableRow className="border-slate-100">
                                                    <TableHead className="w-[50px] text-center text-[10px] font-black uppercase">NO</TableHead>
                                                    <TableHead className="w-[300px] text-[10px] font-black uppercase">NAMA JENIS BARANG</TableHead>
                                                    <TableHead className="w-[100px] text-[10px] font-black uppercase">SATUAN</TableHead>
                                                    {[...Array(spjData.num_shops || 3)].map((_, i) => (
                                                        <TableHead key={i} className="w-[140px] text-[10px] font-black uppercase">HRG T{i+1}</TableHead>
                                                    ))}
                                                    <TableHead className="w-[140px] text-[10px] font-black uppercase bg-primary/5 text-primary">HPS</TableHead>
                                                    <TableHead className="w-[90px] text-center text-[10px] font-black uppercase">PPN (%)</TableHead>
                                                    <TableHead className="w-[90px] text-center text-[10px] font-black uppercase">PPH (%)</TableHead>
                                                    <TableHead className="w-[60px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {spjData.survey_items.map((item: any, idx: number) => (
                                                    <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-slate-50">
                                                        <TableCell className="text-center font-bold text-xs text-slate-400">{idx + 1}</TableCell>
                                                        <TableCell><Input className="h-10 text-sm font-bold uppercase w-full bg-slate-50/30" placeholder="Contoh: Semen..." value={item.nama} onChange={e => updateSurveyItem(idx, 'nama', e.target.value)} /></TableCell>
                                                        <TableCell><Input className="h-10 text-xs uppercase w-full" placeholder="SAK/M3" value={item.satuan} onChange={e => updateSurveyItem(idx, 'satuan', e.target.value)} /></TableCell>
                                                        {[...Array(spjData.num_shops || 3)].map((_, i) => (
                                                            <TableCell key={i}>
                                                                <Input 
                                                                    type="number" 
                                                                    className="h-10 text-sm font-mono w-full" 
                                                                    placeholder="0" 
                                                                    value={item[`h${i+1}` as keyof any]} 
                                                                    onChange={e => updateSurveyItem(idx, `h${i+1}`, e.target.value)} 
                                                                />
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="bg-primary/5"><Input type="number" className="h-10 text-sm font-mono font-black text-primary w-full border-primary/20" placeholder="0" value={item.hps} onChange={e => updateSurveyItem(idx, 'hps', e.target.value)} /></TableCell>
                                                        <TableCell><Input type="number" className="h-10 text-sm text-center font-bold w-full" placeholder="0" value={item.ppn} onChange={e => updateSurveyItem(idx, 'ppn', e.target.value)} /></TableCell>
                                                        <TableCell><Input type="number" className="h-10 text-sm text-center font-bold w-full" placeholder="0" value={item.pph} onChange={e => updateSurveyItem(idx, 'pph', e.target.value)} /></TableCell>
                                                        <TableCell><Button variant="ghost" size="icon" className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeSurveyRow(idx)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                                        <Info className="h-3.5 w-3.5 text-primary" /> Geser tabel ke samping untuk isi harga dan pajak
                                    </p>
                                    <Button variant="outline" className="w-full sm:w-auto h-11 border-dashed border-primary/40 text-primary gap-2 font-black uppercase text-[10px] rounded-xl px-10 shadow-sm" onClick={addSurveyRow}>
                                        <Plus className="h-4 w-4" /> Tambah Baris Barang
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t">
                                <Button onClick={() => handleGenericSave(spjData, setIsSavingSPJ)} disabled={isSavingSPJ} className="h-16 rounded-[1.5rem] bg-orange-600 hover:bg-orange-700 text-white font-black uppercase shadow-xl gap-3">
                                    {isSavingSPJ ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Isian
                                </Button>
                                <Button 
                                  onClick={() => handleGeneratePDF('spj_survey_harga', 'Form Survey Harga')} 
                                  disabled={!!isGenerating || !spjData.nama_toko1} 
                                  variant="outline" 
                                  className="h-16 rounded-[1.5rem] border-orange-200 text-orange-600 font-black uppercase gap-2 hover:bg-orange-50"
                                >
                                    {isGenerating === 'spj_survey_harga' ? <Loader2 className="animate-spin h-5 w-5" /> : <Store className="h-5 w-5" />} 
                                    Cetak Survey Toko
                                </Button>
                                <Button 
                                  onClick={() => handleGeneratePDF('spj_hps_kegiatan', 'Daftar HPS')} 
                                  disabled={!!isGenerating || !spjData.nama_toko1} 
                                  variant="outline" 
                                  className="h-16 rounded-[1.5rem] border-primary/20 text-primary font-black uppercase gap-2 hover:bg-primary/5"
                                >
                                    {isGenerating === 'spj_hps_kegiatan' ? <Loader2 className="animate-spin h-5 w-5" /> : <ClipboardList className="h-5 w-5" />} 
                                    Cetak Dokumen HPS
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-orange-600">
                        <CardHeader className="p-8 bg-orange-50/50">
                            <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Scale className="h-6 w-6 text-orange-600" /> 4. BERITA ACARA PENETAPAN HARGA PERKIRAAN SENDIRI (HPS)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-primary ml-1">Pilih Toko Pemakai HPS (Mufakat)</Label>
                                    <Select value={spjData.selected_shop_hps} onValueChange={v => setSpjData({...spjData, selected_shop_hps: v})}>
                                        <SelectTrigger className="h-12 bg-white rounded-xl border-orange-200 font-bold">
                                            <SelectValue placeholder="Pilih Toko..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shopOptions.map(opt => (
                                                <SelectItem key={opt.id} value={opt.name} className="font-bold">{opt.name}</SelectItem>
                                            ))}
                                            {shopOptions.length === 0 && <SelectItem disabled value="none">Isi Nama Toko di Survey Terlebih Dahulu</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Pilih Tanggal BA</Label>
                                    <Input type="date" value={spjData.ba_hps_date} onChange={e => setSpjData({...spjData, ba_hps_date: e.target.value})} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Pilih Waktu</Label>
                                    <Input type="time" value={spjData.ba_hps_time} onChange={e => setSpjData({...spjData, ba_hps_time: e.target.value})} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Isian Tempat</Label>
                                    <Input value={spjData.ba_hps_location} onChange={e => setSpjData({...spjData, ba_hps_location: e.target.value})} className="h-12 rounded-xl" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase text-primary flex items-center gap-2"><Users className="h-4 w-4" /> Pimpinan Rapat</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500">Nama Ketua</Label>
                                        <Input value={spjData.ba_hps_leader_name} onChange={e => setSpjData({...spjData, ba_hps_leader_name: e.target.value.toUpperCase()})} placeholder="PIMPINAN MUSYAWARAH" className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500">Nama Sekretaris</Label>
                                        <Input value={spjData.ba_hps_secretary_name} onChange={e => setSpjData({...spjData, ba_hps_secretary_name: e.target.value.toUpperCase()})} placeholder="NOTULENSI / KASI KAUR" className="h-12 rounded-xl" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase text-primary flex items-center gap-2"><Briefcase className="h-4 w-4" /> Narasumber Kegiatan</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="p-6 border rounded-2xl bg-slate-50/50 space-y-4">
                                        <p className="text-[9px] font-black uppercase text-primary">Narasumber 1</p>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-slate-400">Nama</Label>
                                            <Input value={spjData.ba_hps_narsum1_name} onChange={e => setSpjData({...spjData, ba_hps_narsum1_name: e.target.value.toUpperCase()})} className="h-10 bg-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-slate-400">Instansi</Label>
                                            <Input value={spjData.ba_hps_narsum1_inst} onChange={e => setSpjData({...spjData, ba_hps_narsum1_inst: e.target.value.toUpperCase()})} className="h-10 bg-white" />
                                        </div>
                                    </div>
                                    <div className="p-6 border rounded-2xl bg-slate-50/50 space-y-4">
                                        <p className="text-[9px] font-black uppercase text-primary">Narasumber 2</p>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-slate-400">Nama</Label>
                                            <Input value={spjData.ba_hps_narsum2_name} onChange={e => setSpjData({...spjData, ba_hps_narsum2_name: e.target.value.toUpperCase()})} className="h-10 bg-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-slate-400">Instansi</Label>
                                            <Input value={spjData.ba_hps_narsum2_inst} onChange={e => setSpjData({...spjData, ba_hps_narsum2_inst: e.target.value.toUpperCase()})} className="h-10 bg-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t">
                                <Button onClick={() => handleGenericSave(spjData, setIsSavingSPJ)} disabled={isSavingSPJ} className="h-16 flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase shadow-xl gap-3">
                                    {isSavingSPJ ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Simpan Isian BA HPS
                                </Button>
                                <Button 
                                  onClick={() => handleGeneratePDF('spj_ba_hps', 'Berita Acara Penetapan HPS')} 
                                  disabled={!!isGenerating || !spjData.ba_hps_leader_name} 
                                  variant="outline" 
                                  className="h-16 flex-1 rounded-2xl border-orange-200 text-orange-600 font-black uppercase gap-2 hover:bg-orange-50"
                                >
                                    {isGenerating === 'spj_ba_hps' ? <Loader2 className="animate-spin h-5 w-5" /> : <Printer className="h-5 w-5" />} 
                                    Cetak PDF BA HPS
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: PBJ */}
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
  )
}
