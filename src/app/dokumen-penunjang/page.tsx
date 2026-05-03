
"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Printer, 
  ArrowLeft, 
  Users, 
  UserCheck, 
  Wallet, 
  Briefcase,
  Calendar,
  Loader2,
  ChevronRight,
  Database,
  Type,
  UserPlus,
  Percent,
  Coins,
  Clock,
  Banknote,
  ShieldCheck,
  Info
} from "lucide-react"
import Link from "next/link"
import { useState, Suspense, useMemo, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { APB_DATA, BIDANG_NAMES } from "@/lib/apbdes-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, query, orderBy } from "firebase/firestore"
import { generateDaftarHadirPDF, generateUangSakuPDF } from "@/lib/pdf-utils-v2"
import { generateHonorNarasumberPDF, generateInsentifPDF, generateSiltapPDF } from "@/lib/pdf-utils"
import { SILTAP_DATA, BPD_INSENTIF_DATA } from "@/lib/personel-data"

function DokumenContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type")
  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Firestore Data fetching
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])
  const { data: userData } = useDoc(userDocRef)

  const personnelQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "personnel"), orderBy("name", "asc"))
  }, [db, user])
  const { data: officialsData } = useCollection(personnelQuery)

  const [useApbdes, setUseApbdes] = useState(true)
  const [bidang, setBidang] = useState("")
  const [sumber, setSumber] = useState("")
  const [kegiatan, setKegiatan] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [date, setDate] = useState("")
  const [location, setLocation] = useState("Balai Desa Rungkang")
  const [time, setTime] = useState("09:00 WIB")
  
  const [jumlahOrang, setJumlahOrang] = useState<number>(15)
  const [participantSelections, setParticipantSelections] = useState(Array(6).fill("none"));

  const [uangSakuNominal, setUangSakuNominal] = useState("100000")
  const [uangSakuTax, setUangSakuTax] = useState("5")

  const [numNarsum, setNumNarsum] = useState<number>(1)
  const [narsumData, setNarsumData] = useState(
    Array(4).fill(null).map(() => ({ name: "", position: "", nominal: "", tax: "0" }))
  )

  const [insentifCat, setInsentifCat] = useState("RT/RW")
  const [insentifMonth, setInsentifMonth] = useState("Januari")
  const [insentifNominal, setInsentifNominal] = useState("0")
  const [insentifTax, setInsentifTax] = useState("0")

  const [siltapSubType, setSiltapSubType] = useState<"perangkat" | "bpd">("perangkat")

  useEffect(() => {
    setMounted(true)
    setDate(new Date().toISOString().split('T')[0])
  }, [])

  const handleParticipantSelectionChange = (index: number, value: string) => {
    const newSelections = [...participantSelections];
    newSelections[index] = value;
    setParticipantSelections(newSelections);
  };

  const participantCategories = useMemo(() => {
    if (!officialsData) return [];
    return Array.from(new Set(officialsData.map(o => o.category).filter(Boolean)));
  }, [officialsData]);

  const filteredSources = useMemo(() => {
    if (!bidang) return []
    const sources = APB_DATA.filter(item => item.bidang.toString() === bidang).map(item => item.sumber)
    return Array.from(new Set(sources))
  }, [bidang])

  const filteredActivities = useMemo(() => {
    if (!bidang || !sumber) return []
    return APB_DATA.filter(item => item.bidang.toString() === bidang && item.sumber === sumber)
  }, [bidang, sumber])

  useEffect(() => {
    if (useApbdes && kegiatan && (type === "daftar-hadir" || type === "uang-saku")) {
      const selected = APB_DATA.find(a => a.uraian === kegiatan)
      if (selected && selected.volume !== "-") {
        const vol = parseInt(selected.volume.replace(/[^\d]/g, ''))
        if (!isNaN(vol)) setJumlahOrang(vol)
      }
    }
  }, [kegiatan, useApbdes, type])

  const configs: Record<string, { title: string; desc: string; icon: any; color: string; bgColor: string }> = {
    "daftar-hadir": { 
      title: "Daftar Hadir", 
      desc: "Cetak berkas absensi rapat", 
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/5"
    },
    "uang-saku": { 
      title: "Uang Saku Peserta", 
      desc: "Cetak tanda terima uang saku", 
      icon: Banknote,
      color: "text-teal-600",
      bgColor: "bg-teal-50"
    },
    "honor-narasumber": { 
      title: "Honor Narasumber", 
      desc: "Cetak bukti honorarium", 
      icon: Briefcase,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    "siltap": { 
      title: "Siltap & Insentif BPD", 
      desc: "Cetak Siltap Desa & BPD", 
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    "insentif": { 
      title: "Cetak Insentif", 
      desc: "Cetak insentif RT/RW/Kader", 
      icon: Wallet,
      color: "text-purple-600",
      bgColor: "bg-purple-50/50"
    }
  }

  const current = type ? (configs[type] || null) : null

  const handlePrint = async () => {
    if (!officialsData) {
        toast({ variant: "destructive", title: "Data Belum Siap", description: "Menunggu sinkronisasi database..." });
        return;
    }

    setIsGenerating(true)
    try {
      const finalTitle = useApbdes ? kegiatan : manualTitle
      
      let pdfBlob;

      if (type === "daftar-hadir" || type === "uang-saku") {
        if (!finalTitle) throw new Error("Nama kegiatan harus diisi")
        const quota = jumlahOrang || 1;
        const selectedCats = participantSelections.filter(cat => cat && cat !== "none");
        let allParticipants: any[] = [];
        
        selectedCats.forEach(cat => {
            const members = officialsData.filter(o => o.category === cat);
            allParticipants.push(...members);
        });

        const uniqueParticipants = Array.from(new Map(allParticipants.map(item => [item.name, item])).values());
        const finalParticipants = Array.from({ length: quota }, (_, i) => 
            uniqueParticipants[i] || { name: "", jabatan: "", category: "" }
        );

        const pdfData = { 
            kegiatan: finalTitle, 
            tanggal: date, 
            participants: finalParticipants.map(p => ({ name: p.name, jabatan: p.jabatan || "", category: p.category || "" })), 
            nominal: uangSakuNominal, 
            tax: uangSakuTax 
        };
        
        if (type === "daftar-hadir") {
          pdfBlob = await generateDaftarHadirPDF(pdfData, userData?.logoBase64);
        } else {
          pdfBlob = await generateUangSakuPDF(pdfData, userData?.logoBase64);
        }
      } 
      else if (type === "honor-narasumber") {
        if (!finalTitle) throw new Error("Nama kegiatan harus diisi")
        const activeNarsum = narsumData.slice(0, numNarsum)
        pdfBlob = await generateHonorNarasumberPDF({ title: finalTitle, date, location, time, narsum: activeNarsum }, userData?.logoBase64)
      }
      else if (type === "insentif") {
        let insentifParticipants: { name: string; position: string }[] = []
        const categoryMap = {
            "RT/RW": "RT/RW",
            "KADER POSYANDU": "Kader",
            "GURU PAUD": "Guru TK & Paud",
            "KADER KPM": "KPM",
        };
        const selectedCategory = (categoryMap as any)[insentifCat];
        if(selectedCategory) {
            insentifParticipants = officialsData.filter(o => o.category === selectedCategory).map(o => ({ name: o.name, position: o.jabatan }))
        }

        pdfBlob = await generateInsentifPDF({ 
          category: insentifCat, 
          month: insentifMonth, 
          date: date, 
          nominal: insentifNominal, 
          tax: insentifTax, 
          participants: insentifParticipants, 
          jumlahOrang: insentifParticipants.length 
        }, userData?.logoBase64)
      }
      else if (type === "siltap") {
        pdfBlob = await generateSiltapPDF({ month: insentifMonth, date, title: siltapSubType === "perangkat" ? "TANDA TERIMA SILTAP" : "TANDA TERIMA INSENTIF BPD", data: siltapSubType === "perangkat" ? SILTAP_DATA : BPD_INSENTIF_DATA }, userData?.logoBase64)
      }

      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob)
        window.open(url, "_blank")
        toast({ title: "PDF Berhasil", description: "Dokumen siap dicetak." })
      } else {
        throw new Error("Gagal menghasilkan PDF.")
      }

    } catch (e: any) {
      console.error(e)
      toast({ variant: "destructive", title: "Gagal Cetak", description: e.message || "Terjadi kesalahan sistem." })
    } finally {
      setIsGenerating(false)
    }
  }

  const updateNarsumData = (index: number, field: string, value: string) => {
    const newData = [...narsumData]
    newData[index] = { ...newData[index], [field]: value }
    setNarsumData(newData)
  }

  if (!mounted) return null

  if (!current) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-10 max-w-5xl mx-auto">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-tight">Pusat Dokumen</h1>
          <p className="text-muted-foreground font-medium">Pilih jenis berkas administrasi yang ingin Anda cetak.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {Object.entries(configs).map(([key, item]) => (
            <Link key={key} href={`/dokumen-penunjang/?type=${key}`}>
              <Card className="border shadow-sm hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group active:scale-95 h-full flex flex-col">
                <CardHeader className={cn("p-6 rounded-t-xl", item.bgColor)}>
                  <item.icon className={cn("h-12 w-12 mb-2 transition-transform group-hover:scale-110", item.color)} />
                  <CardTitle className="text-lg font-bold uppercase leading-tight">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
                  <div className="flex items-center text-[10px] font-black uppercase text-primary tracking-widest group-hover:gap-2 transition-all">
                    Pilih Berkas <ChevronRight className="h-3 w-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full h-12 w-12 hover:bg-muted">
          <Link href="/dokumen-penunjang/">
            <ArrowLeft className="h-6 w-6 text-primary" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Formulir Cetak</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">{current.title}</p>
        </div>
      </header>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden mb-20">
        <CardHeader className={cn("p-8", current.bgColor)}>
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <current.icon className={cn("h-8 w-8", current.color)} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold uppercase leading-none mb-1">{current.title}</CardTitle>
              <CardDescription className="text-xs font-medium opacity-70">{current.desc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          
          {type === "insentif" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pilih Kelompok Penerima</Label>
                <div className="grid grid-cols-2 gap-4">
                  {["RT/RW", "KADER POSYANDU", "GURU PAUD", "KADER KPM"].map((cat) => (
                    <Button 
                      key={cat}
                      type="button"
                      onClick={() => setInsentifCat(cat)}
                      className={cn(
                        "h-14 rounded-2xl font-black text-[10px] uppercase transition-all border-2",
                        insentifCat === cat 
                          ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200" 
                          : "bg-white border-muted text-purple-900 hover:bg-purple-50 hover:border-purple-200"
                      )}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Insentif Bulan</Label>
                  <Select value={insentifMonth} onValueChange={setInsentifMonth}>
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none px-5 text-base font-bold">
                      <SelectValue placeholder="Pilih Bulan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                        <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tgl Penyaluran</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600/50" />
                    <Input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-none font-bold text-base" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-purple-50/50 rounded-[2.5rem] border border-purple-100 shadow-inner grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Nominal Insentif (RP)</Label>
                  <div className="relative">
                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600" />
                    <Input 
                      type="number"
                      placeholder="0" 
                      value={insentifNominal}
                      onChange={(e) => setInsentifNominal(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-white border-none font-black text-purple-900 text-lg shadow-sm" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Pot Pajak (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600" />
                    <Input 
                      type="number"
                      placeholder="0" 
                      value={insentifTax}
                      onChange={(e) => setInsentifTax(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-white border-none font-black text-purple-900 text-lg shadow-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === "siltap" && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pilih Jenis Pembayaran</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button 
                            type="button"
                            onClick={() => setSiltapSubType("perangkat")}
                            className={cn(
                                "h-16 rounded-2xl font-black text-xs uppercase gap-3 transition-all",
                                siltapSubType === "perangkat" ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" : "bg-muted/30 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 border-2 border-transparent"
                            )}
                        >
                            <Users className="h-5 w-5" /> SILTAP PERANGKAT
                        </Button>
                        <Button 
                            type="button"
                            onClick={() => setSiltapSubType("bpd")}
                            className={cn(
                                "h-16 rounded-2xl font-black text-xs uppercase gap-3 transition-all",
                                siltapSubType === "bpd" ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" : "bg-muted/30 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 border-2 border-transparent"
                            )}
                        >
                            <ShieldCheck className="h-5 w-5" /> INSENTIF BPD
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pilih Bulan / Tunjangan</Label>
                        <Select value={insentifMonth} onValueChange={setInsentifMonth}>
                            <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none px-5 text-base font-bold">
                                <SelectValue placeholder="Pilih Bulan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                                    <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tgl Cetak</Label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-14 pl-12 rounded-2xl bg-muted/20 border-none font-bold text-base" 
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Info className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-[11px] font-bold text-emerald-800 leading-relaxed italic mt-1">
                        * Data nominal Siltap menggunakan data baku pemerintah desa Rungkang. Pastikan periode yang dipilih sudah sesuai.
                    </p>
                </div>
             </div>
          )}

          {(type !== "siltap" && type !== "insentif") && (
            <div className="space-y-8">
              <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                <Button 
                  variant={useApbdes ? "default" : "ghost"} 
                  className={cn("flex-1 text-[10px] uppercase font-black gap-2 h-10", useApbdes && "shadow-md")}
                  onClick={() => setUseApbdes(true)}
                >
                  <Database className="h-3 w-3" /> APBDes
                </Button>
                <Button 
                  variant={!useApbdes ? "default" : "ghost"} 
                  className={cn("flex-1 text-[10px] uppercase font-black gap-2 h-10", !useApbdes && "shadow-md")}
                  onClick={() => setUseApbdes(false)}
                >
                  <Type className="h-3 w-3" /> Manual
                </Button>
              </div>

              <div className="grid gap-5">
                {useApbdes ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pilih Bidang</Label>
                      <Select onValueChange={(val) => { setBidang(val); setSumber(""); setKegiatan(""); }}>
                        <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none px-5">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(BIDANG_NAMES).map(([id, name]) => (
                            <SelectItem key={id} value={id}>Bidang {id} - {name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sumber Dana</Label>
                      <Select disabled={!bidang} onValueChange={(val) => { setSumber(val); setKegiatan(""); }}>
                        <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none px-5">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSources.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pilih Kegiatan</Label>
                      <Select disabled={!sumber} onValueChange={setKegiatan}>
                        <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none px-5">
                          <SelectValue placeholder="Pilih Uraian..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredActivities.map(item => (
                            <SelectItem key={item.kode} value={item.uraian}>{item.uraian}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nama Kegiatan</Label>
                    <Input 
                      placeholder="Ketik perihal kegiatan..." 
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="h-14 rounded-2xl bg-muted/20 border-none px-5 text-base font-medium" 
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tanggal</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/20 border-none font-medium" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Waktu</Label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="09:00 WIB" 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/20 border-none font-medium" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Lokasi</Label>
                  <Input 
                    placeholder="Lokasi kegiatan..." 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-12 rounded-xl bg-muted/20 border-none px-5 font-medium" 
                  />
                </div>
              </div>
            </div>
          )}

          {type === "honor-narasumber" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Jumlah Narasumber</Label>
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((n) => (
                            <Button
                                key={n}
                                type="button"
                                variant={numNarsum === n ? "default" : "outline"}
                                onClick={() => setNumNarsum(n)}
                                className={cn(
                                    "h-14 rounded-2xl font-black text-sm transition-all",
                                    numNarsum === n ? "bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200" : "border-amber-200 hover:bg-amber-50 text-amber-900"
                                )}
                            >
                                {n} Orang
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {Array.from({ length: numNarsum }).map((_, i) => (
                        <div key={i} className="p-6 rounded-[2rem] border border-amber-100 bg-amber-50/30 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-600 opacity-20" />
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black uppercase text-amber-800 tracking-[0.2em]">Narasumber {i + 1}</h3>
                                <Briefcase className="h-4 w-4 text-amber-600 opacity-40" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Nama Lengkap</Label>
                                    <Input 
                                        placeholder="Ketik nama..." 
                                        value={narsumData[i].name}
                                        onChange={(e) => updateNarsumData(i, "name", e.target.value)}
                                        className="h-12 rounded-xl bg-white border-amber-100 focus:border-amber-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Jabatan</Label>
                                    <Input 
                                        placeholder="Jabatan/Instansi..." 
                                        value={narsumData[i].position}
                                        onChange={(e) => updateNarsumData(i, "position", e.target.value)}
                                        className="h-12 rounded-xl bg-white border-amber-100 focus:border-amber-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Nominal Honor (Rp)</Label>
                                    <div className="relative">
                                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600 opacity-50" />
                                        <Input 
                                            type="number"
                                            placeholder="0" 
                                            value={narsumData[i].nominal}
                                            onChange={(e) => updateNarsumData(i, "nominal", e.target.value)}
                                            className="h-12 pl-10 rounded-xl bg-white border-amber-100 focus:border-amber-400 font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Pajak (%)</Label>
                                    <div className="relative">
                                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600 opacity-50" />
                                        <Input 
                                            type="number"
                                            placeholder="0" 
                                            value={narsumData[i].tax}
                                            onChange={(e) => updateNarsumData(i, "tax", e.target.value)}
                                            className="h-12 pl-10 rounded-xl bg-white border-amber-100 focus:border-amber-400 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {(type === "daftar-hadir" || type === "uang-saku") && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Kuota Peserta (Master Baris Tabel)</Label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    type="number"
                    value={jumlahOrang}
                    onChange={(e) => setJumlahOrang(parseInt(e.target.value) || 0)}
                    className="h-12 pl-12 rounded-xl bg-primary/5 border-primary/10 font-black text-primary"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground font-bold italic">* Tabel PDF akan dibuat dengan tepat {jumlahOrang} nomor baris sesuai kuota.</p>
              </div>

              {type === "uang-saku" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-teal-50 rounded-3xl border border-teal-100 shadow-inner">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-teal-900 tracking-widest">Nominal Uang Saku (Rp)</Label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600" />
                      <Input 
                        type="number"
                        placeholder="0" 
                        value={uangSakuNominal}
                        onChange={(e) => setUangSakuNominal(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-white border-teal-200 font-black text-teal-700" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-teal-900 tracking-widest">Pot Pajak (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600" />
                      <Input 
                        type="number"
                        placeholder="0" 
                        value={uangSakuTax}
                        onChange={(e) => setUangSakuTax(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-white border-teal-200 font-black text-teal-700" 
                      />
                    </div>
                  </div>
                </div>
              )}

              <section className={cn("p-6 rounded-3xl border space-y-4", type === "uang-saku" ? "bg-teal-50/50 border-teal-100" : "bg-primary/5 border-primary/10")}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", type === "uang-saku" ? "bg-teal-600" : "bg-primary")}>
                    <UserPlus className="h-4 w-4 text-white" />
                  </div>
                  <h3 className={cn("text-sm font-black uppercase tracking-tight", type === "uang-saku" ? "text-teal-900" : "text-primary")}>Otomatisasi Nama Peserta</h3>
                </div>
                <p className={cn("text-[10px] font-bold leading-relaxed mb-4 italic", type === "uang-saku" ? "text-teal-700" : "text-primary/80")}>
                  * Pilih kategori peserta. Nama akan diisi otomatis berdasarkan prioritas urutan input 1 ke 6.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {participantSelections.map((selection, i) => (
                    <div key={i} className="space-y-1.5">
                      <Label className={cn("text-[9px] font-black uppercase ml-1", type === "uang-saku" ? "text-teal-800" : "text-primary/90")}>Kelompok Peserta {i + 1}</Label>
                      <Select 
                        value={selection} 
                        onValueChange={(value) => handleParticipantSelectionChange(i, value)}
                      >
                        <SelectTrigger className={cn("h-11 rounded-xl bg-white", type === "uang-saku" ? "border-teal-200" : "border-primary/20")}>
                          <SelectValue placeholder="Pilih Kelompok..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Kosong --</SelectItem>
                          {participantCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="pt-6 border-t space-y-4">
            <Button 
              className={cn(
                "w-full h-16 gap-3 text-lg font-black uppercase shadow-lg rounded-[1.25rem] active:scale-95 transition-all",
                type === "honor-narasumber" ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" : 
                type === "insentif" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200" :
                type === "siltap" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" :
                type === "uang-saku" ? "bg-teal-600 hover:bg-teal-700 text-teal-50 shadow-teal-200" :
                "bg-primary hover:bg-primary/90 shadow-primary/20"
              )}
              onClick={handlePrint}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />}
              Cetak PDF Sekarang
            </Button>
            <p className="text-[10px] text-center text-muted-foreground italic font-medium">
                * Dokumen akan dicetak dengan kop surat Pemerintah Desa Rungkang.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DokumenSuspense() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <DokumenContent />
    </Suspense>
  )
}

export default function DokumenPenunjangPage() {
  return <DokumenSuspense />
}
