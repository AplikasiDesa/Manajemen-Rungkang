
"use client"

import { useState } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, setDoc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2, Save, AlertCircle, Info, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function InputAbsensiManual() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Guard: Admin resmi saja
  const isAuthorized = user?.email === "admin@rungkang.id" || user?.email === "rungkang@gmail.id";

  // SEKARANG: Ambil daftar dari 'personel' (Database Akun) sebagai sumber utama
  const accountsRef = useMemoFirebase(() => 
    (db && user && isAuthorized) ? query(collection(db, "personel"), orderBy("nama", "asc")) : null, 
  [db, user, isAuthorized])
  const { data: accountList, isLoading: isAccountsLoading } = useCollection(accountsRef)

  const [formData, setFormData] = useState({
    accountId: "",
    tanggal: format(new Date(), "yyyy-MM-dd"),
    jam_masuk: "08:00",
    jam_pulang: "15:30",
    status: "hadir"
  })

  const handleSubmit = async () => {
    if (!db || !formData.accountId) {
        toast({ variant: "destructive", title: "Pilih Personel", description: "Silakan pilih akun perangkat terlebih dahulu." })
        return
    }

    setIsSaving(true)
    try {
      const accounts = accountList || [];
      const targets = formData.accountId === "all" 
        ? accounts.filter(a => a.role !== "admin")
        : accounts.filter(a => a.id === formData.accountId);

      if (targets.length === 0) throw new Error("Tidak ada data personel.");

      let successCount = 0;
      let unsyncedNames: string[] = [];

      for (const acc of targets) {
        const targetUid = acc.uid; 

        // Jika user belum pernah login (UID kosong), kita gunakan ID dokumen sebagai fallback
        // namun peringatkan admin bahwa sinkronisasi penuh butuh login user.
        if (!targetUid) {
          unsyncedNames.push(acc.nama);
          continue;
        }

        const absenId = `${targetUid}_${formData.tanggal}`;
        await setDoc(doc(db, "absensi", absenId), {
          id: absenId,
          personel_id: targetUid, 
          nama: acc.nama,
          tanggal: formData.tanggal,
          jam_masuk: formData.jam_masuk,
          jam_pulang: formData.jam_pulang,
          status: formData.status,
          created_at: new Date().toISOString(),
          input_by: "admin"
        }, { merge: true });
        
        successCount++;
      }

      if (unsyncedNames.length > 0) {
        toast({ 
          variant: "destructive",
          title: "Perhatian", 
          description: `${unsyncedNames.length} Personel (termasuk ${unsyncedNames[0]}) belum sinkron UID. Minta mereka login di HP agar data muncul.` 
        });
      }

      if (successCount > 0) {
        toast({ title: "Data Berhasil Disimpan", description: `${successCount} data absensi telah dicatat secara realtime.` });
      }

    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: e.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <header>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Input Absensi Manual</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase">Database: Manajemen Akun Perangkat (Real-time)</p>
      </header>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 p-8 text-white">
            <CardTitle className="text-lg flex items-center gap-3 uppercase font-black">
                <ShieldCheck className="h-6 w-6 text-primary" /> Formulir Admin
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Hasil input otomatis muncul di HP perangkat masing-masing</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Pilih Akun Perangkat</Label>
                <Select value={formData.accountId} onValueChange={v => setFormData(p => ({ ...p, accountId: v }))}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/30 font-bold">
                        <SelectValue placeholder={isAccountsLoading ? "Memuat Akun..." : "Pilih Nama Personel..."} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="font-black text-primary uppercase text-xs bg-primary/5">
                           --- SELURUH PERANGKAT (MASSAL) ---
                        </SelectItem>
                        {accountList?.filter(a => a.role !== 'admin').map(a => (
                            <SelectItem key={a.id} value={a.id} className="font-bold uppercase text-xs">
                                {a.nama} {!a.uid && " (BELUM SINKRON)"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tanggal</Label>
                    <Input type="date" value={formData.tanggal} onChange={e => setFormData(p => ({ ...p, tanggal: e.target.value }))} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hadir" className="text-green-600 font-bold">HADIR</SelectItem>
                            <SelectItem value="telat" className="text-orange-600 font-bold">TELAT</SelectItem>
                            <SelectItem value="izin" className="text-blue-600 font-bold">IZIN / SAKIT / CUTI</SelectItem>
                            <SelectItem value="dinas_luar" className="text-indigo-600 font-bold">DINAS LUAR (DL)</SelectItem>
                            <SelectItem value="alpha" className="text-red-600 font-bold">ALPHA / TANPA KET.</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Jam Masuk</Label>
                    <Input type="time" value={formData.jam_masuk} onChange={e => setFormData(p => ({ ...p, jam_masuk: e.target.value }))} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Jam Pulang</Label>
                    <Input type="time" value={formData.jam_pulang} onChange={e => setFormData(p => ({ ...p, jam_pulang: e.target.value }))} className="h-12 rounded-xl font-bold" />
                </div>
            </div>

            <div className="pt-4">
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSaving} 
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase shadow-xl gap-3 transition-all active:scale-[0.98]"
                >
                    {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                    Simpan Absensi ke Database
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4 shadow-sm">
        <Info className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
            <p className="text-xs font-black text-blue-800 uppercase">Penting:</p>
            <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
                Data yang Anda masukkan di sini terhubung langsung dengan ID Login perangkat. Jika perangkat login di kemudian hari, mereka akan langsung melihat histori ini di HP mereka.
            </p>
        </div>
      </div>
    </div>
  )
}
