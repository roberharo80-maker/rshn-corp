import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSHN CORP — Control de Fuerza Laboral",
  description: "Sistema de gestión de personal en campo para empresas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-white antialiased">{children}</body>
    </html>
  );
}
