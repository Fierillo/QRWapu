const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log("==================================================");
  console.log("   Generador de API Token para WapuPay");
  console.log("==================================================\n");

  const envInput = await ask("Selecciona entorno (1: Staging/Pruebas, 2: Producción/Real) [1]: ");
  const isProd = envInput.trim() === '2';
  const API_URL = isProd ? "https://be-prod.wapu.app" : "https://be-stage.wapu.app";

  console.log(`\nConectando a: ${API_URL}`);

  const email = await ask("Ingresa tu email de WapuPay: ");
  // Note: readline doesn't easily hide password input without extra complexity, 
  // but since this runs locally on the user's terminal it is safe.
  const password = await ask("Ingresa tu contraseña: ");

  if (!email || !password) {
    console.error("\nError: Email y contraseña son obligatorios.");
    rl.close();
    return;
  }

  console.log("\nIniciando sesión...");
  try {
    const loginRes = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      console.error(`\n❌ Error de inicio de sesión (${loginRes.status}):`, errText);
      rl.close();
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;

    if (!token) {
      console.error("\n❌ No se recibió un token de acceso del servidor.");
      rl.close();
      return;
    }

    console.log("Sesión iniciada con éxito. Solicitando API Token...");

    const tokenRes = await fetch(`${API_URL}/users/api-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`\n❌ Error al generar el API Token (${tokenRes.status}):`, errText);
      console.log("\n💡 Nota: Si dice que requiere 'api_enabled = true', significa que la cuenta no tiene habilitada la API y debes pedirle al equipo de WapuPay que la habilite en tu usuario.");
      rl.close();
      return;
    }

    const tokenData = await tokenRes.json();

    console.log("\n==================================================");
    console.log("   ¡TOKEN GENERADO CON ÉXITO!");
    console.log("==================================================");
    console.log(`Tu WAPU_API_KEY es:\n`);
    console.log(`\x1b[32m${tokenData.token}\x1b[0m`);
    console.log("\n==================================================");
    console.log("Copia esta clave y guardala en un lugar seguro.");
    console.log("Solo se muestra una vez.");

  } catch (err) {
    console.error("\n❌ Error inesperado de red:", err.message);
  } finally {
    rl.close();
  }
}

main();
