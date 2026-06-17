"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  PieChart as PieChartIcon, 
  Download,
  Search,
  Wallet,
  Upload,
  Trash2,
  RefreshCcw,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  Pie,
  PieChart
} from "recharts"
import { cn } from "@/lib/utils"
import { useState, useMemo, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { APB_DATA as initialApbData, BIDANG_NAMES, type ApbItem } from "@/lib/apbdes-data"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ApbdesPage() {
  const [apbData, setApbData] = useState<ApbItem[]>([])
  const [search, setSearch] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("apbdes_data")
    if (savedData) {
      try {
        setApbData(JSON.parse(savedData))
      } catch (e) {
        setApbData(initialApbData)
      }
    } else {
      setApbData(initialApbData)
    }
    setMounted(true)
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("apbdes_data", JSON.stringify(apbData))
    }
  }, [apbData, mounted])

  const stats = useMemo(() => {
    const revenueBySource: Record<string, number> = {}
    const expenseByBidang: Record<number, number> = {}
    let total = 0

    apbData.forEach((item: ApbItem) => {
      revenueBySource[item.sumber] = (revenueBySource[item.sumber] || 0) + item.nominal
      expenseByBidang[item.bidang] = (expenseByBidang[item.bidang] || 0) + item.nominal
      total += item.nominal
    })

    const revenueChart = Object.entries(revenueBySource).map(([name, value]) => ({
      name,
      value,
      color: name === "DD" ? "hsl(var(--primary))" : name === "ADD" ? "hsl(var(--accent))" : "#10b981"
    }))

    const expenseChart = Object.entries(expenseByBidang).map(([bidang, amount]) => ({
      category: BIDANG_NAMES[Number(bidang)] || `Bidang ${bidang}`,
      amount
    }))

    return { total, revenueChart, expenseChart }
  }, [apbData])

  const filteredData = apbData.filter(item => 
    item.uraian.toLowerCase().includes(search.toLowerCase()) || 
    item.kode.includes(search)
  )

  const formatIDR = (val: number) => `Rp ${new Intl.NumberFormat('id-ID').format(val)}`

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Skip header row
        const importedData: ApbItem[] = jsonData.slice(1).map((row: any) => {
          const [kode, uraian, volumeStr, nominal, sumber] = row;
          
          let volume = "-";
          let satuan = "-";
          if (typeof volumeStr === 'string') {
            const parts = volumeStr.match(/(\d+)\s*(.*)/);
            if (parts) {
              volume = parts[1];
              satuan = parts[2].trim();
            } else {
              volume = volumeStr;
            }
          } else if (typeof volumeStr === 'number') {
            volume = String(volumeStr);
            satuan = 'buah';
          }

          return {
            kode: String(kode || ""),
            uraian: String(uraian || ""),
            volume: volume,
            satuan: satuan,
            nominal: Number(nominal || 0),
            sumber: String(sumber || ""),
            bidang: parseInt(String(kode || "0").split('.')[0], 10) || 0,
          };
        }).filter(item => item.kode && item.uraian && item.nominal > 0);

        setApbData(importedData);
        toast({ title: "Impor Berhasil", description: `${importedData.length} baris data berhasil diimpor.` });
      } catch (error) {
        console.error("Import error:", error);
        toast({ variant: "destructive", title: "Impor Gagal", description: "Format file tidak sesuai. Pastikan kolom benar." });
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleExport = () => {
    const exportData = filteredData.map(item => ({
      'Kode Rekening': item.kode,
      'Nama Kegiatan': item.uraian,
      'Bidang': BIDANG_NAMES[item.bidang],
      'Volume': `${item.volume} ${item.satuan}`,
      'Nominal': item.nominal,
      'Sumber Anggaran': item.sumber,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "APBDes");
    XLSX.writeFile(wb, "Laporan_APBDes_rungkang.xlsx");
    toast({ title: "Ekspor Berhasil", description: "Laporan APBDes telah diunduh." });
  };
  
  const handleDeleteAll = () => {
    setApbData([]);
    setShowDeleteConfirm(false);
    toast({ variant: "destructive", title: "Data Dihapus", description: "Semua rincian APBDes telah dihapus." });
  };

  const handleRestoreDefaults = () => {
    setApbData(initialApbData);
    toast({ title: "Data Dipulihkan", description: "Mengembalikan ke data contoh Desa Rungkang." });
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Informasi APBDes</h1>
            <p className="text-xs text-muted-foreground">Anggaran Pendapatan & Belanja Desa Rungkang 2026</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
            <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                Impor
            </Button>
            <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                Ekspor
            </Button>
            <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase" onClick={handleRestoreDefaults}>
                <RefreshCcw className="h-3.5 w-3.5" />
                Reset
            </Button>
            <Button variant="destructive" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase shadow-lg shadow-destructive/20" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Semua
            </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-lg bg-primary text-primary-foreground rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Pengeluaran</p>
            <CardTitle className="text-3xl font-black">{formatIDR(stats.total)}</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-bold text-[10px]">TAHUN 2026</Badge>
              <span className="text-[10px] opacity-70">Realisasi per Hari Ini</span>
            </div>
            <div className="mt-8 space-y-4">
              {stats.revenueChart.map((s: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 uppercase tracking-tighter opacity-80">{s.name}</span>
                    <span>{formatIDR(s.value)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white" style={{ width: `${stats.total > 0 ? (s.value / stats.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="p-8 flex flex-row items-center justify-between bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-black uppercase">Komposisi Sumber Dana</CardTitle>
              <CardDescription className="text-xs font-medium">Penyebaran anggaran berdasarkan sumber pembiayaan</CardDescription>
            </div>
            <PieChartIcon className="h-6 w-6 text-primary/40" />
          </CardHeader>
          <CardContent className="p-0 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.revenueChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.revenueChart.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatIDR(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="p-8 bg-slate-50/50">
            <CardTitle className="text-lg font-black uppercase">Belanja per Bidang</CardTitle>
            <CardDescription className="text-xs font-medium">Alokasi dana untuk pembangunan & pemberdayaan</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expenseChart} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={140}
                  style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatIDR(value)}
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="p-8 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black uppercase">Rincian Kegiatan</CardTitle>
                <CardDescription className="text-xs font-medium">Detail alokasi penggunaan anggaran desa</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari uraian..." 
                  className="pl-9 h-11 w-full sm:w-[240px] bg-white rounded-xl shadow-sm border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase px-6 h-12">Kode</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12">Uraian</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right h-12">Nominal</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center px-6 h-12">Sumber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? filteredData.map((item: ApbItem, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                      <TableCell className="font-mono text-[10px] text-muted-foreground px-6">{item.kode}</TableCell>
                      <TableCell className="py-4">
                        <p className="text-xs font-bold leading-tight text-slate-800">{item.uraian}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase">Volume: {item.volume} {item.satuan}</p>
                      </TableCell>
                      <TableCell className="text-right font-black text-xs text-primary">{formatIDR(item.nominal)}</TableCell>
                      <TableCell className="text-center px-6">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black px-2 py-0.5 border-2",
                          item.sumber === 'DD' ? "border-primary/20 text-primary bg-primary/5" : 
                          item.sumber === 'ADD' ? "border-accent/20 text-accent bg-accent/5" : "border-emerald-200 text-emerald-600 bg-emerald-50"
                        )}>
                          {item.sumber}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <AlertCircle className="h-10 w-10 opacity-20" />
                          <p className="text-sm font-bold uppercase tracking-widest">Tidak ada data APBDes</p>
                          <p className="text-[10px] uppercase">Silakan impor file Excel atau gunakan tombol Reset.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-primary uppercase tracking-tight text-base leading-none">Ringkasan Bidang</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Akumulasi Anggaran per Bidang Utama</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((bidang: number) => {
            const sum = apbData.filter(d => d.bidang === bidang).reduce((acc, curr) => acc + curr.nominal, 0)
            return (
              <div key={bidang} className="p-6 rounded-3xl border bg-slate-50/50 hover:bg-white hover:border-primary/40 hover:shadow-xl transition-all group">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Bidang {bidang}</p>
                <p className="text-[11px] font-black text-slate-800 group-hover:text-primary leading-tight mb-4 line-clamp-2 h-10 uppercase">
                  {BIDANG_NAMES[bidang]}
                </p>
                <p className="text-base font-black tracking-tight text-primary">{formatIDR(sum)}</p>
              </div>
            )
          })}
        </div>
      </section>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
            <AlertDialogHeader className="items-center text-center">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <Trash2 className="h-10 w-10 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl font-black uppercase text-destructive">Hapus Seluruh Data?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs font-bold uppercase text-slate-500 leading-relaxed">
                    Tindakan ini akan menghapus semua rincian APBDes dari memori sistem. Pastikan Anda sudah memiliki cadangan file Excel jika ingin memulihkannya nanti.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
                <AlertDialogCancel className="h-12 rounded-2xl font-bold uppercase w-full">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className={cn(buttonVariants({variant: "destructive"}), "h-12 rounded-2xl font-black uppercase shadow-lg shadow-destructive/20 w-full")}>Ya, Hapus Semua</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
