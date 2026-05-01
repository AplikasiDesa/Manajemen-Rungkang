'use server';
/**
 * @fileOverview An AI assistant to help village administrators draft initial responses to service requests.
 *
 * - aiDraftServiceResponse - A function that handles the drafting of service request responses.
 * - AIDraftServiceResponseInput - The input type for the aiDraftServiceResponse function.
 * - AIDraftServiceResponseOutput - The return type for the aiDraftServiceResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIDraftServiceResponseInputSchema = z.object({
  requestType: z.string().describe('The type of service request (e.g., surat keterangan, izin usaha, pengaduan).'),
  requestDetails: z.string().describe('Detailed information about the service request.'),
  requesterName: z.string().describe('The name of the person who submitted the service request.'),
});
export type AIDraftServiceResponseInput = z.infer<typeof AIDraftServiceResponseInputSchema>;

const AIDraftServiceResponseOutputSchema = z.object({
  draftResponse: z.string().describe('The AI-generated draft response for the service request.'),
});
export type AIDraftServiceResponseOutput = z.infer<typeof AIDraftServiceResponseOutputSchema>;

export async function aiDraftServiceResponse(input: AIDraftServiceResponseInput): Promise<AIDraftServiceResponseOutput> {
  return aiDraftServiceResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'draftServiceResponsePrompt',
  input: {schema: AIDraftServiceResponseInputSchema},
  output: {schema: AIDraftServiceResponseOutputSchema},
  prompt: `Anda adalah asisten AI yang membantu administrator desa di DesaKU. Tugas Anda adalah membuat draf respons awal untuk permintaan layanan. Respons harus sopan, informatif, dan konsisten dengan komunikasi resmi desa. Sertakan instruksi langkah selanjutnya jika perlu.

Jenis Permintaan: {{{requestType}}}
Detail Permintaan: {{{requestDetails}}}
Nama Pemohon: {{{requesterName}}}

Mohon buat draf respons awal untuk permintaan ini.`,
});

const aiDraftServiceResponseFlow = ai.defineFlow(
  {
    name: 'aiDraftServiceResponseFlow',
    inputSchema: AIDraftServiceResponseInputSchema,
    outputSchema: AIDraftServiceResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
