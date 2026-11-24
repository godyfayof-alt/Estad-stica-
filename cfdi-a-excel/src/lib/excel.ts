import type { CfdiRow } from "./cfdi";
import { COLUMNS, sumMoney } from "./columns";

export interface ErrorEntry {
  archivo: string;
  motivo: string;
}

const MONEY_FORMAT = '"$"#,##0.00;-"$"#,##0.00';
const DATE_FORMAT = "dd/mm/yyyy hh:mm";

/** Convierte "YYYY-MM-DDTHH:mm:ss" a número de serie de Excel, sin zona horaria. */
function toExcelSerial(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  return ms / 86_400_000 + 25_569;
}

/** Genera y descarga el .xlsx. SheetJS se carga bajo demanda para aligerar la página. */
export async function downloadExcel(rows: CfdiRow[], errors: ErrorEntry[]) {
  const XLSX = await import("xlsx");
  type Cell = import("xlsx").CellObject;

  const header: Cell[] = COLUMNS.map((c) => ({ t: "s", v: c.label }));

  const body: Cell[][] = rows.map((r) =>
    COLUMNS.map((col): Cell => {
      const value = r[col.key];
      if (col.kind === "money") return { t: "n", v: value as number, z: MONEY_FORMAT };
      if (col.kind === "date") {
        const serial = toExcelSerial(value as string);
        return serial === null ? { t: "s", v: value as string } : { t: "n", v: serial, z: DATE_FORMAT };
      }
      return { t: "s", v: value as string };
    }),
  );

  // Fila de totales con fórmulas SUM (se recalculan si el usuario edita el archivo).
  const totals = sumMoney(rows);
  const firstData = 2;
  const lastData = rows.length + 1;
  const totalRow: Cell[] = COLUMNS.map((col, i): Cell => {
    if (i === 0) return { t: "s", v: "TOTALES" };
    if (col.kind !== "money") return { t: "s", v: "" };
    const letter = XLSX.utils.encode_col(i);
    return {
      t: "n",
      v: totals[col.key as keyof typeof totals],
      f: `SUM(${letter}${firstData}:${letter}${lastData})`,
      z: MONEY_FORMAT,
    };
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...body, totalRow]);
  ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastData - 1, c: COLUMNS.length - 1 } }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CFDI");

  if (errors.length) {
    const wsErr = XLSX.utils.aoa_to_sheet([
      ["Archivo", "Motivo"],
      ...errors.map((e) => [e.archivo, e.motivo]),
    ]);
    wsErr["!cols"] = [{ wch: 40 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsErr, "Archivos con error");
  }

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CFDI_${stamp}.xlsx`, { compression: true });
}
