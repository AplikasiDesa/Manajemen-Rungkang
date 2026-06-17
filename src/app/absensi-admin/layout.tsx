
"use client"

import { ReactNode, useState, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser, useAuth, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { 
  ShieldCheck, 
  MonitorPlay, 
  UserPlus, 
  Settings, 
  LogOut,
  ChevronLeft,
  LayoutDashboard,
  Loader2,
  Printer
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function AdminAbsensiLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const isLoginPage = pathname?.includes("/absensi-admin/login");

  // Ambil data profil untuk verifikasi role dan status aktif
  const personelRef = useMemoFirebase(() => 
    (db && user) ? doc(db, "personel", user.uid) : null, 
  [db, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(personelRef)

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
      router.replace("/");
    }
  }, [auth, router]);

  useEffect(() => {
    if (isLoginPage) return;
    if (isUserLoading) return;
    
    // 1. Jika tidak ada user login
    if (!user) {
      router.replace("/absensi-admin/login/")
      return
    }

    // 2. Tunggu profil dan cek otorisasi secara ketat
    if (!isProfileLoading) {
       const isEmailAuthorized = user.email === "admin@rungkang.id" || 
                                  user.email === "rungkang@gmail.id" ||
                                  user.email?.toLowerCase() === "desarungkang014@gmail.com";
                                  
       const isAdminRole = profile?.role === "admin_absensi" || profile?.role === "admin";

       if (!isEmailAuthorized && !isAdminRole) {
          router.replace("/absensi/dashboard/");
          return;
       }

       if (profile && !profile.aktif && !isEmailAuthorized) {
          handleLogout();
          return;
       }

       // Konfirmasi otorisasi selesai
       setIsAuthorized(true);
    }
  }, [user, profile, isUserLoading, isProfileLoading, router, isLoginPage, handleLogout])

  if (isLoginPage) {
    return <main className="w-full min-h-screen bg-[#0f172a]">{children}</main>;
  }

  // Jangan render konten admin jika belum terverifikasi atau masih loading
  if (isUserLoading || isProfileLoading || !isAuthorized || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-white/20 mx-auto" />
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Memverifikasi Hak Akses...
          </p>
        </div>
      </div>
    )
  }

  const navItems = [
    { label: "Monitoring", icon: MonitorPlay, href: "/absensi-admin/dashboard/" },
    { label: "Input Absensi", icon: UserPlus, href: "/absensi-admin/input/" },
    { label: "Cetak Dokumen", icon: Printer, href: "/absensi-admin/report/" },
    { label: "Pengaturan", icon: Settings, href: "/absensi-admin/settings/" },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-400 transition-all duration-300 shadow-2xl",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-white/5">
            <ShieldCheck className="h-6 w-6 text-white shrink-0" />
            {isSidebarOpen && <span className="ml-3 font-black text-white uppercase tracking-tighter">Admin Absen</span>}
          </div>

          <nav className="flex-1 py-6 px-3 space-y-2">
            {navItems.map((item) => {
              const currentPath = pathname?.replace(/\/$/, "");
              const itemPath = item.href.replace(/\/$/, "");
              const isActive = currentPath === itemPath;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center h-12 rounded-xl transition-all px-3",
                    isActive ? "bg-white/10 text-white shadow-lg" : "hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {isSidebarOpen && <span className="ml-3 text-sm font-bold truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5 space-y-2">
             <button 
              onClick={() => router.push("/")}
              className="flex items-center w-full h-11 px-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span className="ml-3 text-xs font-bold uppercase">Manajemen Desa</span>}
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center w-full h-11 px-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span className="ml-3 text-xs font-bold uppercase">Keluar Portal</span>}
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 bg-slate-900 border border-white/10 text-white rounded-full p-1 shadow-lg hover:bg-slate-800"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !isSidebarOpen && "rotate-180")} />
        </button>
      </aside>

      <main className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
