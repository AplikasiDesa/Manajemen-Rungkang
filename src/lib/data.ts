import { PlaceHolderImages } from './placeholder-images';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
};

export type ServiceRequest = {
  id: string;
  userId: string;
  userName: string;
  requestType: 'Surat Keterangan' | 'Izin Usaha' | 'Pengaduan';
  requestDetails: string;
  status: 'Diajukan' | 'Diproses' | 'Selesai' | 'Ditolak';
  createdAt: string;
  history: { status: string; date: string; notes?: string }[];
  response?: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  imageHint: string;
  createdAt: string;
};

// Mock data has been removed and will now be fetched from Firestore.
export const users: User[] = [];

export const serviceRequests: ServiceRequest[] = [];

export const announcements: Announcement[] = [];
