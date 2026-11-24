import { FileSpreadsheet, ShieldCheck, Table2, Zap } from "lucide-react";
import { Converter } from "@/components/Converter";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Privado por diseño",
    text: "Tus XML se procesan en tu navegador. Nunca se suben a ningún servidor.",
  },
  {
    icon: Zap,
    title: "Cientos de facturas en segundos",
    text: "Arrastra una carpeta completa y obtén la vista previa al instante.",
  },
  {
    icon: Table2,
    title: "Excel listo para contabilidad",
    text: "Montos como números con formato de moneda y fila de totales con SUM.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">CFDI a Excel</span>
          </div>
          <span className="hidden text-sm text-slate-500 sm:block">Para contadores y negocios en México</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
            Compatible con CFDI 3.3 y 4.0 del SAT
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Convierte tus facturas XML del SAT a Excel en segundos
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Fecha, UUID, RFC, subtotal, IVA, retenciones, total y conceptos en una hoja limpia y ordenada. Sin
            capturas manuales.
          </p>
        </div>

        <div className="mt-10">
          <Converter />
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <Icon className="h-5 w-5 text-emerald-600" aria-hidden />
              <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        CFDI a Excel · Tus archivos nunca salen de tu equipo
      </footer>
    </div>
  );
}
