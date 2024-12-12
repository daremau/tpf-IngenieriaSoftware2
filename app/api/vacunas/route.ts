import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const [vaccines] = await pool.query(`
            SELECT 
                IdVacuna,
                NombreVacuna,
                Descripcion,
                Fabricante,
                FechaVencimiento,
                Existencia
            FROM 
                Vacunas;
        `);

        return new NextResponse(JSON.stringify(vaccines), { status: 200 });
    } catch (error) {
        console.error('Database error:', error);
        return new NextResponse(JSON.stringify({ message: 'server error' }), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const vaccine = await request.json();
        const [result] = await pool.query(
            `INSERT INTO Vacunas (
                NombreVacuna, 
                Descripcion, 
                Fabricante, 
                FechaVencimiento, 
                Existencia
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                vaccine.name,
                vaccine.description,
                vaccine.manufacturer,
                vaccine.expirationDate,
                vaccine.stock
            ]
        );

        return new NextResponse(JSON.stringify(result), { status: 201 });
    } catch (error) {
        console.error('Database error:', error);
        return new NextResponse(JSON.stringify({ message: 'server error' }), { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse(JSON.stringify({ message: 'Missing id parameter' }), { status: 400 });
        }

        const [result] = await pool.query(
            'DELETE FROM Vacunas WHERE IdVacuna = ?',
            [id]
        );

        return new NextResponse(JSON.stringify(result), { status: 200 });
    } catch (error) {
        console.error('Database error:', error);
        return new NextResponse(JSON.stringify({ message: 'server error' }), { status: 500 });
    }
}