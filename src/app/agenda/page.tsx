"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, FilePlus } from "lucide-react"
import { RincianKegiatan } from "@/components/agenda/RincianKegiatan"
import { InputAgendaForm } from "@/components/agenda/InputAgendaForm"
import { cn } from "@/lib/utils"

export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-6 p-0 md:p-4 max-w-6xl mx-auto">
       <header className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-primary uppercase tracking-tight">Agenda Kegiatan</h1>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-0.5">Manajemen Kalender & Acara</p>
          </div>
        </header>

      <Tabs defaultValue="rincian" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1.5 rounded-2xl mb-6">
          <TabsTrigger value="rincian" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Rincian</span> Kegiatan
          </TabsTrigger>
          <TabsTrigger value="input" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">
            <FilePlus className="h-4 w-4" />
            Input <span className="hidden sm:inline">Baru</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rincian" className="mt-0 outline-none focus-visible:ring-0">
          <RincianKegiatan />
        </TabsContent>
        <TabsContent value="input" className="mt-0 outline-none focus-visible:ring-0">
          <InputAgendaForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
