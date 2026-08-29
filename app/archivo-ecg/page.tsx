"use client";

import { useEffect, useState } from "react";
import {
  Search, FolderOpen, Folder, FileText, Loader2, ShieldAlert, Inbox,
} from "lucide-react";
import { type Paciente, type ImagenEcg, avatarColor, iniciales } from "../pacientes/_types";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);
  return `${day} ${MESES[month - 1]}. ${year}`;
}

function formatTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Carpeta {
  fecha: string;
  imagenes: ImagenEcg[];
}

function agruparPorFecha(imagenes: ImagenEcg[]): Carpeta[] {
  const grupos = new Map<string, ImagenEcg[]>();
  for (const img of imagenes) {
    const lista = grupos.get(img.fecha) ?? [];
    lista.push(img);
    grupos.set(img.fecha, lista);
  }
  return [...grupos.entries()]
    .map(([fecha, imagenes]) => ({ fecha, imagenes }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export default function ArchivoEcgPage() {
  const [permitido, setPermitido] = useState<boolean | null>(null);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [query, setQuery] = useState("");
  const [cargandoPacientes, setCargandoPacientes] = useState(true);

  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);
  const [imagenes, setImagenes] = useState<ImagenEcg[]>([]);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [errorImagenes, setErrorImagenes] = useState("");
  const [carpetaAbierta, setCarpetaAbierta] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { setPermitido(false); return; }
      const sesion = await res.json();
      setPermitido(Array.isArray(sesion.permisos) && sesion.permisos.includes("ecg:leer"));
    })();
  }, []);

  useEffect(() => {
    if (permitido !== true) return;
    (async () => {
      try {
        const res = await fetch("/api/pacientes");
        if (res.ok) setPacientes(await res.json());
      } finally {
        setCargandoPacientes(false);
      }
    })();
  }, [permitido]);

  async function seleccionarPaciente(p: Paciente) {
    setSeleccionado(p);
    setImagenes([]);
    setErrorImagenes("");
    setCarpetaAbierta(null);
    setCargandoImagenes(true);
    try {
      const res = await fetch(`/api/pacientes/${p.id}/imagenes-ecg`);
      if (!res.ok) throw new Error();
      setImagenes(await res.json());
    } catch {
      setErrorImagenes("No se pudieron cargar las imágenes de este paciente.");
    } finally {
      setCargandoImagenes(false);
    }
  }

  const filtrados = pacientes.filter((p) => {
    const q = query.toLowerCase();
    if (!q) return false;
    return (
      p.nombre_completo.toLowerCase().includes(q) ||
      p.documento.replace(/\./g, "").includes(q.replace(/\./g, ""))
    );
  });

  if (permitido === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
      </main>
    );
  }

  if (permitido === false) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 p-6 text-center">
        <ShieldAlert className="mb-3 h-8 w-8 text-gray-200 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver el archivo de ECG.</p>
      </main>
    );
  }

  const carpetas = agruparPorFecha(imagenes);

  return (
    <main className="flex flex-1 flex-col bg-white dark:bg-gray-900">
      <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Buscar ECG</h1>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          Busca por DNI o nombre para ver los electrocardiogramas subidos manualmente.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Columna: buscador + resultados */}
        <div className="flex w-full max-w-sm flex-shrink-0 flex-col border-r border-gray-100 dark:border-gray-800">
          <div className="px-5 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
              <input
                type="text"
                autoFocus
                placeholder="DNI o nombre del paciente…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 pl-9 pr-4
                           text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 outline-none
                           transition focus:border-blue-300 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {cargandoPacientes ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
              </div>
            ) : !query ? (
              <p className="px-3 pt-8 text-center text-xs text-gray-300 dark:text-gray-600">
                Escribe un DNI o nombre para buscar.
              </p>
            ) : filtrados.length === 0 ? (
              <p className="px-3 pt-8 text-center text-xs text-gray-400 dark:text-gray-500">
                Sin resultados para &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <ul className="space-y-1">
                {filtrados.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => seleccionarPaciente(p)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
                                 ${seleccionado?.id === p.id
                                   ? "bg-blue-50 dark:bg-blue-500/10"
                                   : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(p.id)}`}>
                        {iniciales(p.nombre_completo)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.nombre_completo}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{p.documento}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Columna: carpetas del paciente seleccionado */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!seleccionado ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Inbox className="mb-3 h-8 w-8 text-gray-200 dark:text-gray-600" strokeWidth={1.5} />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Selecciona un paciente para ver sus ECG manuales.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(seleccionado.id)}`}>
                  {iniciales(seleccionado.nombre_completo)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{seleccionado.nombre_completo}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{seleccionado.documento} · {seleccionado.edad} años</p>
                </div>
              </div>

              {cargandoImagenes ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
                </div>
              ) : errorImagenes ? (
                <p className="text-sm text-red-400">{errorImagenes}</p>
              ) : carpetas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Folder className="mb-3 h-8 w-8 text-gray-200 dark:text-gray-600" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sin ECG manuales para este paciente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carpetas.map((carpeta) => {
                    const abierta = carpetaAbierta === carpeta.fecha;
                    return (
                      <div key={carpeta.fecha} className="rounded-2xl border border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => setCarpetaAbierta(abierta ? null : carpeta.fecha)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          {abierta
                            ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-500" strokeWidth={1.75} />
                            : <Folder className="h-4 w-4 flex-shrink-0 text-amber-500" strokeWidth={1.75} />}
                          <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                            {formatFecha(carpeta.fecha)}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {carpeta.imagenes.length} archivo{carpeta.imagenes.length !== 1 ? "s" : ""}
                          </span>
                        </button>

                        {abierta && (
                          <div className="grid grid-cols-2 gap-3 border-t border-gray-50 dark:border-gray-800 p-4 sm:grid-cols-4">
                            {carpeta.imagenes.map((img) => (
                              <a
                                key={img.id}
                                href={img.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800
                                           bg-gray-50 dark:bg-gray-800 transition-colors hover:border-blue-200 dark:hover:border-blue-500/30"
                              >
                                {img.tipo_archivo === "application/pdf" ? (
                                  <div className="flex h-24 flex-col items-center justify-center gap-1.5">
                                    <FileText className="h-6 w-6 text-red-400" strokeWidth={1.5} />
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">PDF</span>
                                  </div>
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={img.url}
                                    alt={img.nombre_archivo}
                                    className="h-24 w-full object-cover"
                                  />
                                )}
                                <div className="px-2 py-1.5">
                                  <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">{img.nombre_archivo}</p>
                                  <p className="text-[10px] text-gray-300 dark:text-gray-600">{formatTamano(img.tamano_bytes)}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
