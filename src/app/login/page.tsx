
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

export default function LoginPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  // Redirect jika sudah login
  useEffect(() => {
    if (user && !isUserLoading) {
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
    setIsProcessing(true)
    try {
      // Mencoba login
      await signInWithEmailAndPassword(auth, values.email, values.password)
      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali.",
      })
      router.push("/dashboard/")
    } catch (error: any) {
      // Auto-registration jika user tidak ditemukan atau kredensial salah (untuk akses bebas)
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password)
          const newUser = userCredential.user

          await setDoc(doc(db, "users", newUser.uid), {
            id: newUser.uid,
            email: newUser.email,
            name: newUser.email?.split('@')[0] || "Pengguna",
            role: "perangkat", 
            createdAt: new Date().toISOString()
          }, { merge: true })

          toast({
            title: "Akses Diberikan",
            description: "Akun Anda telah disiapkan secara otomatis.",
          })
          router.push("/dashboard/")
        } catch (createError: any) {
          toast({
            variant: "destructive",
            title: "Gagal Mengakses",
            description: "Pastikan format email benar dan password minimal 6 karakter.",
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Login Error",
          description: "Terjadi kendala koneksi. Silakan coba lagi.",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (isUserLoading || (user && !isProcessing)) {
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
            <CardTitle className="text-2xl font-black tracking-tighter uppercase text-primary">MASUK SISTEM</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest opacity-60">Gunakan Akun Perangkat Desa Anda</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8 sm:p-10 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="email@desa.id" {...field} className="h-12 rounded-xl pl-10 text-sm border-primary/10 bg-muted/30" />
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
                        <Input type="password" placeholder="******" {...field} className="h-12 rounded-xl pl-10 text-sm border-primary/10 bg-muted/30" />
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
                    Masuk Sekarang
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="p-4 bg-muted/50 rounded-xl flex items-start gap-3 border border-dashed border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase">
              Akses terbuka untuk semua perangkat. Jika belum terdaftar, sistem akan membuatkan akses otomatis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
