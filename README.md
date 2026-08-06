# QRWapu: Terminal POS Lightning de Alta Eficiencia 🛒⚡

**Plataforma B2B para la adopción circular de Bitcoin en comercios físicos.**

QRWapu es una Progressive Web App (PWA) de arquitectura orientada a eventos que permite a artesanos, cafeterías y pequeños comercios procesar pagos a través de Lightning Network y liquidarlos automáticamente a moneda local en tiempo real, operando sobre la infraestructura de la API de **WapuPay**.

---

## 🚀 Estado del Proyecto: ¡PRODUCCIÓN REAL! 🟢

El proyecto se encuentra **completamente operativo en producción**. Ha sido probado y validado con éxito utilizando fondos reales de Lightning Network y liquidaciones inmediatas hacia cuentas bancarias argentinas (CBU/Alias) en pesos (ARS).

* **URL de Producción:** `https://qr-wapu.vercel.app/`
* **Integración API Prod:** `https://be-prod.wapu.app/`

---

## 🔒 Auditoría y Arquitectura de Seguridad

Como parte del pase a producción, se realizó una auditoría exhaustiva del código del backend middleware, implementando las siguientes medidas de mitigación y seguridad:

### 1. Prevención de Bypass de Simulación (Falla Crítica de Configuración)
En entornos locales de desarrollo, el sistema simula facturas y transferencias si la clave de API no está configurada. Para evitar que un error de despliegue en producción deje la aplicación operando en modo simulador (lo que permitiría robos a comercios), el código del backend ahora detecta el entorno:
* Si la app apunta al backend de producción (`be-prod.wapu.app`) o se ejecuta en `process.env.NODE_ENV === 'production'`, el middleware **bloquea por completo cualquier simulación**.
* Si la clave `WAPU_API_KEY` falta o no está configurada, el sistema aborta de inmediato con un error de servidor `HTTP 500` en lugar de retornar mocks exitosos.

### 2. Sanitización y Validación Estricta de Entradas (Inputs)
Para proteger los endpoints internos y evitar inyecciones en APIs de terceros, se agregaron validaciones rigurosas en el servidor:
* **Monto (ARS):** Se valida que sea un número finito, mayor a cero y menor a un tope máximo seguro ($10,000,000 ARS).
* **CBU / Alias:** Se sanitiza y valida usando expresiones regulares. Únicamente se aceptan formatos legítimos:
  - CBU bancario estándar de 22 dígitos numéricos (`/^\d{22}$/`).
  - Alias de CBU de entre 6 y 20 caracteres alfanuméricos y puntos (`/^[a-zA-Z0-9.]{6,20}$/`).
* **ID de Factura (Status):** El parámetro del endpoint de consulta `/api/status` se valida de manera estricta permitiendo únicamente caracteres alfanuméricos y guiones (`/^[a-zA-Z0-9_\-]+$/`), previniendo vulnerabilidades de inyección o Path Traversal.

### 3. Seguridad de Credenciales
* **Server-Side Rendering (SSR) & API Routes:** La clave privada `WAPU_API_KEY` se procesa y consume **únicamente en el lado del servidor** (en las rutas `/api/*`).
* **Sin Exposición en Frontend:** Al no utilizar el prefijo `NEXT_PUBLIC_` para la clave de la API, Next.js garantiza que el token de producción jamás se envíe en los bundles de JavaScript al navegador del cliente.

---

## 🛠️ Despliegue Local y Entorno Operativo

### Prerrequisitos
* Node.js (v20.9+)
* pnpm 10.28.2
* Una cuenta en WapuPay y una API Key activa.

### Configuración
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/CapScabio/QRWapu.git
   cd QRWapu
   ```

2. Instalar dependencias del sistema:
   ```bash
   pnpm install
   ```

3. Variables de entorno (`.env.local`):
   ```env
   # Usar https://be-stage.wapu.app para pruebas o https://be-prod.wapu.app para producción
   NEXT_PUBLIC_WAPU_API_URL=https://be-prod.wapu.app
   WAPU_API_KEY=tu_api_key_segura_de_wapu
   ```

4. Ejecutar Suite de Tests (Vitest):
   ```bash
   pnpm test
   ```

5. Levantar Entorno de Desarrollo Local:
   ```bash
   pnpm dev
   ```

### Producción (Vercel / Cloud)
Para desplegar la aplicación, asegúrate de configurar las variables de entorno en el panel de control de tu proveedor y luego compilar:
```bash
pnpm build
pnpm start
```

---

## 📜 Flujo de Estados de Pago (State Machine)

El ciclo de vida de un pago presencial está diseñado para manejar pérdida de conexión y latencia:

1. **`IDLE`**: El POS está inactivo esperando que el usuario (cliente) inicie un flujo.
2. **`CALCULATING_RATES`**: El usuario ingresa el monto en ARS. QRWapu consulta asincrónicamente el endpoint `/transactions/tentative-amount` de WapuPay para fijar la tasa de cambio USDT/ARS (Sats).
3. **`GENERATING_INVOICE`**: Se ejecuta `/wallet/deposit_lightning` generando un QR estandarizado `lightning:lnbc...`.
4. **`PENDING_PAYMENT`**: Sistema en polling (con backoff exponencial) contra `/transactions/{id}` esperando confirmación de la red Lightning.
   - *Edge Case (Timeout)*: Si pasan > 5 minutos, la factura caduca. Estado pasa a `EXPIRED`.
   - *Edge Case (Network Loss)*: Si el dispositivo pierde red, el Service Worker de la PWA guarda la sesión. Al recuperar red, se retoma el polling.
5. **`SETTLEMENT_PROCESSING`**: El pago en Sats es confirmado. Automáticamente se dispara el evento `/transactions/create` (tipo `fast_fiat_transfer`) indicando el CBU/Alias del comerciante.
6. **`COMPLETED`**: Fondos depositados en el CBU del comerciante. Pantalla verde mostrada al cliente.

---

## 📖 Documentación de Edge Cases

* **Depreciación del tipo de cambio:** El `tentative-amount` de WapuPay garantiza una ventana de tiempo. Si la factura se paga fuera del tiempo de cotización esperada, la API retorna advertencias de volatilidad que QRWapu intercepta para notificar al comerciante en el dashboard si hay un desfase.
* **Fallas de Liquidación Bancaria (CBU Rechazado):** Si el paso 5 (`SETTLEMENT_PROCESSING`) falla debido a que el CBU ingresado por el comercio está bloqueado, el saldo queda seguro como USDT/Sats en la cuenta liquidadora principal de WapuPay de la plataforma, disparando una alerta a operaciones para reintento manual.

---

Creado por el **Capitan del Escabio** 🏴‍☠️🍻
