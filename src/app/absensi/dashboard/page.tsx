
"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase"
import { doc, collection, query, where, orderBy, setDoc, limit } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  LogOut, 
  Calendar as CalendarIcon,
  Navigation,
  Timer,
  RefreshCw,
  Clock,
  Filter,
  UserCheck,
  Home
} from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { calculateDistance, isHoliday, isWorkDay, parseTime } from "@/lib/attendance-utils"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const DAYS_MAP = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export default function AbsensiDashboard() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [isLocLoading, setIsLocLoading] = useState(false)
  const [isAbsenLoading, setIsAbsenLoading] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)

  const [filterStart, setFilterStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [filterEnd, setFilterEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace("/absensi/login/")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // PROFIL: Selalu sinkron dengan data yang dikelola Admin di Manajemen Akun
  const profileQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "personel"), where("uid", "==", user.uid), limit(1))
  }, [db, user])
  const { data: profileDocs, isLoading: isProfileLoading } = useCollection(profileQuery)
  const personelData = profileDocs && profileDocs.length > 0 ? profileDocs[0] : null

  const settingsRef = useMemoFirebase(() => 
    (db && user) ? doc(db, "absensi_settings", "global") : null, 
  [db, user])
  const { data: settings } = useDoc(settingsRef)

  const todayStr = format(new Date(), "yyyy-MM-dd")
  const absenId = user ? `${user.uid}_${todayStr}` : ""
  
  // REAL-TIME: Pantau data absensi hari ini (bisa dari input Admin atau HP)
  const todayAbsenRef = useMemoFirebase(() => 
    (db && user && absenId) ? doc(db, "absensi", absenId) : null, 
  [db, user, absenId])
  const { data: todayAbsen } = useDoc(todayAbsenRef)

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "absensi"),
      where("personel_id", "==", user.uid),
      where("tanggal", ">=", filterStart),
      where("tanggal", "<=", filterEnd),
      orderBy("tanggal", "desc")
    )
  }, [db, user, filterStart, filterEnd])

  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery)

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out error", error);
    }
  }

  const getGeolocation = useCallback(() => {
    setIsLocLoading(true)
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "GPS Error", description: "Browser tidak mendukung lokasi." })
      setIsLocLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(coords)
        if (settings?.lokasi_kantor) {
          const d = calculateDistance(coords.lat, coords.lng, settings.lokasi_kantor.lat, settings.lokasi_kantor.lng)
          setDistance(d)
        }
        setIsLocLoading(false)
      },
      (err) => {
        toast({ variant: "destructive", title: "GPS Gagal", description: "Izinkan akses lokasi." })
        setIsLocLoading(false)
      },
      { enableHighAccuracy: true }
    )
  }, [settings, toast])

  useEffect(() => {
    if (settings && !location) getGeolocation()
  }, [settings, location, getGeolocation])

  const handleAbsenMasuk = async () => {
    if (!user || !settings || !location || !db || !personelData) return
    
    if (personelData.aktif === false) {
        toast({ variant: "destructive", title: "Akun Dinonaktifkan" });
        return;
    }

    if (distance !== null && distance > (settings.radius_lokasi || 100)) {
      toast({ variant: "destructive", title: "Luar Jangkauan", description: "Anda berada di luar radius kantor." })
      return
    }

    setIsAbsenLoading(true)
    const todayDayName = DAYS_MAP[currentTime.getDay()];
    const todaySchedule = settings.jadwal?.[todayDayName] || { masuk: settings.jam_masuk, pulang: settings.jam_pulang };
    const jamMasukSetting = parseTime(todaySchedule.masuk || "08:00")
    const limitMasuk = new Date(jamMasukSetting.getTime() + ((settings.toleransi_telat || 0) * 60000))
    const status = currentTime > limitMasuk ? "telat" : "hadir"

    try {
      await setDoc(doc(db, "absensi", absenId), {
        id: absenId,
        personel_id: user.uid,
        nama: personelData.nama || "Perangkat Desa",
        tanggal: todayStr,
        jam_masuk: format(currentTime, "HH:mm:ss"),
        status: status,
        lokasi_masuk: location,
        created_at: new Date().toISOString()
      }, { merge: true })
      toast({ title: "Absen Berhasil", description: status.toUpperCase() })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan" })
    } finally {
      setIsAbsenLoading(false)
    }
  }

  const handleAbsenPulang = async () => {
    if (!user || !todayAbsen || !location || !db) return
    setIsAbsenLoading(true)
    try {
      await setDoc(doc(db, "absensi", absenId), {
        jam_pulang: format(currentTime, "HH:mm:ss"),
        lokasi_pulang: location,
      }, { merge: true })
      toast({ title: "Absen Pulang Berhasil" })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Simpan" })
    } finally {
      setIsAbsenLoading(false)
    }
  }

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary/20 mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Sesi...</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  const inRadius = distance !== null && distance <= (settings?.radius_lokasi || 100)
  const todayDayName = DAYS_MAP[currentTime.getDay()];
  const displaySchedule = settings?.jadwal?.[todayDayName] || { masuk: settings?.jam_masuk, pulang: settings?.jam_pulang };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Portal Absensi</h1>
            <div className="mt-0.5">
              <p className="text-xs font-black text-slate-800 uppercase leading-tight">{personelData?.nama || "PENGGUNA"}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">{personelData?.jabatan || "PERANGKAT DESA"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/")} className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"><Home className="h-5 w-5" /></button>
          <button onClick={handleLogout} className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-all"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <section className="bg-primary text-primary-foreground p-8 rounded-[2.5rem] shadow-2xl shadow-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10"><Timer className="h-32 w-32" /></div>
        <div className="relative z-10 space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">{format(currentTime, "EEEE, d MMMM yyyy", { locale: localeID })}</p>
          <h2 className="text-6xl font-black tracking-tighter">{format(currentTime, "HH:mm")}<span className="text-xl ml-2 opacity-60">{format(currentTime, "ss")}</span></h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <MapPin className="h-3 w-3" />
              <p className="text-[9px] font-bold uppercase">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "GPS OFF"}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <Clock className="h-3 w-3" />
              <p className="text-[9px] font-bold uppercase">JADWAL: {displaySchedule?.masuk || '--'} - {displaySchedule?.pulang || '--'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden">
          <div className="p-5 space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Masuk</p>
            <p className="text-2xl font-black text-primary">{todayAbsen?.jam_masuk || "--:--"}</p>
            {todayAbsen?.status && (
              <Badge variant="outline" className={cn(
                "text-[8px] font-black uppercase mt-1", 
                todayAbsen.status === 'telat' ? 'text-red-500 border-red-200' : 
                todayAbsen.status === 'hadir' ? 'text-green-500 border-green-200' :
                todayAbsen.status === 'izin' || todayAbsen.status === 'dinas_luar' ? 'text-blue-500 border-blue-200' :
                'text-slate-500 border-slate-200'
              )}>
                {todayAbsen.status}
              </Badge>
            )}
          </div>
        </Card>
        <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden">
          <div className="p-5 space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Pulang</p>
            <p className="text-2xl font-black text-primary">{todayAbsen?.jam_pulang || "--:--"}</p>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {!todayAbsen?.jam_masuk ? (
          <Button 
            onClick={handleAbsenMasuk} 
            disabled={isAbsenLoading || isLocLoading || !inRadius || personelData?.aktif === false}
            className="w-full h-20 rounded-3xl text-lg font-black uppercase shadow-xl shadow-primary/20 gap-3"
          >
            {isAbsenLoading ? <Loader2 className="animate-spin" /> : <Navigation className="h-6 w-6" />}
            {personelData?.aktif === false ? 'AKUN NONAKTIF' : 'Absen Masuk'}
          </Button>
        ) : !todayAbsen?.jam_pulang ? (
          <Button 
            onClick={handleAbsenPulang} 
            disabled={isAbsenLoading || isLocLoading}
            variant="outline"
            className="w-full h-20 rounded-3xl text-lg font-black uppercase border-primary/20 text-primary hover:bg-primary/5 gap-3"
          >
            {isAbsenLoading ? <Loader2 className="animate-spin" /> : <Navigation className="h-6 w-6 rotate-180" />}
            Absen Pulang
          </Button>
        ) : (
          <div className="bg-green-50 border border-green-100 p-6 rounded-3xl text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-sm font-black text-green-800 uppercase">Sudah Absen Hari Ini</p>
          </div>
        )}

        <div className={cn("p-4 rounded-2xl flex items-center gap-3 border transition-colors", inRadius ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}>
          {inRadius ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-slate-800">{inRadius ? "Dalam Radius Kantor" : "Luar Radius Kantor"}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase">{distance ? `${Math.round(distance)} meter dari kantor` : "Mengecek jangkauan..."}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={getGeolocation} disabled={isLocLoading} className="h-8 w-8"><RefreshCw className={cn("h-4 w-4", isLocLoading && "animate-spin")} /></Button>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-1"><CalendarIcon className="h-4 w-4" /> Riwayat Kehadiran</h3>
        <div className="grid gap-3">
          {isHistoryLoading ? (
            <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary/20 mx-auto" /></div>
          ) : (history || []).map((h) => (
            <div key={h.id} className="p-4 bg-white border rounded-2xl shadow-sm flex items-center justify-between group hover:border-primary/40 transition-all">
              <div>
                <p className="text-xs font-bold text-slate-800">{format(new Date(h.tanggal), "EEEE, d MMM", { locale: localeID })}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">{h.jam_masuk} - {h.jam_pulang || "---"}</p>
              </div>
              <Badge className={cn(
                "text-[9px] font-black uppercase shadow-none", 
                h.status === 'hadir' ? 'bg-green-500' : 
                h.status === 'telat' ? 'bg-orange-500' :
                h.status === 'izin' || h.status === 'dinas_luar' ? 'bg-blue-500' :
                'bg-red-500'
              )}>{h.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
