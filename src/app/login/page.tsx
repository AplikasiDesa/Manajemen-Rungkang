"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, LogIn, Loader2, KeyRound, Mail, AlertCircle, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import Link from "next/link"

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
})

/**
 * Halaman Login Utama Manajemen Desa
 * KHUSUS AKUN PUSAT: rungkang@gmail.id
 */
export default function LoginPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Redirect jika sudah login sebagai admin pusat
    if (user && !isUserLoading && user.email?.toLowerCase() === "rungkang@gmail.id") {
      router.push("/dashboard/");
    }
  }, [user, isUserLoading, router])

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (!db || !auth) return
    setIsProcessing(true)
    try {
      const allowedEmail = "rungkang@gmail.id";
      const allowedPass = "rungkang123";

      // 1. Hard Check Kredensial Manajemen
      if (values.email.toLowerCase() !== allowedEmail || values.password !== allowedPass) {
        throw new Error("Akses Ditolak: Hanya akun manajemen pusat yang diizinkan masuk ke sistem ini.");
      }

      // 2. Prosedur Auth Firebase
      try {
        await signInWithEmailAndPassword(auth, values.email, values.password)
      } catch (authErr: any) {
        // Jika akun belum terdaftar di Firebase Auth (Initial Run), daftarkan otomatis
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password') {
           // Jika ini adalah percobaan login pertama dengan rungkang@gmail.id, buatkan akunnya
           if (values.email.toLowerCase() === allowedEmail && values.password === allowedPass) {
              const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password)
              // Daftarkan di Firestore agar role admin terbaca global
              await setDoc(doc(db, "users", userCredential.user.uid), {
                id: userCredential.user.uid,
                email: values.email.toLowerCase(),
                name: "ADMINISTRATOR PUSAT",
                role: "admin",
                createdAt: new Date().toISOString()
              }, { merge: true })
           } else {
             throw new Error("Email atau kata sandi manajemen salah.");
           }
        } else {
          throw authErr
        }
      }

      toast({
        title: "Login Berhasil",
        description: "Selamat datang di Panel Manajemen Desa.",
      })
      router.push("/dashboard/")
    } catch (error: any) {
      console.error("Login Error:", error);
      toast({
        variant: "destructive",
        title: "Gagal Masuk",
        description: error.message || "Terjadi kesalahan saat memproses login.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-primary/5">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-card">
        <CardHeader className="text-center space-y-4 pb-4 pt-12 relative">
          <Button variant="ghost" size="icon" asChild className="absolute left-6 top-6 rounded-full">
            <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="mx-auto h-20 w-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
            <Home className="text-primary-foreground h-10 w-10" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tighter uppercase text-primary">MANAJEMEN PUSAT</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest opacity-60 text-destructive">Akses Terbatas Administrator</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8 sm:p-10 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Email Admin</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="rungkang@gmail.id" 
                          {...field} 
                          className="h-12 rounded-xl pl-10 text-sm border-primary/10 bg-muted/30" 
                          autoComplete="off"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Kata Sandi</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="******" 
                          {...field} 
                          className="h-12 rounded-xl pl-10 text-sm border-primary/10 bg-muted/30" 
                          autoComplete="new-password"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit"
                className="w-full h-14 text-base font-black uppercase gap-4 shadow-lg active:scale-95 transition-all rounded-2xl bg-primary hover:bg-primary/90 mt-4" 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Masuk Manajemen
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="p-4 bg-amber-50 rounded-xl flex items-start gap-3 border border-dashed border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 leading-relaxed font-bold uppercase">
              Halaman ini dikunci untuk Administrator Pusat Desa Rungkang. Perangkat desa silakan gunakan Portal Absensi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
