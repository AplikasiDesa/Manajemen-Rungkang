
import { jsPDF } from "jspdf"
import { format, getDate, getMonth, getYear } from "date-fns"
import { id as localeID } from "date-fns/locale"

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

export const getRomanMonth = (dateStr: string) => {
  if (!dateStr) return "I";
  const month = new Date(dateStr).getMonth() + 1
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
  return roman[month - 1]
}

export const terbilang = (n: number): string => {
  const satuan = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (n < 12) return satuan[n];
  if (n < 20) return satuan[n - 10] + " belas";
  if (n < 100) return satuan[Math.floor(n / 10)] + " puluh " + (n % 10 > 0 ? satuan[n % 10] : "");
  if (n < 200) return "seratus " + (n - 100 > 0 ? terbilang(n - 100) : "");
  if (n < 1000) return satuan[Math.floor(n / 100)] + " ratus " + (n % 100 > 0 ? terbilang(n % 100) : "");
  if (n < 2000) return "seribu " + (n - 1000 > 0 ? terbilang(n - 1000) : "");
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " ribu " + (n % 1000 > 0 ? terbilang(n % 1000) : "");
  return n.toString();
};

export const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export const addKopSuratSync = (doc: jsPDF, img: HTMLImageElement | null, margin: number, pageWidth: number) => {
    if (img) {
        try {
            doc.addImage(img, 'PNG', margin, 10, 18, 22);
        } catch (e) {
            console.error("PDF Logo Error:", e);
        }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PEMERINTAH KABUPATEN CILACAP", pageWidth / 2 + 10, 15, { align: "center" });
    doc.text("KECAMATAN GANDRUNGMANGU", pageWidth / 2 + 10, 20, { align: "center" });
    doc.setFontSize(16);
    doc.text("DESA RUNGKANG", pageWidth / 2 + 10, 27, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Jalan Raya Pelita KM 5 Rungkang, Gandrungmangu, Cilacap, Jawa Tengah", pageWidth / 2 + 10, 31, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("Kode Pos 53254", pageWidth - margin, 33, { align: "right" });
    doc.setLineWidth(0.8);
    doc.line(margin, 34, pageWidth - margin, 34);
    doc.setLineWidth(0.2);
    doc.line(margin, 35, pageWidth - margin, 35);
}

const formatDateIndo = (dateStr: string) => {
  if (!dateStr || dateStr === "-" || dateStr === "") return "-";
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    return format(dateObj, "d MMMM yyyy", { locale: localeID });
  } catch (e) {
    return dateStr;
  }
};

export const generateNotulenPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const labelWidth = 30;
  const valueStartX = margin + labelWidth + 3;
  const valueWidth = contentWidth - labelWidth - 3;
  
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  const displayDate = formatDateIndo(values.date);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NOTULEN", pageWidth/2, 55, { align: "center" });

  doc.setFontSize(11);
  let currentY = 70;
  
  const addLabeledRow = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, currentY);
    doc.text(":", margin + labelWidth, currentY);
    doc.setFont("helvetica", "normal");
    
    const lines = doc.splitTextToSize(text || "-", valueWidth);
    lines.forEach((line: string, i: number) => {
      doc.text(line, valueStartX, currentY + (i * 5)); 
    });
    currentY += Math.max(lines.length * 5, 5) + 2;
  };

  addLabeledRow("Kegiatan", values.title);
  addLabeledRow("Tanggal", displayDate);
  addLabeledRow("Tempat", values.location);

  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const descriptionText = values.description || "(Belum ada isi ringkasan)";
  const paragraphs = descriptionText.split('\n').filter(p => p.trim() !== '');
  const lineHeightFactor = 1.5;

  paragraphs.forEach(para => {
      const lines = doc.splitTextToSize(para, contentWidth);
      const textBlockHeight = doc.getTextDimensions(lines, { maxWidth: contentWidth, lineHeightFactor: lineHeightFactor }).h;

      if (currentY + textBlockHeight > pageHeight - margin) {
          doc.addPage();
          addKopSuratSync(doc, logoImg, margin, pageWidth);
          currentY = 40;
      }

      doc.text(lines, margin, currentY, { align: "justify", maxWidth: contentWidth, lineHeightFactor: lineHeightFactor });
      currentY += textBlockHeight + 4;
  });

  const signatureBlockHeight = 50;
  if (currentY + signatureBlockHeight > pageHeight - margin) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
  }

  const signatureName = "SEPTI AMBARWATI";
  const signatureX = pageWidth - margin - 50;
  const signatureY = currentY + 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Notulis,", signatureX, signatureY, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text(signatureName, signatureX, signatureY + 25, { align: "center" });
  
  const nameWidth = doc.getTextWidth(signatureName);
  doc.line(signatureX - (nameWidth / 2), signatureY + 26, signatureX + (nameWidth / 2), signatureY + 26);

  return doc.output("blob");
}


