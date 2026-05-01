
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { addKopSuratSync, loadImage } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

interface Participant {
    name: string;
    jabatan: string;
    category: string;
}

interface PDFData {
    kegiatan: string;
    tanggal: string;
    participants: Participant[];
    nominal?: string;
    tax?: string;
}

export const generateDaftarHadirPDF = async (values: PDFData, logoBase64?: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    const d = values.tanggal ? new Date(values.tanggal) : new Date();

    const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
    const logoImg = await loadImage(logoSource);

    addKopSuratSync(doc, logoImg, margin, pageWidth);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DAFTAR HADIR", pageWidth / 2, 50, { align: "center" });

    let currentY = 62;
    doc.setFontSize(11);

    const addHeaderDetail = (label: string, text: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, currentY);
        doc.text(":", margin + 35, currentY);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text || "-", contentWidth - 38);
        doc.text(lines, margin + 38, currentY);
        currentY += (lines.length * 6) + 1;
    }

    addHeaderDetail("Kegiatan", values.kegiatan);
    addHeaderDetail("Hari / Tanggal", format(d, "EEEE, d MMMM yyyy", { locale: localeID }));
    addHeaderDetail("Waktu", "09:00 WIB - Selesai");
    addHeaderDetail("Tempat", "Balai Desa Rungkang");

    currentY += 8;
    const colW = [12, 75, 55, 38];
    const baseRowHeight = 12;
    const tableHeaders = ["NO", "NAMA", "JABATAN", "TTD"];

    const drawTableHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        let hX = margin;
        tableHeaders.forEach((header, i) => {
            doc.rect(hX, currentY, colW[i], 12);
            doc.text(header, hX + colW[i] / 2, currentY + 8, { align: "center" });
            hX += colW[i];
        });
        currentY += 12;
    };

    drawTableHeader();

    for (let i = 0; i < values.participants.length; i++) {
        const p = values.participants[i];
        
        const nameLines = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
        const positionLines = doc.splitTextToSize((p.jabatan || "").toUpperCase(), colW[2] - 4);
        const lineCount = Math.max(nameLines.length, positionLines.length, 1);
        const rowHeight = Math.max(baseRowHeight, (lineCount * 5) + 2);

        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            addKopSuratSync(doc, logoImg, margin, pageWidth);
            currentY = 40;
            drawTableHeader();
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

        doc.text(positionLines, cX + 2, textY, { maxWidth: colW[2] - 4, baseline: "middle" });
        cX += colW[2];

        const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[3] / 2);
        doc.setFontSize(8);
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

export const generateUangSakuPDF = async (values: PDFData, logoBase64?: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const d = values.tanggal ? new Date(values.tanggal) : new Date();

    const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
    const logoImg = await loadImage(logoSource);

    const nom = parseInt(values.nominal || "0") || 100000;
    const taxPercent = parseInt(values.tax || "0") || 0;
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
            doc.text(h, hX + colW[i] / 2, currentY + 6.5, { align: "center" });
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
    addHeaderRow("Kegiatan", values.kegiatan);
    addHeaderRow("Hari / Tanggal", format(d, "EEEE, d MMMM yyyy", { locale: localeID }));
    addHeaderRow("Tempat", "Balai Desa Rungkang");
    currentY += 4;

    drawTableHeader();

    for (let i = 0; i < values.participants.length; i++) {
        const p = values.participants[i];
        
        const nameLines = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
        const positionLines = doc.splitTextToSize((p.jabatan || "").toUpperCase(), colW[2] - 4);
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
        doc.text((i + 1).toString(), cX + colW[0] / 2, textY, { align: "center", baseline: "middle" });
        cX += colW[0];

        doc.setFontSize(8);
        doc.text(nameLines, cX + 2, textY, { maxWidth: colW[1] - 4, baseline: "middle" });
        cX += colW[1];
        doc.text(positionLines, cX + 2, textY, { maxWidth: colW[2] - 4, baseline: "middle" });
        cX += colW[2];

        doc.setFontSize(9);
        if (p.name) {
            doc.text(nom.toLocaleString('id-ID'), cX + colW[3] - 2, textY, { align: "right", baseline: "middle" });
            doc.text(taxVal.toLocaleString('id-ID'), cX + colW[3] + colW[4] - 2, textY, { align: "right", baseline: "middle" });
            doc.text(netVal.toLocaleString('id-ID'), cX + colW[3] + colW[4] + colW[5] - 2, textY, { align: "right", baseline: "middle" });
        }
        cX += colW[3] + colW[4] + colW[5];

        const signX = (i % 2 === 0) ? cX + 3 : cX + (colW[6] / 2);
        doc.setFontSize(7);
        doc.text(`${i + 1}. .......`, signX, textY, { baseline: "middle" });
        
        currentY += rowHeight;
    }

    if (currentY > pageHeight - 60) {
        doc.addPage();
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        currentY = 40;
    }

    currentY += 20;
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
