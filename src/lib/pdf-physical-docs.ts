
import { jsPDF } from "jspdf";
import { format, getDate, getYear } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { addKopSuratSync, loadImage, terbilang, getRomanMonth } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

/**
 * Generator PDF Pusat untuk Dokumen Fisik (Physical Documents Hub)
 * Mencakup Proposal, RPD, SPJ (Termasuk Foto Fisik), BAST 100%, dan PBJ
 */
export const generatePhysicalDocPDF = async (type: string, data: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  
  const logoSource = (logoBase64 && logoBase64.length > 50) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  const formattedBudget = new Intl.NumberFormat('id-ID').format(data.anggaran || 0);
  const formattedDate = data.tanggalKegiatan ? format(new Date(data.tanggalKegiatan), "d MMMM yyyy", { locale: localeID }) : format(new Date(), "d MMMM yyyy", { locale: localeID });

  // Shared Helper: Signature Block (Two Signatures)
  const addSignatures = (y: number, leftTitle: string, leftName: string, rightTitle: string, rightName: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const leftX = margin + 35;
    const rightX = pageWidth - margin - 35;
    
    doc.text(leftTitle, leftX, y, { align: "center" });
    doc.text(rightTitle, rightX, y, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.text((leftName || "-----------").toUpperCase(), leftX, y + 25, { align: "center" });
    doc.text((rightName || "-----------").toUpperCase(), rightX, y + 25, { align: "center" });
    
    const wL = doc.getTextWidth((leftName || "-----------").toUpperCase());
    const wR = doc.getTextWidth((rightName || "-----------").toUpperCase());
    doc.line(leftX - wL/2, y + 26, leftX + wL/2, y + 26);
    doc.line(rightX - wR/2, y + 26, rightX + wR/2, y + 26);
  };

  // 1. PROPOSAL SECTION
  if (type === 'prop_cover') {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PROPOSAL KEGIATAN", pageWidth / 2, 60, { align: "center" });
    doc.setFontSize(16);
    const lines = doc.splitTextToSize((data.namaKegiatan || "PROYEK PEMBANGUNAN").toUpperCase(), contentWidth - 40);
    doc.text(lines, pageWidth / 2, 75, { align: "center" });
    
    doc.setFontSize(14);
    doc.text(`TAHUN ANGGARAN ${data.tahunAnggaran}`, pageWidth / 2, 110, { align: "center" });
    
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', pageWidth / 2 - 25, 130, 50, 60);
    }
    
    doc.setFontSize(16);
    doc.text("PEMERINTAH DESA RUNGKANG", pageWidth / 2, 230, { align: "center" });
    doc.setFontSize(14);
    doc.text("KECAMATAN GANDRUNGMANGU", pageWidth / 2, 240, { align: "center" });
    doc.text("KABUPATEN CILACAP", pageWidth / 2, 250, { align: "center" });
  }

  else if (type === 'prop_full') {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("URAIAN PROPOSAL KEGIATAN", pageWidth / 2, 56, { align: "center" });

    let y = 70;
    doc.setFont("helvetica", "bold");
    doc.text("I. PENDAHULUAN", margin, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const pendahuluan = `Dalam rangka meningkatkan infrastruktur dan kualitas hidup masyarakat di ${data.lokasi}, Pemerintah Desa Rungkang memandang perlu melaksanakan ${data.namaKegiatan} melalui pemanfaatan ${data.sumberDana} Tahun Anggaran ${data.tahunAnggaran}.`;
    const pLines = doc.splitTextToSize(pendahuluan, contentWidth);
    doc.text(pLines, margin, y, { align: "justify" });
    y += (pLines.length * 6) + 10;

    doc.setFont("helvetica", "bold");
    doc.text("II. MAKSUD DAN TUJUAN", margin, y); y += 8;
    doc.setFont("helvetica", "normal");
    const tujuan = `Kegiatan ini dimaksudkan untuk mempermudah aksesibilitas warga serta mendukung kelancaran transportasi di wilayah desa. Target volume pekerjaan adalah ${data.volume} dengan lokasi di ${data.lokasi}.`;
    const tLines = doc.splitTextToSize(tujuan, contentWidth);
    doc.text(tLines, margin, y, { align: "justify" });
    y += (tLines.length * 6) + 15;

    addSignatures(y, "Mengetahui,\nKepala Desa", data.nama_kades, "Dibuat Oleh,\nKetua TPK", data.nama_ketua_tpk);
  }

  // 2. RPD SECTION
  else if (type === 'rpd_form') {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("RENCANA PENGGUNAAN DANA (RPD)", pageWidth / 2, 56, { align: "center" });
    
    let y = 70;
    doc.setFontSize(10);
    const addRow = (l: string, v: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(l, margin, y);
        doc.text(":", margin + 45, y);
        doc.setFont("helvetica", "normal");
        doc.text(v || "-", margin + 48, y);
        y += 7;
    }
    addRow("Bidang", data.nama_bidang || "Pelaksanaan Pembangunan Desa");
    addRow("Kegiatan", data.nama_kegiatan);
    addRow("Lokasi", data.lokasi_kegiatan);
    addRow("Sumber Dana", data.sumber_dana || "Dana Desa (DD)");
    addRow("Besar Anggaran", `Rp ${formattedBudget}`);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.rect(margin, y, 10, 10); doc.text("NO", margin + 5, y + 6.5, { align: "center" });
    doc.rect(margin + 10, y, 100, 10); doc.text("URAIAN PEKERJAAN", margin + 60, y + 6.5, { align: "center" });
    doc.rect(margin + 110, y, 60, 10); doc.text("JUMLAH (RP)", margin + 140, y + 6.5, { align: "center" });
    
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.rect(margin, y, 10, 20); doc.text("1", margin + 5, y + 10, { align: "center" });
    doc.rect(margin + 10, y, 100, 20); 
    const lines = doc.splitTextToSize(`Pelaksanaan ${data.nama_kegiatan} dengan volume ${data.volume} sesuai RAB.`, 96);
    doc.text(lines, margin + 12, y + 8);
    doc.rect(margin + 110, y, 60, 20); doc.text(formattedBudget, margin + 168, y + 10, { align: "right" });
    
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.rect(margin, y, 110, 10); doc.text("TOTAL PERMOHONAN", margin + 60, y + 6.5, { align: "center" });
    doc.rect(margin + 110, y, 60, 10); doc.text(formattedBudget, margin + 168, y + 6.5, { align: "right" });

    y += 25;
    addSignatures(y, "Bendahara Desa,", data.nama_bendahara, "Ketua TPK,", data.nama_ketua_tpk);
    y += 45;
    doc.setFont("helvetica", "bold");
    doc.text("Menyetujui,\nKepala Desa Rungkang", pageWidth / 2, y, { align: "center" });
    y += 25;
    doc.text((data.nama_kades || "SUSANTO").toUpperCase(), pageWidth / 2, y, { align: "center" });
    const nW = doc.getTextWidth((data.nama_kades || "SUSANTO").toUpperCase());
    doc.line(pageWidth/2 - nW/2, y+1, pageWidth/2 + nW/2, y+1);
  }

  // 3. SPJ SECTION (Termasuk Foto Fisik & BAST 100%)
  else if (type === 'spj_foto_fisik') {
    const addPhotoPageHeader = (catLabel: string) => {
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`DOKUMENTASI PEKERJAAN ${catLabel}`, pageWidth / 2, 52, { align: "center" });
        doc.setFontSize(10);
        doc.text("DATA KEGIATAN", margin, 62);
        doc.setFont("helvetica", "normal");
        doc.text("Kegiatan", margin, 68); doc.text(`: ${data.nama_kegiatan || "-"}`, margin + 25, 68);
        doc.text("Lokasi", margin, 74); doc.text(`: ${data.lokasi_kegiatan || "-"}`, margin + 25, 74);
        doc.text("Anggaran", margin, 80); doc.text(`: Rp ${formattedBudget}`, margin + 25, 80);
        doc.setLineWidth(0.1);
        doc.line(margin, 84, pageWidth - margin, 84);
        return 90;
    }

    const photoCategories = [
        { label: "KONDISI 0%", urls: data.physicalPhotos?.p0 || [] },
        { label: "KONDISI 50%", urls: data.physicalPhotos?.p50 || [] },
        { label: "KONDISI 100%", urls: data.physicalPhotos?.p100 || [] }
    ];

    let isFirstPage = true;

    for (const cat of photoCategories) {
        if (cat.urls.length === 0) continue;
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        let y = addPhotoPageHeader(cat.label);
        for (const url of cat.urls) {
            const img = await loadImage(url);
            if (img) {
                const imgProps = doc.getImageProperties(url);
                const imgW = contentWidth;
                const imgH = (imgProps.height * imgW) / imgProps.width;
                if (y + imgH > pageHeight - 20) {
                    doc.addPage();
                    y = addPhotoPageHeader(cat.label + " (Lanjutan)");
                }
                doc.addImage(img, 'JPEG', margin, y, imgW, imgH);
                y += imgH + 10;
            }
        }
    }
  }

  else if (type === 'spj_bast_full') {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const titleText = [
      "BERITA ACARA SERAH TERIMA 100 % PEKERJAAN PELAKSANA KEGIATAN",
      "ANGGARAN KEPADA PEMEGANG KEKUASAAN PENGELOLAAN KEUANGAN DESA"
    ];
    doc.text(titleText[0], pageWidth / 2, 56, { align: "center" });
    doc.text(titleText[1], pageWidth / 2, 61, { align: "center" });
    
    const numY = 72;
    const numText = `Nomor : ${data.nomor_bast || "..... / BA / " + getRomanMonth(data.tanggal_bast) + " / " + getYear(new Date())}`;
    doc.text(numText, pageWidth / 2, numY, { align: "center" });
    const textWidth = doc.getTextWidth(numText);
    doc.line(pageWidth / 2 - textWidth / 2, numY + 1, pageWidth / 2 + textWidth / 2, numY + 1);

    const dBast = data.tanggal_bast ? new Date(data.tanggal_bast) : new Date();
    const openingY = 85;
    const openingText = `Pada hari ini ${format(dBast, "EEEE", { locale: localeID })} tanggal ${terbilang(getDate(dBast))} bulan ${format(dBast, "MMMM", { locale: localeID })} tahun ${terbilang(getYear(dBast))} bertempat di Desa Rungkang, kami yang bertanda tangan dibawah ini :`;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    // Use doc.text with align justify directly and maxWidth to ensure it wraps correctly within margins
    doc.text(openingText, margin, openingY, { align: "justify", maxWidth: contentWidth });

    // Calculate height of the justified block to set next Y
    const splitOpening = doc.splitTextToSize(openingText, contentWidth);
    let y = openingY + (splitOpening.length * 5.5) + 6;

    const labelX = margin + 8;
    const dotX = margin + 35;
    const valX = margin + 38;

    // PIHAK I
    doc.setFont("helvetica", "normal");
    doc.text("I", margin, y);
    doc.text("Nama", labelX, y); doc.text(":", dotX, y); doc.setFont("helvetica", "bold"); doc.text((data.nama_kasi || "-").toUpperCase(), valX, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Jabatan", labelX, y); doc.text(":", dotX, y); doc.text(`Pelaksana Kegiatan Anggaran (${data.jabatan_kasi || "-"})`, valX, y); y += 6;
    doc.text("Alamat", labelX, y); doc.text(":", dotX, y); 
    const alamat1 = `Desa Rungkang Kecamatan Gandrungmangu yang selanjutnya disebut PIHAK KESATU`;
    const splitAl1 = doc.splitTextToSize(alamat1, contentWidth - 40);
    doc.text(splitAl1, valX, y); y += (splitAl1.length * 5) + 4;

    // PIHAK II
    doc.text("II", margin, y);
    doc.text("Nama", labelX, y); doc.text(":", dotX, y); doc.setFont("helvetica", "bold"); doc.text("SUSANTO", valX, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Jabatan", labelX, y); doc.text(":", dotX, y); doc.text("Pemegang Kekuasaan Pengelolaan Keuangan Desa", valX, y); y += 6;
    doc.text("Alamat", labelX, y); doc.text(":", dotX, y); 
    const alamat2 = `Desa Rungkang Kecamatan Gandrungmangu yang selanjutnya disebut PIHAK KEDUA`;
    const splitAl2 = doc.splitTextToSize(alamat2, contentWidth - 40);
    doc.text(splitAl2, valX, y); y += (splitAl2.length * 5) + 10;

    const bodyText = "Dengan ini menyatakan bahwa PIHAK KESATU telah menyerahkan barang/pekerjaan kepada PIHAK KEDUA dan PIHAK KEDUA telah menerima barang/pekerjaan dari PIHAK KESATU berupa :";
    doc.text(bodyText, margin, y, { align: "justify", maxWidth: contentWidth });
    const splitBody = doc.splitTextToSize(bodyText, contentWidth);
    y += (splitBody.length * 5.5) + 8;

    // TABLE
    const colW = [12, 105, 30, 33];
    const headers = ["NO", "NAMA KEGIATAN", "VOLUME", "TTD"];
    let hX = margin;
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => {
        doc.rect(hX, y, colW[i], 10);
        doc.text(h, hX + colW[i]/2, y + 6.5, { align: "center" });
        hX += colW[i];
    });
    y += 10;
    doc.setFont("helvetica", "normal");
    let rX = margin;
    doc.rect(rX, y, colW[0], 15); doc.text("1", rX + colW[0]/2, y + 9, { align: "center" }); rX += colW[0];
    doc.rect(rX, y, colW[1], 15); doc.text(data.namaKegiatan || "-", rX + 3, y + 9); rX += colW[1];
    doc.rect(rX, y, colW[2], 15); doc.text(`${data.volume || "1"} Kegiatan`, rX + colW[2]/2, y + 9, { align: "center" }); rX += colW[2];
    doc.rect(rX, y, colW[3], 15);
    y += 25;

    doc.text(`Rungkang, ${format(dBast, "d MMMM yyyy", { locale: localeID })}`, pageWidth - margin, y, { align: "right" }); y += 10;
    
    addSignatures(y, "PIHAK KEDUA\nPemegang Kekuasaan\nPengelolaan Keuangan Desa", "SUSANTO", "PIHAK KESATU\nPelaksana Kegiatan Anggaran", data.nama_kasi);
  }

  else if (type === 'spj_ba_pembayaran') {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BERITA ACARA PEMBAYARAN 100%", pageWidth / 2, 56, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Nomor : ..... / BAP / ${data.tahun_saat_ini}`, pageWidth / 2, 62, { align: "center" });

    let y = 80;
    doc.setFont("helvetica", "normal");
    const intro = `Pada hari ini ${formattedDate} telah dilakukan pembayaran atas pelaksanaan pekerjaan ${data.nama_kegiatan} di ${data.lokasi_kegiatan} kepada:`;
    const iLines = doc.splitTextToSize(intro, contentWidth);
    doc.text(iLines, margin, y, { align: "justify", maxWidth: contentWidth });
    y += (iLines.length * 6) + 10;

    doc.setFont("helvetica", "bold");
    doc.text("Nama Penyedia", margin + 10, y); doc.text(`: ${data.nama_cvpemenang}`, margin + 50, y); y += 7;
    doc.text("Besar Pembayaran", margin + 10, y); doc.text(`: Rp ${formattedBudget}`, margin + 50, y); y += 7;
    doc.text("Terbilang", margin + 10, y); doc.setFont("helvetica", "normal"); doc.text(`: ${terbilang(data.anggaran || data.nominal_cvpemenang)} rupiah`, margin + 50, y); y += 15;

    doc.text("Pihak-pihak sepakat bahwa seluruh kewajiban pekerjaan telah diselesaikan 100%.", margin, y, { maxWidth: contentWidth }); y += 30;

    addSignatures(y, "Bendahara Desa,", data.nama_bendahara, "Penerima/Penyedia,", data.nama_pemilik_cvpemenang);
  }

  // 4. PBJ SECTION (UNIFIED)
  else if (type === 'pbj_sistem') {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("BERKAS PENGADAAN BARANG DAN JASA (PBJ)", pageWidth / 2, 60, { align: "center" });
    
    let y = 80;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Proyek: ${data.nama_kegiatan}`, margin, y); y += 8;
    doc.text(`Tahun: ${data.tahun_saat_ini}`, margin, y); y += 8;
    doc.text(`Pemenang: ${data.nama_cvpemenang || "-"}`, margin, y); y += 8;
    doc.text(`Nilai Kontrak: Rp ${formattedBudget}`, margin, y); y += 15;

    doc.setFont("helvetica", "bold");
    doc.text("STATUS DOKUMEN: SIAP CETAK", margin, y); y += 10;
    
    doc.setFont("helvetica", "normal");
    const note = "Sistem telah menggabungkan seluruh tahapan PBJ (SK TPK, Undangan, Penawaran, BA Klarifikasi, SPPBJ, Kontrak, dan BAST) ke dalam satu alur terintegrasi berdasarkan template PBJ SISTEM.docx.";
    const nLines = doc.splitTextToSize(note, contentWidth);
    doc.text(nLines, margin, y, { align: "justify", maxWidth: contentWidth });
    y += (nLines.length * 6) + 20;

    doc.setFont("helvetica", "italic");
    doc.text("* Gunakan tombol DOCX di aplikasi untuk mendapatkan berkas yang bisa disunting penuh di MS Word.", margin, y);
    
    y += 30;
    doc.setFont("helvetica", "normal");
    doc.text(`Rungkang, ${formattedDate}`, pageWidth - margin - 60, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Ketua TPK Desa Rungkang,", pageWidth - margin - 60, y);
    y += 28;
    doc.text((data.nama_ketua_tpk || "-----------").toUpperCase(), pageWidth - margin - 60, y);
  }

  else {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(type.replace(/_/g, ' ').toUpperCase(), pageWidth / 2, 60, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Kegiatan: ${data.nama_kegiatan || data.namaKegiatan}`, margin, 80);
    doc.text(`Lokasi: ${data.lokasi_kegiatan || data.lokasi}`, margin, 88);
    doc.text(`Besar Anggaran: Rp ${formattedBudget}`, margin, 96);
    
    doc.text("Dokumen ini sedang dalam proses sinkronisasi template otomatis.", margin, 120);
    doc.text("Mohon lengkapi seluruh data master proyek di halaman Editor.", margin, 128);
  }

  return doc.output("blob");
};
