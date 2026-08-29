import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import DeviceStatusBar from "./components/DeviceStatusBar";
import CommandPalette from "./components/CommandPalette";
import { THEME_INIT_SCRIPT } from "./components/ThemeToggle";
import { obtenerSesion } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cardioflow E3",
  description: "Panel de gestión del electrocardiógrafo CONTEC E3",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sesion = await obtenerSesion();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-gray-950">
        {sesion && (
          <>
            <Navbar etiqueta={sesion.etiqueta} permisos={sesion.permisos} />
            <DeviceStatusBar />
            <CommandPalette />
          </>
        )}
        {children}
        {sesion && (
          <footer className="mt-auto border-t border-gray-100 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs text-gray-400 text-center dark:text-gray-600">
              © {new Date().getFullYear()} Cardioflow E3. Todos los derechos reservados.
            </p>
          </footer>
        )}
      </body>
    </html>
  );
}
