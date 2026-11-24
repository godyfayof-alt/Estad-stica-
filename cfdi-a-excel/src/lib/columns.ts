import type { CfdiRow } from "./cfdi";

export type ColumnKey = Exclude<keyof CfdiRow, "version" | "archivo">;

export interface Column {
  key: ColumnKey;
  label: string;
  kind: "text" | "money" | "date";
  /** Ancho aproximado de la columna en Excel (caracteres). */
  width: number;
}

export const COLUMNS: Column[] = [
  { key: "fecha", label: "Fecha", kind: "date", width: 18 },
  { key: "uuid", label: "UUID (Folio Fiscal)", kind: "text", width: 38 },
  { key: "serie", label: "Serie", kind: "text", width: 8 },
  { key: "folio", label: "Folio", kind: "text", width: 10 },
  { key: "tipoComprobante", label: "TipoComprobante", kind: "text", width: 8 },
  { key: "rfcEmisor", label: "RFC Emisor", kind: "text", width: 15 },
  { key: "nombreEmisor", label: "Nombre Emisor", kind: "text", width: 32 },
  { key: "rfcReceptor", label: "RFC Receptor", kind: "text", width: 15 },
  { key: "nombreReceptor", label: "Nombre Receptor", kind: "text", width: 32 },
  { key: "metodoPago", label: "MetodoPago", kind: "text", width: 8 },
  { key: "formaPago", label: "FormaPago", kind: "text", width: 8 },
  { key: "usoCfdi", label: "UsoCFDI", kind: "text", width: 8 },
  { key: "subtotal", label: "Subtotal", kind: "money", width: 14 },
  { key: "descuento", label: "Descuento", kind: "money", width: 13 },
  { key: "ivaTrasladado", label: "IVA Trasladado", kind: "money", width: 14 },
  { key: "retencionIva", label: "Retencion IVA", kind: "money", width: 13 },
  { key: "retencionIsr", label: "Retencion ISR", kind: "money", width: 13 },
  { key: "total", label: "Total", kind: "money", width: 14 },
  { key: "conceptos", label: "Descripción de Conceptos", kind: "text", width: 60 },
];

export const MONEY_KEYS = COLUMNS.filter((c) => c.kind === "money").map(
  (c) => c.key,
) as Array<"subtotal" | "descuento" | "ivaTrasladado" | "retencionIva" | "retencionIsr" | "total">;

export type MoneyKey = (typeof MONEY_KEYS)[number];

export function sumMoney(rows: CfdiRow[]): Record<MoneyKey, number> {
  const totals = Object.fromEntries(MONEY_KEYS.map((k) => [k, 0])) as Record<MoneyKey, number>;
  for (const r of rows) for (const k of MONEY_KEYS) totals[k] += r[k];
  for (const k of MONEY_KEYS) totals[k] = Math.round(totals[k] * 100) / 100;
  return totals;
}

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
export const formatMoney = (n: number) => mxn.format(n);

/** "2024-03-15T10:22:01" -> "15/03/2024 10:22" sin conversiones de zona horaria. */
export function formatFecha(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ""}`;
}
