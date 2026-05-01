"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface KegiatanProps {
  id: string
  title: string
  description: string
  date: string
  location: string
  category: string
  imageUrl: string
  driveFolderId?: string
}

export function KegiatanCard({ 
  kegiatan, 
  onDelete,
  onClick
}: { 
  kegiatan: KegiatanProps,
  onDelete?: (e: React.MouseEvent) => void,
  onClick?: () => void
}) {
  return (
    <Card 
      className="overflow-hidden group hover:shadow-xl transition-all relative cursor-pointer active:scale-[0.98] border-none shadow-sm"
      onClick={onClick}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={kegiatan.imageUrl}
          alt={kegiatan.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          unoptimized={kegiatan.imageUrl.includes('googleusercontent.com') || kegiatan.imageUrl.includes('drive.google.com')}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        
        <div className="absolute top-2 right-2 flex gap-2 items-center z-20">
          {onDelete && (
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm font-bold border-none">
            {kegiatan.category}
          </Badge>
        </div>

        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <ExternalLink className="h-4 w-4 text-white" />
            </div>
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-black text-primary line-clamp-2 leading-tight uppercase tracking-tight">
            {kegiatan.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2 font-medium">
          {kegiatan.description}
        </p>
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
            <Calendar className="h-3 w-3 text-primary/60" />
            <span>{kegiatan.date}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
            <MapPin className="h-3 w-3 text-primary/60" />
            <span className="truncate">{kegiatan.location}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
