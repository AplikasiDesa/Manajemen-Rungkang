
"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUp, Loader2, Sparkles, Save, UserCheck, KeyRound, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { format } from "date-fns"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"

const formSchema = z.object({
  eventType: z.enum(["Internal", "Eksternal"]).default("Internal"),
  eventDate: z.string().min(1, "Tanggal harus diisi."),
  eventTime: z.string().min(1, "Waktu harus diisi."),
  eventLocation: z.string().min(3, "Tempat minimal 3 karakter."),
  eventTitle: z.string().min(5, "Acara minimal 5 karakter."),
  disposition: z.string().min(1, "Disposisi harus dipilih."),
  eventNotes: z.string().optional(),
})

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function InputAgendaForm() {
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [invitationFile, setInvitationFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  const { user } = useUser()
  const db = useFirestore()

  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: dbOfficials, isLoading: isPersonnelLoading } = useCollection(personnelRef)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  const { data: userData } = useDoc(userDocRef);

  const filteredOfficials = (dbOfficials || []).filter(o => 
    o.category === "Pemerintah Desa" || o.jabatan?.includes("KAUR") || o.jabatan?.includes("KEPALA SEKSI")
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: "Internal",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      eventTime: "",
      eventLocation: "Balai Desa Rungkang",
      eventTitle: "",
      disposition: "",
      eventNotes: "",
    },
  })
  
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ variant: "destructive", title: "File Tidak Sesuai", description: "Harap unggah file dengan format PDF." })
        return
      }
      setInvitationFile(file)
      toast({ title: "Undangan Terpilih", description: `File "${file.name}" siap untuk dipindai.` })
    }
  }

  const handleScanPdf = async () => {
    toast({ variant: "default", title: "Fitur AI", description: "Fitur pemindaian PDF sedang dalam pemeliharaan untuk mode statis." });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const folderId = userData?.agendaFolderId || GOOGLE_CONFIG.parentFolderId;

      let fileData = null;
      if (invitationFile) {
        const base64String = await fileToBase64(invitationFile);
        fileData = {
          name: invitationFile.name,
          type: invitationFile.type,
          base64: base64String.split(',')[1],
        };
      }

      const startDateTime = new Date(`${values.eventDate}T${values.eventTime.split(' ')[0] || '00:00'}`);
      // Simpan tipe agenda di deskripsi agar bisa diparsing nantinya
      const description = `JENIS: ${values.eventType}\nDISPOSISI: ${values.disposition}\n\nCATATAN: ${values.eventNotes || '-'}`.trim();

      const result = await callAppsScript({
        action: "createEventAndUpload",
        eventData: {
          calendarId: calendarId,
          title: values.eventTitle,
          start: startDateTime.toISOString(),
          end: new Date(startDateTime.getTime() + 60 * 60 * 1000).toISOString(),
          description: description,
          location: values.eventLocation,
        },
        fileData: fileData,
        folderId: folderId
      });

      if (!result || !result.success) {
        throw new Error(result?.error || "Gagal menyimpan ke Google.");
      }

      toast({ title: "Sukses!", description: "Agenda telah ditambahkan ke kalender dan file telah diunggah." });
      form.reset();
      setInvitationFile(null);

    } catch (error: any) {
      console.error("Submit Error:", error);
      toast({ 
          variant: "destructive", 
          title: "Gagal Simpan", 
          description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  if (!mounted) return null;

  return (
    <Card className="border-none shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Formulir Input Agenda</CardTitle>
        <CardDescription>Isi detail acara atau pindai dari undangan PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {!userData?.agendaFolderId && invitationFile && (
              <Alert className="bg-blue-50 border-blue-100">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-[10px] font-bold text-blue-800 uppercase">
                  ID Folder belum diatur di Pengaturan. File akan diunggah ke folder utama (My Drive).
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Jenis Kegiatan</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Internal" /></FormControl>
                        <FormLabel className="font-medium">Internal</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Eksternal" /></FormControl>
                        <FormLabel className="font-medium">Eksternal</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Undangan (Opsional)</FormLabel>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1 justify-start gap-2 h-12 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="h-4 w-4" />
                  <span className="truncate">{invitationFile ? invitationFile.name : "Pilih File PDF..."}</span>
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                <Button type="button" onClick={handleScanPdf} disabled={isScanning || !invitationFile} className="h-12 rounded-xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Pindai AI
                </Button>
              </div>
            </div>

            <FormField control={form.control} name="eventTitle" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Acara / Perihal</FormLabel>
                <FormControl><Input placeholder="Contoh: Rapat Koordinasi Stunting" {...field} className="h-12 rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="eventDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Hari / Tanggal</FormLabel>
                  <FormControl><Input type="date" {...field} className="h-12 rounded-xl" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="eventTime" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Waktu</FormLabel>
                  <FormControl><Input type="time" {...field} className="h-12 rounded-xl" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="eventLocation" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Tempat</FormLabel>
                <FormControl><Input placeholder="Contoh: Balai Desa Rungkang" {...field} className="h-12 rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField
              control={form.control}
              name="disposition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><UserCheck className="h-4 w-4"/> Disposisi (Petugas)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder={isPersonnelLoading ? "Memuat data..." : "Pilih Perangkat Desa..."} />
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

            <FormField control={form.control} name="eventNotes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Catatan Tambahan (Opsional)</FormLabel>
                <FormControl><Textarea placeholder="Catatan atau deskripsi singkat acara..." {...field} className="min-h-[100px] rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <Alert className="bg-amber-50 border-amber-200 rounded-2xl">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <AlertTitle className="font-bold text-amber-800">Solusi Gagal Simpan</AlertTitle>
              <AlertDescription className="text-[10px] text-amber-700 font-medium uppercase leading-relaxed">
                Jika error 'Akses Ditolak', pastikan ID Kalender/Folder di Pengaturan sudah benar dan jalankan fungsi <strong>'forceGrantAllPermissions'</strong> di Editor Skrip.
              </AlertDescription>
            </Alert>

            <Button type="submit" disabled={isSaving} className="w-full h-14 gap-2 text-base font-black uppercase shadow-lg shadow-primary/20 rounded-2xl">
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Simpan Agenda
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