export const generateBASTPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const d = new Date(values.date);
  
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleY = 48;
  const titleText = [
    "BERITA ACARA SERAH TERIMA 100 % PEKERJAAN PELAKSANA KEGIATAN",
    "ANGGARAN KEPADA PEMEGANG KEKUASAAN PENGELOLAAN KEUANGAN DESA"
  ];
  doc.text(titleText[0], pageWidth / 2, titleY, { align: "center" });
  doc.text(titleText[1], pageWidth / 2, titleY + 5, { align: "center" });

  const numY = titleY + 15;
  const numText = `Nomor : ..... / BA / ${getRomanMonth(values.date)} / ${getYear(d)}`;
  doc.text(numText, pageWidth / 2, numY, { align: "center" });
  const textWidth = doc.getTextWidth(numText);
  doc.line(pageWidth / 2 - textWidth / 2, numY + 1, pageWidth / 2 + textWidth / 2, numY + 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const openingY = numY + 12;
  const openingText = `Pada hari ini ${format(d, "EEEE", { locale: localeID })} tanggal ${terbilang(getDate(d))} bulan ${format(d, "MMMM", { locale: localeID })} tahun ${terbilang(getYear(d))} bertempat di Desa Rungkang, kami yang bertanda tangan dibawah ini :`;
  
  const splitOpening = doc.splitTextToSize(openingText, contentWidth);
  doc.text(splitOpening, margin, openingY, { align: "justify", maxWidth: contentWidth });

  let currentY = openingY + (splitOpening.length * 5) + 5;
  const col1 = margin;
  const col2 = margin + 10;
  const col3 = margin + 30;

  const officialName = values.officialName?.split(" - ")[0] || "SISWANTO";
  const officialJob = values.officialName?.split(" - ")[1] || "KASI KESEJAHTERAAN";

  doc.text("I", col1, currentY);
  doc.text("Nama", col2, currentY);
  doc.text(": " + officialName, col3, currentY);
  currentY += 6;
  doc.text("Jabatan", col2, currentY);
  doc.text(": Pelaksana Kegiatan Anggaran (" + officialJob + ")", col3, currentY);
  currentY += 6;
  doc.text("Alamat", col2, currentY);
  const alamatText = ": Desa Rungkang Kecamatan Gandrungmangu yang selanjutnya disebut PIHAK KESATU";
  const splitAlamat = doc.splitTextToSize(alamatText, contentWidth - 30);
  doc.text(splitAlamat, col3, currentY, { align: "justify" });
  currentY += (splitAlamat.length * 5) + 2;

  doc.text("II", col1, currentY);
  doc.text("Nama", col2, currentY);
  doc.text(": SUSANTO", col3, currentY);
  currentY += 6;
  doc.text("Jabatan", col2, currentY);
  doc.text(": Pemegang Kekuasaan Pengelolaan Keuangan Desa", col3, currentY);
  currentY += 6;
  doc.text("Alamat", col2, currentY);
  const alamatText2 = ": Desa Rungkang Kecamatan Gandrungmangu yang selanjutnya disebut PIHAK KEDUA";
  const splitAlamat2 = doc.splitTextToSize(alamatText2, contentWidth - 30);
  doc.text(splitAlamat2, col3, currentY, { align: "justify" });
  currentY += (splitAlamat2.length * 5) + 8;

  const midText = "Dengan ini menyatakan bahwa PIHAK KESATU telah menyerahkan barang/pekerjaan kepada PIHAK KEDUA dan PIHAK KEDUA telah menerima barang/pekerjaan dari PIHAK KESATU berupa :";
  const splitMid = doc.splitTextToSize(midText, contentWidth);
  doc.text(splitMid, margin, currentY, { align: "justify", maxWidth: contentWidth });
  currentY += (splitMid.length * 5) + 5;

  const tableTop = currentY;
  const rowHeight = 25;
  const colW = [15, 100, 30, 25]; 
  
  doc.setFont("helvetica", "bold");
  doc.rect(margin, tableTop, colW[0], 10);
  doc.text("NO", margin + 7.5, tableTop + 7, { align: "center" });
  doc.rect(margin + colW[0], tableTop, colW[1], 10);
  doc.text("NAMA KEGIATAN", margin + colW[0] + colW[1]/2, tableTop + 7, { align: "center" });
  doc.rect(margin + colW[0] + colW[1], tableTop, colW[2], 10);
  doc.text("VOLUME", margin + colW[0] + colW[1] + colW[2]/2, tableTop + 7, { align: "center" });
  doc.rect(margin + colW[0] + colW[1] + colW[2], tableTop, colW[3], 10);
  doc.text("TTD", margin + colW[0] + colW[1] + colW[2] + colW[3]/2, tableTop + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.rect(margin, tableTop + 10, colW[0], rowHeight);
  doc.text("1", margin + 7.5, tableTop + 22, { align: "center" });
  doc.rect(margin + colW[0], tableTop + 10, colW[1], rowHeight);
  const splitKegiatan = doc.splitTextToSize(values.title || "-", colW[1] - 4);
  doc.text(splitKegiatan, margin + colW[0] + 2, tableTop + 18, { align: "justify", maxWidth: colW[1] - 4 });
  doc.rect(margin + colW[0] + colW[1], tableTop + 10, colW[2], rowHeight);
  doc.text("1 Kegiatan", margin + colW[0] + colW[1] + colW[2]/2, tableTop + 22, { align: "center" });
  doc.rect(margin + colW[0] + colW[1] + colW[2], tableTop + 10, colW[3], rowHeight);

  currentY = tableTop + 10 + rowHeight + 20;

  doc.text(`Rungkang, ${format(d, "d MMMM yyyy", { locale: localeID })}`, pageWidth - margin, currentY, { align: "right" });
  
  const signY = currentY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("PIHAK KEDUA", margin + 30, signY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Pemegang Kekuasaan", margin + 30, signY + 5, { align: "center" });
  doc.text("Pengelolaan Keuangan Desa", margin + 30, signY + 10, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text("PIHAK KESATU", pageWidth - margin - 30, signY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Pelaksana Kegiatan Anggaran", pageWidth - margin - 30, signY + 5, { align: "center" });

  const nameY = signY + 35;
  doc.setFont("helvetica", "bold");
  doc.text("SUSANTO", margin + 30, nameY, { align: "center" });
  const w1 = doc.getTextWidth("SUSANTO");
  doc.line(margin + 30 - w1/2, nameY + 1, margin + 30 + w1/2, nameY + 1);

  doc.text(officialName.toUpperCase(), pageWidth - margin - 30, nameY, { align: "center" });
  const w2 = doc.getTextWidth(officialName.toUpperCase());
  doc.line(pageWidth - margin - 30 - w2/2, nameY + 1, pageWidth - margin - 30 + w2/2, nameY + 1);

  return doc.output("blob");
}

export const generateSuratTugasPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const d = values.startDate ? new Date(values.startDate) : new Date();

  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SURAT TUGAS", pageWidth / 2, 50, { align: "center" });
  const titleWidth = doc.getTextWidth("SURAT TUGAS");
  doc.line(pageWidth / 2 - titleWidth / 2, 51, pageWidth / 2 + titleWidth / 2, 51);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Nomor : ${values.documentNumber || "-"}`, pageWidth / 2, 56, { align: "center" });

  let currentY = 75;
  const labelCol = margin;
  const listCol = margin + 25; 
  const textOffset = 7; 
  const valueWidth = contentWidth - (listCol - margin) - textOffset;

  const addHangingList = (num: string, text: string, y: number) => {
    doc.setFont("helvetica", "normal");
    doc.text(num, listCol, y);
    const splitLines = doc.splitTextToSize(text, valueWidth);
    splitLines.forEach((line: string, i: number) => {
      doc.text(line, listCol + textOffset, y + (i * 6), { align: "justify", maxWidth: valueWidth });
    });
    return y + (splitLines.length * 6) + 2;
  };

  doc.setFont("helvetica", "bold");
  doc.text("Dasar :", labelCol, currentY);
  currentY = addHangingList("1.", "Peraturan Bupati Cilacap Nomor 2 Tahun 2024 tentang Perjalanan Dinas.", currentY);
  currentY = addHangingList("2.", "Peraturan Desa Rungkang Nomor 01 Tahun 2026 tentang APBDes T.A 2026.", currentY);
  currentY += 8;

  doc.setFont("helvetica", "bold");
  doc.text("MEMERINTAHKAN:", pageWidth / 2, currentY, { align: "center" });
  currentY += 12;

  doc.text("Kepada :", labelCol, currentY);
  
  const companions = values.companions ? values.companions.split("\n").filter(Boolean) : [];
  const personnelList = [
    { name: (values.officialName || "-").split(" - ")[0], job: (values.officialName || "-").split(" - ")[1] || "-" },
    ...companions.map(c => ({ name: c.split(" - ")[0], job: c.split(" - ")[1] || "-" }))
  ];

  personnelList.forEach((p, idx) => {
    const listNum = personnelList.length > 1 ? `${idx + 1}. ` : "";
    doc.setFont("helvetica", "normal");
    doc.text(`${listNum}Nama`, listCol, currentY);
    doc.text(":", listCol + 20, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(p.name.toUpperCase(), listCol + 23, currentY);
    
    doc.setFont("helvetica", "normal");
    currentY += 7;
    doc.text("Jabatan", listCol + (listNum ? 3 : 0), currentY);
    doc.text(":", listCol + 20, currentY);
    doc.text(p.job.toUpperCase(), listCol + 23, currentY);
    currentY += 10;
  });

  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Untuk :", labelCol, currentY);
  currentY = addHangingList("1.", values.description || "-", currentY);
  currentY = addHangingList("2.", "Melaksanakan tugas dengan penuh tanggung jawab.", currentY);
  currentY = addHangingList("3.", "Melaporkan hasilnya setelah melaksanakan tugas.", currentY);
  
  currentY += 30;
  const sigX = pageWidth - margin - 65;
  const displayDate = formatDateIndo(values.startDate);
  
  doc.setFont("helvetica", "normal");
  doc.text("Dikeluarkan di", sigX, currentY);
  doc.text(":", sigX + 25, currentY);
  doc.text("Rungkang", sigX + 28, currentY);
  currentY += 6;
  doc.text("Pada tanggal", sigX, currentY);
  doc.text(":", sigX + 25, currentY);
  doc.text(displayDate, sigX + 28, currentY);
  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.text("KEPALA DESA,", sigX, currentY);
  currentY += 30;
  doc.setFont("helvetica", "bold");
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);

  return doc.output("blob");
}

export const generateSPPDPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const d = values.startDate ? new Date(values.startDate) : new Date();

  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const rightInfoX = pageWidth - margin - 90; 
  doc.text("Lembar ke", rightInfoX, 40);
  doc.text(": I/II/III", rightInfoX + 25, 40);
  doc.text("Kode No.", rightInfoX, 45);
  doc.text(":", rightInfoX + 25, 45);
  doc.text("Nomor", rightInfoX, 50);
  doc.text(`: ${values.documentNumber || "-"}`, rightInfoX + 25, 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("SURAT PERJALANAN DINAS", pageWidth / 2, 60, { align: "center" });
  const titleWidth = doc.getTextWidth("SURAT PERJALANAN DINAS");
  doc.line(pageWidth / 2 - titleWidth / 2, 61, pageWidth / 2 + titleWidth / 2, 61);

  let currentY = 70;
  const col1W = 10;
  const col2W = 75;
  const col3W = 85;

  const drawTableRow = (no: string, label: string, val: string, isJustified: boolean = false, isBold: boolean = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const splitLabel = doc.splitTextToSize(label, col2W - 4);
    const splitVal = doc.splitTextToSize(val || "-", col3W - 4);
    
    const lineHeight = 5.0;
    const lineCount = Math.max(splitLabel.length, splitVal.length);
    const height = (lineCount * lineHeight) + 2;

    doc.rect(margin, currentY, col1W, height);
    doc.setFont("helvetica", "normal");
    doc.text(no, margin + 5, currentY + 5, { align: "center" });
    
    doc.rect(margin + col1W, currentY, col2W, height);
    doc.text(splitLabel, margin + col1W + 2, currentY + 5);
    
    doc.rect(margin + col1W + col2W, currentY, col3W, height);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    if (isJustified) {
      doc.text(splitVal, margin + col1W + col2W + 2, currentY + 5, { align: "justify", maxWidth: col3W - 4 });
    } else {
      doc.text(splitVal, margin + col1W + col2W + 2, currentY + 5);
    }
    currentY += height;
  };

  const name = (values.officialName || "-").split(" - ")[0];
  const job = (values.officialName || "-").split(" - ")[1] || "-";

  drawTableRow("1.", "PA/KPA", "KEPALA DESA RUNGKANG");
  drawTableRow("2.", "Nama Pegawai", name.toUpperCase(), false, true);
  drawTableRow("3.", "a. Pangkat\nb. Jabatan\nc. Tingkat Biaya", `a. -\nb. ${job.toUpperCase()}\nc. Lokal`);
  drawTableRow("4.", "Maksud Tugas", values.description || "-", true);
  drawTableRow("5.", "Alat angkut", "Kendaraan Dinas");
  drawTableRow("6.", "a. Tempat Berangkat\nb. Tempat Tujuan", `a. Rungkang\nb. ${values.destination || "-"}`);
  drawTableRow("7.", "a. Lamanya\nb. Tanggal Berangkat\nc. Tanggal Kembali", `a. 1 (satu) hari\nb. ${formatDateIndo(values.startDate)}\nc. ${formatDateIndo(values.endDate)}`);

  // POINT 8: PENGIKUT (REFINED TANGGAL & GARIS)
  const companions = values.companions ? values.companions.split("\n").filter(Boolean) : [];
  const header8H = 8.0;
  const row8H = 8.0;
  const totalRow8H = header8H + (Math.max(1, companions.length) * row8H);

  // Bingkai Kolom 1 (No. 8)
  doc.rect(margin, currentY, col1W, totalRow8H);
  doc.setFont("helvetica", "normal");
  doc.text("8.", margin + 5, currentY + 5, { align: "center" });

  // Header Nama/Jabatan Pengikut
  doc.rect(margin + col1W, currentY, col2W, header8H);
  doc.text("Nama Pengikut", margin + col1W + 2, currentY + 5.5);
  doc.rect(margin + col1W + col2W, currentY, col3W, header8H);
  doc.text("Jabatan Pengikut", margin + col1W + col2W + 2, currentY + 5.5);
  
  let compY = currentY + header8H;
  if (companions.length > 0) {
    companions.forEach((c, idx) => {
      const [cName, cJob] = c.split(" - ");
      doc.rect(margin + col1W, compY, col2W, row8H);
      doc.text((cName || "-").toUpperCase(), margin + col1W + 2, compY + 5.5);
      doc.rect(margin + col1W + col2W, compY, col3W, row8H);
      doc.text((cJob || "-").toUpperCase(), margin + col1W + col2W + 2, compY + 5.5);
      compY += row8H;
    });
  } else {
    doc.rect(margin + col1W, compY, col2W, row8H);
    doc.rect(margin + col1W + col2W, compY, col3W, row8H);
    compY += row8H;
  }
  currentY = compY; // Update currentY ke posisi setelah tabel pengikut

  drawTableRow("9.", "Pembebanan\na. Instansi\nb. Mata Anggaran", `\na. Pemdes Rungkang\nb. APBDes 2026`);
  drawTableRow("10.", "Keterangan", "-");

  const sigX = pageWidth - margin - 60;
  currentY += 10; 
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Dikeluarkan di : Rungkang", sigX, currentY);
  doc.text(`Pada tanggal  : ${formatDateIndo(values.startDate)}`, sigX, currentY + 5);
  doc.setFont("helvetica", "bold");
  doc.text("PENGGUNA ANGGARAN", sigX, currentY + 15);
  
  currentY += 30; 
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);

  doc.addPage();
  const boxW = (pageWidth - margin * 2) / 2;
  const boxH = 50; 
  currentY = 20;

  doc.rect(margin, currentY, boxW, boxH);
  doc.rect(margin + boxW, currentY, boxW, boxH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("I. Berangkat dari : Kantor Desa Rungkang", margin + boxW + 2, currentY + 5);
  doc.text("   (Tempat Kedudukan)", margin + boxW + 2, currentY + 9);
  doc.text("   Ke               : " + (values.destination || "-"), margin + boxW + 2, currentY + 14);
  doc.text("   Pada tanggal     : " + formatDateIndo(values.startDate), margin + boxW + 2, currentY + 19);
  doc.setFont("helvetica", "bold");
  doc.text("KEPALA DESA", margin + boxW + boxW/2, currentY + 28, { align: "center" });
  doc.text("RUNGKANG", margin + boxW + boxW/2, currentY + 32, { align: "center" });
  doc.text("SUSANTO", margin + boxW + boxW/2, currentY + 45, { align: "center" });
  const sigW1 = doc.getTextWidth("SUSANTO");
  doc.line(margin + boxW + boxW/2 - sigW1/2, currentY + 46, margin + boxW + boxW/2 + sigW1/2, currentY + 46);

  currentY += boxH;
  doc.rect(margin, currentY, boxW, boxH);
  doc.rect(margin + boxW, currentY, boxW, boxH);
  doc.setFont("helvetica", "normal");
  doc.text("II. Tiba di         : " + (values.destination || "-"), margin + 2, currentY + 5);
  doc.text("    Pada tanggal    : " + formatDateIndo(values.startDate), margin + 2, currentY + 10);
  doc.text("_____________________________", margin + boxW/2, currentY + 35, { align: "center" });
  doc.text("NIP. ............................................", margin + boxW/2, currentY + 40, { align: "center" });
  doc.text("    Berangkat dari  : " + (values.destination || "-"), margin + boxW + 2, currentY + 5);
  doc.text("    Ke              : Kantor Desa Rungkang", margin + boxW + 2, currentY + 10);
  doc.text("    Pada tanggal    : " + formatDateIndo(values.endDate), margin + boxW + 2, currentY + 15);
  doc.text("_____________________________", margin + boxW + boxW/2, currentY + 35, { align: "center" });
  doc.text("NIP. ............................................", margin + boxW + boxW/2, currentY + 40, { align: "center" });

  currentY += boxH;
  doc.rect(margin, currentY, boxW, boxH);
  doc.rect(margin + boxW, currentY, boxW, boxH);
  doc.text("III. Tiba di        : ", margin + 2, currentY + 5);
  doc.text("     Pada tanggal   : ", margin + 2, currentY + 10);
  doc.text("_____________________________", margin + boxW/2, currentY + 35, { align: "center" });
  doc.text("NIP. ............................................", margin + boxW/2, currentY + 40, { align: "center" });
  doc.text("     Berangkat dari : ", margin + boxW + 2, currentY + 5);
  doc.text("     Ke             : ", margin + boxW + 2, currentY + 10);
  doc.text("     Pada tanggal   : ", margin + boxW + 2, currentY + 15);
  doc.text("_____________________________", margin + boxW + boxW/2, currentY + 35, { align: "center" });
  doc.text("NIP. ............................................", margin + boxW + boxW/2, currentY + 40, { align: "center" });

  currentY += boxH;
  doc.rect(margin, currentY, boxW, boxH);
  doc.rect(margin + boxW, currentY, boxW, boxH);
  doc.text("IV. Tiba kembali di : Kantor Desa Rungkang", margin + 2, currentY + 5);
  doc.text("    (Tempat Kedudukan)", margin + 2, currentY + 9);
  doc.text("    Pada tanggal    : " + formatDateIndo(values.endDate), margin + 2, currentY + 14);
  doc.setFont("helvetica", "bold");
  doc.text("KEPALA DESA", margin + boxW/2, currentY + 25, { align: "center" });
  doc.text("RUNGKANG", margin + boxW/2, currentY + 29, { align: "center" });
  doc.text("SUSANTO", margin + boxW/2, currentY + 42, { align: "center" });
  const sigW2 = doc.getTextWidth("SUSANTO");
  doc.line(margin + boxW/2 - sigW2/2, currentY + 43, margin + boxW/2 + sigW2/2, currentY + 43);
  doc.setFont("helvetica", "normal");
  const verifTxt = "Telah diperiksa dengan keterangan bahwa perjalanan tersebut di atas benar-benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan.";
  const splitVerif = doc.splitTextToSize(verifTxt, boxW - 10);
  doc.text(splitVerif, margin + boxW + 5, currentY + 10, { align: "justify", maxWidth: boxW - 10 });

  currentY += boxH + 5;
  doc.setFont("helvetica", "bold");
  doc.rect(margin, currentY, (pageWidth - margin * 2), 8);
  doc.text("V. CATATAN LAIN-LAIN", margin + 2, currentY + 5);
  currentY += 12;
  doc.rect(margin, currentY, (pageWidth - margin * 2), 25);
  doc.text("VI. PERHATIAN", margin + 2, currentY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noteTxt = "Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendaharawan pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara.";
  const splitNote = doc.splitTextToSize(noteTxt, (pageWidth - margin * 2) - 10);
  doc.text(splitNote, margin + 5, currentY + 10, { align: "justify", maxWidth: (pageWidth - margin * 2) - 10 });

  return doc.output("blob");
}

export const generateDaftarHadirPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 15;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const d = values.date ? new Date(values.date) : new Date();

  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DAFTAR HADIR", pageWidth / 2, 50, { align: "center" });
  
  let currentY = 62;
  doc.setFontSize(11);
  
  const labelW = 35;
  const valW = contentWidth - labelW - 3;

  const addHeaderDetail = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, currentY);
    doc.text(":", margin + labelW, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text || "-", valW);
    lines.forEach((line: string, i: number) => {
      doc.text(line, margin + labelW + 3, currentY + (i * 6));
    });
    currentY += Math.max(lines.length * 6, 6) + 1;
  }

  addHeaderDetail("Kegiatan", values.title);
  addHeaderDetail("Hari / Tanggal", format(d, "EEEE, d MMMM yyyy", { locale: localeID }));
  addHeaderDetail("Waktu", values.time || "09:00 WIB");
  addHeaderDetail("Tempat", values.location);
  
  currentY += 8;
  const colW = [12, 65, 75, 28]; 
  const baseRowHeight = 12;
  const tableHeaders = ["NO", "NAMA", "ALAMAT / JABATAN", "TTD"];

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    let hX = margin;
    tableHeaders.forEach((header, i) => {
        doc.rect(hX, currentY, colW[i], 12);
        doc.text(header, hX + colW[i] / 2, currentY + 8, { align: "center" });
        hX += colW[i];
    });
    currentY += 12;
  }

  drawHeader();
  
  const totalRows = values.jumlahOrang || 0;
  for (let i = 0; i < totalRows; i++) {
    const p = values.participants?.[i] || { name: "", position: "" };

    const nameLines = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
    const positionLines = doc.splitTextToSize((p.position || "").toUpperCase(), colW[2] - 4);
    const lineCount = Math.max(nameLines.length, positionLines.length, 1);
    const rowHeight = Math.max(baseRowHeight, (lineCount * 5) + 2);

    if (currentY + rowHeight > pageHeight - 20) {
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
      drawHeader();
    }
    
    const startY = currentY;
    let rX = margin;
    colW.forEach(w => {
      doc.rect(rX, startY, w, rowHeight);
      rX += w;
    });

    const textY = startY + rowHeight / 2;
    let cX = margin;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    doc.text((i + 1).toString(), cX + colW[0] / 2, textY, { align: "center", baseline: "middle" });
    cX += colW[0];
    
    doc.text(nameLines, cX + 2, textY, { baseline: "middle" });
    cX += colW[1];

    doc.text(positionLines, cX + 2, textY, { baseline: "middle" });
    cX += colW[2];

    doc.setFontSize(8);
    const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[3] / 2);
    doc.text(`${i + 1}. .......`, signX, textY, { baseline: "middle" });
    
    currentY += rowHeight;
  }

  if (currentY > pageHeight - 60) { 
    doc.addPage(); 
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40; 
  }

  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rungkang, ${format(d, "d MMMM yyyy", { locale: localeID })}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Rungkang,", sigX, currentY + 6);
  currentY += 25; 
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);
  
  return doc.output("blob");
}

export const generateUangSakuPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 10;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const d = values.date ? new Date(values.date) : new Date();
  
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  const nom = parseInt(values.nominal) || 0;
  const taxPercent = parseInt(values.tax) || 0;
  const taxVal = Math.round(nom * (taxPercent / 100));
  const netVal = nom - taxVal;

  const colW = [8, 35, 35, 22, 18, 22, 45]; 
  const baseRowHeight = 12;
  const headers = ["NO", "NAMA", "JABATAN", "NOMINAL", "PAJAK", "DITERIMA", "TTD"];

  let currentY = 0;

  const drawTableHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      let hX = margin;
      headers.forEach((h, i) => {
          doc.rect(hX, currentY, colW[i], 10);
          doc.text(h, hX + colW[i]/2, currentY + 6.5, { align: "center" });
          hX += colW[i];
      });
      currentY += 10;
  };

  addKopSuratSync(doc, logoImg, margin, pageWidth);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TANDA TERIMA UANG SAKU PESERTA", pageWidth / 2, 50, { align: "center" });
  currentY = 60;
  
  doc.setFontSize(10);
  const addHeaderRow = (label: string, text: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, currentY);
      doc.text(":", margin + 30, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(text || "-", margin + 33, currentY);
      currentY += 6;
  };
  addHeaderRow("Kegiatan", values.title);
  addHeaderRow("Hari / Tanggal", format(d, "EEEE, d MMMM yyyy", { locale: localeID }));
  addHeaderRow("Tempat", values.location);
  currentY += 4;

  drawTableHeader();

  const kuota = values.jumlahOrang || 0;
  for (let i = 0; i < kuota; i++) {
      const p = values.participants?.[i] || { name: "", position: "" };
      const nameLines = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
      const positionLines = doc.splitTextToSize((p.position || "").toUpperCase(), colW[2] - 4);
      const lineCount = Math.max(nameLines.length, positionLines.length, 1);
      const rowHeight = Math.max(baseRowHeight, (lineCount * 4) + 4);

      if (currentY + rowHeight > pageHeight - 20) {
          doc.addPage();
          addKopSuratSync(doc, logoImg, margin, pageWidth);
          currentY = 40;
          drawTableHeader();
      }

      const startY = currentY;
      let rX = margin;
      colW.forEach((w) => { doc.rect(rX, startY, w, rowHeight); rX += w; });

      const textY = startY + rowHeight / 2;
      let cX = margin;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text((i + 1).toString(), cX + colW[0]/2, textY, { align: "center", baseline: "middle" });
      cX += colW[0];
      
      doc.setFontSize(8);
      doc.text(nameLines, cX + 2, textY, { maxWidth: colW[1]-4, baseline: "middle" });
      cX += colW[1];
      doc.text(positionLines, cX + 2, textY, { maxWidth: colW[2]-4, baseline: "middle" });
      cX += colW[2];
      
      doc.setFontSize(9);
      if (p.name) {
          doc.text(nom.toLocaleString('id-ID'), cX + colW[3] - 2, textY, { align: "right", baseline: "middle" });
          cX += colW[3];
          doc.text(taxVal.toLocaleString('id-ID'), cX + colW[4] - 2, textY, { align: "right", baseline: "middle" });
          cX += colW[4];
          doc.text(netVal.toLocaleString('id-ID'), cX + colW[5] - 2, textY, { align: "right", baseline: "middle" });
          cX += colW[5];
      } else {
          cX += colW[3] + colW[4] + colW[5];
      }

      doc.setFontSize(7);
      const signX = (i % 2 === 0) ? cX + 3 : cX + (colW[6] / 2);
      doc.text(`${i + 1}. .......`, signX, textY, { baseline: "middle" });
      
      currentY += rowHeight;
  }

  if (currentY > pageHeight - 60) { 
    doc.addPage(); 
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
  }
  
  currentY += 15;
  const sigX = pageWidth - 70;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rungkang, ${format(d, "d MMMM yyyy", { locale: localeID })}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Rungkang,", sigX, currentY + 6);
  currentY += 25;
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);

  return doc.output("blob");
}

export const generateHonorNarasumberPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 15;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const d = values.date ? new Date(values.date) : new Date();

  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("HONORARIUM NARASUMBER", pageWidth / 2, 50, { align: "center" });

  let currentY = 65;
  doc.setFontSize(10);

  const addHeaderRow = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, currentY);
    doc.text(":", margin + 25, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(text || "-", margin + 28, currentY);
    currentY += 6;
  };

  addHeaderRow("Kegiatan", values.title);
  addHeaderRow("Tanggal", formatDateIndo(values.date));
  addHeaderRow("Tempat", values.location);

  currentY += 5;
  const colW = [10, 40, 40, 22, 18, 22, 28];
  const baseRowHeight = 12;
  const headers = ["NO", "NAMA", "JABATAN", "NOMINAL", "PAJAK", "DITERIMA", "TTD"];

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let hX = margin;
    headers.forEach((h, i) => {
      doc.rect(hX, currentY, colW[i], 10);
      doc.text(h, hX + colW[i] / 2, currentY + 6.5, { align: "center" });
      hX += colW[i];
    });
    currentY += 10;
  }

  drawHeader();

  const narsumList = values.narsum || [];
  narsumList.forEach((p: any, i: number) => {
    const nom = parseInt(p.nominal) || 0;
    const taxPercent = parseInt(p.tax) || 0;
    const taxVal = Math.round(nom * (taxPercent / 100));
    const netVal = nom - taxVal;

    const nameLines = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
    const positionLines = doc.splitTextToSize((p.position || "").toUpperCase(), colW[2] - 4);
    const lineCount = Math.max(nameLines.length, positionLines.length, 1);
    const rowHeight = Math.max(baseRowHeight, (lineCount * 5) + 2);
    
    if (currentY + rowHeight > pageHeight - 20) { 
        doc.addPage(); 
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        currentY = 40;
        drawHeader();
    }
    const startY = currentY;

    let rX = margin;
    colW.forEach((w) => { doc.rect(rX, startY, w, rowHeight); rX += w; });

    const textY = startY + rowHeight / 2;

    let cX = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text((i + 1).toString(), cX + colW[0] / 2, textY, { align: "center", baseline: "middle" });
    cX += colW[0];
    
    doc.text(nameLines, cX + 2, textY, { baseline: "middle" });
    cX += colW[1];
    doc.text(positionLines, cX + 2, textY, { baseline: "middle" });
    cX += colW[2];

    doc.text(nom.toLocaleString('id-ID'), cX + colW[3] - 2, textY, { align: "right", baseline: "middle" });
    cX += colW[3];
    doc.text(taxVal.toLocaleString('id-ID'), cX + colW[4] - 2, textY, { align: "right", baseline: "middle" });
    cX += colW[4];
    doc.text(netVal.toLocaleString('id-ID'), cX + colW[5] - 2, textY, { align: "right", baseline: "middle" });
    cX += colW[5];

    const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[6] / 2);
    doc.setFontSize(8);
    doc.text(`${i + 1}. .......`, signX, textY, { baseline: "middle" });
    
    currentY += rowHeight;
  });

  if (currentY > pageHeight - 60) { 
    doc.addPage(); 
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40; 
  }
  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rungkang, ${formatDateIndo(values.date)}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Rungkang,", sigX, currentY + 6);
  currentY += 25;
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);

  return doc.output("blob");
}

export const generateSiltapPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const d = values.date ? new Date(values.date) : new Date();

  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(values.title.toUpperCase(), pageWidth / 2, 50, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bulan : ${values.month}`, margin, 60);

  let currentY = 65;
  const colW = [10, 50, 55, 25, 30]; 
  const rowH = 12;
  const headers = ["NO", "NAMA", "JABATAN", "NOMINAL", "TTD"];

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.rect(margin, currentY, colW[0], 10);
    doc.text("NO", margin + 5, currentY + 6.5, { align: "center" });
    doc.rect(margin + colW[0], currentY, colW[1], 10);
    doc.text("NAMA", margin + colW[0] + colW[1] / 2, currentY + 6.5, { align: "center" });
    doc.rect(margin + colW[0] + colW[1], currentY, colW[2], 10);
    doc.text("JABATAN", margin + colW[0] + colW[1] + colW[2] / 2, currentY + 6.5, { align: "center" });
    doc.rect(margin + colW[0] + colW[1] + colW[2], currentY, colW[3], 10);
    doc.text("NOMINAL", margin + colW[0] + colW[1] + colW[2] + colW[3] / 2, currentY + 6.5, { align: "center" });
    doc.rect(margin + colW[0] + colW[1] + colW[2] + colW[3], currentY, colW[4], 10);
    doc.text("TTD", margin + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] / 2, currentY + 6.5, { align: "center" });
    currentY += 10;
  }

  drawHeader();

  doc.setFont("helvetica", "normal");

  values.data.forEach((item: any, i: number) => {
    const splitJabatan = doc.splitTextToSize(item.jabatan || "", colW[2] - 4);
    const itemHeight = Math.max(rowH, splitJabatan.length * 5 + 4);

    if (currentY + itemHeight > pageHeight - 20) { 
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
      drawHeader();
    }
    const startY = currentY;

    doc.rect(margin, startY, colW[0], itemHeight);
    doc.text((i + 1).toString(), margin + 5, startY + (itemHeight / 2) + 1.5, { align: "center" });
    doc.rect(margin + colW[0], startY, colW[1], itemHeight);
    doc.text(item.name || "", margin + colW[0] + 2, startY + (itemHeight / 2) + 1.5);
    doc.rect(margin + colW[0] + colW[1], startY, colW[2], itemHeight);
    doc.text(splitJabatan, margin + colW[0] + colW[1] + 2, startY + 5);
    doc.rect(margin + colW[0] + colW[1] + colW[2], startY, colW[3], itemHeight);
    doc.text((item.nominal || 0).toLocaleString('id-ID'), margin + colW[0] + colW[1] + colW[2] + colW[3] - 2, startY + (itemHeight / 2) + 1.5, { align: "right" });
    doc.rect(margin + colW[0] + colW[1] + colW[2] + colW[3], startY, colW[4], itemHeight);
    
    const signX = (i % 2 === 0) ? margin + colW[0] + colW[1] + colW[2] + colW[3] + 2 : margin + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] / 2;
    doc.setFontSize(8);
    doc.text(`${i + 1}.`, signX, startY + (itemHeight / 2) + 1);
    doc.setFontSize(10);
    currentY += itemHeight;
  });

  if (currentY > pageHeight - 60) { 
    doc.addPage(); 
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40; 
  }
  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.text(`Rungkang, ${formatDateIndo(values.date)}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Rungkang,", sigX, currentY + 6);
  currentY += 25; 
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);

  return doc.output("blob");
}

export const generateInsentifPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 15;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const d = values.date ? new Date(values.date) : new Date();
  
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  const nom = parseInt(values.nominal) || 0;
  const taxPercent = parseInt(values.tax) || 0;
  const taxVal = Math.round(nom * (taxPercent / 100));
  const netVal = nom - taxVal;

  addKopSuratSync(doc, logoImg, margin, pageWidth);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`TANDA TERIMA INSENTIF ${values.category.toUpperCase()}`, pageWidth / 2, 50, { align: "center" });
  
  let currentY = 60;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bulan : ${values.month}`, margin, currentY);

  currentY += 5;
  const colW = [10, 40, 40, 22, 18, 22, 28]; 
  const rowH = 10;
  const headers = ["NO", "NAMA", "JABATAN", "NOMINAL", "PAJAK", "DITERIMA", "TTD"];

  const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      let hX = margin;
      headers.forEach((h, i) => {
        doc.rect(hX, currentY, colW[i], 10);
        doc.text(h, hX + colW[i]/2, currentY + 6.5, { align: "center" });
        hX += colW[i];
      });
      currentY += 10;
  }
  
  drawHeader();
  
  const kuota = values.jumlahOrang || 0;
  
  for (let i = 0; i < kuota; i++) {
    if (currentY + rowH > pageHeight - 20) { 
      doc.addPage(); 
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40; 
      drawHeader();
    }

    const p = values.participants?.[i] || { name: "", position: "" };
    
    let rX = margin;
    colW.forEach((w) => { doc.rect(rX, currentY, w, rowH); rX += w; });

    let cX = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text((i + 1).toString(), cX + colW[0]/2, currentY + 6.5, { align: "center" });
    cX += colW[0];
    
    doc.setFontSize(8);
    doc.text((p.name || "").toUpperCase(), cX + 2, currentY + 6.5, { maxWidth: colW[1]-4 });
    cX += colW[1];
    doc.text((p.position || "").toUpperCase(), cX + 2, currentY + 6.5, { maxWidth: colW[2]-4 });
    cX += colW[2];
    
    doc.setFontSize(9);
    if (p.name) {
      doc.text(nom.toLocaleString('id-ID'), cX + colW[3] - 2, currentY + 6.5, { align: "right" });
      cX += colW[3];
      doc.text(taxVal.toLocaleString('id-ID'), cX + colW[4] - 2, currentY + 6.5, { align: "right" });
      cX += colW[4];
      doc.text(netVal.toLocaleString('id-ID'), cX + colW[5] - 2, currentY + 6.5, { align: "right" });
      cX += colW[5];
    } else {
       cX += colW[3] + colW[4] + colW[5];
    }
    
    doc.setFontSize(8);
    const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[6] / 2);
    doc.text(`${i + 1}. .......`, signX, currentY + 6.5);
    
    currentY += rowH;
  }
  
  if (currentY > pageHeight - 60) { 
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40; 
  }

  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rungkang, ${formatDateIndo(values.date)}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Rungkang,", sigX, currentY + 6);
  currentY += 25; 
  doc.text("SUSANTO", sigX, currentY);
  const nW = doc.getTextWidth("SUSANTO");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);
  
  return doc.output("blob");
}
