
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from "@/firebase"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImagePlus, CheckCircle, Loader2, Save, Trash2, ArrowLeft, AlertCircle, LogOut, FolderOpen, ExternalLink, Zap, LayoutPanelTop, FileStack } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingHero, setIsUploadingHero] = useState(false)
  const [isSavingFolders, setIsSavingFolders] = useState(false)
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

  const [kegiatanId, setKegiatanId] = useState("")
  const [spjId, setSpjId] = useState("")
  const [phId, setPhId] = useState("")
  const [physicalDocId, setPhysicalDocId] = useState("")
  const [agendaFolderId, setAgendaFolderId] = useState("")
  const [googleCalendarId, setGoogleCalendarId] = useState("")

  // GLOBAL SETTINGS: Use shared village settings instead of user-specific
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  
  const { data: userData, isLoading: isDataLoading } = useDoc(villageSettingsRef)

  useEffect(() => {
    if (userData) {
      if (userData.logoBase64) setLocalPreview(userData.logoBase64)
      if (userData.heroPhotoBase64) setHeroPreview(userData.heroPhotoBase64)
      if (userData.kegiatanFolderId) setKegiatanId(userData.kegiatanFolderId)
      if (userData.spjFolderId) setSpjId(userData.spjFolderId)
      if (userData.produkHukumFolderId) setPhId(userData.produkHukumFolderId)
      if (userData.physicalDocFolderId) setPhysicalDocId(userData.physicalDocFolderId)
      if (userData.agendaFolderId) setAgendaFolderId(userData.agendaFolderId)
      if (userData.googleCalendarId) setGoogleCalendarId(userData.googleCalendarId)
    }
  }, [userData])

  const savePreference = useCallback((key: string, value: any, setLoading: (v: boolean) => void) => {
    if (!villageSettingsRef || !user) return
    setLoading(true)
    
    setDocumentNonBlocking(villageSettingsRef, {
      [key]: value,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true })

    setTimeout(() => {
      setLoading(false)
      toast({ title: "Perubahan Disimpan", description: `Pengaturan ${key} telah diperbarui secara global.` })
    }, 1000)
  }, [villageSettingsRef, user, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 700 * 1024) {
      toast({ variant: "destructive", title: "File Terlalu Besar", description: "Maksimal ukuran logo adalah 700KB." })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLocalPreview(base64)
      savePreference('logoBase64', base64, setIsUploading)
    }
    reader.readAsDataURL(file)
  }

  const handleHeroChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1500 * 1024) {
      toast({ variant: "destructive", title: "File Terlalu Besar", description: "Maksimal ukuran foto utama adalah 1.5MB." })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setHeroPreview(base64)
      savePreference('heroPhotoBase64', base64, setIsUploadingHero)
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    if (!villageSettingsRef) return
    setLocalPreview(null)
    setDocumentNonBlocking(villageSettingsRef, { logoBase64: null }, { merge: true })
    toast({ title: "Logo Dihapus", description: "Sistem akan kembali menggunakan logo default." })
  }

  const removeHero = () => {
    if (!villageSettingsRef) return
    setHeroPreview(null)
    setDocumentNonBlocking(villageSettingsRef, { heroPhotoBase64: null }, { merge: true })
    toast({ title: "Foto Dihapus", description: "Halaman utama akan kembali menggunakan foto default." })
  }

  const extractFolderId = (input: string) => {
    if (!input) return ""
    const match = input.match(/folders\/([a-zA-Z0-9_-]{25,})/)
    return match ? match[1] : input.trim()
  }

  const handleSaveFolders = () => {
    if (!villageSettingsRef || !user) return
    setIsSavingFolders(true)

    const finalKegiatan = extractFolderId(kegiatanId)
    const finalSpj = extractFolderId(spjId)
    const finalPh = extractFolderId(phId)
    const finalPhysical = extractFolderId(physicalDocId)

    setDocumentNonBlocking(villageSettingsRef, {
      kegiatanFolderId: finalKegiatan,
      spjFolderId: finalSpj,
      produkHukumFolderId: finalPh,
      physicalDocFolderId: finalPhysical,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true })

    setTimeout(() => {
      setIsSavingFolders(false)
      setKegiatanId(finalKegiatan)
      setSpjId(finalSpj)
      setPhId(finalPh)
      setPhysicalDocId(finalPhysical)
      toast({ title: "Folder Tersimpan", description: "Penyimpanan Drive telah diperbarui secara global." })
    }, 1000)
  }

  const handleSaveIntegrations = () => {
    if (!villageSettingsRef || !user) return
    setIsSavingIntegrations(true)
    const finalAgendaFolderId = extractFolderId(agendaFolderId)
    setDocumentNonBlocking(villageSettingsRef, {
      agendaFolderId: finalAgendaFolderId,
      googleCalendarId: googleCalendarId.trim(),
      updatedBy: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true })

    setTimeout(() => {
      setIsSavingIntegrations(false)
      setAgendaFolderId(finalAgendaFolderId)
      setGoogleCalendarId(googleCalendarId.trim())
      toast({ title: "Integrasi Disimpan", description: "Pengaturan sinkronisasi telah diperbarui secara global." })
    }, 1000)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isAuthLoading || isDataLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto pb-32">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-primary">Pengaturan Sistem (Global)</h1>
      </header>

      <div className="grid gap-6">
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" />
              Logo Pemerintah Desa
            </CardTitle>
            <CardDescription>Logo ini akan muncul pada Kop Surat semua dokumen PDF secara global.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div 
                className="relative h-32 w-32 rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/30 hover:bg-primary/5 cursor-pointer overflow-hidden border-primary/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {localPreview ? (
                  <Image src={localPreview} alt="Logo" fill className="object-contain p-2" unoptimized />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase text-center p-2">Unggah Logo</span>
                )}
                {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              {localPreview && <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={removeLogo}>Hapus Logo</Button>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutPanelTop className="h-5 w-5 text-primary" />
              Foto Halaman Utama
            </CardTitle>
            <CardDescription>Unggah foto desa untuk latar belakang halaman depan aplikasi.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div 
                className="relative w-full aspect-[21/9] rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/30 hover:bg-primary/5 cursor-pointer overflow-hidden border-primary/20"
                onClick={() => heroInputRef.current?.click()}
              >
                {heroPreview ? (
                  <Image src={heroPreview} alt="Hero" fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Klik untuk Unggah Foto Desa</span>
                )}
                {isUploadingHero && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              </div>
              <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={handleHeroChange} />
              {heroPreview && <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={removeHero}>Hapus Foto Utama</Button>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" /> Folder Google Drive (Global)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Upload Kegiatan</Label>
                  <Input placeholder="ID Folder Drive..." value={kegiatanId} onChange={(e) => setKegiatanId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Dokumen Fisik</Label>
                  <Input placeholder="ID Folder Drive..." value={physicalDocId} onChange={(e) => setPhysicalDocId(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder SPJ</Label>
                  <Input placeholder="ID Folder..." value={spjId} onChange={(e) => setSpjId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Produk Hukum</Label>
                  <Input placeholder="ID Folder..." value={phId} onChange={(e) => setPhId(e.target.value)} />
                </div>
              </div>
            </div>
            <Button className="w-full h-12 font-black uppercase" onClick={handleSaveFolders} disabled={isSavingFolders}>
              {isSavingFolders ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Simpan Konfigurasi Folder
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Integrasi Google (Global)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Agenda & Undangan</Label>
                <Input placeholder="ID Folder..." value={agendaFolderId} onChange={(e) => setAgendaFolderId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Google Kalender</Label>
                <Input placeholder="Email kalender desa..." value={googleCalendarId} onChange={(e) => setGoogleCalendarId(e.target.value)} />
              </div>
            </div>
            <Button className="w-full h-12 font-black uppercase" onClick={handleSaveIntegrations} disabled={isSavingIntegrations}>
              {isSavingIntegrations ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Simpan Integrasi
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden border-t-4 border-t-destructive">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground mb-1">Akun Login:</p>
                <p className="text-sm font-bold">{user?.email}</p>
              </div>
              <Button variant="destructive" className="w-full h-12 gap-2 font-bold" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Keluar Sistem
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
