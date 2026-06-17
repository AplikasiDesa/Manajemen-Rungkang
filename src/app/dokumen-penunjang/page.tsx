
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
  Info,
  Stethoscope,
  Baby
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useState, Suspense, useMemo, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { APB_DATA, BIDANG_NAMES } from "@/lib/apbdes-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, query, where } from "firebase/firestore"
import { generateDaftarHadirPDF, generateUangSakuPDF, generateDaftarHadirPesertaPDF } from "@/lib/pdf-utils-v2"
import { generateHonorNarasumberPDF, generateInsentifPDF, generateSiltapPDF } from "@/lib/pdf-utils"

// Define robust types for build safety
interface Participant {
  name: string;
  jabatan: string;
  category: string;
}

const HEALTH_CATEGORIES = [
  "Balita",
  "Stunting",
  "Lansia",
  "Disabilitas",
  "Ibu Hamil",
  "Ibu Menyusui",
  "Ibu Hamil KEK",
  "Remaja Anemia"
]

const configs = {
  "daftar-hadir": {
    title: "Daftar Hadir",
    desc: "Cetak absensi rapat atau kegiatan umum desa.",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  "uang-saku": {
    title: "Uang Saku",
    desc: "Cetak tanda terima uang saku/transport peserta.",
    icon: Wallet,
    color: "text-teal-600",
    bgColor: "bg-teal-50"
  },
  "daftar-hadir-posyandu": {
    title: "Posyandu",
    desc: "Cetak daftar hadir Kader & Peserta Posyandu.",
    icon: Stethoscope,
    color: "text-rose-600",
    bgColor: "bg-rose-50"
  },
  "honor-narasumber": {
    title: "Honor Narasumber",
    desc: "Cetak tanda terima honorarium narasumber.",
    icon: UserPlus,
    color: "text-amber-600",
    bgColor: "bg-amber-50"
  },
  "insentif": {
    title: "Insentif Lembaga",
    desc: "Cetak tanda terima insentif RT/RW, Kader, dll.",
    icon: Coins,
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  "siltap": {
    title: "Siltap & BPD",
    desc: "Cetak tanda terima Siltap Perangkat & BPD.",
    icon: Banknote,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50"
  }
}

/**
 * Utilitas Pengurutan Hierarkis untuk PDF
 */
const CATEGORY_ORDER = [
  "Pemerintah Desa",
  "BPD",
  "RT/RW",
  "Kader",
  "KPM",
  "Karang Taruna",
  "Linmas",
  "Pengurus BUMDes",
  "Pengurus KDMP",
  "Guru Ngaji",
  "Guru TK & Paud"
];

const getRankWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  if (j.includes("KEPALA DESA")) return 1;
  if (j.includes("SEKRETARIS DESA")) return 2;
  if (j.includes("KASI") || j.includes("KEPALA SEKSI")) return 3;
  if (j.includes("KAUR") || j.includes("KEPALA URUSAN")) return 4;
  if (j.includes("KEPALA DUSUN") || j.includes("KADUS")) return 5;
  if (j.includes("STAF")) return 6;
  return 100;
};

const getRtRwWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  const rwMatch = j.match(/RW\s*(\d+)/);
  const rtMatch = j.match(/RT\s*(\d+)/);
  const rwNum = rwMatch ? parseInt(rwMatch[1]) : 0;
  const rtNum = rtMatch ? parseInt(rtMatch[1]) : 0;
  let weight = rwNum * 1000;
  if (j.includes("KETUA RW") && !j.includes("RT")) {
    weight += 0;
  } else {
    weight += rtNum;
  }
  return weight;
};

const getKaderWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  const posyanduMatch = j.match(/RAHAYU\s*(\d+)/);
  return posyanduMatch ? parseInt(posyanduMatch[1]) : 999;
};

const sortParticipants = (list: any[]) => {
    return list.sort((a, b) => {
        const catA = a.category;
        const catB = b.category;
        
        if (catA !== catB) {
            return CATEGORY_ORDER.indexOf(catA) - CATEGORY_ORDER.indexOf(catB);
        }

        if (catA === "Pemerintah Desa") {
            return getRankWeight(a.jabatan) - getRankWeight(b.jabatan);
        } else if (catA === "RT/RW") {
            return getRtRwWeight(a.jabatan) - getRtRwWeight(b.jabatan);
        } else if (catA === "Kader") {
            return getKaderWeight(a.jabatan) - getKaderWeight(b.jabatan);
        }
        
        return a.name.localeCompare(b.name);
    });
};

function DokumenContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type")
  const current = type ? configs[type as keyof typeof configs] : null
  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Sub tab state for posyandu
  const [posyanduSubType, setPosyanduSubType] = useState<"kader" | "peserta">("kader")

  // Mengambil data personil dari Firestore
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: dbOfficials } = useCollection(personnelRef)
  
  // GLOBAL CONFIG: Ambil Logo dari Pengaturan Desa
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  const [useApbdes, setUseApbdes] = useState(true)
  const [bidang, setBidang] = useState("")
  const [sumber, setSumber] = useState("")
  const [kegiatan, setKegiatan] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [date, setDate] = useState("")
  const [location, setLocation] = useState("Balai Desa Rungkang")
  const [time, setTime] = useState("09:00 WIB")
  
  const [jumlahOrang, setJumlahOrang] = useState<number>(15)
  const [jumlahKuotaPeserta, setJumlahKuotaPeserta] = useState<number>(30)
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

  // Posyandu States
  const [selectedSariRahayu, setSelectedSariRahayu] = useState("")
  const [selectedHealthCategory, setSelectedHealthCategory] = useState("Balita")

  // Fetch actual health records data
  const healthDataQuery = useMemoFirebase(() => {
    if (!db || !user || type !== "daftar-hadir-posyandu" || posyanduSubType !== "peserta") return null;
    return query(collection(db, "health_records"), where("category", "==", selectedHealthCategory));
  }, [db, user, type, posyanduSubType, selectedHealthCategory]);
  const { data: healthRecords } = useCollection(healthDataQuery);

  useEffect(() => {
    setMounted(true)
    setDate(new Date().toISOString().split('T')[0])
    
    // Auto switch to manual mode for posyandu
    if (type === "daftar-hadir-posyandu") {
      setUseApbdes(false)
    }
  }, [type])

  const SariRahayuGroups = useMemo(() => {
    if (!dbOfficials) return [];
    const kaders = dbOfficials.filter(o => o.category === "Kader");
    const groups = new Set<string>();
    kaders.forEach(k => {
      const jab = (k.jabatan || "").toUpperCase();
      // Mencari pola "SARI RAHAYU" diikuti oleh angka opsional
      const match = jab.match(/SARI\s*RAHAYU\s*(\d+)?/i);
      if (match) {
        // Standarisasi nama kelompok menjadi "SARI RAHAYU X"
        groups.add(match[0].toUpperCase().trim());
      }
    });
    // Urutkan berdasarkan angka kelompok (Sari Rahayu 1, 2, dst)
    return Array.from(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [dbOfficials]);

  const handleParticipantSelectionChange = (index: number, value: string) => {
    const newSelections = [...participantSelections];
    newSelections[index] = value;
    setParticipantSelections(newSelections);
  };

  const participantCategories = useMemo(() => 
    Array.from(new Set((dbOfficials || []).map(o => o.category).filter(c => c && c.trim() !== '')))
  , [dbOfficials]);

  const filteredSources = useMemo(() => {
    if (!bidang) return []
    const sources = APB_DATA.filter(item => item.bidang.toString() === bidang).map(item => item.sumber)
    return Array.from(new Set(sources))
  }, [bidang])

  const filteredActivities = useMemo(() => {
    if (!bidang || !sumber) return []
    return APB_DATA.filter(item => item.bidang.toString() === bidang && item.sumber === sumber)
  }, [bidang, sumber])

  const handlePrint = async () => {
    setIsGenerating(true)
    try {
      const finalTitle = (type === "daftar-hadir-posyandu" || !useApbdes) ? manualTitle : kegiatan;
      
      let pdfBlob;

      if (type === "daftar-hadir" || type === "uang-saku") {
        if (!finalTitle) throw new Error("Judul kegiatan harus diisi")
        const quota = jumlahOrang || 1;
        const selectedCats = participantSelections.filter(cat => cat && cat !== "none");
        let allParticipants: any[] = [];
        
        selectedCats.forEach(cat => {
            const members = (dbOfficials || []).filter(o => o.category === cat).map(o => ({
                name: String(o.name || ""),
                jabatan: String(o.jabatan || ""),
                category: String(o.category || "")
            }));
            allParticipants.push(...members);
        });

        // 1. Sort by Hierarchy before de-duplication and quota slicing
        const sorted = sortParticipants(allParticipants);

        const uniqueParticipants = Array.from(new Map(sorted.map(item => [item.name, item])).values());
        const finalParticipants = Array.from({ length: quota }, (_, i) => 
            uniqueParticipants[i] || { name: "", jabatan: "", category: "" }
        );

        const pdfData = { 
            kegiatan: finalTitle, 
            tanggal: date, 
            participants: finalParticipants, 
            nominal: uangSakuNominal, 
            tax: uangSakuTax,
            location,
            time
        };
        
        if (type === "daftar-hadir") {
          pdfBlob = await generateDaftarHadirPDF(pdfData, villageSettings?.logoBase64);
        } else {
          pdfBlob = await generateUangSakuPDF(pdfData, villageSettings?.logoBase64);
        }
      } 
      else if (type === "daftar-hadir-posyandu") {
        if (!finalTitle) throw new Error("Judul kegiatan harus diisi")
        if (!selectedSariRahayu) throw new Error("Pilih Kelompok Posyandu")
        
        if (posyanduSubType === "kader") {
            const kaders = (dbOfficials || []).filter(o => o.category === "Kader" && (o.jabatan?.toUpperCase().includes(selectedSariRahayu)));
            const quota = Math.max(kaders.length, 10); // Minimal 10 baris

            const sortedKaders = sortParticipants(kaders);

            const finalParticipants = Array.from({ length: quota }, (_, i) => 
                sortedKaders[i] ? { name: sortedKaders[i].name, jabatan: sortedKaders[i].jabatan, category: "Kader" } : { name: "", jabatan: "", category: "" }
            );

            const pdfData = { 
                kegiatan: finalTitle, 
                tanggal: date, 
                participants: finalParticipants,
                mainTitle: `DAFTAR HADIR POSYANDU ${selectedSariRahayu}`,
                location,
                time
            };
            pdfBlob = await generateDaftarHadirPDF(pdfData, villageSettings?.logoBase64);
        } else {
            // TAB PESERTA (BALITA, LANSIA, DLL)
            const mappedParticipants = (healthRecords || []).map(r => ({
                name: r.name,
                jabatan: r.address, // We use jabatan field to store address for the PDF table column
                category: r.category
            }));

            // Sort alphabetically for patients
            mappedParticipants.sort((a, b) => a.name.localeCompare(b.name));

            const pdfData = {
                kegiatan: finalTitle,
                tanggal: date,
                participants: mappedParticipants,
                quota: Math.max(mappedParticipants.length, jumlahKuotaPeserta),
                mainTitle: `DAFTAR HADIR ${selectedHealthCategory.toUpperCase()} POSYANDU ${selectedSariRahayu}`,
                location,
                time
            };
            pdfBlob = await generateDaftarHadirPesertaPDF(pdfData, villageSettings?.logoBase64);
        }
      }
      else if (type === "honor-narasumber") {
        if (!finalTitle) throw new Error("Nama kegiatan harus diisi")
        const activeNarsum = narsumData.slice(0, numNarsum)
        pdfBlob = await generateHonorNarasumberPDF({ title: finalTitle, date, location, time, narsum: activeNarsum }, villageSettings?.logoBase64)
      }
      else if (type === "insentif") {
        let insentifParticipants: { name: string; position: string; category: string }[] = []
        const categoryMap = {
            "RT/RW": "RT/RW",
            "KADER POSYANDU": "Kader",
            "GURU PAUD": "Guru TK & Paud",
            "KADER KPM": "KPM",
            "HONORARIUM LINMAS": "Linmas"
        };
        const selectedCategory = (categoryMap as any)[insentifCat];
        if(selectedCategory) {
            const rawMembers = (dbOfficials || []).filter(o => o.category === selectedCategory).map(o => ({ 
              name: String(o.name || ""), 
              position: String(o.jabatan || ""),
              category: String(o.category || ""),
              jabatan: String(o.jabatan || "") // needed for helper
            }));
            
            // Sort by hierarchy before printing
            const sorted = sortParticipants(rawMembers);
            insentifParticipants = sorted.map(s => ({ name: s.name, position: s.position, category: s.category }));
        }

        pdfBlob = await generateInsentifPDF({ 
          category: insentifCat, 
          month: insentifMonth, 
          date: date, 
          nominal: insentifNominal, 
          tax: insentifTax, 
          participants: insentifParticipants, 
          jumlahOrang: insentifParticipants.length 
        }, villageSettings?.logoBase64)
      }
      else if (type === "siltap") {
        let dataToPrint = [];
        
        if (siltapSubType === "perangkat") {
          dataToPrint = (dbOfficials || [])
            .filter(o => o.category === "Pemerintah Desa")
            .map(o => {
              let nominal = 0;
              const job = (o.jabatan || "").toUpperCase();
              
              if (job.includes("KEPALA DESA")) nominal = 4000000;
              else if (job.includes("SEKRETARIS DESA")) nominal = 3000000;
              else if (job.includes("KAUR KEUANGAN")) nominal = 2400000;
              else if (job.includes("KAUR UMUM") || job.includes("KAUR UMUM ADD")) nominal = 2400000;
              else if (job.includes("KASI PEMERINTAHAN")) nominal = 2400000;
              else if (job.includes("KASI KESEJAHTERAAN")) nominal = 2400000;
              else if (job.includes("KASI PELAYANAN")) nominal = 2400000;
              else if (job.includes("KEPALA DUSUN")) nominal = 2200000;
              else if (job.includes("STAF")) nominal = 2050000;
              else nominal = 0;

              return {
                name: o.name,
                jabatan: o.jabatan,
                nominal: nominal,
                category: o.category
              };
            });
            
          // Use hierarchy sorting for siltap instead of just nominal
          dataToPrint = sortParticipants(dataToPrint);
        } else {
          dataToPrint = (dbOfficials || [])
            .filter(o => o.category === "BPD")
            .map(o => {
              let nominal = 0;
              const job = (o.jabatan || "").toUpperCase();
              
              if (job.includes("KETUA") && !job.includes("WAKIL")) nominal = 550000;
              else if (job.includes("WAKIL KETUA")) nominal = 450000;
              else if (job.includes("SEKRETARIS")) nominal = 400000;
              else nominal = 350000; // ANGGOTA

              return {
                name: o.name,
                jabatan: o.jabatan,
                nominal: nominal,
                category: o.category
              };
            });
            
          // Simple alphabetical for BPD members of same rank
          dataToPrint.sort((a, b) => b.nominal - a.nominal || a.name.localeCompare(b.name));
        }

        pdfBlob = await generateSiltapPDF({ 
            month: insentifMonth, 
            date, 
            title: siltapSubType === "perangkat" ? "TANDA TERIMA SILTAP" : "TANDA TERIMA INSENTIF BPD", 
            data: dataToPrint 
        }, villageSettings?.logoBase64)
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
                  {["RT/RW", "KADER POSYANDU", "GURU PAUD", "KADER KPM", "HONORARIUM LINMAS"].map((cat) => (
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
                        * Data nominal Siltap menggunakan database pusat Pemerintah Desa Rungkang yang tersimpan di Firestore.
                    </p>
                </div>
             </div>
          )}

          {type === "daftar-hadir-posyandu" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <Tabs value={posyanduSubType} onValueChange={(v: any) => setPosyanduSubType(v)} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full h-12 mb-6 bg-rose-50 p-1 rounded-xl">
                        <TabsTrigger value="kader" className="gap-2 text-[10px] font-black uppercase rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                            <UserCheck className="h-4 w-4" />
                            Daftar Kader
                        </TabsTrigger>
                        <TabsTrigger value="peserta" className="gap-2 text-[10px] font-black uppercase rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                            <Baby className="h-4 w-4" />
                            Daftar Peserta Posyandu
                        </TabsTrigger>
                    </TabsList>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Judul Kegiatan</Label>
                            <Input 
                                placeholder="Contoh: Posyandu Balita & Lansia" 
                                value={manualTitle}
                                onChange={(e) => setManualTitle(e.target.value)}
                                className="h-14 rounded-2xl bg-rose-50/50 border-rose-100 font-bold" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Pilih Kelompok Posyandu</Label>
                            <Select value={selectedSariRahayu} onValueChange={setSelectedSariRahayu}>
                                <SelectTrigger className="h-14 rounded-2xl bg-rose-50 border-rose-100 font-black">
                                    <SelectValue placeholder={SariRahayuGroups.length > 0 ? "Pilih Posyandu..." : "Memuat data kelompok..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {SariRahayuGroups.map(group => (
                                        <SelectItem key={group} value={group} className="font-bold">{group}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {posyanduSubType === "peserta" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Pilih Jenis Peserta</Label>
                                    <Select value={selectedHealthCategory} onValueChange={setSelectedHealthCategory}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-rose-50 border-rose-100 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {HEALTH_CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat} className="font-bold">{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Minimal Baris (Jika Data Sedikit)</Label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-600/50" />
                                        <Input 
                                            type="number"
                                            value={jumlahKuotaPeserta}
                                            onChange={(e) => setJumlahKuotaPeserta(parseInt(e.target.value) || 0)}
                                            className="h-14 pl-12 rounded-2xl bg-rose-50/30 border-rose-100 font-black text-rose-900" 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Tanggal</Label>
                                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Waktu</Label>
                                <Input value={time} onChange={e => setTime(e.target.value)} placeholder="09:00 WIB" className="h-12 rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Lokasi (Manual)</Label>
                            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Contoh: Rumah Ibu RW 01" className="h-12 rounded-xl" />
                        </div>
                    </div>
                </Tabs>
            </div>
          )}

          {(type !== "siltap" && type !== "insentif" && type !== "daftar-hadir-posyandu") && (
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
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
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
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
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
                type === "daftar-hadir-posyandu" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200" :
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
      <StatusChecker />
    </Suspense>
  )
}

function StatusChecker() {
  return <DokumenContent />
}

export default function DokumenPenunjangPage() {
  return <DokumenSuspense />
}
