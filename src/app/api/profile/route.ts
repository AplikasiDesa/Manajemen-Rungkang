/**
 * API Route ini dinonaktifkan sepenuhnya.
 * Seluruh sistem manajemen data telah beralih ke Firestore Client SDK 
 * untuk menghindari batasan Read-Only File System di Vercel.
 */
export async function POST() {
  return new Response(JSON.stringify({ error: "Gunakan Firestore Client SDK secara langsung." }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}