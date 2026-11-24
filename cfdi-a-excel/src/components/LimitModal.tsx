"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Lock, X } from "lucide-react";

interface Props {
  open: boolean;
  blocked: number;
  onClose: () => void;
}

const BENEFITS = [
  "Facturas XML ilimitadas cada mes",
  "Procesamiento 100% en tu navegador",
  "Exportación a Excel con montos sumables",
  "Cancela cuando quieras",
];

export function LimitModal({ open, blocked, onClose }: Props) {
  const [clicked, setClicked] = useState(false);
  const cta = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setClicked(false);
    cta.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 pb-6 pt-8 text-white">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h2 id="limit-title" className="text-xl font-bold leading-snug">
            Has alcanzado el límite de tu prueba gratuita.
          </h2>
          <p className="mt-2 text-emerald-50">
            Suscríbete por <strong className="text-white">$199 MXN/mes</strong> para procesar facturas ilimitadas.
          </p>
        </div>

        <div className="px-6 py-6">
          {blocked > 0 && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {blocked} {blocked === 1 ? "archivo no se procesó" : "archivos no se procesaron"} por el límite de la
              prueba.
            </p>
          )}
          <ul className="space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {b}
              </li>
            ))}
          </ul>

          <button
            ref={cta}
            type="button"
            onClick={() => setClicked(true)}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
          >
            Suscribirme ahora
          </button>
          <p className="mt-3 text-center text-xs text-slate-500" aria-live="polite">
            {clicked ? "¡Gracias! Los pagos con Stripe estarán disponibles muy pronto." : "Pago seguro · Factura disponible"}
          </p>
        </div>
      </div>
    </div>
  );
}
