"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Download, FileWarning, Sparkles, Trash2, XCircle } from "lucide-react";
import { parseCfdi, readXmlText } from "@/lib/cfdi";
import { downloadExcel, type ErrorEntry } from "@/lib/excel";
import { useFreeTrial } from "@/lib/freeTrial";
import { Dropzone } from "./Dropzone";
import { LimitModal } from "./LimitModal";
import { ResultsTable, type TableRow } from "./ResultsTable";

interface WarningEntry {
  archivo: string;
  mensajes: string[];
}

let seq = 0;

export function Converter() {
  const trial = useFreeTrial();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [warnings, setWarnings] = useState<WarningEntry[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; blocked: number }>({ open: false, blocked: 0 });

  const handleFiles = useCallback(
    async (files: File[], ignored: number, linkDropped = false) => {
      setInfo(
        ignored > 0 ? `Se ignoraron ${ignored} ${ignored === 1 ? "archivo" : "archivos"} que no son .xml.` : null,
      );
      if (!files.length) {
        if (linkDropped)
          setInfo(
            "Arrastraste un enlace, no un archivo. Descarga primero el XML a tu computadora y arrástralo desde tu carpeta (o usa «Seleccionar archivos»).",
          );
        else if (!ignored) setInfo("No se encontraron archivos .xml.");
        return;
      }
      if (trial.remaining === 0) {
        setModal({ open: true, blocked: files.length });
        return;
      }

      setProcessing(true);
      const added: TableRow[] = [];
      const newErrors: ErrorEntry[] = [];
      const newWarnings: WarningEntry[] = [];
      const seen = new Set(rows.map((r) => r.uuid).filter(Boolean));
      let slots = trial.remaining;
      let blocked = 0;

      for (const file of files) {
        let result;
        try {
          result = parseCfdi(await readXmlText(file), file.name);
        } catch (e) {
          result = { ok: false as const, error: `No se pudo leer el archivo: ${(e as Error).message}` };
        }

        if (!result.ok) {
          newErrors.push({ archivo: file.name, motivo: result.error });
          continue;
        }
        const { row, warnings: w } = result;
        if (row.uuid && seen.has(row.uuid)) {
          newWarnings.push({ archivo: file.name, mensajes: ["UUID duplicado: ya estaba cargado, se omitió."] });
          continue;
        }
        // Solo los CFDI válidos y nuevos consumen la prueba gratuita.
        if (slots === 0) {
          blocked++;
          continue;
        }
        slots--;
        if (row.uuid) seen.add(row.uuid);
        added.push({ ...row, id: `${++seq}` });
        if (w.length) newWarnings.push({ archivo: file.name, mensajes: w });
      }

      setRows((prev) => [...prev, ...added]);
      setErrors((prev) => [...newErrors, ...prev]);
      setWarnings((prev) => [...newWarnings, ...prev]);
      trial.consume(added.length);
      setProcessing(false);
      if (blocked > 0) setModal({ open: true, blocked });
    },
    [rows, trial],
  );

  const clearAll = () => {
    setRows([]);
    setErrors([]);
    setWarnings([]);
    setInfo(null);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExcel(rows, errors);
    } finally {
      setDownloading(false);
    }
  };

  const pct = useMemo(() => (trial.used / trial.limit) * 100, [trial.used, trial.limit]);
  const closeModal = useCallback(() => setModal({ open: false, blocked: 0 }), []);

  return (
    <section className="space-y-6">
      {/* Contador de la prueba gratuita */}
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 text-sm text-emerald-900">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>
            <strong>Prueba gratuita:</strong>{" "}
            <span className="tabular-nums">{trial.ready ? trial.remaining : trial.limit}</span> archivos XML
            disponibles
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 sm:w-40" aria-hidden>
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-xs tabular-nums text-emerald-800">
            {trial.used}/{trial.limit} usados
          </span>
        </div>
      </div>

      <Dropzone onFiles={handleFiles} processing={processing} />

      {info && <p className="rounded-lg bg-amber-50 px-4 py-3 text-center text-sm text-amber-900" role="status">{info}</p>}

      {/* Avisos: archivos con error y advertencias */}
      {errors.length > 0 && (
        <Notice
          tone="error"
          icon={<XCircle className="h-5 w-5" aria-hidden />}
          title={`${errors.length} ${errors.length === 1 ? "archivo no se pudo procesar" : "archivos no se pudieron procesar"}`}
          items={errors.map((e) => ({ archivo: e.archivo, texto: e.motivo }))}
          onDismiss={() => setErrors([])}
        />
      )}
      {warnings.length > 0 && (
        <Notice
          tone="warning"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          title={`${warnings.length} ${warnings.length === 1 ? "aviso" : "avisos"}`}
          items={warnings.map((w) => ({ archivo: w.archivo, texto: w.mensajes.join(" ") }))}
          onDismiss={() => setWarnings([])}
        />
      )}

      {rows.length > 0 ? (
        <>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Limpiar lista
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-60"
            >
              <Download className="h-5 w-5" aria-hidden />
              {downloading ? "Generando…" : "Descargar Excel (.xlsx)"}
            </button>
          </div>
          <ResultsTable rows={rows} onRemove={(id) => setRows((prev) => prev.filter((r) => r.id !== id))} />
        </>
      ) : (
        !errors.length && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-400">
            <FileWarning className="h-4 w-4" aria-hidden />
            Aún no has cargado facturas. Tu vista previa aparecerá aquí.
          </div>
        )
      )}

      <LimitModal open={modal.open} blocked={modal.blocked} onClose={closeModal} />
    </section>
  );
}

function Notice({
  tone,
  icon,
  title,
  items,
  onDismiss,
}: {
  tone: "error" | "warning";
  icon: React.ReactNode;
  title: string;
  items: { archivo: string; texto: string }[];
  onDismiss: () => void;
}) {
  const styles =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 ${styles}`}>
      <div className="flex items-start gap-3">
        <span className={tone === "error" ? "text-rose-600" : "text-amber-600"}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{title}</p>
            <button type="button" onClick={onDismiss} className="text-xs font-medium underline-offset-2 hover:underline">
              Ocultar
            </button>
          </div>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm">
            {items.map((it, i) => (
              <li key={`${it.archivo}-${i}`} className="break-words">
                <span className="font-mono text-xs font-semibold">{it.archivo}</span>
                <span className="opacity-80"> — {it.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
