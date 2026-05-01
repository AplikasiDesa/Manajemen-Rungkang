'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Home, LogIn, ChevronRight, Shield, Clock, MapPin, ExternalLink, Globe } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { doc } from "firebase/firestore"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const { user } = useUser()
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // We fetch a generic admin profile to get the hero photo if not logged in
  // In a real app, this might be a site-wide config doc, but here we use the user doc as a proxy
  const configRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])
  
  const { data: configData } = useDoc(configRef)

  if (!mounted) return null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* HEADER */}
      <header className="px-4 lg:px-10 h-20 flex items-center justify-between border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Home className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter uppercase text-primary leading-none">RUNGKANG</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sistem Manajemen Desa</span>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-full font-bold border-primary/20 text-primary hover:bg-primary/5 hidden sm:flex">
          <Link href="/login/">Masuk Sistem</Link>
        </Button>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative w-full py-20 lg:py-32 overflow-hidden bg-slate-900">
          {/* Background Photo */}
          <div className="absolute inset-0 z-0">
            {configData?.heroPhotoBase64 ? (
              <Image 
                src={configData.heroPhotoBase64} 
                alt="Background Desa" 
                fill 
                className="object-cover opacity-40"
                unoptimized
              />
            ) : (
              <Image 
                src="https://picsum.photos/seed/desa/1920/1080" 
                alt="Background Placeholder" 
                fill 
                className="object-cover opacity-30 grayscale"
                data-ai-hint="village landscape"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center space-y-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm text-primary-foreground text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-1000">
              <Globe className="h-3 w-3" /> Digitalisasi Desa Rungkang
            </div>
            
            <div className="max-w-4xl mx-auto space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                Sistem Administrasi <br /> 
                <span className="text-primary italic">Desa Terpadu</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000">
                Meningkatkan efisiensi pelayanan, akuntabilitas anggaran, dan keterbukaan informasi publik untuk masyarakat Desa Rungkang yang lebih maju.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <Button asChild size="lg" className="h-16 px-10 rounded-2xl text-lg font-black uppercase shadow-2xl shadow-primary/30 gap-3 group active:scale-95 transition-all">
                <Link href="/login/">
                  Mulai Gunakan Sistem <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-16 px-10 rounded-2xl text-lg font-bold border border-white/20 text-white hover:bg-white/10 backdrop-blur-md active:scale-95 transition-all">
                <Link href="#features">Pelajari Fitur</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 space-y-2">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Solusi Digital Kami</h2>
              <div className="h-1.5 w-20 bg-primary mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Laporan Kegiatan", icon: Shield, desc: "Dokumentasi digital setiap pembangunan dan kegiatan desa secara real-time." },
                { title: "Manajemen SPPD", icon: Clock, desc: "Pengajuan dan pencatatan perjalanan dinas yang sistematis dan transparan." },
                { title: "Arsip Digital", icon: MapPin, desc: "Penyimpanan dokumen penting, SPJ, dan produk hukum desa dalam satu wadah aman." }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 hover:border-primary/30 transition-all group">
                  <div className="h-14 w-14 rounded-2xl bg-white shadow-md flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <f.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-black tracking-tighter text-white">RUNGKANG.ID</span>
              </div>
              <p className="max-w-md leading-relaxed text-sm">
                Pemerintah Desa Rungkang berkomitmen untuk terus berinovasi dalam memberikan pelayanan terbaik melalui pemanfaatan teknologi informasi yang modern.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Kontak Kami</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> Balai Desa Rungkang</li>
                <li className="flex items-center gap-3"><Clock className="h-4 w-4 text-primary" /> Senin - Jumat (08:00 - 15:30)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Tautan Cepat</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/login/" className="hover:text-primary transition-colors flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Panel Perangkat</Link></li>
                <li><Link href="/apbdes/" className="hover:text-primary transition-colors flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Informasi Anggaran</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-bold uppercase tracking-widest">
              &copy; 2026 Pemerintah Desa Rungkang. Seluruh Hak Cipta Dilindungi.
            </p>
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-tighter">
              <span>Kecamatan Gandrungmangu</span>
              <span>Kabupaten Cilacap</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
