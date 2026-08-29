"use client";

import { Users, FileSpreadsheet } from "lucide-react";
import { useDescargas } from "../components/DescargasProvider";
import { generarCsvPacientes } from "./_generadores";

interface Reporte {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ElementType;
  iconoColor: string;
  generar: () => Promise<{ blob: Blob; nombreArchivo: string }>;
}

// Catálogo de reportes disponibles — agregar uno nuevo es sumar una entrada
// aquí y su generador en ./_generadores.ts, sin tocar el resto de la página.
const REPORTES: Reporte[] = [
  {
    id: "pacientes",
    titulo: "Listado de pacientes",
    descripcion: "Exporta todos los pacientes registrados (documento, edad, tipo de sangre, estado, último ECG) en un archivo CSV, compatible con Excel.",
    icono: Users,
    iconoColor: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    generar: generarCsvPacientes,
  },
];

export default function ReportesPage() {
  const { iniciarDescarga, descargas } = useDescargas();

  return (
    <main className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Reportes</h1>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          Exporta información del sistema en archivos descargables.
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-6 py-6">
        {REPORTES.map((reporte) => {
          const Icon = reporte.icono;
          const generando = descargas.some((d) => d.nombre === reporte.titulo && d.estado === "generando");
          return (
            <div
              key={reporte.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-gray-800
                         bg-white dark:bg-gray-900 p-5 shadow-sm"
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${reporte.iconoColor}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{reporte.titulo}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{reporte.descripcion}</p>
              </div>
              <button
                onClick={() => iniciarDescarga(reporte.titulo, reporte.generar)}
                disabled={generando}
                className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs
                           font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={2} />
                {generando ? "Generando…" : "Exportar CSV"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
