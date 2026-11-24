"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import type { CfdiRow } from "@/lib/cfdi";
import { COLUMNS, type ColumnKey, formatFecha, formatMoney, sumMoney } from "@/lib/columns";

export type TableRow = CfdiRow & { id: string };

interface Props {
  rows: TableRow[];
  onRemove: (id: string) => void;
}

const TIPO_LABEL: Record<string, string> = { I: "Ingreso", E: "Egreso", P: "Pago", N: "Nómina", T: "Traslado" };
const TIPO_STYLE: Record<string, string> = {
  I: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  E: "bg-rose-50 text-rose-700 ring-rose-600/20",
  P: "bg-sky-50 text-sky-700 ring-sky-600/20",
  N: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function ResultsTable({ rows, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: ColumnKey; dir: 1 | -1 } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q
      ? rows.filter((r) =>
          [r.uuid, r.rfcEmisor, r.nombreEmisor, r.rfcReceptor, r.nombreReceptor, r.serie, r.folio, r.conceptos]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : rows;
    if (sort) {
      out = [...out].sort((a, b) => {
        const va = a[sort.key];
        const vb = b[sort.key];
        const cmp = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb), "es");
        return cmp * sort.dir;
      });
    }
    return out;
  }, [rows, query, sort]);

  const totals = useMemo(() => sumMoney(visible), [visible]);

  const toggleSort = (key: ColumnKey) =>
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{visible.length}</span>
          {visible.length !== rows.length && ` de ${rows.length}`} {rows.length === 1 ? "factura" : "facturas"}
        </p>
        <label className="relative block sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar RFC, nombre, UUID, concepto…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>
      </div>

      <dl className="grid grid-cols-1 divide-y divide-slate-200 border-b border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {(
          [
            ["Subtotal", totals.subtotal],
            ["IVA Trasladado", totals.ivaTrasladado],
            ["Total", totals.total],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">{formatMoney(value)}</dd>
          </div>
        ))}
      </dl>

      <div className="max-h-[560px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const active = sort?.key === col.key;
                const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-700 ${
                      col.kind === "money" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-slate-950 ${col.kind === "money" ? "flex-row-reverse" : ""}`}
                    >
                      {col.label}
                      <Icon className={`h-3.5 w-3.5 ${active ? "text-emerald-600" : "text-slate-300"}`} aria-hidden />
                    </button>
                  </th>
                );
              })}
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-2" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="group hover:bg-slate-50/70">
                {COLUMNS.map((col) => {
                  const v = r[col.key];
                  let content: React.ReactNode = v as string;
                  if (col.kind === "money") content = formatMoney(v as number);
                  else if (col.kind === "date") content = formatFecha(v as string);
                  else if (col.key === "tipoComprobante")
                    content = (
                      <span
                        title={TIPO_LABEL[r.tipoComprobante] ?? r.tipoComprobante}
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          TIPO_STYLE[r.tipoComprobante] ?? "bg-slate-50 text-slate-700 ring-slate-600/20"
                        }`}
                      >
                        {r.tipoComprobante || "—"}
                      </span>
                    );
                  return (
                    <td
                      key={col.key}
                      title={col.key === "conceptos" || col.key.startsWith("nombre") ? (v as string) : undefined}
                      className={`border-b border-slate-100 px-3 py-2 text-slate-700 ${
                        col.kind === "money" ? "whitespace-nowrap text-right tabular-nums" : ""
                      } ${col.key === "uuid" ? "whitespace-nowrap font-mono text-xs" : ""} ${
                        col.key === "conceptos" || col.key.startsWith("nombre")
                          ? "max-w-[260px] truncate"
                          : "whitespace-nowrap"
                      }`}
                    >
                      {content || <span className="text-slate-300">—</span>}
                    </td>
                  );
                })}
                <td className="border-b border-slate-100 px-2">
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Quitar ${r.archivo}`}
                    title="Quitar de la lista"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-slate-900">
              {COLUMNS.map((col, i) => (
                <td
                  key={col.key}
                  className={`sticky bottom-0 whitespace-nowrap border-t-2 border-slate-300 bg-emerald-50 px-3 py-3 ${
                    col.kind === "money" ? "text-right tabular-nums" : ""
                  }`}
                >
                  {i === 0 ? "TOTALES" : col.kind === "money" ? formatMoney(totals[col.key as keyof typeof totals]) : ""}
                </td>
              ))}
              <td className="sticky bottom-0 border-t-2 border-slate-300 bg-emerald-50" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
