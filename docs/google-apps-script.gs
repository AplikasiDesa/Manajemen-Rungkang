/**
 * BACKEND GOOGLE APPS SCRIPT - DESA DIGITAL
 * Versi 3.0: Menambahkan kemampuan untuk mengambil data kalender dan memperbarui deskripsi acara (notulensi).
 * Logika Terpadu: Agenda, Arsip, Google Drive, & Google Kalender.
 */

// --- FUNGSI UTAMA UNTUK MENERIMA PERINTAH DARI APLIKASI ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'createEventAndUpload':
        result = handleCreateEventAndUpload(data);
        break;
      
      case 'uploadArchiveFile':
        result = handleArchiveUpload(data);
        break;
        
      case 'getCalendar':
        result = handleGetCalendar(data);
        break;

      case 'updateEventDescription':
        result = handleUpdateDescription(data);
        break;

      default:
        throw new Error("Aksi tidak dikenal: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('doPost Error: ' + error.toString() + "\n" + error.stack);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Apps Script Error: " + error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * FUNGSI BARU: Mengambil acara dari kalender pada tanggal tertentu.
 */
function handleGetCalendar(data) {
  const { calendarId, date } = data;
  if (!calendarId || !date) {
    throw new Error("calendarId dan tanggal diperlukan.");
  }

  try {
    const targetDate = new Date(date);
    const timeMin = targetDate.toISOString();
    const timeMax = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const response = Calendar.Events.list(calendarId, {
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return { items: response.items };
  } catch (e) {
    throw new Error('Gagal mengambil acara dari Kalender: ' + e.message);
  }
}

/**
 * FUNGSI BARU: Memperbarui deskripsi acara untuk menyimpan notulensi.
 */
function handleUpdateDescription(data) {
  const { calendarId, eventId, newContent } = data;
  if (!calendarId || !eventId || newContent === undefined) {
    throw new Error("calendarId, eventId, dan newContent diperlukan.");
  }

  try {
    // 1. Ambil event yang ada
    const event = Calendar.Events.get(calendarId, eventId);
    let description = event.description || "";

    // 2. Hapus notulensi lama jika ada
    const separator = "\n\n--- NOTULENSI ---";
    const oldNotulensiIndex = description.indexOf(separator);
    if (oldNotulensiIndex !== -1) {
      description = description.substring(0, oldNotulensiIndex);
    }

    // 3. Tambahkan notulensi baru
    const finalDescription = description.trim() + separator + "\n" + newContent.trim();

    // 4. Buat payload update
    const updatedEvent = {
      description: finalDescription
    };

    // 5. Kirim pembaruan
    const result = Calendar.Events.patch(updatedEvent, calendarId, eventId);
    
    return { message: "Deskripsi acara berhasil diperbarui.", updatedEvent: result };
  } catch (e) {
    throw new Error('Gagal memperbarui deskripsi acara: ' + e.message);
  }
}


/**
 * Menangani unggahan file arsip ke Google Drive.
 */
function handleArchiveUpload(data) {
  const { fileData, fileName, folderId } = data;

  if (!fileData || !fileData.base64 || !fileName || !folderId) {
    throw new Error("Data arsip tidak lengkap.");
  }

  try {
    const decoded = Utilities.base64Decode(fileData.base64);
    const blob = Utilities.newBlob(decoded, fileData.type, fileName);
    const targetFolder = DriveApp.getFolderById(folderId);
    const newFile = targetFolder.createFile(blob);
    
    return {
      message: "File berhasil diarsipkan.",
      fileUrl: newFile.getUrl(),
      fileId: newFile.getId()
    };
  } catch (e) {
    throw new Error('Gagal unggah arsip ke Drive: ' + e.message);
  }
}


/**
 * Membuat acara di Google Calendar & mengunggah file ke Google Drive.
 */
function handleCreateEventAndUpload(data) {
  const { eventData, fileData, folderId } = data;
  let fileUrl = null;
  let eventUrl = null;

  if (!eventData || !eventData.calendarId || !eventData.title || !folderId) {
    throw new Error("Data tidak lengkap.");
  }

  if (fileData && fileData.base64) {
    try {
      const decoded = Utilities.base64Decode(fileData.base64);
      const blob = Utilities.newBlob(decoded, fileData.type, fileData.name);
      const targetFolder = DriveApp.getFolderById(folderId);
      const newFile = targetFolder.createFile(blob);
      fileUrl = newFile.getUrl();
    } catch (e) {
      throw new Error('Gagal unggah ke Drive: ' + e.message);
    }
  }

  try {
    const finalDescription = (eventData.description || '') + (fileUrl ? `\n\n🔗 Link Undangan: ${fileUrl}` : '');

    const eventResource = {
      summary: eventData.title,
      location: eventData.location,
      description: finalDescription,
      start: { dateTime: eventData.start, timeZone: 'Asia/Jakarta' },
      end: { dateTime: eventData.end, timeZone: 'Asia/Jakarta' },
      reminders: { 'useDefault': false, 'overrides': [{'method': 'popup', 'minutes': 60}, {'method': 'email', 'minutes': 1440}] }
    };
    
    const createdEvent = Calendar.Events.insert(eventResource, eventData.calendarId);
    eventUrl = createdEvent.htmlLink;

  } catch (e) {
    throw new Error('Gagal buat acara Kalender: ' + e.message);
  }

  return { 
    message: 'Agenda berhasil disimpan.',
    eventUrl: eventUrl,
    fileUrl: fileUrl
  };
}

/**
 * FUNGSI DIAGNOSTIK: Jalankan fungsi ini secara manual untuk otorisasi.
 */
function forceGrantAllPermissions() {
  try {
    Calendar.Events.list('primary');
    DriveApp.getRootFolder();
  } catch (e) {
    console.error('Gagal saat meminta izin: ' + e.message);
  }
}
