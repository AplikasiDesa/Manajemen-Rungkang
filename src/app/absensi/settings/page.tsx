"use client"

import { useState, useEffect } from "react"
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Settings, 
  Save, 
  Loader2, 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon,
  Plus,
  Trash2
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

const DAYS = [
  { id: 'senin', label: 'SENIN' },
  { id: 'selasa', label: 'SELASA' },
  { id: 'rabu', label: 'RABU' },
  { id: 'kamis', label: 'KAMIS' },
  { id: 'jumat', label: 'JUMAT' },
  { id: 'sabtu', label: 'SABTU' },
  { id: 'minggu', label: 'MINGGU' }
]

export default function AbsensiSettings() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  
  // Memastikan fetch hanya dilakukan jika user sudah terautentikasi
  const settingsRef = useMemoFirebase(() => 
    (db && user) ? doc(db, "absensi_settings", "global") : null, 
  [db, user])
  
  const { data: initialData, isLoading } = useDoc(settingsRef)

  const [formData, setFormData] = useState({
    jam_masuk: "08:00",
    jam_pulang: "16:00",
    toleransi_telat: 15,
    hari_kerja: ["senin", "selasa", "rabu", "kamis", "jumat"],
    hari_libur: [] as string[],
    radius_lokasi: 100,
    lokasi_kantor: { lat: -7.5342, lng: 108.9721 }
  })

  const [newHoliday, setNewHoliday] = useState("")

  useEffect(() => {
    if (initialData) setFormData(initialData as any)
  }, [initialData])

  const handleSave = async () => {
    if (!db || !user) return
    setIsSaving(true)
    try {
      await setDoc(doc(db, "absensi_settings", "global"), formData)
      toast({ title: "Tersimpan", description: "Pengaturan absensi telah diperbarui." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan pengaturan." })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      hari_kerja: prev.hari_kerja.includes(day) 
        ? prev.hari_kerja.filter(d => d !== day)
        : [...prev.hari_kerja, day]
    }))
  }

  const addHoliday = () => {
    if (!newHoliday) return
    if (formData.hari_libur.includes(newHoliday)) return
    setFormData(prev => ({ ...prev, hari_libur: [...prev.hari_libur, newHoliday].sort() }))
    setNewHoliday("")
  }

  const removeHoliday = (date: string) => {
    setFormData(prev => ({ ...prev, hari_libur: prev.hari_libur.filter(d => d !== date) }))
  }

  if (isUserLoading || isLoading) {
    return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-10 max-w-5xl mx-auto pb-40 bg-white min-h-screen">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100">
          <Link href="/absensi-admin/dashboard/"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">Pengaturan Absensi</h1>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Waktu Kerja */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] bg-white overflow-hidden">
          <CardHeader className="bg-primary/[0.03] border-b border-primary/5 py-4">
            <CardTitle className="text-base font-bold flex items-center gap-3 text-slate-800">
              <Clock className="h-5 w-5 text-slate-600" /> Waktu Kerja
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Jam Masuk</Label>
                <div className="relative">
                  <Input 
                    type="time" 
                    value={formData.jam_masuk} 
                    onChange={e => setFormData(p => ({ ...p, jam_masuk: e.target.value }))}
                    className="h-12 rounded-xl bg-slate-50/50 border-slate-200 pr-10 font-medium"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Jam Pulang</Label>
                <div className="relative">
                  <Input 
                    type="time" 
                    value={formData.jam_pulang} 
                    onChange={e => setFormData(p => ({ ...p, jam_pulang: e.target.value }))}
                    className="h-12 rounded-xl bg-slate-50/50 border-slate-200 pr-10 font-medium"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Toleransi Telat (Menit)</Label>
              <Input 
                type="number" 
                value={formData.toleransi_telat} 
                onChange={e => setFormData(p => ({ ...p, toleransi_telat: parseInt(e.target.value) || 0 }))}
                className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-medium"
              />
            </div>
          </CardContent>
        </Card>

        {/* Titik Lokasi */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] bg-white overflow-hidden">
          <CardHeader className="bg-primary/[0.03] border-b border-primary/5 py-4">
            <CardTitle className="text-base font-bold flex items-center gap-3 text-slate-800">
              <MapPin className="h-5 w-5 text-slate-600" /> Titik Lokasi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Latitude</Label>
                <Input 
                  type="number" 
                  value={formData.lokasi_kantor.lat} 
                  onChange={e => setFormData(p => ({ ...p, lokasi_kantor: { ...p.lokasi_kantor, lat: parseFloat(e.target.value) } }))}
                  className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Longitude</Label>
                <Input 
                  type="number" 
                  value={formData.lokasi_kantor.lng} 
                  onChange={e => setFormData(p => ({ ...p, lokasi_kantor: { ...p.lokasi_kantor, lng: parseFloat(e.target.value) } }))}
                  className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Radius Absensi (Meter)</Label>
              <Input 
                type="number" 
                value={formData.radius_lokasi} 
                onChange={e => setFormData(p => ({ ...p, radius_lokasi: parseInt(e.target.value) || 0 }))}
                className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-medium"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hari Kerja & Libur */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] bg-white md:col-span-2 overflow-hidden">
          <CardHeader className="bg-primary/[0.03] border-b border-primary/5 py-4">
            <CardTitle className="text-base font-bold flex items-center gap-3 text-slate-800">
              <CalendarIcon className="h-5 w-5 text-slate-600" /> Hari Kerja & Libur
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            <div className="space-y-5">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pilih Hari Kerja</Label>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {DAYS.map(day => (
                  <div key={day.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleDay(day.id)}>
                    <Checkbox 
                      id={day.id} 
                      checked={formData.hari_kerja.includes(day.id)} 
                      onCheckedChange={() => toggleDay(day.id)}
                      className="h-5 w-5 rounded-full border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                    />
                    <label 
                      htmlFor={day.id} 
                      className={cn(
                        "text-[13px] font-black uppercase tracking-tight cursor-pointer transition-colors",
                        formData.hari_kerja.includes(day.id) ? "text-slate-800" : "text-slate-400"
                      )}
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 pt-10 border-t border-slate-100">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Daftar Hari Libur (Non-Kerja)</Label>
              <div className="flex gap-3 max-w-md">
                <Input 
                  type="date" 
                  value={newHoliday} 
                  onChange={e => setNewHoliday(e.target.value)} 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium"
                />
                <Button onClick={addHoliday} variant="outline" className="h-12 rounded-xl gap-2 border-slate-200 px-6 font-bold hover:bg-slate-50">
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4">
                {formData.hari_libur.map(date => (
                  <div key={date} className="flex items-center gap-2 bg-slate-100/80 pl-4 pr-1 py-1 rounded-full border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">{date}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeHoliday(date)} 
                      className="h-7 w-7 rounded-full hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {formData.hari_libur.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Belum ada hari libur yang ditambahkan.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tombol Simpan Melayang (Bottom Sticky) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 bg-gradient-to-t from-white via-white/90 to-transparent flex justify-center">
        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full max-w-2xl h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-tighter shadow-[0_15px_35px_rgba(255,102,0,0.3)] transition-all active:scale-[0.98] gap-3"
        >
          {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
          Simpan Seluruh Pengaturan
        </Button>
      </div>
    </div>
  )
}
