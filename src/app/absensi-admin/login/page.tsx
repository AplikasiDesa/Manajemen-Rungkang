"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogIn, Loader2, KeyRound, User, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { INTERNAL_USERS } from "@/lib/internal-users"

const loginSchema = z.object({
  username: z.string().min(1, "Username admin diperlukan."),
  password: z.string().min(1, "Password admin diperlukan."),
})

export default function AdminAbsensiLoginPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user && !isUserLoading) {
      const isAdmin = user.email === "admin@rungkang.id" || user.email === "rungkang@gmail.id"
      if (isAdmin) {
        router.push("/absensi-admin/dashboard/")
      }
    }
  }, [user, isUserLoading, router, mounted])

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (!db) return
    setIsProcessing(true)
    try {
      const cleanUsername = values.username.trim().toLowerCase()
      const targetAdmin = INTERNAL_USERS.find(u => u.username === cleanUsername && u.role === "admin_absensi")

      if (!targetAdmin) {
        throw new Error("Akun ini tidak memiliki hak akses administrator.")
      }

      try {
        // Coba masuk langsung
        await signInWithEmailAndPassword(auth, targetAdmin.email, values.password)
      } catch (authErr: any) {
        // Jika belum terdaftar di Firebase Auth, coba daftarkan otomatis (Initial Setup)
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
           try {
              const userCredential = await createUserWithEmailAndPassword(auth, targetAdmin.email, values.password)
              // Daftarkan di Firestore personel agar terverifikasi role-nya
              await setDoc(doc(db, "personel", userCredential.user.uid), {
                uid: userCredential.user.uid,
                email: targetAdmin.email,
                username: cleanUsername,
                password: values.password,
                nama: targetAdmin.nama,
                role: "admin",
                aktif: true,
                updated_at: new Date().toISOString()
              }, { merge: true })
           } catch (createErr) {
             throw authErr // Lempar error auth asli jika gagal create
           }
        } else {
          throw authErr
        }
      }

      toast({ title: "Login Admin Berhasil", description: "Selamat datang di Panel Monitoring." })
      router.push("/absensi-admin/dashboard/")
    } catch (error: any) {
      let msg = "Gagal masuk ke panel admin."
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        msg = "Username atau kata sandi administrator salah."
      } else {
        msg = error.message || msg
      }
      toast({ variant: "destructive", title: "Akses Ditolak", description: msg })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#0f172a]">
      <Card className="w-full max-w-[440px] shadow-2xl border-none rounded-[3.5rem] overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-500">
        <CardContent className="p-10 sm:p-14 space-y-8">
          <div className="text-center space-y-6">
            <div className="mx-auto h-24 w-24 rounded-[2.5rem] bg-[#1e293b] flex items-center justify-center shadow-2xl shadow-black/20">
              <ShieldCheck className="text-white h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tighter uppercase text-[#1e293b] leading-tight">
                MONITORING ABSENSI
              </h1>
              <p className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">
                PORTAL KONTROL ADMIN
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-wider ml-1">Username Admin</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="adminrungkang" 
                        {...field} 
                        className="h-14 rounded-2xl pl-12 text-sm border-none bg-slate-50 focus:ring-2 focus:ring-slate-200 font-bold text-slate-700" 
                        autoComplete="off"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-wider ml-1">Kata Sandi</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="h-14 rounded-2xl pl-12 text-sm border-none bg-slate-50 focus:ring-2 focus:ring-slate-200 font-bold text-slate-700" 
                        autoComplete="new-password"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button 
                type="submit" 
                className="w-full h-16 text-sm font-black uppercase shadow-xl rounded-2xl bg-[#1e293b] hover:bg-[#0f172a] mt-4 text-white gap-3 transition-all active:scale-[0.98]" 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" /> 
                    Masuk Panel Admin
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
