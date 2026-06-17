/**
 * @fileOverview Daftar kredensial internal untuk Portal Absensi.
 * Hanya menyertakan admin sistem utama. Personel lain dikelola via Firestore.
 */

export const INTERNAL_USERS = [
  { 
    username: "adminrungkang", 
    email: "admin@rungkang.id", 
    password: "admin00", 
    role: "admin_absensi", 
    nama: "ADMINISTRATOR ABSENSI" 
  }
];
