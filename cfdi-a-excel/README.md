# CFDI a Excel (MVP)

Micro-SaaS para convertir facturas XML del SAT (CFDI 3.3 y 4.0) a un Excel (.xlsx) limpio.
Todo el procesamiento ocurre **en el navegador**: los XML nunca se suben a un servidor.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · `fast-xml-parser` · SheetJS (`xlsx` 0.20.3 desde cdn.sheetjs.com) · `lucide-react`

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

En `samples/` hay XML de prueba: ingreso 4.0 con retenciones, egreso 3.3, nómina 4.0, un XML roto y uno que no es CFDI.

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `src/lib/cfdi.ts` | Valida y parsea el CFDI; extrae las 19 columnas. IVA/retenciones del nodo `cfdi:Impuestos` (o suma por concepto si no existe); ISR de nómina desde `nomina12:Deducciones` (tipo 002). |
| `src/lib/columns.ts` | Definición única de columnas (tabla y Excel), totales y formatos. |
| `src/lib/excel.ts` | Genera el .xlsx: montos como números con formato moneda, fecha como fecha real de Excel, fila TOTALES con `SUM()`, autofiltro y hoja "Archivos con error". |
| `src/lib/files.ts` | Recolecta .xml de un drop (incluye carpetas y subcarpetas) o de un `<input>`. |
| `src/lib/freeTrial.ts` | Límite gratuito de 15 archivos guardado en `localStorage` (clave `cfdi-a-excel:archivos-usados`). |
| `src/components/*` | Dropzone, tabla con búsqueda/orden, modal de suscripción, lógica principal (`Converter`). |

## Reglas del límite gratuito

- Solo consumen la prueba los CFDI **válidos y no duplicados** (mismo UUID). Los XML con error no cuentan.
- Si un lote excede lo disponible, se procesan los que caben y el modal indica cuántos quedaron fuera.
- Para reiniciar la prueba en desarrollo: `localStorage.removeItem("cfdi-a-excel:archivos-usados")`.

## Pendiente (siguientes pasos)

- Conectar "Suscribirme ahora" a Stripe Checkout y mover el control de uso al servidor (localStorage es fácil de borrar).
- CFDI en moneda extranjera: hoy se muestra un aviso y no se convierte a MXN.
- Complemento de pagos (`pago20`): los tipo P muestran montos en 0 porque el CFDI de pago no lleva importes en el comprobante.
