'use server';
/**
 * @fileOverview An AI assistant to scan invitation PDFs and extract key details.
 *
 * - scanInvitation - A function that handles the scanning of invitation PDFs.
 * - ScanInvitationInput - The input type for the scanInvitation function.
 * - ScanInvitationOutput - The return type for the scanInvitation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanInvitationInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "An invitation file (likely PDF), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanInvitationInput = z.infer<typeof ScanInvitationInputSchema>;

const ScanInvitationOutputSchema = z.object({
  eventTitle: z.string().describe('The main title or purpose of the event (acara). Extract the core topic, including multi-line text if present. E.g., "Rapat Koordinasi Percepatan Pelaksanaan Agenda Strategis".'),
  eventDate: z.string().describe('The date of the event. Extract from "Hari/tanggal" and format it as YYYY-MM-DD. For "Selasa, 06 Desember 2026", the output should be "2026-12-06". If the year is not specified, assume the current year.'),
  eventTime: z.string().describe('The start time of the event from "Waktu". For "Pukul 10.00 WIB s/d selesai", the output should be "10:00".'),
  eventLocation: z.string().describe('The location or venue of the event (tempat). E.g., "Balai Desa Wringinharjo".'),
  eventNotes: z.string().optional().describe('Any additional notes or instructions from the "Catatan" field. This is optional; if not present, omit this field. E.g., "Kepala Desa dimohon untuk mengikutsertakan Sekretaris Desa dan Kepala Urusan Keuangan."'),
});
export type ScanInvitationOutput = z.infer<typeof ScanInvitationOutputSchema>;

export async function scanInvitation(input: ScanInvitationInput): Promise<ScanInvitationOutput> {
  return scanInvitationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanInvitationPrompt',
  input: {schema: ScanInvitationInputSchema},
  output: {schema: ScanInvitationOutputSchema},
  prompt: `You are an expert administrative assistant for a village in Indonesia. Your task is to analyze the provided document (an invitation letter) and extract key information about an event.

Analyze the document provided via the media URL. Extract the event's title (acara), date (tanggal), time (waktu), location (tempat), and any additional notes (catatan).

- For the date ("Hari/tanggal"), convert it to YYYY-MM-DD format. Example: "Selasa, 06 Desember 2026" becomes "2026-12-06".
- For the time ("Waktu"), extract only the start time. Example: "Pukul 10.00 WIB s/d selesai" becomes "10:00".
- For the title ("Acara"), capture the full text, even if it spans multiple lines.
- For the notes ("Catatan"), capture the full text. This field is optional.

Document for analysis: {{media url=pdfDataUri}}`,
});

const scanInvitationFlow = ai.defineFlow(
  {
    name: 'scanInvitationFlow',
    inputSchema: ScanInvitationInputSchema,
    outputSchema: ScanInvitationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
