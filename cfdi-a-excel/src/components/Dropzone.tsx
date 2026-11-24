"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode2, FolderOpen, Loader2, UploadCloud } from "lucide-react";
import { filesFromDataTransfer, filesFromList } from "@/lib/files";

interface Props {
  onFiles: (files: File[], ignored: number) => void;
  processing: boolean;
}

export function Dropzone({ onFiles, processing }: Props) {
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  // React no tipa `webkitdirectory`; lo asignamos directamente al DOM.
  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
  }, []);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (processing) return;
    const { xml, ignored } = await filesFromDataTransfer(e.dataTransfer);
    onFiles(xml, ignored);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { xml, ignored } = filesFromList(e.target.files);
    e.target.value = ""; // permite volver a elegir los mismos archivos
    onFiles(xml, ignored);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors sm:py-20 ${
        dragging
          ? "border-emerald-500 bg-emerald-50"
          : "border-slate-300 bg-white hover:border-slate-400"
      }`}
    >
      <div
        className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
          dragging ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {processing ? (
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        ) : (
          <UploadCloud className="h-8 w-8" aria-hidden />
        )}
      </div>

      <p className="text-lg font-semibold text-slate-900">
        {processing
          ? "Procesando facturas…"
          : dragging
            ? "Suelta aquí tus archivos"
            : "Arrastra tus archivos XML o una carpeta completa"}
      </p>
      <p className="mt-1 text-sm text-slate-500">CFDI 3.3 y 4.0 · Ingresos, egresos, pagos y nómina</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={processing}
          onClick={() => fileInput.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          <FileCode2 className="h-4 w-4" aria-hidden />
          Seleccionar archivos
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={() => folderInput.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <FolderOpen className="h-4 w-4" aria-hidden />
          Seleccionar carpeta
        </button>
      </div>

      <input ref={fileInput} type="file" accept=".xml,text/xml,application/xml" multiple hidden onChange={handleInput} />
      <input ref={folderInput} type="file" multiple hidden onChange={handleInput} />
    </div>
  );
}
