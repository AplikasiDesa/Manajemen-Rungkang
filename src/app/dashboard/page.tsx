"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  FileText, 
  Map, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Users,
  LayoutDashboard,
  RefreshCw,
  Loader2,
  MapPin
} from "lucide-react"
import { KegiatanCard } from "@/components/kegiatan/KegiatanCard"
import { KegiatanUpload } from "@/components/kegiatan/KegiatanUpload"
import { SppdUpload } from "@/components/sppd/SppdUpload"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from "next/link"
import { useUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [isKegiatanOpen, setIsKegiatanOpen] = useState(false)
  const [isSppdOpen, setIsSppdOpen] = useState(false)
  const [todayAgenda, setTodayAgenda] = useState<any[]>([])
  const [isAgendaLoading, setIsAgendaLoading] = useState(false)
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchTodayAgenda = useCallback(async () => {
    if (!GOOGLE_CONFIG.appsScriptUrl || !GOOGLE_CONFIG.appsScriptUrl.startsWith('http')) {
      return;
    }
    
    setIsAgendaLoading(true);
    try {
      const localDateStr = format(new Date(), "yyyy-MM-dd");
      const payload = {
        action: 'getCalendar',
        calendarId: GOOGLE_CONFIG.calendarId,
        date: localDateStr
      };

      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        redirect: "follow"
      });
      
      const resultText = await response.text();
      const res = JSON.parse(resultText);
      
      if (res && res.success && res.items) {
        setTodayAgenda(res.items);
      } else {
        setTodayAgenda([]);
      }
    } catch (err) {
      console.warn("Dashboard Agenda fetch error:", err);
      setTodayAgenda([]);
    } finally {
      setIsAgendaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchTodayAgenda();
    }
  }, [mounted, fetchTodayAgenda]);

  const kegiatanQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "users", user.uid, "kegiatans"),
      orderBy("uploadDate", "desc"),
      limit(2)
    )
  }, [db, user])

  const { data: kegiatans, isLoading: isKegiatanLoading } = useCollection(kegiatanQuery)

  const sppdQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "users", user.uid, "sppds"),
      orderBy("expenseDate", "desc"),
      limit(3)
    )
  }, [db, user])

  const { data: sppds } = useCollection(sppdQuery)

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-0 md:p-4">
      <header className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary hidden md:block" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Selamat datang, {user?.email?.split('@')[0]}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none shadow-sm bg-primary/5 rounded-[1.5rem] overflow-hidden">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/70">Laporan</p>
            <FileText className="h-4 w-4 text-primary opacity-70" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-primary">{kegiatans?.length || 0}</div>
            <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Total Aktif</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-accent/5 rounded-[1.5rem] overflow-hidden">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-accent/70">SPPD</p>
            <Map className="h-4 w-4 text-accent opacity-70" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-accent">{sppds?.length || 0}</div>
            <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Pengajuan</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-sky-500/5 rounded-[1.5rem] overflow-hidden">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-sky-500/70">Realisasi</p>
            <TrendingUp className="h-4 w-4 text-sky-500 opacity-70" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-sky-500">85%</div>
            <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Anggaran 2026</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-emerald-500/5 rounded-[1.5rem] overflow-hidden">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70">Staff</p>
            <Users className="h-4 w-4 text-emerald-500 opacity-70" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-emerald-500">100%</div>
            <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Kehadiran</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-none overflow-hidden bg-card rounded-[2rem]">
            <CardHeader className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Agenda Hari Ini</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase">Sinkronisasi Google Calendar</CardDescription>
                </div>
                <RefreshCw 
                  className={cn("h-4 w-4 text-primary cursor-pointer active:rotate-180 transition-transform", isAgendaLoading && "animate-spin")} 
                  onClick={fetchTodayAgenda}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isAgendaLoading ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Menghubungkan...</p>
                  </div>
                ) : todayAgenda.length > 0 ? (
                  todayAgenda.map((agenda, i) => (
                    <div key={i} className="p-4 flex items-center gap-4 hover:bg-muted transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{agenda.summary}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground uppercase font-bold truncate">{agenda.location || "Balai Desa"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary shrink-0">AKTIF</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center flex flex-col items-center gap-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground italic">Tidak ada agenda hari ini.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-primary uppercase tracking-widest">Riwayat Laporan</h3>
              <Button variant="ghost" size="sm" asChild className="text-primary font-black text-[10px] uppercase">
                <Link href="/kegiatan/" className="flex items-center gap-1">
                  Semua <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {isKegiatanLoading ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : (kegiatans || []).length > 0 ? (
                kegiatans?.map((item) => (
                  <KegiatanCard 
                    key={item.id} 
                    kegiatan={{
                      ...item,
                      imageUrl: item.imageUrls?.[0] === "Tersimpan di Drive" ? "https://picsum.photos/seed/" + item.id + "/600/400" : (item.imageUrls?.[0] || `https://picsum.photos/seed/${item.id}/600/400`)
                    }} 
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed rounded-[1.5rem] border-primary/10">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground italic">Belum ada laporan tercatat.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-5 bg-primary/5 border-b">
              <CardTitle className="text-sm font-black uppercase">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <Dialog open={isKegiatanOpen} onOpenChange={setIsKegiatanOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 justify-start gap-4 text-sm font-black uppercase shadow-lg rounded-2xl bg-primary hover:bg-primary/90">
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Plus className="h-6 w-6" />
                    </div>
                    Input Laporan
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-0 rounded-[2.5rem] border-none shadow-2xl">
                  <div className="p-6">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-xl font-black uppercase text-primary">Input Laporan</DialogTitle>
                      <DialogDescription className="text-[10px] font-bold uppercase">Dokumentasi Digital Desa</DialogDescription>
                    </DialogHeader>
                    <KegiatanUpload onSuccess={() => setIsKegiatanOpen(false)} />
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isSppdOpen} onOpenChange={setIsSppdOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-14 justify-start gap-4 text-sm font-black uppercase border-accent/20 text-accent rounded-2xl hover:bg-accent/5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Map className="h-6 w-6 text-accent" />
                    </div>
                    Pengajuan SPPD
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-0 rounded-[2.5rem] border-none shadow-2xl">
                  <div className="p-6">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-xl font-black uppercase text-accent">Pengajuan SPPD</DialogTitle>
                      <DialogDescription className="text-[10px] font-bold uppercase">Input Rincian Biaya Dinas</DialogDescription>
                    </DialogHeader>
                    <SppdUpload onSuccess={() => setIsSppdOpen(false)} />
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-primary uppercase tracking-widest px-2">Status Dinas</h3>
            <div className="space-y-3">
              {sppds && sppds.length > 0 ? (
                sppds.map((sppd, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-white hover:border-primary/30 transition-all shadow-sm">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                      sppd.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {sppd.approvalStatus === 'approved' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{sppd.description || "Dinas Luar"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase truncate">{sppd.destination || "-"}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-20" />
                  </div>
                ))
              ) : (
                <div className="p-12 text-center border-2 border-dashed rounded-[1.5rem] text-muted-foreground border-primary/10">
                  <p className="text-[10px] font-bold uppercase">Tidak ada pengajuan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
