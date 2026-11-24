import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CFDI a Excel — Convierte tus facturas XML del SAT a Excel",
  description:
    "Arrastra tus facturas XML (CFDI 3.3 y 4.0) y descarga un Excel limpio con UUID, RFC, subtotal, IVA, retenciones y total. Procesamiento 100% en tu navegador.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
