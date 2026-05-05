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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
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
    <div className="flex flex-col gap-6 p-0 md:p-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 md:hidden">
            <Link href="/">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-primary uppercase tracking-tight">Info APBDes</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Anggaran & Belanja Desa 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
            <Button variant="outline" size="sm" className="h-9 px-3 gap-2 text-[10px] font-black uppercase rounded-xl shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Impor
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 gap-2 text-[10px] font-black uppercase rounded-xl shrink-0" onClick={handleExport}>
                <Download className="h-4 w-4" /> Ekspor
            </Button>
            <Button variant="destructive" size="sm" className="h-9 px-3 gap-2 text-[10px] font-black uppercase rounded-xl shrink-0" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4" /> Hapus
            </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-lg bg-primary text-primary-foreground rounded-[2rem]">
          <CardHeader className="pb-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Pengeluaran</p>
            <CardTitle className="text-3xl font-black">{formatIDR(stats.total)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-black text-[9px] rounded-full uppercase">TAHUN 2026</Badge>
            </div>
            <div className="mt-8 space-y-4">
              {stats.revenueChart.map((s: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="opacity-80">{s.name}</span>
                    <span>{formatIDR(s.value)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${stats.total > 0 ? (s.value / stats.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-md rounded-[2rem] bg-white">
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div>
              <CardTitle className="text-base font-black uppercase">Komposisi Dana</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Penyebaran Anggaran</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="h-[250px] w-full p-4">
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
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-md rounded-[2rem] bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-base font-black uppercase">Belanja per Bidang</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Alokasi pembangunan</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-0 pb-6 px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expenseChart} layout="vertical" margin={{ left: -20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={150}
                  style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatIDR(value)}
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-md overflow-hidden rounded-[2rem] bg-white">
          <CardHeader className="bg-muted/30 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-black uppercase">Rincian Kegiatan</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Detail penggunaan anggaran</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari uraian..." 
                  className="pl-9 h-11 w-full bg-white rounded-xl border-none shadow-sm text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <Table>
                    <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="text-[9px] font-black uppercase px-6">Kode</TableHead>
                        <TableHead className="text-[9px] font-black uppercase px-6">Uraian</TableHead>
                        <TableHead className="text-[9px] font-black uppercase px-6 text-right">Nominal</TableHead>
                        <TableHead className="text-[9px] font-black uppercase px-6 text-center">Sumber</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredData.length > 0 ? filteredData.map((item: ApbItem, i: number) => (
                        <TableRow key={i} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-[10px] text-muted-foreground px-6">{item.kode}</TableCell>
                        <TableCell className="px-6">
                            <p className="text-xs font-bold leading-tight">{item.uraian}</p>
                            <p className="text-[9px] font-black text-muted-foreground mt-1 uppercase">Vol: {item.volume} {item.satuan}</p>
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-primary px-6">{formatIDR(item.nominal)}</TableCell>
                        <TableCell className="text-center px-6">
                            <Badge variant="outline" className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-lg",
                            item.sumber === 'DD' ? "border-primary/20 text-primary bg-primary/5" : 
                            item.sumber === 'ADD' ? "border-accent/20 text-accent bg-accent/5" : "border-primary/20 text-primary"
                            )}>
                            {item.sumber}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-[10px] font-black uppercase text-muted-foreground">
                            Data tidak ditemukan.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
            <AlertDialogHeader className="items-center text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-10 w-10 text-destructive" />
                </div>
                <div>
                    <AlertDialogTitle className="text-xl font-black uppercase text-destructive">Hapus Semua Data?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs font-bold uppercase mt-1 leading-relaxed">
                        Tindakan ini akan mengosongkan seluruh rincian APBDes secara permanen.
                    </AlertDialogDescription>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
                <AlertDialogCancel className="w-full sm:flex-1 h-12 rounded-2xl font-bold uppercase border-none bg-muted/50">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className={cn("w-full sm:flex-1 h-12 rounded-2xl font-black uppercase", buttonVariants({variant: "destructive"}))}>Ya, Hapus Semua</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
