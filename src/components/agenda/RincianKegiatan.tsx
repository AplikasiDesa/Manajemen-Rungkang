"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  RefreshCw, 
  Loader2, 
  Copy, 
  Calendar as CalendarIcon,
  Send,
  BookUser
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { GOOGLE_CONFIG } from "@/lib/google-config"

// Definisikan tipe untuk acara
interface CalendarEvent {
  id: string;
  summary: string;
  location: string;
  htmlLink: string;
  start: { dateTime: string };
  end: { dateTime: string };
  description: string;
}

export function RincianKegiatan() {
  const [searchDate, setSearchDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [searchEvents, setSearchEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [notulensi, setNotulensi] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const fetchAgendaData = useCallback(async (date: string) => {
    setIsSearching(true)
    setSearchEvents([])
    setSelectedEvent(null) // Reset pilihan saat mencari tanggal baru
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const payload = {
        action: 'getCalendar',
        calendarId: GOOGLE_CONFIG.calendarId,
        date: date
      };

      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify(payload),
        redirect: "follow"
      });
      
      clearTimeout(timeoutId);
      const res = await response.json();
      
      if (res && res.success && res.items) {
        setSearchEvents(res.items);
        if (res.items.length === 0) {
          toast({ variant: "default", title: "Informasi", description: `Tidak ada agenda ditemukan pada tanggal ${format(new Date(date), "dd MMM yyyy")}.` })
        }
      } else {
        throw new Error(res.error || "Gagal memproses data dari Google.");
      }

    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Mencari Agenda", description: err.message })
    } finally {
      setIsSearching(false);
    }
  }, [toast])

  useEffect(() => {
    // Fetch data untuk hari ini saat komponen pertama kali dimuat
    fetchAgendaData(format(new Date(), "yyyy-MM-dd"));
  }, [fetchAgendaData])

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    // Cek apakah notulensi sudah ada di deskripsi
    const notulenMatch = event.description?.match(/\n\n--- NOTULENSI ---\n([\s\S]*)/);
    setNotulensi(notulenMatch ? notulenMatch[1] : "");
  }

  const handleSaveNotulensi = async () => {
    if (!selectedEvent || !notulensi) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: "Pilih acara dan isi notulensi terlebih dahulu." });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        action: 'updateEventDescription',
        calendarId: GOOGLE_CONFIG.calendarId,
        eventId: selectedEvent.id,
        newContent: notulensi
      };

      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Gagal memperbarui acara.');
      }

      toast({ title: "Berhasil", description: "Notulensi berhasil disimpan ke Google Calendar." });
      // Refresh data acara untuk mendapatkan deskripsi terbaru
      fetchAgendaData(searchDate);

    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      
      {/* Kolom Kiri: Pencarian dan Daftar Acara */}
      <div className="space-y-6">
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white">
            <CardContent className="p-8 space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Pilih Tanggal Agenda</Label>
              <div className="flex gap-3">
                <Input 
                  type="date" 
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold text-slate-700 text-base"
                />
                <Button 
                  onClick={() => fetchAgendaData(searchDate)}
                  disabled={isSearching}
                  className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/20"
                >
                  <RefreshCw className={cn("h-5 w-5", isSearching && "animate-spin")} />
                </Button>
              </div>
            </CardContent>
        </Card>

        <div className="space-y-2">
          {isSearching ? (
            <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary/30 mx-auto" /></div>
          ) : searchEvents.length > 0 ? (
            searchEvents.map((event) => (
              <button 
                key={event.id} 
                onClick={() => handleSelectEvent(event)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl bg-white border shadow-sm transition-all hover:border-primary/60 hover:bg-primary/5",
                  selectedEvent?.id === event.id && "bg-primary/5 border-primary/80 ring-2 ring-primary/20"
                )}
              >
                <p className="font-bold text-sm text-slate-800">{event.summary}</p>
                <p className="text-xs text-muted-foreground font-medium">{event.location || "Lokasi belum diatur"}</p>
              </button>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-2xl">
                <p className="text-sm font-semibold text-muted-foreground">Tidak ada agenda ditemukan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Kolom Kanan: Rincian dan Input Notulensi */}
      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white lg:sticky lg:top-8">
        <CardHeader className="border-b">
            <div className="flex items-center gap-3">
                <BookUser className="h-6 w-6 text-primary" />
                <div>
                    <CardTitle className="text-lg font-black uppercase">Rincian & Notulensi</CardTitle>
                    <CardDescription>Pilih acara dari daftar untuk melihat detail dan mengisi notulensi.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {selectedEvent ? (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <Label className="text-xs text-muted-foreground">Judul Kegiatan</Label>
                <p className="font-bold text-primary">{selectedEvent.summary}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Waktu</Label>
                <p className="font-semibold">{format(parseISO(selectedEvent.start.dateTime), "HH:mm", { locale: localeID })} - {format(parseISO(selectedEvent.end.dateTime), "HH:mm", { locale: localeID })} WIB</p>
              </div>
               <div>
                <Label className="text-xs text-muted-foreground">Lokasi</Label>
                <p className="font-semibold">{selectedEvent.location || "-"}</p>
              </div>
              <div>
                <Label htmlFor="notulensi" className="text-xs text-muted-foreground">Notulensi / Catatan Rapat</Label>
                <Textarea
                  id="notulensi"
                  value={notulensi}
                  onChange={(e) => setNotulensi(e.target.value)}
                  placeholder="Tulis hasil rapat atau catatan penting di sini..."
                  className="min-h-[200px] mt-1"
                />
              </div>
              <Button onClick={handleSaveNotulensi} disabled={isSaving || !notulensi} className="w-full gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                Simpan Notulensi ke Kalender
              </Button>
            </div>
          ) : (
            <div className="text-center py-20">
                <p className="text-sm font-semibold text-muted-foreground">Pilih satu acara untuk memulai.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
