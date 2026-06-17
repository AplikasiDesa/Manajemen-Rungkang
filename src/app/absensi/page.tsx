
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/firebase"
import { Loader2 } from "lucide-react"

export default function AbsensiRedirectPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.replace("/absensi/login/")
      return;
    }

    // Selalu arahkan ke dashboard personal dari gerbang /absensi/
    // Jika user adalah admin dan ingin mengelola sistem, mereka harus 
    // masuk melalui gerbang khusus /absensi-admin/
    router.replace("/absensi/dashboard/")
    
  }, [user, isUserLoading, router])

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
    </div>
  )
}
