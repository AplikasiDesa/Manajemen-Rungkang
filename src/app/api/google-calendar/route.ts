
/**
 * API Route ini dikosongkan karena aplikasi telah beralih ke 
 * arsitektur Static Export. Seluruh komunikasi kini dilakukan 
 * langsung dari browser ke Apps Script menggunakan teknik text/plain.
 */
export async function POST() {
  return new Response(JSON.stringify({ error: "Gunakan pemanggilan langsung ke Apps Script di sisi Client." }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
}
