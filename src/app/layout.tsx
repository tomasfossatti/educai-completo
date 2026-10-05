import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Educai", template: "%s · Educai" },
  description: "Educai convierte experiencias de aprendizaje en evidencia y la evidencia en la próxima mejor decisión.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4a49dc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
