"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileHeart, User, Phone, Droplets,
  CheckCircle2, Clock, Loader2, ChevronRight, Plus, UploadCloud,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { ecgData } from "../_ecgMock";
import {
  type EstadoPaciente, type EstadoEcg, type Paciente, type RegistroEcg,
  avatarColor, iniciales,
} from "../_types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFecha(iso: string) {
  const d = iso.split("T")[0].split("-").map(Number);
  return `${d[2]} ${MESES[d[1] - 1]}. ${d[0]}`;
}

function formatHora(iso: string) {
  const t = iso.split("T")[1] ?? "";
  return t.slice(0, 5);
}

const ESTADO_PACIENTE: Record<EstadoPaciente, { label: string; cls: string }> = {
  activo:    { label: "Activo",    cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"   },
  pendiente: { label: "Pendiente", cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" },
  inactivo:  { label: "Inactivo",  cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"    },
};

const ESTADO_ECG: Record<EstadoEcg, {
  label: string;
  cls:   string;
  icon:  React.ElementType;
}> = {
  revisado:   { label: "Revisado",   cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",   icon: CheckCircle2 },
  pendiente:  { label: "Pendiente",  cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400", icon: Clock        },
  en_proceso: { label: "En proceso", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",     icon: Loader2      },
};

// ── Mini ECG chart ────────────────────────────────────────────────────────────

const ECG_POINTS = ecgData();

function MiniEcgChart({ color = "#3b82f6" }: { color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={ECG_POINTS} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PacienteDetallePage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [paciente, setPaciente]   = useState<Paciente | null>(null);
  const [registros, setRegistros] = useState<RegistroEcg[]>([]);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [resPaciente, resRegistros] = await Promise.all([
          fetch(`/api/pacientes/${id}`),
          fetch(`/api/pacientes/${id}/registros-ecg`),
        ]);
        if (resPaciente.status === 404) {
          if (!cancelado) setNotFound(true);
          return;
        }
        if (!resPaciente.ok || !resRegistros.ok) throw new Error();
        const [dataPaciente, dataRegistros] = await Promise.all([
          resPaciente.json(),
          resRegistros.json(),
        ]);
        if (!cancelado) {
          setPaciente(dataPaciente);
          setRegistros(dataRegistros);
        }
      } catch {
        if (!cancelado) setNotFound(true);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [id]);

  if (loading) {
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
        <button onClick={() => router.back()}
          className="mt-4 text-xs text-blue-500 dark:text-blue-400 underline underline-offset-2">
          Volver
        </button>
      </main>
    );
  }

  const estadoPac = ESTADO_PACIENTE[paciente.estado];

  return (
    <main className="flex flex-1 flex-col bg-white dark:bg-gray-900">

      {/* Header */}
      <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500
                     transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Pacientes
        </button>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center
                          rounded-2xl text-base font-bold ${avatarColor(paciente.id)}`}>
            {iniciales(paciente.nombre_completo)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">{paciente.nombre_completo}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${estadoPac.cls}`}>
                {estadoPac.label}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                {paciente.documento} · {paciente.edad} años
              </span>
              <span className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" strokeWidth={1.75} />
                {paciente.tipo_sangre}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                {paciente.telefono}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historia clínica */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileHeart className="h-4 w-4 text-blue-500 dark:text-blue-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Historia clínica</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-50 dark:bg-gray-800 px-2.5 py-1 text-[11px] text-gray-400 dark:text-gray-500">
              {registros.length} registro{registros.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => router.push(`/pacientes/${id}/subir-ecg-manual`)}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800
                         text-gray-500 dark:text-gray-400 shadow-sm transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Subir ECG manual"
            >
              <UploadCloud className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={() => router.push(`/pacientes/${id}/nuevo-estudio`)}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600
                         text-white shadow-sm transition-colors hover:bg-blue-700"
              title="Registrar nuevo estudio"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {registros.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed
                          border-gray-200 dark:border-gray-700 py-16 text-center">
            <FileHeart className="mb-3 h-8 w-8 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
            <p className="text-sm text-gray-400 dark:text-gray-500">Sin registros ECG aún</p>
            <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">Los estudios realizados aparecerán aquí</p>
            <button
              onClick={() => router.push(`/pacientes/${id}/nuevo-estudio`)}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2
                         text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Registrar primer estudio
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {registros.map((reg, idx) => {
              const est  = ESTADO_ECG[reg.estado];
              const Icon = est.icon;
              const isRev = reg.estado === "revisado";
              return (
                <li key={reg.id}>
                  <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900
                                  shadow-sm transition-shadow hover:shadow-md">

                    {/* Card header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          Electrocardiograma #{String(registros.length - idx).padStart(3, "0")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                          {formatFecha(reg.fecha)} · {formatHora(reg.fecha)} · {reg.duracion_segundos}s
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1
                                       text-[10px] font-semibold ${est.cls}`}>
                        <Icon className={`h-3 w-3 ${reg.estado === "en_proceso" ? "animate-spin" : ""}`}
                              strokeWidth={2} />
                        {est.label}
                      </span>
                    </div>

                    {/* Mini ECG */}
                    <div className="px-5 py-1">
                      <div className={`rounded-xl px-2 py-1 ${isRev ? "bg-blue-50 dark:bg-blue-500/10" : "bg-gray-50 dark:bg-gray-800"}`}>
                        <MiniEcgChart color={isRev ? "#3b82f6" : "#9ca3af"} />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="px-5 py-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500">
                        <span>Técnico: <span className="font-medium text-gray-600 dark:text-gray-300">{reg.tecnico_nombre}</span></span>
                        {reg.medico_nombre
                          ? <span>Médico: <span className="font-medium text-gray-600 dark:text-gray-300">{reg.medico_nombre}</span></span>
                          : <span className="text-gray-300 dark:text-gray-600">Sin médico asignado</span>
                        }
                        <span>CONTEC E3</span>
                      </div>
                      {(reg.diagnostico || reg.notas) && (
                        <p className="mt-2 rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2 text-[11px]
                                      leading-relaxed text-gray-500 dark:text-gray-300 italic">
                          &ldquo;{reg.diagnostico || reg.notas}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-50 dark:border-gray-800 px-5 py-3">
                      <button
                        onClick={() => router.push(`/pacientes/${id}/registros/${reg.id}`)}
                        className="flex items-center gap-1 text-xs font-medium text-blue-500 dark:text-blue-400
                                   transition-colors hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        Ver registro completo
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>

                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </main>
  );
}
