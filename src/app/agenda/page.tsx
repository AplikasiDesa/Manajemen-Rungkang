"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, FilePlus, Globe } from "lucide-react"
import { RincianKegiatan } from "@/components/agenda/RincianKegiatan"
import { InputAgendaForm } from "@/components/agenda/InputAgendaForm"
import { Card, CardContent } from "@/components/ui/card"

export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto">
       <header className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Agenda Kegiatan</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase">Manajemen Kalender & Input Acara Desa</p>
          </div>
        </header>

      <Tabs defaultValue="rincian" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-muted/50 p-1.5 rounded-2xl">
          <TabsTrigger value="rincian" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full">
            <Calendar className="h-4 w-4" />
            Rincian
          </TabsTrigger>
          <TabsTrigger value="input" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full">
            <FilePlus className="h-4 w-4" />
            Input Baru
          </TabsTrigger>
          <TabsTrigger value="visual" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full">
            <Globe className="h-4 w-4" />
            Tampilan Kalender
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rincian" className="mt-6">
          <RincianKegiatan />
        </TabsContent>
        
        <TabsContent value="input" className="mt-6">
          <InputAgendaForm />
        </TabsContent>

        <TabsContent value="visual" className="mt-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="aspect-[4/3] md:aspect-video w-full">
                <iframe 
                  src="https://calendar.google.com/calendar/embed?src=desarungkang014%40gmail.com&ctz=Asia%2FJakarta" 
                  style={{ border: 0 }} 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no"
                  className="rounded-[2.5rem]"
                ></iframe>
              </div>
            </CardContent>
          </Card>
          <p className="text-[10px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-widest">
            * Pastikan kalender telah diatur ke publik untuk tampilan visual yang optimal.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
