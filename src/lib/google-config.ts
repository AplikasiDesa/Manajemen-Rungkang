/**
 * @fileOverview Konfigurasi terpusat untuk integrasi layanan Google.
 * Simpan semua variabel konfigurasi di sini untuk memudahkan pengelolaan.
 */

interface GoogleConfig {
  /**
   * URL hasil deploy Google Apps Script yang berfungsi sebagai backend.
   * Ganti URL ini setiap kali Anda melakukan deploy ulang skrip.
   */
  appsScriptUrl: string;

  /**
   * ID Kalender Google yang akan digunakan untuk manajemen agenda.
   * Pastikan ID ini benar dan aplikasi memiliki akses ke kalender ini.
   */
  calendarId: string;

  /**
   * ID folder "parent" di Google Drive tempat laporan-laporan baru akan disimpan.
   * Pastikan ID ini valid dan folder tersebut ada.
   */
  parentFolderId: string;
}

export const GOOGLE_CONFIG: GoogleConfig = {
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzx0UEr9bw-5JkqceyXASw23B6A-3c5WbVbkjgxZo3jN9R9x5U-rrf0Y3uSGH2mtkpIlw/exec",
  calendarId: "desarungkang014@gmail.com",
  parentFolderId: "1-yZW2Z7V5J2j2aVp9p4aJ3R8Q9J4v8tU", // Contoh ID, ganti jika perlu
};