
import { NextResponse } from 'next/server';

/**
 * API Route ini dinonaktifkan secara permanen.
 * Seluruh sistem CRUD telah dimigrasi langsung ke Firebase Firestore di sisi Client.
 */
export async function POST() {
    return new NextResponse(JSON.stringify({ 
        message: 'Endpoint ini tidak lagi digunakan. Gunakan Firestore Client SDK.',
        status: 'deprecated'
    }), { status: 410 });
}

export async function PUT() {
    return new NextResponse(JSON.stringify({ message: 'Deprecated' }), { status: 410 });
}

export async function DELETE() {
    return new NextResponse(JSON.stringify({ message: 'Deprecated' }), { status: 410 });
}
