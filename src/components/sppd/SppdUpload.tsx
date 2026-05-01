"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plane, Calendar as CalendarIcon, RefreshCw, ChevronRight, Save, Hash, Sparkles, Clock, MapPin, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { OFFICIALS } from "@/lib/personel-data"
import { format, addDays, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { getRomanMonth } from "@/lib/pdf-utils"

const formSchema = z.object({
  category: z.string().min(1, "Pilih kategori"),
  officialName: z.string().min(1, "Pilih atau isi nama personel"),
  documentNumber: z.string().min(3, "Nomor dokumen minimal 3 karakter"),
  destination: z.string().min(3, "Tujuan minimal 3 karakter"),
  totalExpense: z.string().min(1, "Total biaya harus diisi"),
  startDate: z.string().min(1, "Pilih tanggal mulai"),
  endDate: z.string().min(1, "Pilih tanggal selesai"),
  description: z.string().optional(),
  companions: z.string().optional(),
})

interface AgendaItem {
  id: string
  summary: string
  location: string
  start: { dateTime: string };
}

interface CompanionEntry {
  category: string
  name: string
}

interface SppdUploadProps {
  onSuccess?: () => void
  initialData?: any
}

export function SppdUpload({ onSuccess, initialData }: SppdUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isFetchingNumber, setIsFetchingNumber] = useState(false)
  const [activeTab, setActiveTab] = useState(initialData ? "manual" : "agenda")
  const [isSyncing, setIsSyncing] = useState(false)
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [duration, setDuration] = useState<number>(1)
  
  const [numCompanions, setNumCompanions] = useState<number>(0)
  const [companionsList, setCompanionsList] = useState<CompanionEntry[]>([])

  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: initialData?.category || "",
      officialName: initialData?.officialName || "",
      documentNumber: initialData?.documentNumber || "",
      destination: initialData?.destination || "",
      totalExpense: initialData?.amount?.toString() || "",
      startDate: initialData?.startDate || format(new Date(), "yyyy-MM-dd"),
      endDate: initialData?.endDate || format(new Date(), "yyyy-MM-dd"),
      description: initialData?.description || "",
      companions: initialData?.companions || "",
    },
  })

  useEffect(() => {
    if (initialData?.companions) {
      const lines = initialData.companions.split("\n").filter(Boolean)
      const parsed = lines.map((line: string) => {
        const [name, cat] = line.split(" - ")
        return { name, category: cat || "Pemerintah Desa" }
      })
      setCompanionsList(parsed)
      setNumCompanions(parsed.length)
    }
  }, [initialData])

  const watchStartDate = form.watch("startDate")
  const selectedCategory = form.watch("category")
  const destination = form.watch("destination")
  const officialName = form.watch("officialName")

  useEffect(() => {
    if (watchStartDate) {
      const start = parseISO(watchStartDate)
      const end = addDays(start, duration - 1)
      form.setValue("endDate", format(end, "yyyy-MM-dd"), { shouldValidate: true })
    }
  }, [watchStartDate, duration, form])

  const handleNumCompanionsChange = (val: string) => {
    const num = parseInt(val) || 0
    setNumCompanions(num)
    const newList = [...companionsList]
    if (num > newList.length) {
      for (let i = newList.length; i < num; i++) {
        newList.push({ category: "", name: "" })
      }
    } else {
      newList.splice(num)
    }
    setCompanionsList(newList)
  }

  const updateCompanion = (index: number, field: keyof CompanionEntry, value: string) => {
    const newList = [...companionsList]
    newList[index] = { ...newList[index], [field]: value }
    if (field === 'category') newList[index].name = "" 
    setCompanionsList(newList)
  }

  const handlePullNumber = async () => {
    if (!destination || !officialName) {
      toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Isi tujuan dan nama personel untuk tarik nomor." })
      return
    }
    setIsFetchingNumber(true)
    try {
      const payload = {
        action: 'generateNumber',
        destination,
        officialName,
        spreadsheetId: GOOGLE_CONFIG.sppdSpreadsheetId
      };
      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      const result = await response.json();
      
      if (result.success && result.docNumber) {
        form.setValue("documentNumber", result.docNumber, { shouldValidate: true })
        toast({ title: "Nomor Berhasil Ditarik", description: `Nomor ${result.docNumber} telah dicatat.` })
      } else {
        throw new Error(result.error || "Gagal tarik nomor");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Kesalahan Server", description: err.message || "Gagal menghubungi Apps Script." })
    } finally {
      setIsFetchingNumber(false)
    }
  }

  const handleSync = useCallback(async (date: string) => {
    setIsSyncing(true)
    setAgendas([])
    try {
      const payload = {
        action: 'getCalendar',
        date: date,
        calendarId: GOOGLE_CONFIG.calendarId
      };
      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      const res = await response.json();
      if (res.success && res.items) {
        setAgendas(res.items);
        if (res.items.length === 0) {
          toast({ title: "Info", description: "Tidak ada agenda pada tanggal tersebut." });
        }
      } else {
        throw new Error(res.error || "Gagal mengambil data kalender");
      }
    } catch (err: any) {
      setAgendas([]);
      toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: err.message });
    } finally {
      setIsSyncing(false)
    }
  }, [toast]);

  useEffect(() => {
    handleSync(selectedCalendarDate);
  }, [selectedCalendarDate, handleSync]);

  const handleSelectAgenda = (agenda: AgendaItem) => {
    form.setValue("destination", agenda.location || "Balai Desa", { shouldValidate: true })
    form.setValue("startDate", format(new Date(agenda.start.dateTime), "yyyy-MM-dd"), { shouldValidate: true })
    form.setValue("description", agenda.summary, { shouldValidate: true })
    setActiveTab("manual")
    toast({ title: "Agenda Terpilih", description: "Tujuan dan Judul Kegiatan terisi otomatis." })
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return
    setIsUploading(true)
    
    const serializedCompanions = companionsList
      .filter(c => c.name && c.category)
      .map(c => `${c.name} - ${c.category}`)
      .join("\n")

    const payload = {
      ...values,
      userId: user.uid,
      amount: parseFloat(values.totalExpense) || 0,
      expenseDate: initialData?.expenseDate || new Date().toISOString(),
      approvalStatus: initialData?.approvalStatus || "pending",
      description: values.description || `Perjalanan dinas ke ${values.destination}`,
      companions: serializedCompanions,
    }

    try {
      if (initialData?.id) {
        const docRef = doc(db, "users", user.uid, "sppds", initialData.id)
        updateDocumentNonBlocking(docRef, payload)
        toast({ title: "Berhasil Diperbarui", description: "Data pengajuan SPPD telah diperbarui." })
      } else {
        const sppdRef = collection(db, "users", user.uid, "sppds")
        addDocumentNonBlocking(sppdRef, { ...payload, documentUrls: [] })
        toast({ title: "Sukses!", description: "Data pengajuan SPPD berhasil disimpan." })
      }
      form.reset()
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Gagal menyimpan ke Firestore." })
    } finally {
      setIsUploading(false)
    }
  }

  const personnelCategories = [
    { id: "Pemerintah Desa", label: "Perangkat" },
    { id: "BPD", label: "BPD" },
    { id: "RT/RW", label: "RT/RW" },
    { id: "Kader", label: "Kader" },
    { id: "Lainnya", label: "Lainnya" }
  ]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {!initialData && (
        <TabsList className="grid grid-cols-2 w-full h-11 mb-6 bg-accent/5 p-1 rounded-xl">
          <TabsTrigger value="agenda" className="gap-2 text-[10px] font-black uppercase rounded-lg">
            <CalendarIcon className="h-4 w-4" />
            Agenda Desa
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2 text-[10px] font-black uppercase rounded-lg">
            <Plane className="h-4 w-4" />
            Isi Pengajuan
          </TabsTrigger>
        </TabsList>
      )}

      <TabsContent value="agenda" className="mt-0 space-y-4">
        <div className="flex items-end gap-2 p-4 border rounded-2xl bg-accent/5 shadow-inner border-accent/10">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-accent mb-1 block">Pilih Tanggal Agenda</label>
            <Input 
              type="date" 
              value={selectedCalendarDate}
              onChange={(e) => setSelectedCalendarDate(e.target.value)}
              className="h-12 font-black border-accent/20 bg-white"
            />
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            onClick={() => handleSync(selectedCalendarDate)} 
            disabled={isSyncing} 
            className="h-12 w-12 shrink-0 border-accent/20 bg-white shadow-sm"
          >
            <RefreshCw className={cn("h-5 w-5 text-accent", isSyncing && "animate-spin")} />
          </Button>
        </div>
        
        <ScrollArea className="h-[300px] border rounded-2xl p-2 bg-muted/20">
          {isSyncing ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent/40" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menyambungkan Kalender...</p>
            </div>
          ) : agendas.length > 0 ? (
            <div className="space-y-3">
              {agendas.map((agenda: AgendaItem) => (
                <button
                  key={agenda.id}
                  type="button"
                  onClick={() => handleSelectAgenda(agenda)}
                  className="w-full text-left p-4 rounded-xl border bg-white hover:bg-accent/5 transition-all flex items-start justify-between gap-3 group shadow-sm border-accent/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black group-hover:text-accent leading-tight whitespace-normal">{agenda.summary}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="h-3 w-3 text-accent/50" />
                      <p className="text-[10px] text-muted-foreground truncate font-bold uppercase">{agenda.location || "Luar Desa"}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0 mt-1" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl border-muted/50 flex flex-col items-center justify-center gap-2">
              <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Tidak ada agenda pada tanggal ini</p>
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="manual" className="mt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Lembaga/Jabatan</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue("officialName", "");
                    }} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 border-accent/20">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personnelCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedCategory && (
                <FormField
                  control={form.control}
                  name="officialName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Nama Personel</FormLabel>
                      {selectedCategory === "Lainnya" ? (
                        <FormControl>
                          <Input placeholder="Ketik nama..." className="h-11 border-accent/20" {...field} />
                        </FormControl>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-accent/20">
                              <SelectValue placeholder="Pilih..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <ScrollArea className="h-[180px]">
                              {OFFICIALS.filter(o => o.category === selectedCategory).map((o: any) => (
                                <SelectItem key={`${o.name}-${o.jabatan}`} value={`${o.name} - ${o.jabatan}`}>
                                  {o.name}
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">No. Dokumen</FormLabel>
                    <button 
                      type="button" 
                      onClick={handlePullNumber}
                      disabled={isFetchingNumber}
                      className="text-[9px] font-black text-primary uppercase flex items-center gap-1 hover:opacity-70 transition-opacity disabled:opacity-50"
                    >
                      {isFetchingNumber ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Tarik Nomor
                    </button>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="090/        /II/2026" className="h-11 pl-10 border-accent/20 font-bold" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Tujuan Dinas</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Masukkan lokasi tujuan..." className="h-11 pl-10 border-accent/20" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 border rounded-2xl bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Daftar Pengikut</h4>
              </div>
              
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Jumlah Pengikut</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="10" 
                    value={numCompanions}
                    onChange={(e) => handleNumCompanionsChange(e.target.value)}
                    placeholder="0" 
                    className="h-11 border-slate-300"
                  />
                </FormControl>
              </FormItem>

              {companionsList.map((comp, idx) => (
                <div key={idx} className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Pengikut #{idx + 1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Lembaga</FormLabel>
                      <Select 
                        value={comp.category} 
                        onValueChange={(val) => updateCompanion(idx, 'category', val)}
                      >
                        <SelectTrigger className="h-10 text-xs border-slate-300 bg-white">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          {personnelCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Nama Personel</FormLabel>
                      {comp.category === "Lainnya" ? (
                        <Input 
                          placeholder="Ketik nama..." 
                          value={comp.name} 
                          onChange={(e) => updateCompanion(idx, 'name', e.target.value)}
                          className="h-10 text-xs border-slate-300 bg-white" 
                        />
                      ) : (
                        <Select 
                          disabled={!comp.category}
                          value={comp.name} 
                          onValueChange={(val) => updateCompanion(idx, 'name', val)}
                        >
                          <SelectTrigger className="h-10 text-xs border-slate-300 bg-white">
                            <SelectValue placeholder="Pilih Nama..." />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[150px]">
                              {OFFICIALS.filter(o => o.category === comp.category).map((o: any) => (
                                <SelectItem key={`${o.name}-${o.jabatan}`} value={`${o.name} - ${o.jabatan}`}>
                                  {o.name}
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 p-4 border rounded-2xl bg-primary/5 border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Waktu Perjalanan</h4>
              </div>
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Tanggal Berangkat</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11 border-primary/20 bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground block">Durasi</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((d: number) => (
                    <Button
                      key={d}
                      type="button"
                      variant={duration === d ? "default" : "outline"}
                      onClick={() => setDuration(d)}
                      className={cn(
                        "flex-1 h-10 text-[10px] font-black uppercase rounded-xl transition-all",
                        duration === d ? "bg-primary shadow-md" : "border-primary/20 bg-white text-primary hover:bg-primary/5"
                      )}
                    >
                      {d} Hari
                    </Button>
                  ))}
                </div>
              </div>
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Tanggal Kembali</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11 border-primary/20 bg-muted/30 font-bold" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Maksud / Judul Kegiatan</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Rapat Koordinasi..." className="h-11 border-accent/20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalExpense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Estimasi Biaya (Rp)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="500000" className="h-11 border-accent/20 font-black text-accent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-14 text-base font-black uppercase shadow-lg bg-accent hover:bg-accent/90 rounded-2xl transition-all active:scale-[0.98]" disabled={isUploading}>
              {isUploading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> MENGIRIM...</> : initialData ? <><Save className="mr-2 h-5 w-5" /> SIMPAN PERUBAHAN</> : <><Plane className="mr-2 h-5 w-5" /> AJUKAN SEKARANG</>}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  )
}
