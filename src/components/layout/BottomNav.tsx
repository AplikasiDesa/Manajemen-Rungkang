
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileUp, Map, User } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { label: "Beranda", icon: LayoutDashboard, href: "/dashboard/" },
    { label: "Upload", icon: FileUp, href: "/kegiatan/" },
    { label: "SPPD", icon: Map, href: "/sppd/" },
    { label: "Profil", icon: User, href: "/profile/" },
  ]

  if (!mounted) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card px-4 pb-safe-area-inset-bottom md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 transition-all active:scale-90",
                isActive ? "text-primary font-bold" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] uppercase tracking-wider font-bold">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
