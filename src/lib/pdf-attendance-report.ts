
import { jsPDF } from "jspdf";
import { format, lastDayOfMonth } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { loadImage } from "./pdf-utils";

interface AttendanceReportData {
  month: string;
  year: string;
  data: any[];
  logoBase64?: string | null;
  settings?: any; 
}

const DAYS_MAP = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export const generateAttendancePDF = async (report: AttendanceReportData): Promise<Blob> => {
  const { month, year, data, logoBase64, settings } = report;
  
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  const monthIdx = parseInt(month) - 1;
  const dateObj = new Date(parseInt(year), monthIdx, 1);
  const monthName = format(dateObj, "MMMM", { locale: localeID }).toUpperCase();
  const daysInMonth = new Date(parseInt(year), monthIdx + 1, 0).getDate();

  const logoSource = (logoBase64 && logoBase64.length > 50) ? logoBase64 : "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";
  const logoImg = await loadImage(logoSource);

  const addLandscapeKop = () => {
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', margin + 10, 10, 15, 18);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PEMERINTAH KABUPATEN CILACAP", pageWidth / 2, 14, { align: "center" });
    doc.text("KECAMATAN GANDRUNGMANGU", pageWidth / 2, 19, { align: "center" });
    doc.setFontSize(14);
    doc.text("DESA RUNGKANG", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Jalan Raya Pelita KM 5 Rungkang, Kec. Gandrungmangu, Cilacap, Jawa Tengah,", pageWidth / 2, 29, { align: "center" });
    doc.text("Tlp. 0852-2770-6666, Laman : www.rungkang-cilacap.desa.id, Pos-el : www.desarungkang014@gmail.com", pageWidth / 2, 33, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);
    doc.setLineWidth(0.1);
    doc.line(margin, 35.8, pageWidth - margin, 35.8);
  };

  addLandscapeKop();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const title = `ABSENSI PERANGKAT DESA RUNGKANG BULAN ${monthName} ${year}`;
  doc.text(title, pageWidth / 2, 48, { align: "center" });

  let currentY = 54;
  const colNoW = 8;
  const colNameW = 45;
  const colDayW = (contentWidth - colNoW - colNameW - 25) / 31;

  const drawHeader = (y: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    let x = margin;
    
    doc.rect(x, y, colNoW, 8);
    doc.text("NO", x + colNoW / 2, y + 5, { align: "center" });
    x += colNoW;

    doc.rect(x, y, colNameW, 8);
    doc.text("NAMA / JABATAN", x + colNameW / 2, y + 5, { align: "center" });
    x += colNameW;

    for (let i = 1; i <= 31; i++) {
      if (i <= daysInMonth) {
        const checkDate = new Date(parseInt(year), monthIdx, i);
        const dayName = DAYS_MAP[checkDate.getDay()];
        const dateStr = `${year}-${month}-${i.toString().padStart(2, '0')}`;
        const isWeekend = settings?.hari_kerja ? !settings.hari_kerja.includes(dayName) : false;
        const isManualHoliday = settings?.hari_libur ? settings.hari_libur.includes(dateStr) : false;
        
        if (isWeekend || isManualHoliday) {
            doc.setFillColor(255, 200, 200);
            doc.rect(x, y, colDayW, 8, 'F');
        }
      }
      doc.rect(x, y, colDayW, 8);
      doc.text(i.toString(), x + colDayW / 2, y + 5, { align: "center" });
      x += colDayW;
    }

    const stats = ["H", "T", "S", "TK", "DL"];
    const statWTotal = 25 / 5;
    stats.forEach(s => {
      doc.rect(x, y, statWTotal, 8);
      doc.text(s, x + statWTotal / 2, y + 5, { align: "center" });
      x += statWTotal;
    });

    return y + 8;
  };

  currentY = drawHeader(currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  data.forEach((row, i) => {
    const rowH = 7;
    if (currentY + rowH > pageHeight - 50) {
      doc.addPage();
      addLandscapeKop();
      currentY = drawHeader(40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
    }

    let x = margin;
    
    doc.rect(x, currentY, colNoW, rowH);
    doc.text((i + 1).toString(), x + colNoW / 2, currentY + 4.5, { align: "center" });
    x += colNoW;

    doc.rect(x, currentY, colNameW, rowH);
    doc.setFont("helvetica", "bold");
    doc.text(row.name.substring(0, 25), x + 1, currentY + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text(row.jabatan.substring(0, 35), x + 1, currentY + 5.5);
    doc.setFontSize(6);
    x += colNameW;

    for (let d = 1; d <= 31; d++) {
      if (d <= daysInMonth) {
        const checkDate = new Date(parseInt(year), monthIdx, d);
        const dayName = DAYS_MAP[checkDate.getDay()];
        const dateStr = `${year}-${month}-${d.toString().padStart(2, '0')}`;
        const isWeekend = settings?.hari_kerja ? !settings.hari_kerja.includes(dayName) : false;
        const isManualHoliday = settings?.hari_libur ? settings.hari_libur.includes(dateStr) : false;
        
        if (isWeekend || isManualHoliday) {
            doc.setFillColor(255, 235, 235);
            doc.rect(x, currentY, colDayW, rowH, 'F');
        }
      }

      doc.rect(x, currentY, colDayW, rowH);
      
      if (d <= daysInMonth) {
        const record = row.attendance[d];
        if (record) {
          let mark = "";
          // Logika baru: Jika masuk tapi tidak pulang, anggap terlambat (T)
          const isStillWorking = record.jam_masuk && !record.jam_pulang && record.status !== 'alpha' && record.status !== 'izin' && record.status !== 'dinas_luar';
          
          if (record.status === 'alpha') mark = "A";
          else if (record.status === 'izin') mark = "S";
          else if (record.status === 'dinas_luar') mark = "DL";
          else if (isStillWorking || record.status === 'telat') mark = "T";
          else if (record.status === 'hadir') mark = "H";
          
          if (mark === "H") doc.setTextColor(0, 150, 0);
          else if (mark === "A") doc.setTextColor(200, 0, 0);
          else if (mark === "T") doc.setTextColor(255, 102, 0); // Orange for T
          else doc.setTextColor(0, 0, 0);
          
          doc.text(mark, x + colDayW / 2, currentY + 4.5, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(x, currentY, colDayW, rowH, 'F');
        doc.rect(x, currentY, colDayW, rowH);
      }
      x += colDayW;
    }

    const statWTotal = 25 / 5;
    [row.stats.h, row.stats.t, row.stats.s, row.stats.tk, row.stats.dl].forEach(statVal => {
        doc.rect(x, currentY, statWTotal, rowH);
        doc.text(statVal.toString(), x + statWTotal / 2, currentY + 4.5, { align: "center" });
        x += statWTotal;
    });
    
    currentY += rowH;
  });

  const lastDay = lastDayOfMonth(dateObj);
  const footerDate = format(lastDay, "d MMMM yyyy", { locale: localeID });
  
  if (currentY > pageHeight - 50) {
    doc.addPage();
    addLandscapeKop();
    currentY = 40;
  }

  currentY += 15;
  const sigX = pageWidth - margin - 60;
  doc.setFontSize(9);
  doc.text(`Rungkang, ${footerDate}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Rungkang,", sigX, currentY + 5);
  currentY += 22;
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);

  return doc.output("blob");
};
