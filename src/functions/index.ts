
/**
 * =================================================================================
 * KODE GOOGLE APPS SCRIPT
 * =================================================================================
 * 
 * PENTING: File ini berisi kode untuk Google Apps Script, BUKAN untuk Firebase Cloud Functions.
 * 
 * Error "aksi tidak dikenal" terjadi karena skrip yang Anda deploy di Google Apps Script
 * sudah usang dan tidak mengenali perintah baru dari aplikasi.
 * 
 * --- LANGKAH-LANGKAH PERBAIKAN ---
 * 1. Buka Proyek Google Apps Script Anda yang terhubung dengan aplikasi ini.
 * 2. Buka file `Code.gs` (atau file utama Anda).
 * 3. HAPUS SEMUA KODE yang ada di dalamnya.
 * 4. SALIN SELURUH KODE di bawah ini (mulai dari `// KONFIGURASI` sampai akhir).
 * 5. TEMPEL kode yang baru Anda salin ke editor `Code.gs` yang sudah kosong.
 * 6. Klik "Deploy" -> "New deployment".
 * 7. Pastikan "Execute as" diatur ke "Me" dan "Who has access" diatur ke "Anyone".
 * 8. Klik "Deploy". 
 * 9. Salin "Web app URL" yang baru dan pastikan sudah sesuai di file .env aplikasi Anda.
 * 
 * Setelah melakukan langkah-langkah di atas, error akan teratasi.
 * =================================================================================
 */

// =========================================
// KONFIGURASI
// =========================================
// ID Folder Undangan di Google Drive.
const UNDANGAN_FOLDER_ID = "1CbcNmav1OGDIfgZp_duEmen02ctGR4or"; 

// =========================================
// FUNGSI UTAMA (WEB APP ENDPOINT)
// =========================================
function doPost(e) {
  try {
    // Parsing body request yang dikirim dari aplikasi frontend
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // --- Aksi 1: Ambil Agenda dari Kalender ---
    if (action === 'getCalendar') {
      const { calendarId, date } = body;
      const events = getCalendarEvents(calendarId, date);
      return createJsonResponse({ success: true, items: events });
    }

    // --- Aksi 2: Buat Acara Kalender & Unggah Undangan ---
    if (action === 'createEventAndUpload') {
      const { eventData, fileData, folderId } = body;
      
      // Buat acara baru di Google Calendar
      const event = createCalendarEvent(eventData);

      // Jika ada file (undangan), unggah ke Google Drive
      let fileUrl = null;
      if (fileData && fileData.base64) {
        const file = uploadFileToDrive(fileData, folderId || UNDANGAN_FOLDER_ID);
        fileUrl = file.getUrl();
      }
      
      return createJsonResponse({
        success: true,
        eventId: event.getId(),
        fileUrl: fileUrl
      });
    }

    // --- Aksi 3: Simpan Laporan Kegiatan (Notulen, BAST, dll) ke Drive ---
    if (action === 'saveToDrive') {
      const { folderName, parentFolderId, files } = body;
      
      const parentFolder = DriveApp.getFolderById(parentFolderId);
      const newFolder = parentFolder.createFolder(folderName);
      const folderId = newFolder.getId();
      const fileUrls = {};

      for (const key in files) {
        if (files[key]) {
          if (Array.isArray(files[key]) && files[key].length > 0) {
            // Handle array of files like photos/materials
            const subFolderName = key.charAt(0).toUpperCase() + key.slice(1); // 'photos' -> 'Photos'
            const subFolder = newFolder.createFolder(subFolderName);
            fileUrls[key] = [];
            files[key].forEach(fileData => {
              if (fileData) {
                const file = uploadFileToDrive(fileData, subFolder.getId());
                fileUrls[key].push(file.getUrl());
              }
            });
          } else if (!Array.isArray(files[key])) {
            // Handle single files like notulen/undangan/bast
            const fileData = files[key];
             if (fileData && fileData.base64) {
               const file = uploadFileToDrive(fileData, folderId);
               fileUrls[key] = file.getUrl();
             }
          }
        }
      }
      
      return createJsonResponse({ success: true, folderId: folderId, fileUrls: fileUrls });
    }

    // --- Aksi 4: Tarik Nomor SPPD ---
    if (action === 'generateNumber') {
       const { destination, officialName, spreadsheetId } = body;
       const sheet = SpreadsheetApp.openById(spreadsheetId).getSheets()[0];
       const lastRow = sheet.getLastRow();
       const newNumber = lastRow; // Simple sequential number
       const docNumber = `090/${newNumber}/SPPD/${new Date().getFullYear()}`;

       sheet.appendRow([new Date(), docNumber, officialName, destination]);
       
       return createJsonResponse({ success: true, docNumber: docNumber });
    }
    
    // --- Aksi 5: Bantuan AI (Placeholder, jika ingin dipindahkan ke Apps Script) ---
     if (action === 'askAI') {
        // Implementasi Gemini bisa ditambahkan di sini jika diperlukan
        const { prompt } = body;
        // Contoh respons statis
        const textResponse = `Hasil dari AI untuk prompt: "${prompt}". \nIni adalah paragraf kedua sebagai contoh.`;
        return createJsonResponse({ success: true, text: textResponse });
    }

    // Jika aksi tidak dikenal, kirim error
    return createJsonResponse({ success: false, error: 'Aksi tidak dikenal: ' + action }, 400);

  } catch (error) {
    Logger.log(error);
    return createJsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// =========================================
// FUNGSI PEMBANTU
// =========================================

/**
 * Membuat respons JSON standar untuk Web App.
 * @param {Object} data - Objek yang akan dikirim sebagai JSON.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengambil acara dari Google Calendar pada tanggal tertentu.
 * @param {string} calendarId - ID kalender.
 * @param {string} dateString - Tanggal dalam format ISO (YYYY-MM-DD).
 * @returns {Array} - Daftar acara yang ditemukan.
 */
function getCalendarEvents(calendarId, dateString) {
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(targetDate.getDate() + 1);

  try {
    const events = CalendarApp.getCalendarById(calendarId).getEvents(targetDate, nextDay);
    return events.map(event => ({
      id: event.getId(),
      summary: event.getTitle(),
      description: event.getDescription(),
      location: event.getLocation(),
      start: event.getStartTime(),
      end: event.getEndTime(),
    }));
  } catch (e) {
    Logger.log('Gagal mengakses kalender: ' + e.toString());
    return [];
  }
}

/**
 * Membuat acara baru di Google Calendar.
 * @param {Object} eventData - Detail acara (title, start, end, dll).
 * @returns {GoogleAppsScript.Calendar.CalendarEvent} - Objek acara yang baru dibuat.
 */
function createCalendarEvent(eventData) {
  const calendar = CalendarApp.getCalendarById(eventData.calendarId);
  const event = calendar.createEvent(
    eventData.title,
    new Date(eventData.start),
    new Date(eventData.end),
    {
      description: eventData.description,
      location: eventData.location
    }
  );
  return event;
}

/**
 * Mengunggah file (dari data base64) ke Google Drive.
 * @param {Object} fileData - Detail file (name, type, base64).
 * @param {string} folderId - ID folder tujuan di Google Drive.
 * @returns {GoogleAppsScript.Drive.File} - Objek file yang baru dibuat.
 */
function uploadFileToDrive(fileData, folderId) {
  const decoded = Utilities.base64Decode(fileData.base64, Utilities.Charset.UTF_8);
  const blob = Utilities.newBlob(decoded, fileData.type, fileData.name);
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  return file;
}
