'use server';

import { aiDraftServiceResponse, type AIDraftServiceResponseInput } from '@/ai/flows/ai-draft-service-response';
import { scanInvitation, type ScanInvitationInput } from '@/ai/flows/scan-invitation-flow';


export async function generateDraftResponse(input: AIDraftServiceResponseInput) {
  try {
    const output = await aiDraftServiceResponse(input);
    return output;
  } catch (error) {
    console.error('Error generating AI draft response:', error);
    return { draftResponse: 'Maaf, terjadi kesalahan saat membuat draf respons. Silakan coba lagi.' };
  }
}

export async function performInvitationScan(input: ScanInvitationInput) {
    try {
        const result = await scanInvitation(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error scanning invitation:", error);
        return { success: false, error: error.message || "Gagal memindai PDF. Pastikan file tidak rusak." };
    }
}
