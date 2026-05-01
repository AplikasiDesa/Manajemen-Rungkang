
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
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Dashboard Desa
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Selamat datang di sistem manajemen Desa Rungkang.</p>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-card rounded-3xl overflow-hidden border-primary/10">
          <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Laporan</p>
            <FileText className="h-5 w-5 text-primary opacity-70" />
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="text-3xl font-black text-primary">{kegiatans?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Histori Aktif</p>
          </CardContent>
        </Card>
        
        <Card className="border shadow-sm bg-card rounded-3xl overflow-hidden border-primary/10">
          <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SPPD</p>
            <Map className="h-5 w-5 text-accent opacity-70" />
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="text-3xl font-black text-accent">{sppds?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Pengajuan</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card rounded-3xl overflow-hidden border-primary/10">
          <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anggaran</p>
            <TrendingUp className="h-5 w-5 text-primary opacity-70" />
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="text-3xl font-black text-primary">85%</div>
            <p className="text-[10px] text-primary/70 font-black mt-2 uppercase tracking-tighter">Realisasi 2026</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card rounded-3xl overflow-hidden border-primary/10">
          <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hadir</p>
            <Users className="h-5 w-5 text-sky-500 opacity-70" />
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="text-3xl font-black text-sky-500">100%</div>
            <p className="text-[10px] text-sky-500/70 font-black mt-2 uppercase tracking-tighter">Staff Aktif</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-xl border overflow-hidden bg-card rounded-[2rem] border-primary/5">
            <CardHeader className="p-6 border-b border-border bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Agenda Hari Ini</CardTitle>
                  <CardDescription>Sinkronisasi kalender desa</CardDescription>
                </div>
                <RefreshCw 
                  className={cn("h-4 w-4 text-primary cursor-pointer", isAgendaLoading && "animate-spin")} 
                  onClick={fetchTodayAgenda}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isAgendaLoading ? (
                  <div className="p-10 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
                    <p className="text-xs text-muted-foreground">Menghubungkan...</p>
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
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">{agenda.location || "Balai Desa"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold border-primary/20 text-primary">AKTIF</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground font-medium italic">Tidak ada agenda hari ini.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Riwayat Terbaru</h3>
              <Button variant="ghost" size="sm" asChild className="text-primary font-bold">
                <Link href="/kegiatan/" className="flex items-center gap-1">
                  Lihat Semua <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {isKegiatanLoading ? (
                <div className="col-span-full py-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
                  <p className="text-xs text-muted-foreground">Sinkronisasi data...</p>
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
                <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl border-primary/10">
                  <p className="text-sm text-muted-foreground italic">Belum ada histori tercatat.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border shadow-xl bg-card rounded-[2rem] border-primary/5 overflow-hidden">
            <CardHeader className="p-6 bg-primary/5">
              <CardTitle className="text-lg">Aksi Cepat</CardTitle>
              <CardDescription>Input data terpadu</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Dialog open={isKegiatanOpen} onOpenChange={setIsKegiatanOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 justify-start gap-4 text-base shadow-lg rounded-2xl bg-primary hover:bg-primary/90">
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Plus className="h-6 w-6" />
                    </div>
                    Input Laporan Desa
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Input Laporan</DialogTitle>
                    <DialogDescription>Dokumentasikan kegiatan pembangunan atau sosial.</DialogDescription>
                  </DialogHeader>
                  <KegiatanUpload onSuccess={() => setIsKegiatanOpen(false)} />
                </DialogContent>
              </Dialog>

              <Dialog open={isSppdOpen} onOpenChange={setIsSppdOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-14 justify-start gap-4 text-base border-primary/20 rounded-2xl hover:bg-primary/5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Map className="h-6 w-6 text-primary" />
                    </div>
                    Pengajuan SPPD
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Pengajuan SPPD</DialogTitle>
                    <DialogDescription>Input rincian biaya perjalanan dinas.</DialogDescription>
                  </DialogHeader>
                  <SppdUpload onSuccess={() => setIsSppdOpen(false)} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="font-black text-primary uppercase tracking-tight">Status Pengajuan</h3>
            <div className="space-y-3">
              {sppds && sppds.length > 0 ? (
                sppds.map((sppd, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:border-primary/30 transition-all shadow-sm">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                      sppd.approvalStatus === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {sppd.approvalStatus === 'approved' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{sppd.description || "Dinas Luar"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[9px] font-bold text-muted-foreground uppercase truncate">{sppd.destination || "-"}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-20" />
                  </div>
                ))
              ) : (
                <div className="p-10 text-center border-2 border-dashed rounded-2xl text-muted-foreground border-primary/10">
                  <p className="text-xs">Tidak ada pengajuan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
