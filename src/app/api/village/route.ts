/**
 * API Route ini dikosongkan karena aplikasi telah beralih ke 
 * arsitektur Static Export untuk Firebase Hosting.
 * Seluruh komunikasi kini dilakukan langsung dari Client ke Apps Script.
 */
export async function POST() {
  return new Response(JSON.stringify({ error: "Gunakan pemanggilan langsung ke Apps Script di sisi Client." }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
}
