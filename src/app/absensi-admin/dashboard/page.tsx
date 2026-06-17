"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, where, doc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Search, 
  Info,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
  Clock,
  Timer,
  LayoutList
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, getDaysInMonth, parseISO } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * Utilitas konversi waktu untuk kalkulasi
 */
const timeToSeconds = (t: string) => {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  return (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
};

const formatSeconds = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}|${String(m).padStart(2, '0')}|${String(s).padStart(2, '0')}`;
};

export default function MonitoringAbsensiGrid() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "MM"))
  const [filterYear, setFilterYear] = useState(format(new Date(), "yyyy"))
  const [now, setNow] = useState(new Date())

  // Timer untuk update perhitungan jam kerja real-time setiap detik
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Otorisasi dasar: Jika user ada, kita izinkan tarik data personel (Rules Firestore mengizinkan publik baca)
  const canFetchData = !!(db && user && !isUserLoading);

  // Pengaturan Global
  const settingsRef = useMemoFirebase(() => 
    canFetchData ? doc(db, "absensi_settings", "global") : null, 
  [db, user, isUserLoading, canFetchData])
  const { data: settings } = useDoc(settingsRef)

  // Ambil Master Akun dari koleksi 'personel' (yang diinput di Manajemen Akun)
  const personelRef = useMemoFirebase(() => 
    canFetchData ? query(collection(db, "personel"), orderBy("nama", "asc")) : null, 
  [db, user, isUserLoading, canFetchData])
  const { data: personnelList, isLoading: isPersonelLoading } = useCollection(personelRef)

  // Ambil Data Absensi Bulan Terpilih
  const absensiRef = useMemoFirebase(() => {
    if (!canFetchData) return null;
    const startDate = `${filterYear}-${filterMonth}-01`;
    const endDate = `${filterYear}-${filterMonth}-31`; 
    return query(
        collection(db, "absensi"), 
        where("tanggal", ">=", startDate),
        where("tanggal", "<=", endDate),
        orderBy("tanggal", "asc")
    );
  }, [db, user, isUserLoading, canFetchData, filterMonth, filterYear])
  
  const { data: attendanceData, isLoading: isAttendanceLoading } = useCollection(absensiRef)

  const rekapGrid = useMemo(() => {
    // personnelList harus ada, tapi settings boleh null (pake default)
    if (!personnelList) return []

    const safeSettings = settings || {
        hari_kerja: ['senin', 'selasa', 'rabu', 'kamis', 'jumat'],
        hari_libur: [],
        jam_masuk: "08:00",
        toleransi_telat: 15,
        jadwal: {}
    };

    const workDays = safeSettings.hari_kerja || ['senin', 'selasa', 'rabu', 'kamis', 'jumat'];
    const holidays = safeSettings.hari_libur || [];
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const daysInMonth = getDaysInMonth(new Date(parseInt(filterYear), parseInt(filterMonth) - 1));
    
    const nowSec = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

    return personnelList
      .filter(p => (p.nama || "").toLowerCase().includes(searchTerm.toLowerCase()) && p.role !== 'admin')
      .map(p => {
        const userMonthData: Record<number, any> = {}
        let s = 0, tk = 0, dl = 0
        let totalLatenessSec = 0
        let totalWorkSec = 0

        const uid = p.uid || p.id;

        if (attendanceData && uid) {
            const userAbsen = attendanceData.filter(a => a.personel_id === uid || a.id.startsWith(uid));
            userAbsen.forEach(a => {
                const parts = a.tanggal.split('-');
                if (parts.length === 3) {
                  const d = parseInt(parts[2]);
                  userMonthData[d] = a;
                }
            })
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${filterYear}-${filterMonth}-${d.toString().padStart(2, '0')}`;
            const checkDate = new Date(parseInt(filterYear), parseInt(filterMonth) - 1, d);
            const dayName = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'][checkDate.getDay()];
            
            // Logic Alpha Otomatis
            if (!userMonthData[d]) {
                if (dateStr <= todayStr && workDays.includes(dayName) && !holidays.includes(dateStr)) {
                    userMonthData[d] = { status: 'alpha' };
                }
            }

            const record = userMonthData[d];
            if (record) {
                if (record.status === 'izin') s++;
                if (record.status === 'alpha') tk++;
                if (record.status === 'dinas_luar') dl++;

                // Hitung Keterlambatan
                if (record.jam_masuk && record.status !== 'alpha' && record.status !== 'izin') {
                  const schedIn = safeSettings.jadwal?.[dayName]?.masuk || safeSettings.jam_masuk || "08:00";
                  const schedInSec = timeToSeconds(schedIn);
                  const actualInSec = timeToSeconds(record.jam_masuk);
                  
                  if (actualInSec > (schedInSec + ((safeSettings.toleransi_telat || 0) * 60))) {
                    totalLatenessSec += (actualInSec - schedInSec);
                  }

                  // Hitung Jam Kerja
                  if (record.jam_pulang) {
                    const actualOutSec = timeToSeconds(record.jam_pulang);
                    totalWorkSec += Math.max(0, actualOutSec - actualInSec);
                  } else if (dateStr === todayStr) {
                    // Masih bekerja (Orange status)
                    totalWorkSec += Math.max(0, nowSec - actualInSec);
                  }
                }
            }
        }

        return {
          ...p,
          attendance: userMonthData,
          stats: { s, tk, dl, totalLatenessSec, totalWorkSec },
          hasUid: !!p.uid
        }
      })
  }, [personnelList, attendanceData, searchTerm, settings, filterMonth, filterYear, now])

  const tableHeaderDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Monitoring Absensi</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase mt-1">Database Perangkat Desa • Kalkulasi Waktu Real-time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-48 lg:w-64">
                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400", (isPersonelLoading || isAttendanceLoading) && "animate-spin")} />
                <Input 
                    placeholder="Cari nama..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 h-10 rounded-xl bg-white border-slate-200 font-bold" 
                />
            </div>
            
            <div className="flex items-center gap-1 bg-white border rounded-xl p-1 shadow-sm">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-[120px] h-8 border-none font-bold text-xs bg-transparent focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <SelectItem key={i+1} value={(i+1).toString().padStart(2, '0')} className="font-bold text-xs">
                                {format(new Date(2024, i, 1), "MMMM", { locale: localeID })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="w-px h-4 bg-slate-200" />
                <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="w-[90px] h-8 border-none font-bold text-xs bg-transparent focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {["2024", "2025", "2026", "2027"].map(y => (
                            <SelectItem key={y} value={y} className="font-bold text-xs">{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </header>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
            <div className="overflow-x-auto overflow-y-hidden">
                {(isPersonelLoading) ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                        <p className="text-[10px] font-black uppercase text-slate-400">Sinkronisasi Database...</p>
                    </div>
                ) : (
                <table className="w-full border-collapse text-[10px]">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="px-2 py-3 text-center font-black border border-white/10 min-w-[30px]">NO</th>
                            <th className="px-2 py-3 text-center font-black border border-white/10 min-w-[70px] bg-orange-600">TERLAMBAT</th>
                            <th className="px-2 py-3 text-center font-black border border-white/10 min-w-[70px] bg-emerald-600">JAM KERJA</th>
                            <th className="px-4 py-3 text-left font-black border border-white/10 min-w-[180px]">NAMA AKUN / JABATAN</th>
                            {tableHeaderDays.map(d => (
                                <th key={d} className="w-8 py-3 text-center font-black border border-white/10">{d}</th>
                            ))}
                            <th className="px-2 py-3 text-center font-black border border-white/10 bg-blue-600">S</th>
                            <th className="px-2 py-3 text-center font-black border border-white/10 bg-red-600">TK</th>
                            <th className="px-2 py-3 text-center font-black border border-white/10 bg-indigo-600">DL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rekapGrid.length === 0 ? (
                            <tr>
                                <td colSpan={38} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <AlertCircle className="h-8 w-8 opacity-20" />
                                        <p className="text-xs font-black uppercase">Belum ada akun perangkat terdaftar</p>
                                        <p className="text-[10px]">Silakan tambah akun di Pengaturan &gt; Manajemen Akun</p>
                                    </div>
                                </td>
                            </tr>
                        ) : rekapGrid.map((row, idx) => (
                            <tr key={row.id} className={cn("hover:bg-slate-50 transition-colors border-b", !row.hasUid && "bg-amber-50/30")}>
                                <td className="px-2 py-3 text-center font-bold text-slate-500 border-r">{idx + 1}</td>
                                <td className="px-2 py-3 text-center font-mono font-black text-orange-600 border-r bg-orange-50/30">{formatSeconds(row.stats.totalLatenessSec)}</td>
                                <td className="px-2 py-3 text-center font-mono font-black text-emerald-600 border-r bg-emerald-50/30">{formatSeconds(row.stats.totalWorkSec)}</td>
                                <td className="px-4 py-2 border-r relative group">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-900 uppercase leading-tight truncate max-w-[140px]">{row.nama}</p>
                                        {!row.hasUid ? (
                                            <div className="group/hint relative shrink-0">
                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                                <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-slate-900 text-white text-[9px] rounded-xl opacity-0 group-hover/hint:opacity-100 transition-all whitespace-nowrap z-50 shadow-2xl pointer-events-none">
                                                    <p className="font-black mb-1 text-primary">UID BELUM TERTAUT</p>
                                                    <p className="font-medium opacity-70">Personel harus login minimal sekali di HP<br/>agar datanya sinkron di panel ini.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[8px] text-muted-foreground font-bold uppercase truncate max-w-[160px]">{row.jabatan || 'PERANGKAT DESA'}</p>
                                </td>
                                {tableHeaderDays.map(d => {
                                    const record = row.attendance[d]
                                    const isDayValid = d <= getDaysInMonth(new Date(parseInt(filterYear), parseInt(filterMonth) - 1))
                                    
                                    let statusColor = "bg-white"
                                    if (record) {
                                        if (record.jam_masuk && !record.jam_pulang && record.status !== 'alpha') statusColor = "bg-orange-400"
                                        else if (record.status === 'hadir') statusColor = "bg-green-400"
                                        else if (record.status === 'telat') statusColor = "bg-orange-400"
                                        else if (record.status === 'alpha') statusColor = "bg-red-400"
                                        else if (record.status === 'izin' || record.status === 'dinas_luar') statusColor = "bg-blue-400"
                                    }

                                    return (
                                        <td key={d} className={cn("border-r text-center align-middle p-0.5", !isDayValid && "bg-slate-100")}>
                                            {isDayValid && (
                                                <div className={cn("w-full h-8 flex flex-col items-center justify-center rounded-sm transition-all shadow-inner", statusColor, record ? "text-white" : "text-transparent")}>
                                                    {record?.jam_masuk && <span className="font-black leading-none">{record.jam_masuk.substring(0,5)}</span>}
                                                    {record?.jam_pulang && <span className="font-bold text-[7px] mt-0.5">{record.jam_pulang.substring(0,5)}</span>}
                                                    {record?.status === 'alpha' && <span className="font-black">A</span>}
                                                    {record?.jam_masuk && !record?.jam_pulang && <span className="text-[5px] font-black mt-0.5 animate-pulse">AKTIF</span>}
                                                </div>
                                            )}
                                        </td>
                                    )
                                })}
                                <td className="text-center font-black bg-blue-50 border-r border-slate-200 text-blue-700">{row.stats.s || 0}</td>
                                <td className="text-center font-black bg-red-50 border-r border-slate-200 text-red-600">{row.stats.tk || 0}</td>
                                <td className="text-center font-black bg-indigo-50 border-r border-slate-200 text-indigo-700">{row.stats.dl || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-6 px-6 py-4 bg-white border rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded-sm shadow-inner" />
            <span className="text-[10px] font-black uppercase text-slate-500">Hadir</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400 rounded-sm shadow-inner" />
            <span className="text-[10px] font-black uppercase text-slate-500">Telat / Sedang Bekerja</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded-sm shadow-inner" />
            <span className="text-[10px] font-black uppercase text-slate-500">Alpha / TK</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 rounded-sm shadow-inner" />
            <span className="text-[10px] font-black uppercase text-slate-500">Izin / DL / CT</span>
        </div>
      </div>
    </div>
  )
}
