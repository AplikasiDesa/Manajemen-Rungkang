
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

export const runtime = 'nodejs';

/**
 * Sanitasi data Firestore secara mendalam (Deep Recursive).
 * Menangani format mata uang, casing teks, dan tanggal khusus.
 */
function sanitize(data: any): any {
  if (data === null || data === undefined) return "";
  
  if (Array.isArray(data)) {
    return data.map(v => sanitize(v));
  }

  if (typeof data === 'object') {
    // Deteksi Firebase Timestamp
    if (data.seconds !== undefined) {
      return format(new Date(data.seconds * 1000), "d MMMM yyyy", { locale: localeID });
    }

    const obj: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        let val = data[key];
        
        // 1. FORMAT MATA UANG (Rp. X.XXX.XXX,00)
        // Diterapkan pada field nominal_cv1, nominal_cv2, nominal_cvpemenang
        if (key.startsWith('nominal_cv') && !key.toLowerCase().includes('terbilang')) {
            const num = Number(val);
            if (!isNaN(num) && val !== "" && val !== null && val !== undefined) {
                obj[key] = `Rp. ${new Intl.NumberFormat('id-ID').format(num)},00`;
                continue;
            }
        }

        // 2. FORMAT TEKS (UPPERCASE & PROPER CASE)
        if (key.includes('nama_cv') || key.includes('nama_pemilik')) {
            obj[key] = String(val || "").toUpperCase();
            continue;
        }

        if (key === 'jabatan_kasi') {
            const str = String(val || "");
            obj[key] = str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            continue;
        }
        
        // 3. FORMAT TANGGAL
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const dateObj = new Date(val);
            
            // Format Khusus Laporan Pajak
            if (key.includes('pajak')) {
                obj[key] = format(dateObj, "d MMMM 'Tahun' yyyy", { locale: localeID });
            }
            // Format Hari Lengkap
            else if (key.includes('pengumuman') || key.includes('pendaftaran') || key.includes('pemasukan') || key.includes('evaluasi') || key.includes('Penetapan') || key.includes('ba_pembahasan')) {
                obj[key] = format(dateObj, "EEEE, d MMMM yyyy", { locale: localeID });
            }
            // Format Standar (28 Mei 2026)
            else {
                obj[key] = format(dateObj, "d MMMM yyyy", { locale: localeID });
            }
        }
        else {
            obj[key] = sanitize(val);
        }
      }
    }
    return obj;
  }

  if (typeof data === 'number') {
    return data.toLocaleString('id-ID');
  }

  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data: rawData, type: docType } = body;

    if (!rawData || !docType) {
      return NextResponse.json({ error: "Data atau Tipe Dokumen tidak lengkap" }, { status: 400 });
    }

    let templateFileName = docType.endsWith('.docx') ? docType : `${docType}.docx`;
    if (docType === 'pbj_sistem') templateFileName = 'PBJ SISTEM.docx';

    const templatePath = path.join(process.cwd(), 'public', 'templates', templateFileName);

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: `File template "${templateFileName}" tidak ditemukan.` }, { status: 404 });
    }

    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter() { return ""; }
    });

    const renderData = sanitize(rawData);
    renderData.tanggal_cetak_sekarang = format(new Date(), "d MMMM yyyy", { locale: localeID });

    try {
      doc.render(renderData);
    } catch (error: any) {
      console.error("[API-DOCX] Render Failure:", error);
      const errors = error.properties?.errors;
      if (errors && Array.isArray(errors)) {
        const detail = errors.map(e => `${e.message} (Tag: ${e.properties?.explanation || 'unknown'})`).join(" | ");
        return NextResponse.json({ error: `Kesalahan pada Template Word: ${detail}` }, { status: 500 });
      }
      return NextResponse.json({ error: `Kesalahan Sistem: ${error.message}` }, { status: 500 });
    }

    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(templateFileName)}"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: `Sistem Error: ${error.message}` }, { status: 500 });
  }
}
