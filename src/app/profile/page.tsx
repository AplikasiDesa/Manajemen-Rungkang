
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  ArrowLeft, 
  Search, 
  Loader2, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Plus, 
  Upload, 
  Download,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useState, useRef, useMemo } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, getDocs } from "firebase/firestore"
import { 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  setDocumentNonBlocking 
} from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  "Pemerintah Desa", 
  "BPD", 
  "RT/RW", 
  "Kader", 
  "KPM", 
  "Karang Taruna", 
  "Linmas", 
  "Pengurus BUMDes", 
  "Pengurus KDMP", 
  "Guru Ngaji", 
  "Guru TK & Paud"
];

// Helper: Weighting for Pemerintah Desa hierarchy
const getRankWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  if (j.includes("KEPALA DESA")) return 1;
  if (j.includes("SEKRETARIS DESA")) return 2;
  if (j.includes("KASI") || j.includes("KEPALA SEKSI")) return 3;
  if (j.includes("KAUR") || j.includes("KEPALA URUSAN")) return 4;
  if (j.includes("KEPALA DUSUN") || j.includes("KADUS")) return 5;
  if (j.includes("STAF")) return 6;
  return 100;
};

// Helper: Weighting for RT/RW sorting
// Urutan: Ketua RW 01 -> RT 01 RW 01 -> RT 02 RW 01 -> Ketua RW 02 -> RT 01 RW 02...
const getRtRwWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  
  // Mencari angka RW dan RT
  const rwMatch = j.match(/RW\s*(\d+)/);
  const rtMatch = j.match(/RT\s*(\d+)/);
  
  const rwNum = rwMatch ? parseInt(rwMatch[1]) : 0;
  const rtNum = rtMatch ? parseInt(rtMatch[1]) : 0;

  // Bobot RW adalah ribuan (misal RW 1 = 1000, RW 2 = 2000)
  let weight = rwNum * 1000;
  
  // Jika "Ketua RW" tanpa keterangan RT, maka beri bobot 0 di satuan (urutan pertama di RW tersebut)
  if (j.includes("KETUA RW") && !j.includes("RT")) {
    weight += 0;
  } else {
    // Jika "Ketua RT", maka bobotnya adalah nomor RT-nya (misal RT 1 = 1, RT 2 = 2)
    weight += rtNum;
  }
  
  return weight;
};

// Helper: Weighting for Kader/Posyandu sorting
const getKaderWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  const posyanduMatch = j.match(/RAHAYU\s*(\d+)/);
  return posyanduMatch ? parseInt(posyanduMatch[1]) : 999;
};

