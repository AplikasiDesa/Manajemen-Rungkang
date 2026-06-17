"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  FileUp, 
  Map, 
  User, 
  Settings, 
  LogOut,
  Home,
  Loader2,
  CircleDollarSign,
  Files,
  Calendar,
  Archive,
  FileText,
  Hash,
  HeartPulse,
  FileStack
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import Image from "next/image"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const menuGroups = [
  {
    label: "MENU UTAMA",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard/" },
      { label: "Informasi APBDes", icon: CircleDollarSign, href: "/apbdes/" },
      { label: "Agenda Kegiatan", icon: Calendar, href: "/agenda/" },
    ],
  },
  {
    label: "MANAJEMEN DOKUMEN",
    items: [
      { label: "Arsip Digital", icon: Archive, href: "/arsip-dokumen/" },
      { label: "Register Surat", icon: Hash, href: "/arsip-nomor-surat/" },
      { label: "Naskah Dinas", icon: FileText, href: "/naskah-dinas/" },
      { label: "Manajemen SPPD", icon: Map, href: "/sppd/" },
      { label: "Dokumentasi Kegiatan", icon: FileUp, href: "/kegiatan/" },
      { label: "Cetak Dokumen", icon: Files, href: "/dokumen-penunjang/" },
      { label: "Inventaris Dokumen Fisik", icon: FileStack, href: "/dokumen-fisik/" },
    ],
  },
  {
    label: "DATA & INFORMASI",
    items: [
      { label: "Data Perangkat Desa", icon: User, href: "/profile/" },
      { label: "Data Kesehatan", icon: HeartPulse, href: "/data-kesehatan/" },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()
  const { setOpenMobile, isMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  // GLOBAL CONFIG: Use village shared settings
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  
  const { data: configData } = useDoc(villageSettingsRef)

  React.useEffect(() => {
    setMounted(true)
  }, [])

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

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar className="border-r bg-card shadow-none" collapsible="icon">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-lg shadow-primary/10 border border-border overflow-hidden shrink-0">
            {configData?.logoBase64 ? (
              <Image 
                src={configData.logoBase64} 
                alt="Logo Desa" 
                width={48} 
                height={48} 
                className="object-contain p-1.5"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                <Home className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-black text-xl leading-tight tracking-tighter text-foreground">Rungkang</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] font-bold">DATABASE TERPADU</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label} className="mt-2">
            <SidebarGroupLabel className="px-2 py-4 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
              {group.items.map((item) => {
                const itemPath = item.href.replace(/\/$/, "")
                const currentPath = mounted ? pathname.replace(/\/$/, "") : ""
                const isActive = mounted && (
                  currentPath === itemPath || currentPath.startsWith(itemPath + "/")
                )
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={handleLinkClick}
                      className={cn(
                        "h-12 px-4 rounded-xl transition-all duration-300 group",
                        isActive 
                          ? "bg-primary/10 text-primary border-none hover:bg-primary/10" 
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )}>
                          <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                        </div>
                        <span className={cn(
                          "font-bold text-[13px] whitespace-nowrap",
                          isActive ? "text-primary" : "text-foreground"
                        )}>
                          {item.label}
                        </span>
                        {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />} 
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-2 py-4 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
            SISTEM & LAYANAN
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1.5">
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Pengaturan" onClick={handleLinkClick} className="h-11 px-4 rounded-xl hover:bg-muted text-muted-foreground">
                    <Link href="/settings/" className="flex items-center gap-3">
                        <Settings className="h-5 w-5 shrink-0" />
                        <span className="font-semibold text-[13px]">Pengaturan</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-muted mt-auto border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 w-full px-2 py-3 overflow-hidden">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <span className="text-xs font-black text-primary uppercase">{user?.email?.substring(0,2).toUpperCase() || 'AD'}</span>
              </div>
              <div className="flex flex-col text-left overflow-hidden flex-1">
                <span className="text-sm font-black text-foreground truncate">{user?.email?.split('@')[0].toUpperCase() || 'Pengguna'}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase truncate">Perangkat Desa</span>
              </div>
              <button 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted hover:shadow-sm text-muted-foreground hover:text-destructive transition-all shrink-0"
              >
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}