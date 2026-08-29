"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import type { Paciente, RegistroEcg } from "../pacientes/_types";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFecha(iso: string) {
  const [fecha] = iso.split("T");
  const [y, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1]}. ${y}`;
}

interface Pendiente {
  registro: RegistroEcg;
  pacienteNombre: string;
}

/** Solo relevante para quien puede completar un informe — sin ecg:revisar
 * no hay nada que hacer con esta lista, así que ni se pinta el ícono. */
export default function NotificationBadge({ permisos }: { permisos: string[] }) {
  const router = useRouter();
  const puedeRevisar = permisos.includes("ecg:revisar");

  const [abierto, setAbierto] = useState(false);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!puedeRevisar) return;

    let cancelado = false;
    async function cargar() {
      try {
        const [resRegistros, resPacientes] = await Promise.all([
          fetch("/api/registros-ecg?limite=1000"),
          fetch("/api/pacientes"),
        ]);
        if (!resRegistros.ok || !resPacientes.ok) return;
        const registros: RegistroEcg[] = await resRegistros.json();
        const pacientes: Paciente[] = await resPacientes.json();
        const nombrePorId = new Map(pacientes.map((p) => [p.id, p.nombre_completo]));

        const lista = registros
          .filter((r) => r.estado === "pendiente")
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .map((registro) => ({
            registro,
            pacienteNombre: nombrePorId.get(registro.paciente_id) ?? "Paciente",
          }));

        if (!cancelado) setPendientes(lista);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    const intervalo = setInterval(cargar, 60_000);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [puedeRevisar]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  if (!puedeRevisar) return null;

  function ir(pacienteId: string, registroId: string) {
    setAbierto(false);
    router.push(`/pacientes/${pacienteId}/registros/${registroId}/revisar`);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl text-gray-400
                   transition-colors hover:bg-gray-100 hover:text-gray-700
                   dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        title="Estudios pendientes de revisión"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {pendientes.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full
                           bg-red-500 px-1 text-[10px] font-semibold text-white">
            {pendientes.length > 9 ? "9+" : pendientes.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100
                        bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Pendientes de revisión</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cargando ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
              </div>
            ) : pendientes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-green-400" strokeWidth={1.5} />
                <p className="text-xs text-gray-400 dark:text-gray-500">Todo al día — sin estudios pendientes.</p>
              </div>
            ) : (
              pendientes.slice(0, 8).map(({ registro, pacienteNombre }) => (
                <button
                  key={registro.id}
                  onClick={() => ir(registro.paciente_id, registro.id)}
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors
                             hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="truncate text-sm text-gray-800 dark:text-gray-100">{pacienteNombre}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    {registro.tecnico_nombre} · {formatFecha(registro.fecha)}
                  </span>
                </button>
              ))
            )}
          </div>

          {pendientes.length > 8 && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
              +{pendientes.length - 8} más
            </div>
          )}
        </div>
      )}
    </div>
  );
}
