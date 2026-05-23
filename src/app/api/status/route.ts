import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('invoiceId');

  if (!invoiceId || typeof invoiceId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(invoiceId)) {
    return NextResponse.json({ error: 'ID de factura inválido o con formato incorrecto.' }, { status: 400 });
  }

  const API_KEY = process.env.WAPU_API_KEY;
  const API_URL = process.env.NEXT_PUBLIC_WAPU_API_URL || 'https://be-stage.wapu.app';

  const isProduction = process.env.NODE_ENV === 'production' || API_URL.includes('be-prod.wapu.app');

  if (!API_KEY) {
    if (isProduction) {
      console.error("CRITICAL SECURITY ALERT: Attempted to run mock status check in production environment!");
      return NextResponse.json({ error: 'Error de servidor: API Key no configurada en entorno de producción.' }, { status: 500 });
    }

    // Si no hay API Key en desarrollo, simulamos que sigue pendiente o completada
    return NextResponse.json({ status: 'Pending' });
  }

  try {
    // Asumimos que el endpoint estándar REST para ver una tx es /transactions/{id}
    const res = await fetch(`${API_URL}/transactions/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Transaction not found or error fetching status' }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json({ status: data.status }); // Ej: "Pending", "Completed"
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
