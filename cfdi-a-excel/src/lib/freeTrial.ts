"use client";

import { useCallback, useEffect, useState } from "react";

export const FREE_LIMIT = 15;
const STORAGE_KEY = "cfdi-a-excel:archivos-usados";

function readUsed(): number {
  try {
    const n = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? Math.min(n, FREE_LIMIT) : 0;
  } catch {
    return 0;
  }
}

function writeUsed(n: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* almacenamiento bloqueado (modo privado): el límite solo dura la sesión */
  }
}

/** Simula el límite de la prueba gratuita guardando el uso en localStorage. */
export function useFreeTrial() {
  const [used, setUsed] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUsed(readUsed());
    setReady(true);
  }, []);

  const consume = useCallback((n: number) => {
    setUsed((prev) => {
      const next = Math.min(FREE_LIMIT, prev + n);
      writeUsed(next);
      return next;
    });
  }, []);

  return { used, remaining: Math.max(0, FREE_LIMIT - used), limit: FREE_LIMIT, ready, consume };
}
