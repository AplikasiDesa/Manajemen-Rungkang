import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { addKopSuratSync, loadImage } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

export interface Participant {
    name: string;
    jabatan: string;
    category?: string;
}

export interface PDFData {
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
    addHeaderDetail("Tempat", "Balai Desa Rungkang");

    currentY += 8;
    const colW = [12, 75, 55, 38];
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
        const rowHeight = 12;

        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            addKopSuratSync(doc, logoImg, margin, pageWidth);
            currentY = 40;
            drawTableHeader();
        }

        let rX = margin;
        colW.forEach(w => { doc.rect(rX, currentY, w, rowHeight); rX += w; });
        
        doc.setFont("helvetica", "normal");
        doc.text((i + 1).toString(), margin + colW[0] / 2, currentY + 8, { align: "center" });
        doc.text((p.name || "").toUpperCase(), margin + colW[0] + 2, currentY + 8);
        doc.text((p.jabatan || "").toUpperCase(), margin + colW[0] + colW[1] + 2, currentY + 8, { maxWidth: colW[2] - 4 });
        
        currentY += rowHeight;
    }

    return doc.output("blob");
}

export const generateUangSakuPDF = async (values: PDFData, logoBase64?: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const d = values.tanggal ? new Date(values.tanggal) : new Date();

    const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
    const logoImg = await loadImage(logoSource);

    const nom = parseInt(values.nominal || "0") || 0;
    const taxVal = Math.round(nom * (parseInt(values.tax || "0") / 100));
    
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("TANDA TERIMA UANG SAKU", pageWidth / 2, 50, { align: "center" });
    
    // Simple table implementation for build safety
    let currentY = 70;
    values.participants.forEach((p, i) => {
        doc.setFontSize(10).setFont("helvetica", "normal");
        doc.text(`${i+1}. ${p.name} (${p.jabatan}) - Rp ${nom.toLocaleString()}`, margin, currentY);
        currentY += 8;
    });

    return doc.output("blob");
}
