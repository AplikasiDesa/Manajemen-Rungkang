
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, ArrowLeft, Shield, Search, Upload, XCircle, Loader2, MoreVertical, Edit, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState, useRef } from "react"
import { OFFICIALS as initialOfficials, Official } from "@/lib/personel-data"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const [officials] = useState<Official[]>(initialOfficials);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [currentImportCategory, setCurrentImportCategory] = useState<string | null>(null);

  // State for manual add
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newJabatan, setNewJabatan] = useState("");
  const [activeTab, setActiveTab] = useState("Pemerintah Desa");

  // State for editing single official
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedJabatan, setEditedJabatan] = useState("");

  // State for deleting single official
  const [isDeleteSingleConfirmOpen, setIsDeleteSingleConfirmOpen] = useState(false);
  const [deletingOfficial, setDeletingOfficial] = useState<Official | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filteredOfficials = (officials || []).filter(o => 
    (o.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (o.jabatan?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const categories = ["Pemerintah Desa", "BPD", "RT/RW", "Kader", "KPM", "Karang Taruna", "Linmas", "Pengurus BUMDes", "Pengurus KDMP", "Guru Ngaji", "Guru TK & Paud"];

  const handleImportClick = (category: string) => {
    setCurrentImportCategory(category);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentImportCategory) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const data = new Uint8Array(e.target.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(worksheet, { header: ['name', 'jabatan'], range: 1 });
              const newPersonnelForCategory = json.filter((p: any) => p.name && p.jabatan);

              if (newPersonnelForCategory.length === 0) {
                  throw new Error("Tidak ada data valid di file Excel. Format: Kolom A: Nama, Kolom B: Jabatan (mulai baris 2).");
              }

              const response = await fetch('/api/profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ category: currentImportCategory, newPersonnelForCategory }),
              });

              if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || 'Gagal memperbarui data personel.');
              }

              toast({ title: "Impor Berhasil", description: `Data personel untuk ${currentImportCategory} akan segera diperbarui.` });
              setTimeout(() => window.location.reload(), 1000);

          } catch (err: any) {
              toast({ variant: "destructive", title: "Impor Gagal", description: err.message });
          } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
              setCurrentImportCategory(null);
          }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
        toast({ variant: "destructive", title: "File Error", description: err.message });
        setIsImporting(false);
    }
  };

  const handleSaveAdd = async () => {
    if (!newName || !newJabatan) {
        toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Nama dan jabatan harus diisi." });
        return;
    }
    
    setIsImporting(true);
    try {
        // Ambil data personel yang sudah ada di kategori ini
        const existingInCategory = officials.filter(o => o.category === activeTab);
        const updatedCategoryList = [...existingInCategory, { name: newName, jabatan: newJabatan }];

        const response = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: activeTab, newPersonnelForCategory: updatedCategoryList }),
        });

        if (!response.ok) throw new Error('Gagal menambah data.');

        toast({ title: "Berhasil Ditambah", description: "Personel baru telah ditambahkan." });
        setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Menambah", description: err.message });
    } finally {
        setIsImporting(false);
        setIsAddModalOpen(false);
        setNewName("");
        setNewJabatan("");
    }
  };

  const confirmDeleteAll = (category: string) => {
      setCategoryToDelete(category);
      setIsDeleteAllConfirmOpen(true);
  };

  const handleDeleteAll = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
        const response = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: categoryToDelete, newPersonnelForCategory: [] }),
        });

        if (!response.ok) throw new Error('Gagal menghapus data.');

        toast({ title: "Berhasil Dihapus", description: `Data personel untuk ${categoryToDelete} akan segera dihapus.` });
        setTimeout(() => window.location.reload(), 1000);

    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    } finally {
        setIsDeleting(false);
        setIsDeleteAllConfirmOpen(false);
    }
  };

  // Functions for single official actions
  const handleEditClick = (official: Official) => {
    setEditingOfficial(official);
    setEditedName(official.name);
    setEditedJabatan(official.jabatan);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOfficial) return;
    setIsImporting(true); // Reuse importing state for loading indicator
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                originalName: editingOfficial.name,
                category: editingOfficial.category,
                newName: editedName,
                newJabatan: editedJabatan,
            }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal memperbarui data.');
        }
        toast({ title: "Berhasil Disimpan", description: "Data personel telah diperbarui." });
        setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Memperbarui", description: err.message });
    } finally {
        setIsImporting(false);
        setIsEditModalOpen(false);
    }
  };

  const handleDeleteClick = (official: Official) => {
    setDeletingOfficial(official);
    setIsDeleteSingleConfirmOpen(true);
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deletingOfficial) return;
    setIsDeleting(true);
    try {
        const response = await fetch('/api/profile', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: deletingOfficial.name,
                category: deletingOfficial.category,
            }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal menghapus data.');
        }
        toast({ title: "Berhasil Dihapus", description: "Data personel telah dihapus." });
        setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    } finally {
        setIsDeleting(true);
        setIsDeleteSingleConfirmOpen(false);
        setDeletingOfficial(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-primary">Data Personel Desa</h1>
      </header>

      <section className="grid gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama atau jabatan di semua kategori..." 
            className="pl-9 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="Pemerintah Desa" className="w-full" onValueChange={setActiveTab}>
            <TabsList className={cn(
              "w-full h-auto p-1 bg-muted/50", // Base styles
              "flex flex-row overflow-x-auto no-scrollbar", // Mobile: horizontal scroll
              "md:flex-wrap md:h-auto" // Desktop: wrap to multiple lines
            )}>
                {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="flex-shrink-0 px-4 py-2 text-xs font-bold uppercase md:flex-1 md:min-w-[120px]">
                    {cat}
                </TabsTrigger>
                ))}
            </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                    <Button 
                        variant="default"
                        className="h-9 gap-2 text-xs bg-primary shadow-lg"
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isImporting || isDeleting}
                    >
                        <Plus className="h-4 w-4"/>
                        <span>Tambah Personel</span>
                    </Button>
                    <Button 
                        variant="outline"
                        className="h-9 gap-2 text-xs"
                        onClick={() => handleImportClick(cat)}
                        disabled={isImporting || isDeleting}
                    >
                        {isImporting && currentImportCategory === cat ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                        <span>Impor Excel</span>
                    </Button>
                    <Button 
                        variant="destructive"
                        className="h-9 gap-2 text-xs"
                        onClick={() => confirmDeleteAll(cat)}
                        disabled={isImporting || isDeleting}
                    >
                        {isDeleting && categoryToDelete === cat ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>}
                        <span>Hapus Semua</span>
                    </Button>
                </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOfficials
                  .filter(o => o.category === cat)
                  .map((official, index) => (
                    <Card key={`${official.name}-${official.category}-${index}`} className="border-none shadow-sm">
                        <CardHeader className="p-4 pb-2 flex-row items-start justify-between">
                          <div className="flex-1 overflow-hidden">
                              <Badge variant="outline" className="w-fit mb-2 text-[10px] uppercase font-bold text-primary border-primary/20">
                              {official.jabatan}
                              </Badge>
                              <CardTitle className="text-base font-bold truncate">{official.name}</CardTitle>
                           </div>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(official)}>
                                  <Edit className="mr-2 h-4 w-4"/>
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClick(official)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                   <Trash2 className="mr-2 h-4 w-4"/>
                                   <span>Hapus</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                <User className="h-3 w-3" />
                                <span>Status: Aktif</span>
                            </div>
                        </CardContent>
                    </Card>
                  ))}
                {filteredOfficials.filter(o => o.category === cat).length === 0 && (
                  <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                    <p className="font-bold mb-2">Data Kosong</p>
                    <p className="text-sm">Silakan tambah manual atau impor Excel menggunakan tombol di atas.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>
      
      {/* DIALOGS */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx, .xls, .csv"
        onChange={handleFileSelected}
      />

      {/* Manual Add Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Personel ({activeTab})</DialogTitle>
            <DialogDescription>Input data personel secara manual ke sistem.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-name" className="text-right">Nama</Label>
              <Input id="add-name" value={newName} onChange={(e) => setNewName(e.target.value)} className="col-span-3" placeholder="Nama lengkap..." />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-jabatan" className="text-right">Jabatan</Label>
              <Input id="add-jabatan" value={newJabatan} onChange={(e) => setNewJabatan(e.target.value)} className="col-span-3" placeholder="Contoh: KETUA RT 01" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSaveAdd} disabled={isImporting}>
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Personel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Konfirmasi Hapus Semua</DialogTitle>
                <DialogDescription>
                    Anda yakin ingin menghapus semua data personel untuk kategori "{categoryToDelete}"? Tindakan ini tidak dapat dibatalkan.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
                <Button variant="destructive" onClick={handleDeleteAll} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Hapus Semua
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Personel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nama</Label>
              <Input id="name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jabatan" className="text-right">Jabatan</Label>
              <Input id="jabatan" value={editedJabatan} onChange={(e) => setEditedJabatan(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSaveEdit} disabled={isImporting}>
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteSingleConfirmOpen} onOpenChange={setIsDeleteSingleConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menghapus data personel "{deletingOfficial?.name}"? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button variant="destructive" onClick={handleConfirmDeleteSingle} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
