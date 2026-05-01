
"use client"

import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sembunyikan sidebar di Landing Page (/) dan Login Page (/login)
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/login/';

  return (
    <html lang="id">
      <head>
        <title>Manajemen Desa Rungkang</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
        {!mounted ? (
          <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
          </div>
        ) : (
          <FirebaseClientProvider>
            {isPublicPage ? (
              <main className="w-full min-h-screen">
                {children}
                <Toaster />
              </main>
            ) : (
              <SidebarProvider defaultOpen={true}>
                <div className="flex min-h-screen w-full overflow-hidden">
                  <AppSidebar />
                  <SidebarInset className="flex-1 flex flex-col min-w-0">
                    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4 md:hidden">
                      <SidebarTrigger />
                      <div className="flex-1 text-center font-black text-primary uppercase tracking-tighter">Rungkang</div>
                      <Button variant="ghost" size="icon" asChild className="rounded-full">
                        <Link href="/settings/">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                        </Link>
                      </Button>
                    </header>
                    <main className="flex-1 w-full max-w-screen-2xl mx-auto p-0 overflow-y-auto pb-20 md:pb-0">
                      {children}
                    </main>
                  </SidebarInset>
                </div>
                <BottomNav />
                <Toaster />
              </SidebarProvider>
            )}
          </FirebaseClientProvider>
        )}
      </body>
    </html>
  );
}
