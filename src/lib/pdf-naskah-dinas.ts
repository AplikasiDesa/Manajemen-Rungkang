
import { jsPDF } from "jspdf";
import { format, subDays } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { addKopSuratSync, loadImage, terbilang, getRomanMonth } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

/**
 * Generator PDF Utama untuk Naskah Dinas
 */
export const generateNaskahPDF = async (type: string, data: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  
  const logoSource = (logoBase64 && logoBase64.length > 50) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  let currentY = 52; // Slightly higher starting point
  const lineH = 5.5;
  const paragraphGap = 2; 
  const sectionGap = 4; 
  const lineHeightFactor = 1.15; 

  // Helper to render justified text blocks with auto-wrap and page break detection
  const renderTextBlock = (text: string, isBold: boolean = false, customLineHeight: number = lineHeightFactor) => {
    if (!text) return;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    
    paragraphs.forEach((p) => {
      const lines = doc.splitTextToSize(p, contentWidth);
      const textDim = doc.getTextDimensions(lines, { maxWidth: contentWidth });
      const blockHeight = textDim.h * customLineHeight;

      if (currentY + blockHeight > pageHeight - 15) { 
        doc.addPage();
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        currentY = 52;
      }

      doc.text(lines, margin, currentY, { align: "justify", maxWidth: contentWidth, lineHeightFactor: customLineHeight });
      currentY += blockHeight + paragraphGap;
    });
  };

  if (type === 'UND') {
    // === SURAT UNDANGAN ===
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    doc.text("Nomor", margin, currentY);
    doc.text(":", margin + 25, currentY);
    doc.text(data.nomorSurat || "..... / No / 04 / 2026", margin + 28, currentY);

    // Tanggal Surat H-1 dari hari pelaksanaan (Align Right, same line as Nomor)
    const letterDate = data.tanggal ? subDays(new Date(data.tanggal), 1) : new Date();
    doc.setFont("helvetica", "normal");
    doc.text(`Rungkang, ${format(letterDate, "d MMMM yyyy", { locale: localeID })}`, pageWidth - margin, currentY, { align: "right" });
    
    currentY += lineH;

    doc.text("Sifat", margin, currentY);
    doc.text(":", margin + 25, currentY);
    doc.text(data.sifat || "Biasa", margin + 28, currentY);
    currentY += lineH;

    doc.text("Lampiran", margin, currentY);
    doc.text(":", margin + 25, currentY);
    doc.text("-", margin + 28, currentY);
    currentY += lineH;

    doc.text("Perihal", margin, currentY);
    doc.text(":", margin + 25, currentY);
    doc.setFont("helvetica", "bold");
    doc.text("Undangan", margin + 28, currentY);

    currentY += 12;
    doc.text("Kepada Yth.", margin, currentY);
    currentY += lineH;
    doc.setFont("helvetica", "bold");
    const tujuanLines = doc.splitTextToSize((data.tujuan || "Bapak/Ibu/Sdr/i").toUpperCase(), contentWidth / 2);
    doc.text(tujuanLines, margin, currentY);
    currentY += (tujuanLines.length * 5) + 2;
    
    doc.setFont("helvetica", "normal");
    doc.text("di -", margin, currentY);
    currentY += lineH;
    doc.text("   Tempat", margin + 5, currentY);

    currentY += 10;
    const isiUndangan = "Dengan ini kami minta bantuan Bapak/Ibu/Saudara untuk hadir besok pada :";
    doc.text(isiUndangan, margin, currentY, { lineHeightFactor: 1.15 });
    
    currentY += 8;
    
    const formattedTime = data.waktu ? `${data.waktu} WIB s.d Selesai` : "-";

    const details = [
      { l: "Hari / Tanggal", v: data.tanggal ? format(new Date(data.tanggal), "EEEE, d MMMM yyyy", { locale: localeID }) : "-" },
      { l: "Waktu", v: formattedTime },
      { l: "Tempat", v: data.tempat || "Balai Desa Rungkang" },
      { l: "Acara", v: data.agenda || "-" },
    ];

    if (data.catatan) {
      details.push({ l: "Catatan", v: data.catatan });
    }

    details.forEach(item => {
      doc.setFont("helvetica", "normal");
      doc.text(item.l, margin + 5, currentY);
      doc.text(":", margin + 40, currentY);
      const lines = doc.splitTextToSize(item.v, contentWidth - 45);
      doc.text(lines, margin + 43, currentY, { lineHeightFactor: 1.15 });
      currentY += (lines.length * (5.5 * 1.15));
    });

    currentY += 3;
    const penutup = "Demikian atas bantuan dan kehadirannya disampaikan terima kasih.";
    const pLines = doc.splitTextToSize(penutup, contentWidth);
    doc.text(pLines, margin, currentY, { align: "justify", lineHeightFactor: 1.15 });
    currentY += (pLines.length * (5.5 * 1.15)) + 10;

  } else if (type === 'SK') {
    // === SURAT KEPUTUSAN ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("KEPUTUSAN KEPALA DESA RUNGKANG", pageWidth / 2, currentY, { align: "center" });
    currentY += lineH;
    doc.text(`NOMOR : ${data.nomorSurat || "..... / No / 04 / 2026"}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 8;
    doc.text("TENTANG", pageWidth / 2, currentY, { align: "center" });
    currentY += lineH;
    const tentangLines = doc.splitTextToSize((data.tentang || "").toUpperCase(), contentWidth - 40);
    doc.text(tentangLines, pageWidth / 2, currentY, { align: "center" });
    currentY += (tentangLines.length * 5) + 8;

    doc.text("KEPALA DESA RUNGKANG,", pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    const addSection = (label: string, items: string[]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(":", margin + 30, currentY);
      
      let itemY = currentY;
      items.forEach((item, idx) => {
        const bullet = items.length > 1 ? `${String.fromCharCode(97 + idx)}. ` : "";
        const lines = doc.splitTextToSize(bullet + item, contentWidth - 35);
        doc.text(lines, margin + 33, itemY, { align: "justify", lineHeightFactor: 1.15 });
        itemY += (lines.length * (5 * 1.15));
      });
      currentY = itemY + 3;
    };

    addSection("Menimbang", data.menimbang || []);
    addSection("Mengingat", data.mengingat || []);
    
    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.text("MEMUTUSKAN :", pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    (data.keputusan || []).forEach((item: string, idx: number) => {
      const label = ["KESATU", "KEDUA", "KETIGA", "KEEMPAT", "KELIMA"][idx] || `KE-${idx + 1}`;
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, currentY);
      doc.text(":", margin + 30, currentY);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(item, contentWidth - 35);
      doc.text(lines, margin + 33, currentY, { align: "justify", lineHeightFactor: 1.15 });
      currentY += (lines.length * (5.5 * 1.15)) + 3;
    });

  } else if (type === 'BA') {
    // === BERITA ACARA ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BERITA ACARA", pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
    
    const baTitleLines = doc.splitTextToSize((data.title || "PELAKSANAAN KEGIATAN").toUpperCase(), contentWidth - 30);
    doc.text(baTitleLines, pageWidth / 2, currentY, { align: "center" });
    currentY += (baTitleLines.length * 5) + 3;
    
    doc.setFontSize(10);
    doc.text(`Nomor : ${data.nomorSurat || "..... / No / 04 / 2026"}`, pageWidth / 2, currentY, { align: "center" });
    
    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const d = data.tanggal ? new Date(data.tanggal) : new Date();
    const dayName = format(d, "EEEE", { locale: localeID });
    const dateNum = d.getDate();
    const monthName = format(d, "MMMM", { locale: localeID });
    const yearNum = d.getFullYear();

    const opening = `Pada hari ini ${dayName} tanggal ${terbilang(dateNum)} bulan ${monthName} tahun ${terbilang(yearNum)}, bertempat di ${data.tempat || "Balai Desa Rungkang"}, telah dilaksanakan ${data.title || "kegiatan"}.`;
    
    renderTextBlock(opening, false, 1.15);
    currentY += 1;

    // Bagian Isi
    doc.setFont("helvetica", "bold");
    doc.text("ISI BERITA ACARA :", margin, currentY);
    currentY += 5;
    renderTextBlock(data.isi || "(Belum ada isi berita acara)", false, 1.15);
    currentY += 1;

    // Bagian Kesimpulan
    doc.setFont("helvetica", "bold");
    doc.text("KESIMPULAN / TINDAK LANJUT :", margin, currentY);
    currentY += 5;
    renderTextBlock(data.kesimpulan || "(Belum ada kesimpulan)", false, 1.15);
    currentY += 1;

    // Penutup dengan logika sangat ketat agar muat 1 lembar
    const closing = "Demikian berita acara ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.";
    const closingLines = doc.splitTextToSize(closing, contentWidth);
    const closingHeight = (closingLines.length * 5 * 1.15);
    const signatureSpaceNeeded = 35; 

    if (currentY + closingHeight + signatureSpaceNeeded > pageHeight - 15) {
        doc.addPage();
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        currentY = 52;
    }

    doc.setFont("helvetica", "normal");
    doc.text(closingLines, margin, currentY, { align: "justify", lineHeightFactor: 1.15, maxWidth: contentWidth });
    currentY += closingHeight + 5;

  } else if (type === 'ST') {
    // === SURAT TUGAS ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("SURAT TUGAS", pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
    doc.setFontSize(11);
    doc.text(`Nomor : ${data.nomorSurat || "..... / No / 04 / 2026"}`, pageWidth / 2, currentY, { align: "center" });
    
    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.text("Dasar :", margin, currentY);
    const dasarText = data.dasar || "Peraturan Desa tentang APBDes Tahun Berjalan.";
    const dasarLines = doc.splitTextToSize(dasarText, contentWidth - 25);
    doc.text(dasarLines, margin + 25, currentY, { lineHeightFactor: 1.15 });
    currentY += (dasarLines.length * (5.5 * 1.15)) + 8;

    doc.setFont("helvetica", "bold");
    doc.text("MEMERINTAHKAN :", pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    doc.text("Kepada :", margin, currentY);
    currentY += 6;
    
    (data.petugas || []).forEach((p: any, idx: number) => {
      doc.setFont("helvetica", "normal");
      doc.text(`${idx + 1}. Nama`, margin + 10, currentY);
      doc.text(":", margin + 35, currentY);
      doc.setFont("helvetica", "bold");
      doc.text((p.name || "").toUpperCase(), margin + 38, currentY);
      currentY += 5.5;
      doc.setFont("helvetica", "normal");
      doc.text("   Jabatan", margin + 10, currentY);
      doc.text(":", margin + 35, currentY);
      doc.text(p.jabatan || "-", margin + 38, currentY);
      currentY += 7;
    });

    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Untuk :", margin, currentY);
    currentY += 6;
    doc.setFont("helvetica", "normal");
    const untukLines = doc.splitTextToSize(data.tujuanTugas || "-", contentWidth - 10);
    doc.text(untukLines, margin + 10, currentY, { align: "justify", maxWidth: contentWidth - 10, lineHeightFactor: 1.15 });
    currentY += (untukLines.length * (5.5 * 1.15)) + 12;
  }

  // === SIGNATURE SECTION COMPACT ===
  const finalSignatureHeight = 35;
  if (currentY + finalSignatureHeight > pageHeight - 12) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 52;
  }

  const sigX = pageWidth - margin - 60;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  
  const dFooter = data.tanggal ? new Date(data.tanggal) : new Date();
  const footerDateStr = format(dFooter, "d MMMM yyyy", { locale: localeID });

  if (type !== 'UND') {
    doc.text(`Rungkang, ${footerDateStr}`, sigX, currentY);
    currentY += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Rungkang,", sigX, currentY);
  currentY += 18; 
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 0.8, sigX + nW, currentY + 0.8);

  return doc.output("blob");
};