export default function ProfilePage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: officials, isLoading: isDataLoading } = useCollection(personnelRef)

  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("Pemerintah Desa");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteSingleConfirmOpen, setIsDeleteSingleConfirmOpen] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newJabatan, setNewJabatan] = useState("");
  const [editingOfficial, setEditingOfficial] = useState<any>(null);
  const [deletingOfficial, setDeletingOfficial] = useState<any>(null);

  // Sorting logic combined with filtering
  const sortedOfficials = useMemo(() => {
    if (!officials) return [];
    
    const filtered = officials.filter(o => 
      (o.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (o.jabatan?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      // Grouping remains by category as per tab
      if (a.category !== b.category) return a.category.localeCompare(b.category);

      const cat = a.category;

      if (cat === "Pemerintah Desa") {
        const wA = getRankWeight(a.jabatan);
        const wB = getRankWeight(b.jabatan);
        if (wA !== wB) return wA - wB;
      } else if (cat === "RT/RW") {
        const wA = getRtRwWeight(a.jabatan);
        const wB = getRtRwWeight(b.jabatan);
        if (wA !== wB) return wA - wB;
      } else if (cat === "Kader") {
        const wA = getKaderWeight(a.jabatan);
        const wB = getKaderWeight(b.jabatan);
        if (wA !== wB) return wA - wB;
      }

      // Default sorting by name
      return a.name.localeCompare(b.name);
    });
  }, [officials, searchTerm]);

  const handleSaveAdd = () => {
    if (!newName || !newJabatan || !db) return;
    const colRef = collection(db, "personnel");
    addDocumentNonBlocking(colRef, {
        name: newName.toUpperCase().trim(),
        jabatan: newJabatan.toUpperCase().trim(),
        category: activeTab,
        active: true,
        createdAt: new Date().toISOString()
    });
    toast({ title: "Berhasil", description: "Personel baru ditambahkan." });
    setIsAddModalOpen(false);
    setNewName(""); setNewJabatan("");
  };

  const handleSaveEdit = () => {
    if (!editingOfficial || !db) return;
    const docRef = doc(db, "personnel", editingOfficial.id);
    setDocumentNonBlocking(docRef, {
        ...editingOfficial,
        name: newName.toUpperCase().trim(),
        jabatan: newJabatan.toUpperCase().trim(),
    }, { merge: true });
    toast({ title: "Berhasil", description: "Data diperbarui." });
    setIsEditModalOpen(false);
  };

  const handleConfirmDeleteSingle = () => {
    if (!deletingOfficial || !db) return;
    const docRef = doc(db, "personnel", deletingOfficial.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Terhapus", description: "Data dihapus secara permanen." });
    setIsDeleteSingleConfirmOpen(false);
  };

  const handleExport = () => {
    if (!officials || officials.length === 0) return;
    const exportData = sortedOfficials
      .filter(o => o.category === activeTab)
      .map(o => ({
        'Nama': o.name,
        'Jabatan': o.jabatan
      }));

    if (exportData.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: `Tidak ada data pada kategori ${activeTab} untuk diekspor.` });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Personel");
    XLSX.writeFile(wb, `Data_Personel_${activeTab.replace(/\s+/g, '_')}_rungkang.xlsx`);
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !user) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
        
        if (jsonData.length === 0) {
          toast({ variant: "destructive", title: "File Kosong", description: "Tidak ada data yang ditemukan di file Excel." });
          return;
        }

        let importedCount = 0;
        jsonData.forEach((row) => {
          const keys = Object.keys(row);
          const nameKey = keys.find(k => k.toLowerCase().replace(/\s/g, '') === 'nama');
          const jobKey = keys.find(k => k.toLowerCase().replace(/\s/g, '') === 'jabatan');

          const nameValue = nameKey ? row[nameKey] : null;
          const jobValue = jobKey ? row[jobKey] : null;
          
          if (nameValue && jobValue) {
            const colRef = collection(db, "personnel");
            addDocumentNonBlocking(colRef, {
              name: String(nameValue).toUpperCase().trim(),
              jabatan: String(jobValue).toUpperCase().trim(),
              category: activeTab,
              active: true,
              createdAt: new Date().toISOString()
            });
            importedCount++;
          }
        });

        if (importedCount > 0) {
          toast({ title: "Impor Berhasil", description: `${importedCount} data personel sedang diproses ke database.` });
        } else {
          toast({ 
            variant: "destructive", 
            title: "Format Salah", 
            description: "Pastikan kolom Excel bernama 'Nama' dan 'Jabatan'." 
          });
        }
      } catch (error) {
        console.error("Import error:", error);
        toast({ variant: "destructive", title: "Impor Gagal", description: "Terjadi kesalahan saat membaca file." });
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteAll = async () => {
    if (!db) return;
    setIsProcessing(true);
    try {
      const q = collection(db, "personnel");
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((docSnap) => {
        deleteDocumentNonBlocking(docSnap.ref);
      });
      toast({ title: "Berhasil", description: "Proses penghapusan database dimulai." });
      setShowDeleteAllConfirm(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan akses." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sinkronisasi Database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
                <Link href="/dashboard/"><ArrowLeft className="h-6 w-6" /></Link>
            </Button>
            <div>
                <h1 className="text-xl font-black uppercase text-primary tracking-tight">Data Perangkat Desa</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Manajemen Perangkat & Lembaga Desa</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button variant="ghost" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase text-destructive hover:bg-destructive/5" onClick={() => setShowDeleteAllConfirm(true)} disabled={isProcessing}>
                <Trash2 className="h-3.5 w-3.5" /> Hapus Seluruh Database
            </Button>
          </div>
      </header>

      <section className="grid gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama atau jabatan..." 
            className="pl-11 h-14 rounded-2xl bg-white shadow-sm border-primary/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="Pemerintah Desa" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full h-auto p-1.5 bg-muted/50 flex flex-row overflow-x-auto no-scrollbar md:flex-wrap rounded-2xl">
                {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="flex-shrink-0 px-5 py-3 text-[10px] font-black uppercase md:flex-1 md:min-w-[120px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                    {cat}
                </TabsTrigger>
                ))}
            </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                    <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">{cat}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isProcessing}
                            className="h-10 rounded-xl gap-2 font-black text-[10px] uppercase border-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                            <Upload className="h-3.5 w-3.5" /> Impor
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExport}
                            className="h-10 rounded-xl gap-2 font-black text-[10px] uppercase border-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                            <Download className="h-3.5 w-3.5" /> Ekspor
                        </Button>
                        <Button 
                            onClick={() => {
                                setNewName(""); setNewJabatan("");
                                setIsAddModalOpen(true);
                            }}
                            className="h-10 gap-2 text-[10px] font-black uppercase bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl px-5"
                        >
                            <Plus className="h-4 w-4"/>
                            Tambah {cat}
                        </Button>
                    </div>
                </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedOfficials
                  .filter(o => o.category === cat)
                  .map((official) => (
                    <Card key={official.id} className="border-none shadow-sm rounded-[1.5rem] overflow-hidden group hover:shadow-xl transition-all bg-white border border-primary/5">
                        <CardHeader className="p-5 pb-2 flex-row items-start justify-between">
                          <div className="flex-1 overflow-hidden">
                              <Badge variant="outline" className="w-fit mb-2 text-[9px] uppercase font-black text-primary border-primary/20 bg-primary/5">
                                {official.jabatan}
                              </Badge>
                              <CardTitle className="text-base font-black truncate text-slate-800">{official.name}</CardTitle>
                           </div>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl font-black uppercase text-[10px] p-2">
                                <DropdownMenuItem className="rounded-xl cursor-pointer" onClick={() => {
                                    setEditingOfficial(official);
                                    setNewName(official.name);
                                    setNewJabatan(official.jabatan);
                                    setIsEditModalOpen(true);
                                }}>
                                  <Edit className="mr-2 h-4 w-4 text-primary"/> Edit Data
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive rounded-xl cursor-pointer" onClick={() => {
                                    setDeletingOfficial(official);
                                    setIsDeleteSingleConfirmOpen(true);
                                }}>
                                   <Trash2 className="mr-2 h-4 w-4"/> Hapus Permanen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold">
                                <User className="h-3 w-3 text-primary/40" /> 
                                Database ID: <span className="font-mono">{official.id.substring(0,6)}...</span>
                            </div>
                        </CardContent>
                    </Card>
                  ))}
                {sortedOfficials.filter(o => o.category === cat).length === 0 && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed rounded-[2.5rem] text-muted-foreground border-slate-100 bg-slate-50/30">
                    <p className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Belum ada data di kategori {cat}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>
      
      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-lg text-primary">Tambah Personel</DialogTitle>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{activeTab}</p>
          </DialogHeader>
          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nama Lengkap</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contoh: BUDI SANTOSO" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Jabatan</Label>
              <Input value={newJabatan} onChange={(e) => setNewJabatan(e.target.value)} placeholder="Contoh: KEPALA DUSUN" className="h-12 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAdd} disabled={!newName || !newJabatan} className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-primary/20">
              Simpan Personel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm">
          <DialogHeader><DialogTitle className="font-black uppercase text-lg text-primary">Edit Data Personel</DialogTitle></DialogHeader>
          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nama</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Jabatan</Label>
              <Input value={newJabatan} onChange={(e) => setNewJabatan(e.target.value)} className="h-12 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-primary/20">
               Perbarui Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Alert */}
      <Dialog open={isDeleteSingleConfirmOpen} onOpenChange={setIsDeleteSingleConfirmOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-xs text-center">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="font-black uppercase text-destructive">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-xs font-bold uppercase text-slate-500 leading-relaxed">Hapus <strong>{deletingOfficial?.name}</strong> dari database secara permanen?</p>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button variant="destructive" onClick={handleConfirmDeleteSingle} className="w-full h-12 rounded-2xl font-black uppercase shadow-lg shadow-destructive/20">
                Ya, Hapus Data
            </Button>
            <Button variant="ghost" onClick={() => setIsDeleteSingleConfirmOpen(false)} className="w-full h-12 rounded-2xl font-bold uppercase">Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Alert */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent className="rounded-[2.5rem] border-none p-8">
            <AlertDialogHeader className="items-center text-center">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <Trash2 className="h-10 w-10 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl font-black uppercase text-destructive">Hapus Seluruh Database?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-xs uppercase text-slate-500 leading-relaxed">
                    Tindakan ini akan menghapus SEMUA data personel di seluruh kategori dari Firestore. Pastikan Anda sudah memiliki cadangan (Ekspor Excel).
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
                <AlertDialogCancel className="h-12 rounded-2xl font-bold uppercase w-full">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className="h-12 rounded-2xl font-black uppercase bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 w-full" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Ya, Hapus Semua"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
