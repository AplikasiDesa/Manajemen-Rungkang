import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Utility functions
const getFilePath = () => path.join(process.cwd(), 'src', 'lib', 'personel-data.ts');

const readOriginalFile = async () => {
    const filePath = getFilePath();
    return await fs.readFile(filePath, 'utf8');
};

const parseOfficials = (arrayString: string): any[] => {
    const entries = [];
    const entryRegex = /{\s*name:\s*(?:"(.*?)"|'(.*?)'),\s*jabatan:\s*(?:"(.*?)"|'(.*?)'),\s*category:\s*(?:"(.*?)"|'(.*?)')\s*}/g;
    let match;
    while ((match = entryRegex.exec(arrayString)) !== null) {
        entries.push({
            name: match[1] || match[2],
            jabatan: match[3] || match[4],
            category: match[5] || match[6],
        });
    }
    return entries;
};

const getOfficials = async (originalContent?: string) => {
    const content = originalContent || await readOriginalFile();
    const officialsRegex = /export const OFFICIALS\s*=\s*(\[[\s\S]*?\]);/;
    const match = content.match(officialsRegex);

    if (!match || !match[1]) {
        throw new Error('Could not find or parse `export const OFFICIALS` in personel-data.ts');
    }

    return parseOfficials(match[1]);
};

const writeOfficials = async (officialsList: any[]) => {
    const filePath = getFilePath();
    const originalContent = await readOriginalFile();

    const categoryOrder: { [key: string]: number } = { 
        "Pemerintah Desa": 1, "BPD": 2, "RT/RW": 3, "Kader": 4, "Karang Taruna": 5,
        "Linmas": 6, "Pengurus BUMDes": 7, "Pengurus KDMP": 8, "Guru Ngaji": 9,
        "Guru TK & Paud": 10, "Lainnya": 99 
    };

    officialsList.sort((a, b) => {
        const orderA = categoryOrder[a.category] || 99;
        const orderB = categoryOrder[b.category] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });

    const newOfficialsArrayString = '[\n' + officialsList.map(p => 
        `    { name: ${JSON.stringify(p.name)}, jabatan: ${JSON.stringify(p.jabatan)}, category: ${JSON.stringify(p.category)} }`
    ).join(',\n') + '\n]';

    const updatedContent = originalContent.replace(
        /export const OFFICIALS\s*=\s*\[[\s\S]*?\];/, 
        `export const OFFICIALS = ${newOfficialsArrayString};`
    );

    await fs.writeFile(filePath, updatedContent, 'utf8');
};

// Handlers for different HTTP methods

async function handlePOST(request: Request) {
    const { category, newPersonnelForCategory } = await request.json();
    if (!category || newPersonnelForCategory === undefined) {
        return new NextResponse(JSON.stringify({ message: 'Category or personnel data not found.' }), { status: 400 });
    }
    
    const newPersonnelWithCategory = newPersonnelForCategory.map((p: any) => ({ ...p, category }));

    const currentOfficials = await getOfficials();
    const otherPersonnel = currentOfficials.filter((p: any) => p.category !== category);
    const updatedOfficialsList = [...otherPersonnel, ...newPersonnelWithCategory];

    await writeOfficials(updatedOfficialsList);
    return NextResponse.json({ message: 'Personnel data updated successfully.' });
}

async function handlePUT(request: Request) {
    const { originalName, category, newName, newJabatan } = await request.json();
    if (!originalName || !category || !newName || !newJabatan) {
        return new NextResponse(JSON.stringify({ message: 'Missing required fields for updating.' }), { status: 400 });
    }

    const currentOfficials = await getOfficials();
    const officialIndex = currentOfficials.findIndex(p => p.name === originalName && p.category === category);

    if (officialIndex === -1) {
        return new NextResponse(JSON.stringify({ message: 'Official not found.' }), { status: 404 });
    }

    currentOfficials[officialIndex] = { name: newName, jabatan: newJabatan, category };

    await writeOfficials(currentOfficials);
    return NextResponse.json({ message: 'Official updated successfully.' });
}

async function handleDELETE(request: Request) {
    const { name, category } = await request.json();
    if (!name || !category) {
        return new NextResponse(JSON.stringify({ message: 'Name and category are required for deletion.' }), { status: 400 });
    }

    const currentOfficials = await getOfficials();
    const updatedOfficialsList = currentOfficials.filter(p => !(p.name === name && p.category === category));

    if (updatedOfficialsList.length === currentOfficials.length) {
         return new NextResponse(JSON.stringify({ message: 'Official not found.' }), { status: 404 });
    }

    await writeOfficials(updatedOfficialsList);
    return NextResponse.json({ message: 'Official deleted successfully.' });
}

export async function POST(request: Request) {
    try {
        return await handlePOST(request);
    } catch (error: any) {
        console.error('Failed to update personnel data:', error);
        return new NextResponse(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        return await handlePUT(request);
    } catch (error: any) {
        console.error('Failed to update official:', error);
        return new NextResponse(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        return await handleDELETE(request);
    } catch (error: any) {
        console.error('Failed to delete official:', error);
        return new NextResponse(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
    }
}
