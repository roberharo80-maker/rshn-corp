import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSHN CORP — Control de Fuerza Laboral",
  description: "Sistema de gestion de personal en campo para empresas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body style={{ backgroundColor: "#09090b", color: "#ffffff", minHeight: "100vh", margin: 0, fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}