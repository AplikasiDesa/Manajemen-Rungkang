
import { jsPDF } from "jspdf";
import { format, getDate, getYear } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { addKopSuratSync, loadImage, terbilang, getRomanMonth } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

/**
 * Generator PDF Pusat untuk Dokumen Fisik (Physical Documents Hub)
 */
export const generatePhysicalDocPDF = async (type: string, data: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
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

  else if (type === 'spj_survey_harga') {
    const filledItems = (data.survey_items || []).filter((it:any) => it.nama && it.nama.trim() !== "");
    const numShops = data.num_shops || 3;

    const renderSurveyPage = (pageIdx: number) => {
        const tokoName = [data.nama_toko1, data.nama_toko2, data.nama_toko3, data.nama_toko4][pageIdx] || "";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("FORM SURVEY HARGA", pageWidth / 2, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text("DESA", margin, 25); doc.text(`: RUNGKANG`, margin + 30, 25);
        doc.text("KECAMATAN", margin, 31); doc.text(`: GANDRUNGMANGU`, margin + 30, 31);
        doc.text("KABUPATEN", margin, 37); doc.text(`: CILACAP`, margin + 30, 37);
        let y = 45;
        const colW = [12, 85, 25, 30, 23]; 
        const headers = ["NO", "Nama/Jenis Barang", "Satuan", "Harga", "Keterangan"];
        doc.setFont("helvetica", "bold");
        let hX = margin;
        headers.forEach((h, i) => { doc.rect(hX, y, colW[i], 12); doc.text(h, hX + colW[i]/2, y + 8, { align: "center" }); hX += colW[i]; });
        y += 12;
        doc.setFont("helvetica", "normal");
        filledItems.forEach((item: any, i: number) => {
            let rX = margin;
            doc.rect(rX, y, colW[0], 8.5); doc.text((i+1).toString(), rX + colW[0]/2, y + 5.5, { align: "center" }); rX += colW[0];
            doc.rect(rX, y, colW[1], 8.5); doc.text((item.nama || "").toUpperCase(), rX + 2, y + 5.5); rX += colW[1];
            doc.rect(rX, y, colW[2], 8.5); doc.text((item.satuan || "").toUpperCase(), rX + colW[2]/2, y + 5.5, { align: "center" }); rX += colW[2];
            doc.rect(rX, y, colW[3], 8.5); 
            const price = Number([item.h1, item.h2, item.h3, item.h4][pageIdx] || 0);
            if (price > 0) doc.text(price.toLocaleString('id-ID'), rX + colW[3] - 2, y + 5.5, { align: "right" });
            rX += colW[3];
            doc.rect(rX, y, colW[4], 8.5);
            y += 8.5;
        });
        y += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Catatan : Harga termasuk pajak dan resiko pengiriman", margin, y);
        
        const sigCenterX = pageWidth - margin - 35;
        const dStr = format(new Date(), "d MMMM yyyy", { locale: localeID });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        y += 10;
        doc.text(`Rungkang, ${dStr}`, sigCenterX, y, { align: "center" });
        y += 6;
        doc.text(`Toko ${tokoName.toUpperCase()}`, sigCenterX, y, { align: "center" });
        y += 28;
        doc.text("..........................", sigCenterX, y, { align: "center" });
    };

    for (let p = 0; p < numShops; p++) {
        if (p > 0) doc.addPage();
        renderSurveyPage(p);
    }
  }

  else if (type === 'spj_hps_kegiatan') {
    const docL = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pW = docL.internal.pageSize.getWidth();
    const pH = docL.internal.pageSize.getHeight();
    const m = 10;
    const contentW = pW - (m * 2);
    
    docL.setFont("helvetica", "bold");
    docL.setFontSize(11);
    docL.text("DAFTAR HARGA PERKIRAAN SENDIRI (HPS)", pW / 2, 10, { align: "center" });
    docL.text("BAHAN / MATERIAL", pW / 2, 15, { align: "center" });
    
    let y = 25;
    const numShops = data.num_shops || 3;
    
    const colNo = 8;
    const colUraian = 48;
    const colSat = 11;
    const colHps = 22;
    const colPpn = 18;
    const colPph = 18;
    const colHrgSat = 22;
    const colHrgPakai = 22;
    const colKet = 18;

    const surveyColW = Math.floor(90 / numShops);
    
    const colW = [colNo, colUraian, colSat]; 
    for (let s = 0; s < numShops; s++) colW.push(surveyColW);
    colW.push(colHps, colPpn, colPph, colHrgSat, colHrgPakai, colKet); 

    const headers = ["NO", "URAIAN", "SAT"];
    for (let s = 0; s < numShops; s++) {
        const name = [data.nama_toko1, data.nama_toko2, data.nama_toko3, data.nama_toko4][s] || `TOKO ${s+1}`;
        headers.push(`SURVEY ${name.toUpperCase()}`);
    }
    headers.push("HARGA HPS", "PPN", "PPH", "HRG SAT", "HRG PAKAI", "KET");
    
    docL.setFontSize(7);
    let hX = m;
    headers.forEach((h, i) => { 
        docL.rect(hX, y, colW[i], 12); 
        const splitH = docL.splitTextToSize(h, colW[i] - 2);
        const lineCount = splitH.length;
        const lineH = 3.5;
        const startH = 6.5 - ((lineCount - 1) * (lineH / 2));
        docL.text(splitH, hX + colW[i]/2, y + startH, { align: "center" }); 
        hX += colW[i]; 
    });
    y += 12;

    docL.setFont("helvetica", "normal");
    const items = (data.survey_items || []).filter((it:any) => it.nama && it.nama.trim() !== "");
    items.forEach((item: any, i: number) => {
        const hps = Number(item.hps) || 0;
        const ppnPercent = Number(item.ppn) || 0;
        const pphPercent = Number(item.pph) || 0;
        const ppnNominal = Math.round(hps * (ppnPercent / 100));
        const pphNominal = Math.round(hps * (pphPercent / 100));
        const hrgSat = hps + ppnNominal + pphNominal;
        
        let rX = m;
        docL.rect(rX, y, colW[0], 8.5); docL.text((i+1).toString(), rX + colW[0]/2, y + 5.5, { align: "center" }); rX += colW[0];
        docL.rect(rX, y, colW[1], 8.5); docL.text((item.nama || "").toUpperCase(), rX + 2, y + 5.5); rX += colW[1];
        docL.rect(rX, y, colW[2], 8.5); docL.text((item.satuan || "").toUpperCase(), rX + colW[2]/2, y + 5.5, { align: "center" }); rX += colW[2];
        
        for (let s = 1; s <= numShops; s++) {
            const price = Number(item[`h${s}` as keyof any] || 0);
            docL.rect(rX, y, colW[2+s], 8.5); 
            if (price > 0) docL.text(price.toLocaleString('id-ID'), rX + colW[2+s]-1, y+5.5, { align: "right" }); 
            rX += colW[2+s];
        }

        const nextIdx = 3 + numShops;
        docL.rect(rX, y, colW[nextIdx], 8.5); docL.text(hps.toLocaleString('id-ID'), rX + colW[nextIdx]-1, y+5.5, { align: "right" }); rX += colW[nextIdx];
        docL.rect(rX, y, colW[nextIdx+1], 8.5); docL.text(ppnNominal > 0 ? ppnNominal.toLocaleString('id-ID') : "0", rX + colW[nextIdx+1]-1, y+5.5, { align: "right" }); rX += colW[nextIdx+1];
        docL.rect(rX, y, colW[nextIdx+2], 8.5); docL.text(pphNominal > 0 ? pphNominal.toLocaleString('id-ID') : "0", rX + colW[nextIdx+2]-1, y+5.5, { align: "right" }); rX += colW[nextIdx+2];
        docL.rect(rX, y, colW[nextIdx+3], 8.5); docL.text(hrgSat.toLocaleString('id-ID'), rX + colW[nextIdx+3]-1, y+5.5, { align: "right" }); rX += colW[nextIdx+3];
        docL.rect(rX, y, colW[nextIdx+4], 8.5); docL.text(hrgSat.toLocaleString('id-ID'), rX + colW[nextIdx+4]-1, y+5.5, { align: "right" }); rX += colW[nextIdx+4];
        docL.rect(rX, y, colW[nextIdx+5], 8.5);
        y += 8.5;
    });

    y += 10;
    docL.setFontSize(8);
    const dStr = format(new Date(), "d MMMM yyyy", { locale: localeID });
    const sX = [m + 45, pW / 2, pW - 60];
    
    docL.setFont("helvetica", "normal");
    docL.text(`Desa Rungkang, ${dStr}`, sX[2], y, { align: "center" });
    
    y += 5;
    docL.setFont("helvetica", "bold");
    
    docL.text("Diverifikasi Oleh,", sX[0], y, { align: "center" });
    docL.text("Sekretaris Desa", sX[0], y + 4, { align: "center" });

    docL.text("Dibuat Oleh,", sX[2], y, { align: "center" });
    docL.text("Kasi/Kaur", sX[2], y + 4, { align: "center" });

    docL.text("Mengetahui,", sX[1], y + 10, { align: "center" });
    docL.text("Kepala Desa", sX[1], y + 14, { align: "center" });

    y += 28;
    const nameSekdes = (data.nama_sekdes || "WASIMAN").toUpperCase();
    docL.text(nameSekdes, sX[0], y, { align: "center" });
    docL.line(sX[0] - docL.getTextWidth(nameSekdes)/2, y + 0.8, sX[0] + docL.getTextWidth(nameSekdes)/2, y + 0.8);

    docL.text("SUSANTO", sX[1], y + 10, { align: "center" });
    docL.line(sX[1] - docL.getTextWidth("SUSANTO")/2, y + 10.8, sX[1] + docL.getTextWidth("SUSANTO")/2, y + 10.8);

    const nameKasi = (data.nama_kasi || "-----------").toUpperCase();
    docL.text(nameKasi, sX[2], y, { align: "center" });
    docL.line(sX[2] - docL.getTextWidth(nameKasi)/2, y + 0.8, sX[2] + docL.getTextWidth(nameKasi)/2, y + 0.8);

    return docL.output("blob");
  }

  else if (type === 'spj_foto_fisik') {
    const isFisik = data.photoMode === "fisik";
    
    const addPhotoPageHeader = (catLabel: string) => {
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        
        // Judul khusus untuk mode Non-Fisik sesuai permintaan user
        const titleText = isFisik ? `DOKUMENTASI PEKERJAAN ${catLabel}` : `DOKUMENTASI ${catLabel}`;
        doc.text(titleText, pageWidth / 2, 52, { align: "center" });
        
        doc.setFontSize(10);
        let yHeader = 62;

        if (isFisik) {
            doc.setFont("helvetica", "bold"); doc.text("DATA KEGIATAN", margin, yHeader);
            yHeader += 6;
            doc.setFont("helvetica", "normal");
            doc.text("Kegiatan", margin, yHeader); doc.text(`: ${data.nama_kegiatan || "-"}`, margin + 25, yHeader);
            yHeader += 6;
            doc.text("Lokasi", margin, yHeader); doc.text(`: ${data.lokasi_kegiatan || "-"}`, margin + 25, yHeader);
            yHeader += 6;
            doc.text("Anggaran", margin, yHeader); doc.text(`: Rp ${formattedBudget}`, margin + 25, yHeader);
        } else {
            doc.setFont("helvetica", "normal");
            doc.text("Pengadaan", margin, yHeader); doc.text(`: ${data.nama_kegiatan || "-"}`, margin + 25, yHeader);
            yHeader += 6;
            doc.text("Anggaran", margin, yHeader); doc.text(`: Rp ${formattedBudget}`, margin + 25, yHeader);
        }
        
        yHeader += 4;
        doc.setLineWidth(0.1);
        doc.line(margin, yHeader, pageWidth - margin, yHeader);
        return yHeader + 6;
    }

    const photoCategories = isFisik 
      ? [
          { label: "KONDISI 0%", urls: data.physicalPhotos?.p0 || [] }, 
          { label: "KONDISI 50%", urls: data.physicalPhotos?.p50 || [] }, 
          { label: "KONDISI 100%", urls: data.physicalPhotos?.p100 || [] }
        ]
      : [
          { label: "FOTO BUKTI 1", urls: data.nonPhysicalPhotos?.f1 || [] },
          { label: "FOTO BUKTI 2", urls: data.nonPhysicalPhotos?.f2 || [] }
        ];

    for (let i = 0; i < photoCategories.length; i++) {
        const cat = photoCategories[i];
        if (i > 0) doc.addPage();
        
        let y = addPhotoPageHeader(cat.label);
        
        if (cat.urls && cat.urls.length > 0) {
            for (const url of cat.urls) {
                const img = await loadImage(url);
                if (img) {
                    const imgProps = doc.getImageProperties(url);
                    const imgW = contentWidth;
                    const imgH = (imgProps.height * imgW) / imgProps.width;
                    
                    if (y + imgH > pageHeight - 20) { 
                        doc.addPage(); 
                        y = addPhotoPageHeader(cat.label); // Judul tetap sama tanpa (Lanjutan)
                    }
                    
                    doc.addImage(img, 'JPEG', margin, y, imgW, imgH);
                    y += imgH + 10;
                }
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
    doc.text(openingText, margin, openingY, { align: "justify", maxWidth: contentWidth });
    const splitOpening = doc.splitTextToSize(openingText, contentWidth);
    let y = openingY + (splitOpening.length * 5.5) + 6;
    const labelX = margin + 8;
    const dotX = margin + 35;
    const valX = margin + 38;
    doc.text("I", margin, y);
    doc.text("Nama", labelX, y); doc.text(":", dotX, y); doc.setFont("helvetica", "bold"); doc.text((data.nama_kasi || "-").toUpperCase(), valX, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Jabatan", labelX, y); doc.text(":", dotX, y); doc.text(`Pelaksana Kegiatan Anggaran (${data.jabatan_kasi || "-"})`, valX, y); y += 6;
    doc.text("Alamat", labelX, y); doc.text(":", dotX, y); 
    const alamat1 = `Desa Rungkang Kecamatan Gandrungmangu yang selanjutnya disebut PIHAK KESATU`;
    const splitAl1 = doc.splitTextToSize(alamat1, contentWidth - 40);
    doc.text(splitAl1, valX, y); y += (splitAl1.length * 5) + 4;
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
    const colW = [12, 105, 30, 33];
    const headers = ["NO", "NAMA KEGIATAN", "VOLUME", "TTD"];
    let hX = margin;
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => { doc.rect(hX, y, colW[i], 10); doc.text(h, hX + colW[i]/2, y + 6.5, { align: "center" }); hX += colW[i]; });
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

  else if (type === 'spj_ba_hps') {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BERITA ACARA PENETAPAN HARGA PERKIRAAN SENDIRI (HPS)", pageWidth / 2, 54, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let y = 62;
    const bodyText = `Bahwa dalam pelaksanaan pembangunan Desa Rungkang Kecamatan Gandrungmangu Kabupaten Cilacap Provinsi Jawa Tengah, maka pada :`;
    const bLines = doc.splitTextToSize(bodyText, contentWidth);
    doc.text(bLines, margin, y, { align: "justify", maxWidth: contentWidth });
    y += (bLines.length * 4.5) + 3;

    const dHps = data.ba_hps_date ? new Date(data.ba_hps_date) : new Date();
    const lX = margin + 5;
    const vX = margin + 35;
    doc.text("Hari/Tanggal", lX, y); doc.text(`: ${format(dHps, "EEEE, d MMMM yyyy", { locale: localeID })}`, vX, y); y += 5;
    doc.text("Tempat", lX, y); doc.text(`: ${data.ba_hps_location || "-"}`, vX, y); y += 5;
    doc.text("Pukul", lX, y); doc.text(`: ${data.ba_hps_time || "09:00"} WIB s.d Selesai`, vX, y); y += 6;

    const mainDesc = `Telah dilaksanakan musyawarah dalam rangka penetapan HPS untuk kegiatan ${data.namaKegiatan || "-"} yang dihadiri oleh unsur Pemerintah Desa, BPD, Lembaga desa Lainnya dengan daftar hadir sebagaimana terlampir.`;
    const mLines = doc.splitTextToSize(mainDesc, contentWidth);
    doc.text(mLines, margin, y, { align: "justify", maxWidth: contentWidth, lineHeightFactor: 1.1 });
    y += (mLines.length * 4.5) + 4;

    doc.setFont("helvetica", "bold");
    doc.text("Adapun materi atau topik adalah :", margin, y); y += 5;
    doc.setFont("helvetica", "normal");
    doc.text("1. Pembahasan hasil survey harga bahan/material/jasa", margin + 5, y); y += 4.5;
    doc.text("2. Penentuan Harga Perkiraan Sendiri sesuai hasil survey", margin + 5, y); y += 4.5;
    doc.text("3. Penetapan HPS oleh Kaur/Kasi sebagai pelaksana kegiatan anggaran", margin + 5, y); y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Unsur pimpinan rapat dan Narasumber adalah :", margin, y); y += 5;
    doc.setFont("helvetica", "normal");
    
    const labelColW = 35;
    const numX = margin + labelColW + 2; 
    const dariX = margin + 105; 
    
    doc.text("Pimpinan Rapat", margin + 5, y); 
    doc.text(`: 1. Ketua`, numX, y); doc.text(`dari ${(data.ba_hps_leader_name || "-")}`, dariX, y); y += 4.5;
    doc.text(`: 2. Sekretaris`, numX, y); doc.text(`dari ${(data.ba_hps_secretary_name || "-")}`, dariX, y); y += 5.5;

    doc.text("Narasumber", margin + 5, y);
    doc.text(`: 1. ${(data.ba_hps_narsum1_name || "-")}`, numX, y); doc.text(`dari ${(data.ba_hps_narsum1_inst || "-")}`, dariX, y); y += 4.5;
    doc.text(`: 2. ${(data.ba_hps_narsum2_name || "-")}`, numX, y); doc.text(`dari ${(data.ba_hps_narsum2_inst || "-")}`, dariX, y); y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Setelah dilakukan pembahasan maka keputusan berdasarkan mufakat :", margin, y); y += 5;
    doc.setFont("helvetica", "normal");
    const result1 = `1. Hasil survey yang dipakai untuk HPS adalah dari penyedia ${data.selected_shop_hps || "-"}`;
    doc.text(doc.splitTextToSize(result1, contentWidth - 5), margin + 5, y); y += 5;
    doc.text("2. HPS di ambil dari harga survey terendah dengan kualitas sama", margin + 5, y); y += 5;
    const result3 = "3. Selanjutnya HPS akan ditetapkan oleh Kaur/Kasi yang selanjutnya sebagai acuan penyusunan RAB sebelum kegiatan pengadaan Barang/Jasa dilakukan";
    const r3Lines = doc.splitTextToSize(result3, contentWidth - 5);
    doc.text(r3Lines, margin + 5, y, { align: "justify", maxWidth: contentWidth - 10, lineHeightFactor: 1.1 }); y += (r3Lines.length * 4.5) + 6;

    doc.text("Demikian berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.", margin, y);
    y += 10;

    const sigX1 = margin + 35;
    const sigX2 = pageWidth - margin - 35;
    doc.text("Pemimpin Musyawarah,", sigX1, y, { align: "center" });
    doc.text("Notulensi,", sigX2, y, { align: "center" });
    
    y += 18;
    doc.setFont("helvetica", "bold");
    const leaderName = (data.ba_hps_leader_name || "-----------").toUpperCase();
    const secName = (data.nama_kasi || "-----------").toUpperCase();
    doc.text(leaderName, sigX1, y, { align: "center" });
    doc.text(secName, sigX2, y, { align: "center" });
    doc.line(sigX1 - doc.getTextWidth(leaderName)/2, y+0.5, sigX1 + doc.getTextWidth(leaderName)/2, y+0.5);
    doc.line(sigX2 - doc.getTextWidth(secName)/2, y+0.5, sigX2 + doc.getTextWidth(secName)/2, y+0.5);

    y += 6;
    doc.text("Mengetahui,", pageWidth / 2, y, { align: "center" }); y += 4;
    doc.text("Kepala Desa Rungkang", pageWidth / 2, y, { align: "center" }); y += 18;
    doc.text("SUSANTO", pageWidth / 2, y, { align: "center" });
    doc.line(pageWidth/2 - 25, y+0.5, pageWidth/2 + 25, y+0.5);

    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    let y2 = 60;
    doc.setFont("helvetica", "bold");
    doc.text("DAFTAR HADIR PESERTA MUSYAWARAH", pageWidth / 2, y2, { align: "center" }); y2 += 8;
    
    const colW = [12, 60, 60, 38];
    const tableHeaders = ["NO", "NAMA", "ALAMAT", "TANDA TANGAN"];
    let hX = margin;
    doc.setFontSize(9);
    tableHeaders.forEach((h, i) => {
        doc.rect(hX, y2, colW[i], 10);
        doc.text(h, hX + colW[i]/2, y2 + 6.5, { align: "center" });
        hX += colW[i];
    });
    y2 += 10;
    doc.setFont("helvetica", "normal");
    for (let i = 1; i <= 15; i++) {
        let rX = margin;
        if (y2 + 12 > pageHeight - 20) { doc.addPage(); y2 = 20; }
        doc.rect(rX, y2, colW[0], 12); doc.text(i.toString(), rX + colW[0]/2, y2 + 7.5, { align: "center" }); rX += colW[0];
        doc.rect(rX, y2, colW[1], 12); rX += colW[1]; 
        doc.rect(rX, y2, colW[2], 12); rX += colW[2]; 
        doc.rect(rX, y2, colW[3], 12); 
        
        doc.setFontSize(8);
        const signX = (i % 2 !== 0) ? rX + 2 : rX + (colW[3] / 2);
        doc.text(`${i}. .........`, signX, y2 + 7.5);
        doc.setFontSize(9);
        y2 += 12;
    }
  }

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

  return doc.output("blob");
};
