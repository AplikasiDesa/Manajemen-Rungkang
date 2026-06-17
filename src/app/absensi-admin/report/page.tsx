
"use client"

import { useState, useMemo } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Printer, 
  FileSpreadsheet, 
  Loader2,
  FileText,
  ChevronRight,
  Download
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, getDaysInMonth } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { generateAttendancePDF } from "@/lib/pdf-attendance-report"
import * as XLSX from "xlsx"

export default function CetakDokumenAbsensi() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "MM"))
  const [filterYear, setFilterYear] = useState(format(new Date(), "yyyy"))
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const isAuthorized = user?.email === "admin@rungkang.id" || user?.email === "rungkang@gmail.id" || user?.email === "desarungkang014@gmail.com";

  // 1. Ambil Data Desa (untuk Logo & Info)
  const villageRef = useMemoFirebase(() => (db && user && isAuthorized) ? doc(db, "settings", "village") : null, [db, user, isAuthorized])
  const { data: villageSettings } = useDoc(villageRef)

  // 2. Ambil Master Personel dari Database Akun
  const personnelRef = useMemoFirebase(() => (db && user && isAuthorized) ? collection(db, "personel") : null, [db, user, isAuthorized])
  const { data: personnelList, isLoading: isPersonnelLoading } = useCollection(personnelRef)

  // 3. Ambil Seluruh Data Absensi
  const absensiRef = useMemoFirebase(() => 
    (db && user && isAuthorized) ? query(collection(db, "absensi"), orderBy("tanggal", "asc")) : null, 
  [db, user, isAuthorized])
  const { data: attendanceData, isLoading: isAttendanceLoading } = useCollection(absensiRef)

  // 4. Ambil Pengaturan Absensi (Hari Kerja & Libur)
  const settingsRef = useMemoFirebase(() => 
    (db && user && isAuthorized) ? doc(db, "absensi_settings", "global") : null, 
  [db, user, isAuthorized])
  const { data: attendanceSettings, isLoading: isSettingsLoading } = useDoc(settingsRef)

  // 5. Logika Rekap Data Laporan & Alpha Otomatis
  const reportData = useMemo(() => {
    if (!personnelList || !attendanceData || !attendanceSettings) return []

    const workDays = attendanceSettings.hari_kerja || ['senin', 'selasa', 'rabu', 'kamis', 'jumat'];
    const holidays = attendanceSettings.hari_libur || [];
    const daysInMonth = getDaysInMonth(new Date(parseInt(filterYear), parseInt(filterMonth) - 1));
    const todayStr = format(new Date(), "yyyy-MM-dd");

    return personnelList
      .filter(p => p.role !== 'admin')
      .map(p => {
        const userMonthData: Record<number, any> = {}
        let s = 0, tk = 0, dl = 0, h = 0, t = 0

        const uid = p.uid || p.id;

        // Cari data absen yang cocok dengan personel ini di bulan terpilih
        const filteredAbsen = attendanceData.filter(a => {
            const matchesId = a.personel_id === uid || a.id.startsWith(uid);
            const matchesMonth = a.tanggal?.startsWith(`${filterYear}-${filterMonth}`);
            return matchesId && matchesMonth;
        })

        // Masukkan data absen real ke dalam kalender bulan
        filteredAbsen.forEach(a => {
          const parts = a.tanggal.split('-');
          if (parts.length === 3) {
            const d = parseInt(parts[2]);
            userMonthData[d] = a;
          }
        })

        // Cek setiap tanggal untuk Alpha Otomatis
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${filterYear}-${filterMonth}-${d.toString().padStart(2, '0')}`;
          
          if (!userMonthData[d]) {
            const checkDate = new Date(parseInt(filterYear), parseInt(filterMonth) - 1, d);
            const dayName = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'][checkDate.getDay()];
            
            // Jika hari kerja, bukan hari libur manual, dan di masa lalu/hari ini
            if (dateStr <= todayStr && workDays.includes(dayName) && !holidays.includes(dateStr)) {
              userMonthData[d] = { status: 'alpha' };
            }
          }

          // Hitung Statistik
          const record = userMonthData[d];
          if (record) {
            // Logika baru: Jika masuk tapi tidak pulang, anggap telat/incomplete (T)
            const isStillWorking = record.jam_masuk && !record.jam_pulang && record.status !== 'alpha' && record.status !== 'izin' && record.status !== 'dinas_luar';
            
            if (record.status === 'izin') s++;
            else if (record.status === 'alpha') tk++;
            else if (record.status === 'dinas_luar') dl++;
            else if (isStillWorking || record.status === 'telat') t++;
            else if (record.status === 'hadir') h++;
          }
        }

        return {
          ...p,
          name: (p.nama || p.username || "-").toUpperCase(),
          jabatan: (p.jabatan || "PERANGKAT DESA").toUpperCase(),
          attendance: userMonthData,
          stats: { h, t, s, tk, dl }
        }
      })
  }, [personnelList, attendanceData, attendanceSettings, filterMonth, filterYear])

  const handleDownloadExcel = () => {
    if (reportData.length === 0) return

    const daysInMonth = getDaysInMonth(new Date(parseInt(filterYear), parseInt(filterMonth) - 1))
    const monthName = format(new Date(2024, parseInt(filterMonth) - 1, 1), "MMMM", { locale: localeID }).toUpperCase()
    
    const excelRows = reportData.map((row, idx) => {
      const data: any = {
        "NO": idx + 1,
        "NAMA LENGKAP": row.name,
        "JABATAN": row.jabatan
      }

      for (let d = 1; d <= 31; d++) {
        if (d <= daysInMonth) {
          const record = row.attendance[d]
          let statusText = "";
          if (record) {
            const isStillWorking = record.jam_masuk && !record.jam_pulang && record.status !== 'alpha' && record.status !== 'izin' && record.status !== 'dinas_luar';
            statusText = isStillWorking ? "TELAT" : record.status.toUpperCase();
          }
          data[d.toString()] = statusText;
        } else {
          data[d.toString()] = "-"
        }
      }

      data["HADIR"] = row.stats.h
      data["TELAT"] = row.stats.t
      data["IJIN/SAKIT"] = row.stats.s
      data["ALPHA"] = row.stats.tk
      data["DL"] = row.stats.dl

      return data
    })

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi")
    XLSX.writeFile(wb, `REKAP_ABSENSI_${monthName}_${filterYear}.xlsx`)
    toast({ title: "Excel Berhasil", description: "Laporan telah diunduh." })
  }

  const handleDownloadPDF = async () => {
    if (reportData.length === 0) {
      toast({ variant: "destructive", title: "Data Belum Siap", description: "Menunggu sinkronisasi database..." });
      return;
    }
    setIsGeneratingPDF(true)
    try {
      const pdfBlob = await generateAttendancePDF({
        month: filterMonth,
        year: filterYear,
        data: reportData,
        logoBase64: villageSettings?.logoBase64,
        settings: attendanceSettings 
      })
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `REKAP_ABSENSI_DESA_${filterMonth}_${filterYear}.pdf`
      link.click()
      toast({ title: "PDF Berhasil", description: "Laporan siap dicetak." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Cetak", description: "Terjadi kesalahan sistem." })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (!isAuthorized) return <div className="p-10 text-center font-bold">Akses Ditolak</div>;

  const isLoading = isPersonnelLoading || isAttendanceLoading || isSettingsLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cetak Dokumen Absensi</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase mt-1">Laporan Resmi Berbasis Database Akun Perangkat</p>
      </header>

      <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-primary">
        <CardHeader className="p-10 pb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Printer className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Konfigurasi Laporan</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Periode & Format Laporan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10 pt-4 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Pilih Bulan</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-none font-black text-lg px-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i+1} value={(i+1).toString().padStart(2, '0')} className="font-bold">
                      {format(new Date(2024, i, 1), "MMMM", { locale: localeID })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Pilih Tahun</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-none font-black text-lg px-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()} className="font-bold">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <FileText className="h-10 w-10 text-slate-300" />
               <div>
                  <p className="text-xs font-black uppercase text-slate-900">Kesiapan Data</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {isLoading ? "Sinkronisasi..." : `${reportData.length} Akun Terdeteksi`}
                  </p>
               </div>
            </div>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary/30" /> : <ChevronRight className="h-5 w-5 text-slate-200" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || isLoading || reportData.length === 0}
              className="h-20 rounded-[1.5rem] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white font-black uppercase text-sm gap-4 transition-all active:scale-95"
            >
              {isGeneratingPDF ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />}
              Unduh Laporan PDF
            </Button>
            <Button 
              onClick={handleDownloadExcel}
              disabled={isLoading || reportData.length === 0}
              variant="outline"
              className="h-20 rounded-[1.5rem] border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 font-black uppercase text-sm gap-4 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-6 w-6" />
              Unduh Format Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Download className="h-4 w-4 text-blue-600" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-blue-800 leading-relaxed uppercase mt-1">
            Status 'T' (Terlambat) akan muncul otomatis jika personel belum melakukan absen pulang pada hari tersebut.
          </p>
        </div>
      </div>
    </div>
  )
}
