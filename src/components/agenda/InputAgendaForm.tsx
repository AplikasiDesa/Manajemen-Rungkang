
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
import { FileUp, Loader2, Sparkles, Save, AlertCircle, UserCheck } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { performInvitationScan } from "@/app/agenda/actions"
import { format } from "date-fns"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import Link from "next/link"
import { OFFICIALS } from "@/lib/personel-data"

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

const perangkatDesa = OFFICIALS.filter(p => p.category === "Pemerintah Desa");

export function InputAgendaForm() {
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [invitationFile, setInvitationFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  const { user } = useUser()
  const db = useFirestore()
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  const { data: userData } = useDoc(userDocRef);

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
      if (file.size > 700 * 1024) { // 700KB limit
        toast({
          variant: "destructive",
          title: "File Terlalu Besar",
          description: "Ukuran file undangan PDF tidak boleh melebihi 700KB."
        })
        return
      }
      setInvitationFile(file)
      toast({ title: "Undangan Terpilih", description: `File "${file.name}" siap untuk dipindai.` })
    }
  }

  const handleScanPdf = async () => {
    if (!invitationFile) {
      toast({ variant: "destructive", title: "Tidak Ada File", description: "Harap pilih file undangan PDF terlebih dahulu." })
      return
    }

    setIsScanning(true)
    try {
      const pdfDataUri = await fileToBase64(invitationFile);
      const result = await performInvitationScan({ pdfDataUri });

      if (result.success && result.data) {
        form.setValue("eventTitle", result.data.eventTitle, { shouldValidate: true })
        form.setValue("eventDate", result.data.eventDate, { shouldValidate: true })
        form.setValue("eventTime", result.data.eventTime, { shouldValidate: true })
        form.setValue("eventLocation", result.data.eventLocation, { shouldValidate: true })
        if (result.data.eventNotes) {
          form.setValue("eventNotes", result.data.eventNotes, { shouldValidate: true })
        }
        toast({ title: "Pemindaian Berhasil", description: "Formulir telah diisi otomatis dari undangan." })
      } else {
        throw new Error(result.error || "Gagal mendapatkan data dari AI.")
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Pemindaian Gagal", description: error.message || "Terjadi kesalahan saat memindai PDF." })
    } finally {
      setIsScanning(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
      const calendarId = userData?.googleCalendarId;
      const folderId = userData?.agendaFolderId;

      if (!calendarId || !folderId) {
        toast({
          variant: "destructive",
          title: "Konfigurasi Tidak Lengkap",
          description: (
            <span>
              Harap atur ID Google Kalender dan ID Folder Agenda di halaman{' '}
              <Link href="/settings" className="underline font-bold">Pengaturan</Link> terlebih dahulu.
            </span>
          ),
          duration: 9000
        });
        return;
      }

      if (!GOOGLE_CONFIG.appsScriptUrl) {
        throw new Error("URL Apps Script belum dikonfigurasi.");
      }

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
      
      const description = `Disposisi: ${values.disposition}\n\n${values.eventNotes || ''}`.trim();

      const payload = {
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
      };

      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
        redirect: "follow"
      });
      
      const resultText = await response.text();
      const result = JSON.parse(resultText);

      if (!result.success) {
        const errorMessage = result.error || "Gagal menyimpan data ke Google.";
        throw new Error(errorMessage);
      }

      toast({ title: "Sukses!", description: "Agenda telah ditambahkan ke kalender dan file telah diunggah." });
      form.reset();
      setInvitationFile(null);

    } catch (error: any) {
      console.error("Submit Error:", error);
      toast({ 
          variant: "destructive", 
          title: "Gagal Menyimpan", 
          description: error.message || "Terjadi kesalahan yang tidak diketahui."
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  if (!mounted) {
    return null;
  }

  return (
    <Card className="border-none shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Formulir Input Agenda</CardTitle>
        <CardDescription>Isi detail acara atau pindai dari undangan PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Button type="button" variant="outline" className="flex-1 justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="h-4 w-4" />
                  {invitationFile ? invitationFile.name : "Pilih File PDF..."}
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                <Button type="button" onClick={handleScanPdf} disabled={isScanning || !invitationFile} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Pindai dengan AI
                </Button>
              </div>
            </div>

            <FormField control={form.control} name="eventTitle" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Acara / Perihal</FormLabel>
                <FormControl><Input placeholder="Contoh: Rapat Koordinasi Stunting" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="eventDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Hari / Tanggal</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="eventTime" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Waktu</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="eventLocation" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Tempat</FormLabel>
                <FormControl><Input placeholder="Contoh: Balai Desa Rungkang" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField
              control={form.control}
              name="disposition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><UserCheck className="h-4 w-4"/> Disposisi</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih perangkat desa yang ditugaskan..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {perangkatDesa.map(personel => (
                        <SelectItem key={personel.name} value={`${personel.name} (${personel.jabatan})`}>
                          {personel.name} - <span className="text-muted-foreground">{personel.jabatan}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="eventNotes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Catatan Tambahan (Opsional)</FormLabel>
                <FormControl><Textarea placeholder="Catatan atau deskripsi singkat acara..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Perhatian</AlertTitle>
              <AlertDescription className="text-xs">
                Dengan menekan "Simpan", acara akan ditambahkan ke Google Calendar dan file undangan akan diunggah ke Google Drive sesuai ID yang Anda masukkan di halaman Pengaturan.
              </AlertDescription>
            </Alert>

            <Button type="submit" disabled={isSaving} className="w-full h-12 gap-2 text-base font-bold">
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Simpan Agenda
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
