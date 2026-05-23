import { NextResponse } from 'next/server';

function isValidCbuOrAlias(input: string): boolean {
  const clean = input.trim();
  const isCbu = /^\d{22}$/.test(clean);
  const isAlias = /^[a-zA-Z0-9.]{6,20}$/.test(clean);
  return isCbu || isAlias;
}

export async function POST(request: Request) {
  try {
    const { amountArs, cbu, invoiceId } = await request.json();

    if (!amountArs || !cbu) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: amountArs o cbu' }, { status: 400 });
    }

    const numericAmount = Number(amountArs);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 10000000) {
      return NextResponse.json({ error: 'Monto inválido. Debe ser un número positivo razonable menor a 10 millones.' }, { status: 400 });
    }

    if (typeof cbu !== 'string' || !isValidCbuOrAlias(cbu)) {
      return NextResponse.json({ error: 'CBU o Alias inválido. Debe tener 22 dígitos o ser un alias alfanumérico de 6 a 20 caracteres.' }, { status: 400 });
    }

    const API_KEY = process.env.WAPU_API_KEY;
    const API_URL = process.env.NEXT_PUBLIC_WAPU_API_URL || 'https://be-stage.wapu.app';

    const isProduction = process.env.NODE_ENV === 'production' || API_URL.includes('be-prod.wapu.app');

    if (!API_KEY) {
      if (isProduction) {
        console.error("CRITICAL SECURITY ALERT: Attempted to run mock transfer in production environment!");
        return NextResponse.json({ error: 'Error de servidor: API Key no configurada en entorno de producción.' }, { status: 500 });
      }

      console.warn("WAPU_API_KEY no detectada. Retornando éxito simulado.");
      return NextResponse.json({ success: true, transferId: 'mock_tx_' + Date.now() });
    }

    // Llamar a /transactions/create con type 'fast_fiat_transfer'
    // El endpoint espera multipart/form-data
    const formData = new FormData();
    formData.append('type', 'fast_fiat_transfer');
    formData.append('payment_amount', String(amountArs));
    formData.append('currency_taken', 'USDT');
    formData.append('alias', cbu);

    const transferRes = await fetch(`${API_URL}/transactions/create`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY
      },
      body: formData
    });

    if (!transferRes.ok) {
      const err = await transferRes.text();
      console.error("Error from Wapu fiat transfer:", err);
      throw new Error("El sistema bancario rechazó la transacción (WapuPay Error)");
    }

    const transferData = await transferRes.json();

    return NextResponse.json({
      success: true,
      transferId: transferData.transaction_id || transferData.id
    });

  } catch (error: any) {
    console.error('Fiat transfer failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
