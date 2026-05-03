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
import { Loader2, Plane, Calendar as CalendarIcon, RefreshCw, ChevronRight, Save, Hash, Clock, MapPin, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { OFFICIALS } from "@/lib/personel-data"
import { format, addDays, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GOOGLE_CONFIG } from "@/lib/google-config"

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
        const parts = line.split(" - ")
        return { name: parts[0] || "", category: parts[2] || "Pemerintah Desa" }
      })
      setCompanionsList(parsed)
      setNumCompanions(parsed.length)
    }
  }, [initialData])

  const watchStartDate = form.watch("startDate")
  const selectedCategory = form.watch("category")

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
    setCompanionsList(newList)
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
      }
    } catch (err: any) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false)
    }
  }, []);

  useEffect(() => {
    if (activeTab === "agenda") handleSync(selectedCalendarDate);
  }, [selectedCalendarDate, handleSync, activeTab]);

  const handleSelectAgenda = (agenda: AgendaItem) => {
    form.setValue("destination", agenda.location || "Balai Desa", { shouldValidate: true })
    form.setValue("startDate", format(new Date(agenda.start.dateTime), "yyyy-MM-dd"), { shouldValidate: true })
    form.setValue("description", agenda.summary, { shouldValidate: true })
    setActiveTab("manual")
    toast({ title: "Agenda Terpilih", description: "Detail kegiatan terisi otomatis." })
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return
    setIsUploading(true)
    
    const serializedCompanions = companionsList
      .filter(c => c.name)
      .map(c => c.name) // c.name already contains "Name - Jabatan" from Select
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
        toast({ title: "Berhasil Diperbarui" })
      } else {
        const sppdRef = collection(db, "users", user.uid, "sppds")
        addDocumentNonBlocking(sppdRef, { ...payload, documentUrls: [] })
        toast({ title: "Sukses Disimpan" })
      }
      form.reset()
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal menyimpan" })
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
          <TabsTrigger value="agenda" className="gap-2 text-[10px] font-black uppercase">
            <CalendarIcon className="h-4 w-4" />
            Agenda Desa
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2 text-[10px] font-black uppercase">
            <Plane className="h-4 w-4" />
            Isi Pengajuan
          </TabsTrigger>
        </TabsList>
      )}

      <TabsContent value="agenda" className="mt-0 space-y-4">
        <div className="flex items-end gap-2 p-4 border rounded-2xl bg-accent/5 shadow-inner border-accent/10">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-accent mb-1 block">Pilih Tanggal</label>
            <Input type="date" value={selectedCalendarDate} onChange={(e) => setSelectedCalendarDate(e.target.value)} className="h-12 border-accent/20 bg-white" />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => handleSync(selectedCalendarDate)} disabled={isSyncing} className="h-12 w-12 shrink-0 border-accent/20 bg-white shadow-sm">
            <RefreshCw className={cn("h-5 w-5 text-accent", isSyncing && "animate-spin")} />
          </Button>
        </div>
        
        <ScrollArea className="h-[300px] border rounded-2xl p-2 bg-muted/20">
          {isSyncing ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent/40" />
            </div>
          ) : agendas.length > 0 ? (
            <div className="space-y-3">
              {agendas.map((agenda: AgendaItem) => (
                <button key={agenda.id} type="button" onClick={() => handleSelectAgenda(agenda)} className="w-full text-left p-4 rounded-xl border bg-white hover:bg-accent/5 transition-all flex items-start justify-between gap-3 group border-accent/10 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black group-hover:text-accent leading-tight">{agenda.summary}</p>
                    <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold">{agenda.location || "Luar Desa"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0 mt-1" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground uppercase text-[10px] font-bold">Tidak ada agenda</div>
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Lembaga</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); form.setValue("officialName", ""); }} defaultValue={field.value} value={field.value}>
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
                          <Input placeholder="Nama..." className="h-11 border-accent/20" {...field} />
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
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">No. Dokumen</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="090/..../SPPD/2026" className="h-11 pl-10 border-accent/20 font-bold" {...field} />
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
                      <Input placeholder="Tujuan..." className="h-11 pl-10 border-accent/20" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 border rounded-2xl bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pengikut</h4>
              </div>
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Jumlah</FormLabel>
                <FormControl>
                  <Input type="number" value={numCompanions} onChange={(e) => handleNumCompanionsChange(e.target.value)} className="h-11 border-slate-300" />
                </FormControl>
              </FormItem>

              {companionsList.map((comp, idx) => (
                <div key={idx} className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select value={comp.category} onValueChange={(val) => updateCompanion(idx, 'category', val)}>
                      <SelectTrigger className="h-10 text-xs bg-white"><SelectValue placeholder="Kategori" /></SelectTrigger>
                      <SelectContent>
                        {personnelCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {comp.category === "Lainnya" ? (
                      <Input placeholder="Nama..." value={comp.name} onChange={(e) => updateCompanion(idx, 'name', e.target.value)} className="h-10 text-xs bg-white" />
                    ) : (
                      <Select disabled={!comp.category} value={comp.name} onValueChange={(val) => updateCompanion(idx, 'name', val)}>
                        <SelectTrigger className="h-10 text-xs bg-white"><SelectValue placeholder="Pilih Nama" /></SelectTrigger>
                        <SelectContent><ScrollArea className="h-[150px]">
                          {OFFICIALS.filter(o => o.category === comp.category).map((o: any) => (
                            <SelectItem key={`${o.name}-${o.jabatan}`} value={`${o.name} - ${o.jabatan}`}>{o.name}</SelectItem>
                          ))}
                        </ScrollArea></SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Mulai</FormLabel>
                <FormControl><Input type="date" className="h-11" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Selesai</FormLabel>
                <FormControl><Input type="date" className="h-11 bg-muted/30" {...field} readOnly /></FormControl></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="totalExpense" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Biaya (Rp)</FormLabel>
                <FormControl><Input type="number" className="h-11 font-black text-accent" {...field} /></FormControl></FormItem>
              )} />
            <Button type="submit" className="w-full h-14 font-black uppercase shadow-lg bg-accent hover:bg-accent/90 rounded-2xl" disabled={isUploading}>
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SIMPAN PENGAJUAN"}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  )
}
