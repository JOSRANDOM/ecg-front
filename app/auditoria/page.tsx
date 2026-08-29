"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Loader2, ShieldAlert, History,
  Eye, UserPlus, Pencil, FileText, Activity, Stamp, UploadCloud,
} from "lucide-react";
import type { AccionAuditoria, EventoAuditoria, Paciente } from "../pacientes/_types";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFechaHora(iso: string) {
  const [fecha, hora] = iso.split("T");
  const [y, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1]}. ${y} · ${(hora ?? "").slice(0, 5)}`;
}

const ACCIONES: Record<AccionAuditoria, { label: string; icono: React.ElementType; cls: string }> = {
  ver_paciente:          { label: "Vio la ficha del paciente",     icono: Eye,         cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  crear_paciente:        { label: "Registró al paciente",          icono: UserPlus,    cls: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
  actualizar_paciente:   { label: "Editó el historial",            icono: Pencil,      cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  ver_registro_ecg:      { label: "Vio un estudio ECG",             icono: FileText,    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  crear_registro_ecg:    { label: "Creó un estudio ECG",            icono: Activity,    cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  revisar_registro_ecg:  { label: "Revisó un estudio ECG",          icono: Stamp,       cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
  subir_imagen_ecg:      { label: "Subió un ECG manual",            icono: UploadCloud, cls: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" },
};

export default function AuditoriaPage() {
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { setPermitido(false); return; }
      const sesion = await res.json();
      setPermitido(Array.isArray(sesion.permisos) && sesion.permisos.includes("auditoria:leer"));
    })();
  }, []);

  useEffect(() => {
    if (permitido !== true) return;
    (async () => {
      try {
        const [resEventos, resPacientes] = await Promise.all([
          fetch("/api/auditoria?limite=200"),
          fetch("/api/pacientes"),
        ]);
        if (!resEventos.ok || !resPacientes.ok) throw new Error();
        setEventos(await resEventos.json());
        setPacientes(await resPacientes.json());
      } catch {
        setError("No se pudo cargar la auditoría.");
      } finally {
        setCargando(false);
      }
    })();
  }, [permitido]);

  const nombrePorId = useMemo(
    () => new Map(pacientes.map((p) => [p.id, p.nombre_completo])),
    [pacientes]
  );

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eventos;
    return eventos.filter((e) => {
      const pacienteNombre = (nombrePorId.get(e.paciente_id) ?? "").toLowerCase();
      return pacienteNombre.includes(q) || e.usuario_nombre.toLowerCase().includes(q);
    });
  }, [eventos, nombrePorId, query]);

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
        <p className="text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver la auditoría de accesos.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Auditoría de accesos</h1>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          Quién vio o editó qué paciente y cuándo — últimos 200 eventos.
        </p>
      </div>

      <div className="px-6 py-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Filtrar por paciente o usuario…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 pl-9 pr-4
                       text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 outline-none
                       transition focus:border-blue-300 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {cargando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
          </div>
        ) : error ? (
          <p className="py-16 text-center text-sm text-red-400">{error}</p>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History className="mb-3 h-8 w-8 text-gray-200 dark:text-gray-600" strokeWidth={1.5} />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {query ? `Sin resultados para "${query}".` : "Sin eventos registrados todavía."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtrados.map((e) => {
                const info = ACCIONES[e.accion];
                const Icon = info.icono;
                const pacienteNombre = nombrePorId.get(e.paciente_id) ?? "Paciente eliminado";
                return (
                  <li key={e.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${info.cls}`}>
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-800 dark:text-gray-100">
                        <span className="font-medium">{e.usuario_nombre}</span> — {info.label}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        <Link href={`/pacientes/${e.paciente_id}`} className="hover:underline">
                          {pacienteNombre}
                        </Link>
                        {" "}· {formatFechaHora(e.creado_en)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
