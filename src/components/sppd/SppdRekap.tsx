
"use client"

import { useCollection, useUser, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, Clock, Loader2, Wallet, ChevronRight, Users, FileText, TrendingUp, AlertCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SppdRekap() {
  const { user } = useUser()
  const db = useFirestore()

  const sppdQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "users", user.uid, "sppds")
  }, [db, user])

  const { data: sppds, isLoading, error } = useCollection(sppdQuery)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card rounded-3xl border border-accent/10">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sinkronisasi Data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center space-y-4 bg-card rounded-3xl border border-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-xs font-bold text-destructive uppercase">Koneksi Bermasalah</p>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Coba Lagi</Button>
      </div>
    )
  }

  const totalAmount = (sppds || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  const totalPersonel = (sppds || []).reduce((acc, curr) => {
    const companionsCount = curr.companions ? curr.companions.split("\n").filter(Boolean).length : 0
    return acc + 1 + companionsCount
  }, 0)
  const approvedCount = (sppds || []).filter(s => s.approvalStatus === "approved").length
  const pendingCount = (sppds || []).length - approvedCount

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-none bg-gradient-to-br from-accent to-accent/80 text-accent-foreground shadow-xl rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Wallet className="h-20 w-20" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Realisasi Anggaran</p>
            <h2 className="text-2xl font-black mt-1">
              Rp {new Intl.NumberFormat('id-ID').format(totalAmount)}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <Badge className="bg-accent-foreground/20 hover:bg-accent-foreground/30 text-accent-foreground border-none font-bold text-[9px] rounded-full">
                TAHUN ANGGARAN 2026
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-card shadow-xl rounded-3xl border border-accent/10">
          <CardContent className="p-6 grid grid-cols-2 gap-4 h-full">
            <div className="flex flex-col justify-center items-center text-center border-r border-border">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase">Total Personel</p>
              <h3 className="text-xl font-black text-accent">{totalPersonel}</h3>
            </div>
            <div className="flex flex-col justify-center items-center text-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase">Total Berkas</p>
              <h3 className="text-xl font-black text-primary">{sppds?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20 text-center">
          <p className="text-[8px] font-black text-green-400 uppercase mb-1">Disetujui</p>
          <p className="text-lg font-black text-green-500">{approvedCount}</p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-center">
          <p className="text-[8px] font-black text-yellow-400 uppercase mb-1">Proses</p>
          <p className="text-lg font-black text-yellow-500">{pendingCount}</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-2xl border-blue-500/20 text-center">
          <p className="text-[8px] font-black text-primary uppercase mb-1">Efisiensi</p>
          <p className="text-lg font-black text-primary">92%</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-black text-accent uppercase tracking-tight text-xs flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Riwayat Perjalanan Terakhir
          </h3>
        </div>
        <div className="grid gap-3">
          {sppds && sppds.length > 0 ? (
            sppds.map((sppd) => (
              <div key={sppd.id} className="flex items-start gap-4 p-4 rounded-2xl border bg-card hover:border-accent/30 transition-all cursor-pointer group shadow-sm border-accent/5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  sppd.approvalStatus === "approved" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                }`}>
                  {sppd.approvalStatus === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-black text-xs text-accent leading-tight whitespace-normal break-words group-hover:text-primary transition-colors">
                      {sppd.description || "Kegiatan Dinas"}
                    </h3>
                    <span className="font-black text-[10px] text-accent shrink-0 mt-0.5">
                      Rp {new Intl.NumberFormat('id-ID').format(Number(sppd.amount) || 0)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      <span>{sppd.destination || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{sppd.startDate || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{(sppd.officialName || "").split(' - ')[0] || "-"}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-10 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-card border-border">
              <p className="font-bold text-xs uppercase tracking-widest">Belum ada riwayat pengajuan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
