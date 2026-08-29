"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type EstadoDescarga = "generando" | "lista" | "error";

export interface Descarga {
  id: string;
  nombre: string;
  estado: EstadoDescarga;
  mensajeError?: string;
}

type GenerarArchivo = () => Promise<{ blob: Blob; nombreArchivo: string }>;

interface DescargasContextValue {
  descargas: Descarga[];
  iniciarDescarga: (nombre: string, generar: GenerarArchivo) => void;
}

const DescargasContext = createContext<DescargasContextValue | null>(null);

/** Contexto global (montado una vez en layout.tsx) para que un reporte se
 * genere en segundo plano sin bloquear la navegación: el estado vive aquí,
 * no en la página que disparó la descarga, así que sigue visible en la
 * barra inferior aunque el usuario se mueva a otra pantalla mientras
 * termina. */
export function useDescargas() {
  const ctx = useContext(DescargasContext);
  if (!ctx) throw new Error("useDescargas debe usarse dentro de <DescargasProvider>");
  return ctx;
}

export function DescargasProvider({ children }: { children: React.ReactNode }) {
  const [descargas, setDescargas] = useState<Descarga[]>([]);
  const contador = useRef(0);

  const iniciarDescarga = useCallback((nombre: string, generar: GenerarArchivo) => {
    const id = `descarga-${++contador.current}`;
    setDescargas((prev) => [...prev, { id, nombre, estado: "generando" }]);

    generar()
      .then(({ blob, nombreArchivo }) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);

        setDescargas((prev) => prev.map((d) => (d.id === id ? { ...d, estado: "lista" } : d)));
        setTimeout(() => setDescargas((prev) => prev.filter((d) => d.id !== id)), 4000);
      })
      .catch((err) => {
        const mensajeError = err instanceof Error ? err.message : "No se pudo generar el archivo.";
        setDescargas((prev) => prev.map((d) => (d.id === id ? { ...d, estado: "error", mensajeError } : d)));
        setTimeout(() => setDescargas((prev) => prev.filter((d) => d.id !== id)), 6000);
      });
  }, []);

  return (
    <DescargasContext.Provider value={{ descargas, iniciarDescarga }}>
      {children}
    </DescargasContext.Provider>
  );
}
