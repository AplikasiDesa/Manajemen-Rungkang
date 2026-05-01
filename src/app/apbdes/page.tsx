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
  Trash2
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
import { useState, useMemo, useRef } from "react"
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
  const [apbData, setApbData] = useState<ApbItem[]>(initialApbData)
  const [search, setSearch] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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
    XLSX.writeFile(wb, "Laporan_APBDes_Rungkang.xlsx");
    toast({ title: "Ekspor Berhasil", description: "Laporan APBDes telah diunduh." });
  };
  
  const handleDeleteAll = () => {
    setApbData([]);
    setShowDeleteConfirm(false);
    toast({ variant: "destructive", title: "Data Dihapus", description: "Semua rincian APBDes telah dihapus." });
  };

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
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Transparansi APBDes</h1>
            <p className="text-xs text-muted-foreground">Anggaran Pendapatan & Belanja Desa Rungkang 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
            <Button variant="outline" size="sm" className="flex gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Impor
            </Button>
            <Button variant="outline" size="sm" className="flex gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Ekspor
            </Button>
            <Button variant="destructive" size="sm" className="flex gap-2" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4" />
                Hapus
            </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-lg bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Pengeluaran</p>
            <CardTitle className="text-3xl font-black">{formatIDR(stats.total)}</CardTitle>
          </CardHeader>
          <CardContent>
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

        <Card className="md:col-span-2 border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Komposisi Sumber Dana</CardTitle>
              <CardDescription>Penyebaran anggaran berdasarkan sumber pembiayaan</CardDescription>
            </div>
            <PieChartIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[250px] w-full">
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
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Belanja per Bidang</CardTitle>
            <CardDescription>Alokasi dana untuk pembangunan & pemberdayaan</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expenseChart} layout="vertical" margin={{ left: -20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={150}
                  style={{ fontSize: '9px', fontWeight: 'bold' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatIDR(value)}
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Rincian Kegiatan</CardTitle>
                <CardDescription>Detail alokasi penggunaan anggaran desa</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari uraian..." 
                  className="pl-9 h-9 w-full sm:w-[200px] bg-white rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Kode</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Uraian</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Nominal</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center">Sumber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? filteredData.map((item: ApbItem, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{item.kode}</TableCell>
                      <TableCell>
                        <p className="text-xs font-bold leading-tight">{item.uraian}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Vol: {item.volume} {item.satuan}</p>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs text-primary">{formatIDR(item.nominal)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black px-1.5 py-0",
                          item.sumber === 'DD' ? "border-primary/20 text-primary" : 
                          item.sumber === 'ADD' ? "border-accent/20 text-accent" : "border-primary/20 text-primary"
                        )}>
                          {item.sumber}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Tidak ada data. Silakan impor data baru.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <section className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-primary uppercase tracking-tight text-sm">Ringkasan Bidang</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Akumulasi Anggaran per Bidang Utama</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((bidang: number) => {
            const sum = apbData.filter(d => d.bidang === bidang).reduce((acc, curr) => acc + curr.nominal, 0)
            return (
              <div key={bidang} className="p-4 rounded-2xl border bg-muted/5 hover:border-primary/30 transition-all group">
                <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Bidang {bidang}</p>
                <p className="text-[10px] font-bold text-primary group-hover:text-primary leading-tight mb-2 line-clamp-2 h-8">
                  {BIDANG_NAMES[bidang]}
                </p>
                <p className="text-sm font-black tracking-tight">{formatIDR(sum)}</p>
              </div>
            )
          })}
        </div>
      </section>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus semua data?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan menghapus semua data rincian APBDes secara permanen. Data hanya bisa dipulihkan dengan mengimpor ulang file Excel.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className={cn(buttonVariants({variant: "destructive"}))}>Ya, Hapus Semua</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
