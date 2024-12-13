import { NextRequest } from 'next/server'
import pool from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const [detalles] = await pool.query(
      `SELECT df.*, p.PrecioCompra, p.NombreProducto 
       FROM detallefactura df
       JOIN factura f ON df.id_factura = f.id
       JOIN productos p ON df.id_producto = p.IdProducto 
       WHERE f.fecha BETWEEN ? AND ?
       AND df.id_producto IS NOT NULL`,
      [startDate, endDate]
    )

    return new Response(JSON.stringify(detalles), { status: 200 })
  } catch (error) {
    console.error('Database error:', error)
    return new Response(
      JSON.stringify({ message: 'Error al obtener detalles' }), 
      { status: 500 }
    )
  }
}