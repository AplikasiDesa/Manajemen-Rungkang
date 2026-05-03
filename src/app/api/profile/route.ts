import { NextResponse } from 'next/server';

/**
 * API Route ini dinonaktifkan secara permanen.
 * Seluruh sistem CRUD telah dimigrasi langsung ke Firebase Firestore di sisi Client.
 * Tidak ada operasi filesystem (EROFS safety).
 */
export async function POST() {
    return new NextResponse(JSON.stringify({ 
        message: 'Endpoint ini tidak lagi digunakan. Gunakan Firestore Client SDK.',
        status: 'deprecated'
    }), { status: 200 });
}

export async function GET() {
    return new NextResponse(JSON.stringify({ message: 'Deprecated' }), { status: 200 });
}
