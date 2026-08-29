"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, UploadCloud, FileImage, FileText, X, Loader2,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { type Paciente, avatarColor, iniciales } from "../../_types";

const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "application/pdf"];
const TAMANO_MAXIMO = 15 * 1024 * 1024;

type EstadoArchivo = "pendiente" | "subiendo" | "ok" | "error";

interface ArchivoEnCola {
  archivo: File;
  estado: EstadoArchivo;
  error?: string;
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SubirEcgManualPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [fecha, setFecha] = useState(hoyISO());
  const [cola, setCola] = useState<ArchivoEnCola[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/pacientes/${id}`);
        if (res.status === 404) { if (!cancelado) setNotFound(true); return; }
        if (!res.ok) throw new Error();
        if (!cancelado) setPaciente(await res.json());
      } catch {
        if (!cancelado) setNotFound(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [id]);

  function agregarArchivos(lista: FileList | null) {
    if (!lista) return;
    setErrorGeneral("");
    const nuevos: ArchivoEnCola[] = [];
    for (const archivo of Array.from(lista)) {
      if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
        setErrorGeneral(`"${archivo.name}" no es JPG, PNG o PDF — se omitió.`);
        continue;
      }
      if (archivo.size > TAMANO_MAXIMO) {
        setErrorGeneral(`"${archivo.name}" supera los 15MB — se omitió.`);
        continue;
      }
      nuevos.push({ archivo, estado: "pendiente" });
    }
    setCola((prev) => [...prev, ...nuevos]);
  }

  function quitar(index: number) {
    setCola((prev) => prev.filter((_, i) => i !== index));
  }

  async function subirTodo() {
    setEnviando(true);
    let huboError = false;
    for (let i = 0; i < cola.length; i++) {
      if (cola[i].estado === "ok") continue;
      setCola((prev) => prev.map((it, idx) => idx === i ? { ...it, estado: "subiendo" } : it));

      const formData = new FormData();
      formData.append("fecha", fecha);
      formData.append("archivo", cola[i].archivo);

      try {
        const res = await fetch(`/api/pacientes/${id}/imagenes-ecg`, { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.detail ?? "No se pudo subir el archivo.");
        }
        setCola((prev) => prev.map((it, idx) => idx === i ? { ...it, estado: "ok" } : it));
      } catch (e) {
        huboError = true;
        const mensaje = e instanceof Error ? e.message : "No se pudo subir el archivo.";
        setCola((prev) => prev.map((it, idx) => idx === i ? { ...it, estado: "error", error: mensaje } : it));
      }
    }
    setEnviando(false);
    if (!huboError) {
      router.push(`/pacientes/${id}`);
    }
  }

  if (cargando) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
      </main>
    );
  }

  if (notFound || !paciente) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 p-6">
        <p className="text-sm text-gray-400 dark:text-gray-500">Paciente no encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-xs text-blue-500 underline underline-offset-2">
          Volver
        </button>
      </main>
    );
  }

  const hayPendientes = cola.some((it) => it.estado !== "ok");

  return (
    <main className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <button
          onClick={() => router.push(`/pacientes/${id}`)}
          className="mb-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500
                     transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Volver al paciente
        </button>

        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(paciente.id)}`}>
            {iniciales(paciente.nombre_completo)}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">Subir ECG manual</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{paciente.nombre_completo} · {paciente.documento}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-6 py-6">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Fecha del estudio
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            max={hoyISO()}
            className="w-full max-w-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                       px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition
                       focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
          />
          <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
            Todos los archivos que subas ahora se agrupan bajo esta fecha.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Archivos (JPG, PNG o PDF — máx. 15MB c/u)
          </label>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
                       border-gray-200 dark:border-gray-700 py-8 text-center transition-colors
                       hover:border-blue-300 dark:hover:border-blue-500/40"
          >
            <UploadCloud className="h-6 w-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            <span className="text-sm text-gray-500 dark:text-gray-400">Haz clic para elegir archivos</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ""; }}
          />

          {errorGeneral && (
            <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {errorGeneral}
            </p>
          )}

          {cola.length > 0 && (
            <ul className="mt-4 space-y-2">
              {cola.map((it, i) => (
                <li
                  key={`${it.archivo.name}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2.5"
                >
                  {it.archivo.type === "application/pdf"
                    ? <FileText className="h-4 w-4 flex-shrink-0 text-red-400" strokeWidth={1.75} />
                    : <FileImage className="h-4 w-4 flex-shrink-0 text-blue-400" strokeWidth={1.75} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">{it.archivo.name}</p>
                    {it.estado === "error" && (
                      <p className="text-[11px] text-red-500 dark:text-red-400">{it.error}</p>
                    )}
                  </div>
                  {it.estado === "subiendo" && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400 dark:text-gray-500" strokeWidth={1.75} />}
                  {it.estado === "ok" && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" strokeWidth={1.75} />}
                  {it.estado === "error" && <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" strokeWidth={1.75} />}
                  {it.estado === "pendiente" && (
                    <button onClick={() => quitar(i)} className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400">
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={subirTodo}
          disabled={cola.length === 0 || enviando || !hayPendientes}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5
                     text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando
            ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Subiendo…</>
            : `Subir ${cola.length || ""} archivo${cola.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </main>
  );
}
