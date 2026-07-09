
'use server';
/**
 * @fileOverview Asisten AI untuk membantu menyusun draf notulen kegiatan desa.
 *
 * - generateNotulen - Fungsi utama untuk membuat narasi notulensi.
 * - GenerateNotulenInput - Skema input (judul, lokasi, tanggal).
 * - GenerateNotulenOutput - Skema output (teks notulen).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNotulenInputSchema = z.object({
  title: z.string().describe('Judul atau nama kegiatan'),
  location: z.string().describe('Lokasi pelaksanaan kegiatan'),
  date: z.string().describe('Tanggal pelaksanaan kegiatan'),
});
export type GenerateNotulenInput = z.infer<typeof GenerateNotulenInputSchema>;

const GenerateNotulenOutputSchema = z.object({
  notulen: z.string().describe('Teks narasi notulen hasil generate AI'),
});
export type GenerateNotulenOutput = z.infer<typeof GenerateNotulenOutputSchema>;

/**
 * Fungsi pembungkus untuk memanggil flow AI dari sisi client.
 */
export async function generateNotulen(input: GenerateNotulenInput): Promise<GenerateNotulenOutput> {
  return generateNotulenFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNotulenPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateNotulenInputSchema},
  output: {schema: GenerateNotulenOutputSchema},
  prompt: `Anda adalah asisten administrasi profesional untuk Pemerintah Desa Rungkang. 
Tugas Anda adalah menyusun draf notulen formal berdasarkan data kegiatan berikut:

Judul Kegiatan: {{{title}}}
Lokasi: {{{location}}}
Tanggal: {{{date}}}

Instruksi Penulisan:
1. Buatlah draf notulen dalam 3 paragraf narasi.
2. Gunakan Bahasa Indonesia yang sangat formal, baku, dan sesuai dengan standar korespondensi pemerintahan desa (profesional).
3. Jangan sertakan judul, kop surat, nomor surat, atau informasi metadata lainnya. 
4. Langsung berikan isi paragraf notulensinya saja.
5. Struktur Paragraf:
   - Paragraf 1: Pembukaan, penyampaian maksud, dan tujuan utama kegiatan.
   - Paragraf 2: Inti pembahasan, jalannya diskusi, atau poin-poin penting yang dikemukakan dalam pertemuan.
   - Paragraf terakhir: Kesimpulan, rencana tindak lanjut, dan penutupan kegiatan.`,
});

const generateNotulenFlow = ai.defineFlow(
  {
    name: 'generateNotulenFlow',
    inputSchema: GenerateNotulenInputSchema,
    outputSchema: GenerateNotulenOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI gagal menghasilkan draf notulen.");
    }
    return output;
  }
);
