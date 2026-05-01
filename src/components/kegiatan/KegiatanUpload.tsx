
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ImagePlus, Loader2, FileText, Upload, Calendar as CalendarIcon, RefreshCw, Printer, CheckCircle, ChevronRight, FileCheck, Sparkles, BookOpen, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { OFFICIALS } from "@/lib/personel-data"
import { generateNotulenPDF, generateBASTPDF } from "@/lib/pdf-utils"

const formSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter"),
  description: z.string().min(1, "Isi notulen tidak boleh kosong"),
  activityType: z.enum(["Internal", "Eksternal"]).default("Internal"),
  category: z.string().default("Internal"),
  location: z.string().min(3, "Lokasi minimal 3 karakter"),
  date: z.string().min(1, "Pilih tanggal"),
  officialName: z.string().optional(),
}).refine((data) => {
  if (data.activityType === "Internal" && (!data.officialName || data.officialName === "")) {
    return false;
  }
  return true;
}, {
  message: "Pilih pelaksana kegiatan untuk kegiatan internal",
  path: ["officialName"],
})

interface AgendaItem {
  id: string
  summary: string
  location: string
  start: { dateTime: string };
}

export function KegiatanUpload({ onSuccess }: { onSuccess?: () => void }) {
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [activeTab, setActiveTab] = useState("agenda")
  const [isSyncing, setIsSyncing] = useState(false)
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<File[]>([])
  const [selectedUndangan, setSelectedUndangan] = useState<File | null>(null)
  
  const photoInputRef = useRef<HTMLInputElement>(null)
  const undanganInputRef = useRef<HTMLInputElement>(null)
  const materiInputRef = useRef<HTMLInputElement>(null)
  
  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()
  
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])
  
  const { data: userData } = useDoc(userDocRef)

  const filteredOfficials = OFFICIALS.filter(o => 
    o.jabatan.includes("KAUR") || o.jabatan.includes("KEPALA SEKSI")
  );
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      activityType: "Internal",
      category: "Internal",
      location: "",
      date: format(new Date(), "yyyy-MM-dd"),
      officialName: "",
    },
  })

  const watchActivityType = form.watch("activityType");

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
        setAgendas(res.items)
        if (res.items.length === 0) {
          toast({ title: "Info", description: "Tidak ada agenda pada tanggal tersebut."})
        }
      } else {
        throw new Error(res.error || "Gagal mengambil data kalender")
      }
    } catch (err: any) {
      setAgendas([])
      toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: err.message })
    } finally {
      setIsSyncing(false)
    }
  }, [toast])

  useEffect(() => {
    handleSync(selectedCalendarDate);
  }, [selectedCalendarDate, handleSync])

  const fileToBase64 = async (file: File): Promise<{name: string, type: string, base64: string} | null> => {
    if (!file || file.size === 0) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({
          name: file.name,
          type: file.type,
          base64: base64
        });
      };
      reader.onerror = error => reject(error);
    });
  }

  const handleSelectAgenda = (agenda: AgendaItem) => {
    const cleanTitle = agenda.summary.replace(/^Kegiatan\s*:\s*/i, "");
    form.setValue("title", cleanTitle, { shouldDirty: true, shouldValidate: true })
    form.setValue("date", format(new Date(agenda.start.dateTime), "yyyy-MM-dd"), { shouldDirty: true, shouldValidate: true })
    form.setValue("location", agenda.location || "Balai Desa", { shouldDirty: true, shouldValidate: true })
    setActiveTab("manual")
    toast({ title: "Agenda Terpilih", description: `Data telah terisi otomatis.` })
  }

  const handlePreviewBAST = async () => {
    const values = form.getValues();
    if (!values.officialName) {
      toast({ variant: "destructive", title: "Pilih Pelaksana", description: "Silakan pilih nama pelaksana terlebih dahulu." });
      return;
    }
    try {
      const pdfBlob = await generateBASTPDF(values, userData?.logoBase64);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal PDF", description: "Kesalahan saat membuat BAST." });
    }
  }

  const handlePreviewPDF = async () => {
    const values = form.getValues();
    try {
      const pdfBlob = await generateNotulenPDF(values, userData?.logoBase64);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal PDF", description: "Kesalahan saat membuat Notulen." });
    }
  }

  const handleAskAI = async () => {
    const values = form.getValues();
    if (!values.title) {
      toast({ variant: "destructive", title: "Judul Kosong", description: "Isi nama kegiatan agar AI bisa meringkas." });
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const payload = {
        action: 'askAI',
        prompt: `Susun ringkasan notulen formal untuk kegiatan: ${values.title}, Lokasi: ${values.location}, Tanggal: ${values.date}. Maksimal 2 paragraf formal.`
      };
      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        redirect: "follow"
      });
      
      const result = await response.json();
      if (result.success && result.text) {
        form.setValue("description", result.text);
        toast({ title: "AI Berhasil", description: "Ringkasan notulen telah dibuat." });
      } else {
        throw new Error(result.error || "Gagal mendapatkan respon AI");
      }
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Gagal AI", 
        description: e.message || "Fitur AI sedang tidak tersedia." 
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsUploading(true);

    try {
      const photoData = await Promise.all(selectedPhotos.map(f => fileToBase64(f)));
      const materialData = await Promise.all(selectedMaterials.map(f => fileToBase64(f)));
      const undanganData = selectedUndangan ? await fileToBase64(selectedUndangan) : null;

      const notulenBlob = await generateNotulenPDF(values, userData?.logoBase64);
      const notulenBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(notulenBlob);
      });

      let bastBase64 = null;
      if (values.activityType === "Internal") {
        const bastBlob = await generateBASTPDF(values, userData?.logoBase64);
        bastBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(bastBlob);
        });
      }

      const targetFolderId = userData?.kegiatanFolderId || GOOGLE_CONFIG.parentFolderId;

      const payload = {
        action: 'saveToDrive',
        folderName: `${values.title} | ${values.date}`,
        parentFolderId: targetFolderId,
        files: {
          photos: photoData.filter(Boolean),
          materials: materialData.filter(Boolean),
          undangan: undanganData,
          notulen: { name: `Notulen_${values.title}.pdf`, type: 'application/pdf', base64: notulenBase64 },
          bast: bastBase64 ? { name: `BAST_${values.title}.pdf`, type: 'application/pdf', base64: bastBase64 } : null
        }
      };

      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Gagal simpan ke Drive");
      }

      const kegiatanRef = collection(db, "users", user.uid, "kegiatans");
      
      const drivePhotos = result.fileUrls?.photos || [];

      addDocumentNonBlocking(kegiatanRef, {
        ...values,
        userId: user.uid,
        uploadDate: new Date().toISOString(),
        driveFolderId: result.folderId,
        driveUrls: result.fileUrls || {},
        imageUrls: drivePhotos.length > 0 ? drivePhotos : []
      });

      toast({ title: "Berhasil!", description: `Laporan tersimpan di Drive Desa.` });
      form.reset();
      setSelectedPhotos([]);
      setSelectedMaterials([]);
      setSelectedUndangan(null);
      onSuccess?.();
    } catch (err: any) {
      console.error("Submit Error:", err);
      toast({ 
        variant: "destructive", 
        title: "Gagal Simpan", 
        description: err.message || "Gagal menghubungi server Google." 
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full h-12 mb-4 bg-muted/50 p-1">
          <TabsTrigger value="agenda" className="gap-2 text-xs font-bold">
            <CalendarIcon className="h-4 w-4" />
            Agenda Desa
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2 text-xs font-bold">
            <FileText className="h-4 w-4" />
            Isi Laporan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-0 space-y-4 w-full">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-end gap-2 p-4 border rounded-xl bg-card shadow-sm border-primary/20">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Pilih Tanggal Agenda</label>
                <Input 
                  type="date" 
                  value={selectedCalendarDate}
                  onChange={(e) => setSelectedCalendarDate(e.target.value)}
                  className="h-12 text-base font-bold w-full"
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={() => handleSync(selectedCalendarDate)} 
                disabled={isSyncing} 
                className="h-12 w-12 border-primary/20 shrink-0"
              >
                <RefreshCw className={cn("h-5 w-5 text-primary", isSyncing && "animate-spin")} />
              </Button>
            </div>

            <div className="space-y-2 w-full">
              <ScrollArea className="h-[350px] w-full border rounded-xl p-2 bg-muted/20">
                {isSyncing ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-[10px] text-muted-foreground">Menghubungkan...</p>
                  </div>
                ) : agendas.length > 0 ? (
                  <div className="space-y-3 w-full">
                    {agendas.map((agenda: AgendaItem) => (
                      <button
                        key={agenda.id}
                        type="button"
                        onClick={() => handleSelectAgenda(agenda)}
                        className="w-full text-left p-4 rounded-xl border bg-card hover:bg-primary/5 transition-all flex items-start justify-between gap-3 group border-primary/10 shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-snug group-hover:text-primary whitespace-normal break-words">
                            {agenda.summary}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 whitespace-normal break-words">
                            {agenda.location || 'Lokasi belum diatur'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center border-2 border-dashed rounded-xl border-muted/50">
                    <p className="text-xs text-muted-foreground">Tidak ada agenda pada tanggal ini.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-0 w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="activityType"
                render={({ field }) => (
                  <FormItem className="space-y-3 p-4 border rounded-xl bg-primary/5 border-primary/20">
                    <FormLabel className="text-xs font-black text-primary uppercase tracking-widest">Jenis Kegiatan</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Internal" />
                          </FormControl>
                          <FormLabel className="font-bold text-sm">Internal</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Eksternal" />
                          </FormControl>
                          <FormLabel className="font-bold text-sm">Eksternal</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Nama Kegiatan</FormLabel>
                    <FormControl><Input placeholder="Judul kegiatan..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchActivityType === "Internal" && (
                <FormField
                  control={form.control}
                  name="officialName"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-1">
                      <FormLabel className="text-xs font-bold uppercase">Pelaksana</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Pelaksana..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <ScrollArea className="h-[200px]">
                            {filteredOfficials.map((o: any) => (
                              <SelectItem key={`${o.name}-${o.jabatan}`} value={`${o.name} - ${o.jabatan}`}>
                                {o.name} - {o.jabatan}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Tanggal</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Lokasi</FormLabel>
                      <FormControl><Input placeholder="Tempat..." {...field} /></FormControl>
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
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel className="text-xs font-bold uppercase">Isi Notulen</FormLabel>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <button 
                          type="button" 
                          className="flex h-7 items-center gap-1 rounded-md border border-blue-500/30 bg-blue-50/50 px-2 text-[10px] font-medium text-blue-600 hover:bg-blue-50" 
                          onClick={handleAskAI}
                          disabled={isGeneratingAI}
                        >
                          {isGeneratingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} 
                          Tanya AI
                        </button>
                        <button type="button" className="flex h-7 items-center gap-1 rounded-md border border-primary/30 px-2 text-[10px] font-medium text-primary hover:bg-primary/5" onClick={handlePreviewPDF}>
                          <Printer className="h-3 w-3" /> PDF Notulen
                        </button>
                        {watchActivityType === "Internal" && (
                          <button type="button" className="flex h-7 items-center gap-1 rounded-md border border-emerald-500/30 px-2 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50" onClick={handlePreviewBAST}>
                            <FileCheck className="h-3 w-3" /> PDF BAST
                          </button>
                        )}
                      </div>
                    </div>
                    <FormControl>
                      <Textarea placeholder="Tulis ringkasan kegiatan..." className="h-32 text-sm leading-relaxed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div 
                  onClick={() => photoInputRef.current?.click()} 
                  className={cn(
                    "h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors", 
                    selectedPhotos.length > 0 ? "bg-emerald-50 border-emerald-500/50" : "bg-muted/30 hover:bg-primary/5"
                  )}
                >
                  <input 
                    type="file" 
                    ref={photoInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                    onChange={(e) => setSelectedPhotos(Array.from(e.target.files || []))} 
                  />
                  {selectedPhotos.length > 0 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-[8px] font-bold text-center px-1">
                    {selectedPhotos.length > 0 ? `${selectedPhotos.length} Foto` : "Foto"}
                  </span>
                </div>

                <div 
                  onClick={() => undanganInputRef.current?.click()} 
                  className={cn(
                    "h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors", 
                    selectedUndangan ? "bg-emerald-50 border-emerald-500/50" : "bg-muted/30 hover:bg-accent/5"
                  )}
                >
                  <input 
                    type="file" 
                    ref={undanganInputRef} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx" 
                    onChange={(e) => setSelectedUndangan(e.target.files?.[0] || null)} 
                  />
                  {selectedUndangan ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-[8px] font-bold text-center px-1 truncate w-full">
                    {selectedUndangan ? selectedUndangan.name : "Undangan"}
                  </span>
                </div>

                <div 
                  onClick={() => materiInputRef.current?.click()} 
                  className={cn(
                    "h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors", 
                    selectedMaterials.length > 0 ? "bg-emerald-50 border-emerald-500/50" : "bg-muted/30 hover:bg-blue-50"
                  )}
                >
                  <input 
                    type="file" 
                    ref={materiInputRef} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.ppt,.pptx" 
                    multiple 
                    onChange={(e) => setSelectedMaterials(Array.from(e.target.files || []))} 
                  />
                  {selectedMaterials.length > 0 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <BookOpen className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-[8px] font-bold text-center px-1">
                    {selectedMaterials.length > 0 ? `${selectedMaterials.length} Materi` : "Materi"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-muted/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase">
                  Data dikirim langsung ke Google Drive Desa.
                </p>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg" disabled={isUploading}>
                {isUploading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Menyimpan...</> : <><Upload className="mr-2 h-5 w-5" /> Simpan ke Drive</>}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
