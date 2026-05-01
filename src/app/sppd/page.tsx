
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2, Plane, Printer, Map, LayoutList, PieChart } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SppdUpload } from "@/components/sppd/SppdUpload"
import { SppdCetakForm } from "@/components/sppd/SppdCetakForm"
import { SppdRekap } from "@/components/sppd/SppdRekap"
import { useUser } from "@/firebase"

export default function SppdPage() {
  const { user, isUserLoading } = useUser()
  const [activeTab, setActiveTab] = useState("pengajuan")

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4 p-4 text-center">
        <h2 className="text-xl font-bold">Akses Dibatasi</h2>
        <p className="text-muted-foreground">Silakan login untuk mengelola Layanan SPPD.</p>
        <Button asChild variant="default" className="bg-accent hover:bg-accent/90">
          <Link href="/login">Login Sekarang</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="hover:bg-accent/10">
          <Link href="/">
            <ChevronLeft className="h-6 w-6 text-accent" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black text-accent uppercase tracking-tight">Layanan SPPD</h1>
          <p className="text-xs text-muted-foreground">Sistem Pengelolaan Biaya & Cetak Dokumen Dinas</p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-14 mb-8 bg-accent/5 p-1.5 rounded-2xl border border-accent/10">
          <TabsTrigger value="pengajuan" className="rounded-xl gap-2 text-[10px] font-black uppercase data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-lg transition-all">
            <Map className="h-4 w-4" />
            Pengajuan
          </TabsTrigger>
          <TabsTrigger value="cetak" className="rounded-xl gap-2 text-[10px] font-black uppercase data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-lg transition-all">
            <Printer className="h-4 w-4" />
            Cetak
          </TabsTrigger>
          <TabsTrigger value="rekap" className="rounded-xl gap-2 text-[10px] font-black uppercase data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-lg transition-all">
            <PieChart className="h-4 w-4" />
            Rekapitulasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pengajuan" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card p-6 rounded-3xl border shadow-xl border-accent/5">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Plane className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-black text-lg text-accent uppercase leading-tight">Form Pengajuan</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Input rincian biaya perjalanan dinas</p>
              </div>
            </div>
            <SppdUpload onSuccess={() => setActiveTab("rekap")} />
          </div>
        </TabsContent>

        <TabsContent value="cetak" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card p-6 rounded-3xl border shadow-xl border-accent/5">
             <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-lg text-primary uppercase leading-tight">Cetak Dokumen</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Cetak Surat Tugas & SPPD Format PDF</p>
              </div>
            </div>
            <SppdCetakForm />
          </div>
        </TabsContent>

        <TabsContent value="rekap" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <PieChart className="h-5 w-5 text-accent" />
              <h4 className="font-black text-accent uppercase tracking-wider text-sm">Rekapitulasi Administrasi SPPD</h4>
            </div>
            <SppdRekap />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
