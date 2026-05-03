
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, ArrowLeft, Search, Upload, XCircle, Loader2, MoreVertical, Edit, Trash2, Plus, DatabaseZap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { OFFICIALS as initialOfficials } from "@/lib/personel-data"

export default function ProfilePage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false)
  const [currentImportCategory, setCurrentImportCategory] = useState<string | null>(null)

  // Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newJabatan, setNewJabatan] = useState("")
  const [activeTab, setActiveTab] = useState("Pemerintah Desa")

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOfficial, setEditingOfficial] = useState<any | null>(null)
  const [editedName, setEditedName] = useState("")
  const [editedJabatan, setEditedJabatan] = useState("")

  const [isDeleteSingleConfirmOpen, setIsDeleteSingleConfirmOpen] = useState(false)
  const [deletingOfficial, setDeletingOfficial] = useState<any | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Firestore Hook
  const personnelQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "personnel"), orderBy("name", "asc"))
  }, [db, user])

  const { data: officials, isLoading } = useCollection(personnelQuery)

  const filteredOfficials = (officials || []).filter(o => 
    (o.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (o.jabatan?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const categories = ["Pemerintah Desa", "BPD", "RT/RW", "Kader", "KPM", "Karang Taruna", "Linmas", "Pengurus BUMDes", "Pengurus KDMP", "Guru Ngaji", "Guru TK & Paud"];

  const handleImportClick = (category: string) => {
    setCurrentImportCategory(category)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentImportCategory || !user || !db) return
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { header: ['name', 'jabatan'], range: 1 })
        
        const personnelRef = collection(db, "users", user.uid, "personnel")
        
        let count = 0
        for (const row of json as any[]) {
          if (row.name && row.jabatan) {
            addDocumentNonBlocking(personnelRef, {
              name: String(row.name),
              jabatan: String(row.jabatan),
              category: currentImportCategory,
              createdAt: new Date().toISOString()
            })
            count++
          }
        }

        toast({ title: "Impor Berhasil", description: `${count} data personel ditambahkan ke kategori ${currentImportCategory}.` })
      } catch (err: any) {
        toast({ variant: "destructive", title: "Impor Gagal", description: err.message })
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
        setCurrentImportCategory(null)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleMigrateInitialData = async () => {
    if (!user || !db) return
    setIsProcessing(true)
    try {
        const personnelRef = collection(db, "users", user.uid, "personnel")
        let count = 0
        for (const item of initialOfficials) {
            addDocumentNonBlocking(personnelRef, {
                ...item,
                createdAt: new Date().toISOString()
            })
            count++
        }
        toast({ title: "Migrasi Berhasil", description: `${count} data awal telah dipindahkan ke database.` })
    } catch (e: any) {
        toast({ variant: "destructive", title: "Migrasi Gagal", description: e.message })
    } finally {
        setIsProcessing(false)
    }
  }

  const handleSaveAdd = async () => {
    if (!newName || !newJabatan || !user || !db) {
        toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Nama dan jabatan harus diisi." })
        return
    }
    
    setIsProcessing(true)
    try {
        const personnelRef = collection(db, "users", user.uid, "personnel")
        addDocumentNonBlocking(personnelRef, {
            name: newName,
            jabatan: newJabatan,
            category: activeTab,
            createdAt: new Date().toISOString()
        })
        toast({ title: "Berhasil Ditambah", description: "Personel baru telah ditambahkan ke database." })
        setIsAddModalOpen(false)
        setNewName(""); setNewJabatan("")
    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Menambah", description: err.message })
    } finally {
        setIsProcessing(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingOfficial || !user || !db) return
    setIsProcessing(true)
    try {
        const docRef = doc(db, "users", user.uid, "personnel", editingOfficial.id)
        updateDocumentNonBlocking(docRef, {
            name: editedName,
            jabatan: editedJabatan
        })
        toast({ title: "Berhasil Disimpan", description: "Data personel telah diperbarui." })
        setIsEditModalOpen(false)
    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Memperbarui", description: err.message })
    } finally {
        setIsProcessing(false)
    }
  }

  const handleConfirmDeleteSingle = async () => {
    if (!deletingOfficial || !user || !db) return
    setIsProcessing(true)
    try {
        const docRef = doc(db, "users", user.uid, "personnel", deletingOfficial.id)
        deleteDocumentNonBlocking(docRef)
        toast({ title: "Berhasil Dihapus", description: "Data personel telah dihapus dari database." })
        setIsDeleteSingleConfirmOpen(false)
        setDeletingOfficial(null)
    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message })
    } finally {
        setIsProcessing(false)
    }
  }

  const handleDeleteAllCategory = async () => {
    if (!categoryToDelete || !officials || !user || !db) return
    setIsProcessing(true)
    try {
        const toDelete = officials.filter(o => o.category === categoryToDelete)
        for (const item of toDelete) {
            const docRef = doc(db, "users", user.uid, "personnel", item.id)
            deleteDocumentNonBlocking(docRef)
        }
        toast({ title: "Kategori Dibersihkan", description: `Semua data ${categoryToDelete} telah dihapus.` })
        setIsDeleteAllConfirmOpen(false)
    } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message })
    } finally {
        setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/">
                <ArrowLeft className="h-6 w-6" />
                </Link>
            </Button>
            <h1 className="text-xl font-bold text-primary">Data Personel Desa</h1>
          </div>
          
          {(officials || []).length === 0 && !isLoading && (
              <Button variant="outline" size="sm" className="gap-2 bg-primary/10 border-primary/20 text-primary" onClick={handleMigrateInitialData} disabled={isProcessing}>
                  <DatabaseZap className="h-4 w-4" />
                  Migrasi Data Awal
              </Button>
          )}
      </header>

      <section className="grid gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama atau jabatan..." 
            className="pl-9 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="Pemerintah Desa" className="w-full" onValueChange={setActiveTab}>
            <TabsList className={cn(
              "w-full h-auto p-1 bg-muted/50",
              "flex flex-row overflow-x-auto no-scrollbar",
              "md:flex-wrap md:h-auto"
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
                        disabled={isProcessing}
                    >
                        <Plus className="h-4 w-4"/>
                        <span>Tambah Personel</span>
                    </Button>
                    <Button 
                        variant="outline"
                        className="h-9 gap-2 text-xs"
                        onClick={() => handleImportClick(cat)}
                        disabled={isProcessing}
                    >
                        {isProcessing && currentImportCategory === cat ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                        <span>Impor Excel</span>
                    </Button>
                    <Button 
                        variant="destructive"
                        className="h-9 gap-2 text-xs"
                        onClick={() => { setCategoryToDelete(cat); setIsDeleteAllConfirmOpen(true); }}
                        disabled={isProcessing}
                    >
                        <XCircle className="h-4 w-4"/>
                        <span>Hapus Kategori</span>
                    </Button>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/20" /></div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredOfficials
                        .filter(o => o.category === cat)
                        .map((official, index) => (
                            <Card key={official.id} className="border-none shadow-sm group hover:shadow-md transition-all">
                                <CardHeader className="p-4 pb-2 flex-row items-start justify-between">
                                <div className="flex-1 overflow-hidden">
                                    <Badge variant="outline" className="w-fit mb-2 text-[10px] uppercase font-bold text-primary border-primary/20">
                                    {official.jabatan}
                                    </Badge>
                                    <CardTitle className="text-base font-bold truncate">{official.name}</CardTitle>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setEditingOfficial(official); setEditedName(official.name); setEditedJabatan(official.jabatan); setIsEditModalOpen(true); }}>
                                            <Edit className="mr-2 h-4 w-4"/> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setDeletingOfficial(official); setIsDeleteSingleConfirmOpen(true); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4"/> Hapus
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                        <User className="h-3 w-3" />
                                        <span>ID: {official.id.substring(0, 8)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredOfficials.filter(o => o.category === cat).length === 0 && (
                        <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
                            <p className="font-bold mb-2">Belum Ada Data</p>
                            <p className="text-sm">Gunakan tombol di atas untuk mengisi database.</p>
                        </div>
                        )}
                    </div>
                )}
            </TabsContent>
          ))}
        </Tabs>
      </section>
      
      {/* DIALOGS */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileSelected} />

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Personel ({activeTab})</DialogTitle>
            <DialogDescription>Data akan disimpan langsung ke database cloud Firestore.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Nama Lengkap</Label>
              <Input id="add-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama lengkap..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-jabatan">Jabatan</Label>
              <Input id="add-jabatan" value={newJabatan} onChange={(e) => setNewJabatan(e.target.value)} placeholder="Contoh: KETUA RT 01" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSaveAdd} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Data Personel</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama</Label>
              <Input id="edit-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-jabatan">Jabatan</Label>
              <Input id="edit-jabatan" value={editedJabatan} onChange={(e) => setEditedJabatan(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSaveEdit} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Modal */}
      <Dialog open={isDeleteSingleConfirmOpen} onOpenChange={setIsDeleteSingleConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data</DialogTitle>
            <DialogDescription>Hapus personel "{deletingOfficial?.name}" secara permanen?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button variant="destructive" onClick={handleConfirmDeleteSingle} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Modal */}
      <Dialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Kosongkan Kategori</DialogTitle>
                <DialogDescription>Anda yakin ingin menghapus SEMUA personel di kategori "{categoryToDelete}"?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
                <Button variant="destructive" onClick={handleDeleteAllCategory} disabled={isProcessing}>Hapus Semua</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
