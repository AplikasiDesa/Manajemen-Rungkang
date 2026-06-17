/**
 * @fileOverview Utilitas komunikasi Google Apps Script untuk Sisi Client.
 * File ini dirancang khusus untuk kompatibilitas Static Export & CORS.
 */

import { GOOGLE_CONFIG } from '@/lib/google-config';

/**
 * Memanggil Google Apps Script menggunakan metode "Simple Request".
 * Kita menggunakan header 'text/plain' untuk melewati pengecekan preflight CORS 
 * yang sering menyebabkan error "Failed to fetch" di lingkungan browser ketat.
 */
export async function callAppsScript(payload: any) {
  try {
    const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        // Menggunakan text/plain agar dianggap sebagai Simple Request oleh browser (Menghindari Preflight CORS)
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Apps Script Communication Error:", error);
    
    // Memberikan pesan error yang sangat detail untuk membantu pengguna melakukan debug
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      return { 
        success: false, 
        error: "Koneksi ke Google diblokir oleh Browser (CORS). Pastikan Apps Script di-deploy dengan akses 'Anyone' (Siapa Saja) dan Anda sudah menjalankan fungsi forceGrantAllPermissions di Editor Skrip." 
      };
    }
    
    return { success: false, error: error.message || "Gagal menghubungi server Google." };
  }
}
