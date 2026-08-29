"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useDescargas } from "./DescargasProvider";

/** Franja fija al pie de pantalla — visible sin importar a qué pantalla
 * navegue el usuario mientras un reporte se genera, para que quede claro
 * que puede seguir trabajando y no tiene que quedarse esperando en
 * /reportes. */
export default function DescargasBar() {
  const { descargas } = useDescargas();

  if (descargas.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 p-4 print:hidden">
      {descargas.map((d) => (
        <div
          key={d.id}
          className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border
                     border-gray-100 bg-white px-4 py-3 shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          {d.estado === "generando" && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-500" strokeWidth={2} />}
          {d.estado === "lista" && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" strokeWidth={2} />}
          {d.estado === "error" && <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" strokeWidth={2} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-100">{d.nombre}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {d.estado === "generando" && "Generando en segundo plano — puedes seguir usando la plataforma."}
              {d.estado === "lista" && "Descarga lista."}
              {d.estado === "error" && (d.mensajeError ?? "Ocurrió un error al generar el archivo.")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
