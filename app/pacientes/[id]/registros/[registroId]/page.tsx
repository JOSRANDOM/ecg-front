"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileHeart, CheckCircle2, Clock, Loader2,
  Stethoscope, ClipboardList, HeartPulse, Stamp,
} from "lucide-react";
import {
  type EstadoEcg, type Paciente, type RegistroEcg,
} from "../../../_types";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFechaHora(iso: string) {
  const [fecha, hora] = iso.split("T");
  const [y, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1]}. ${y} · ${(hora ?? "").slice(0, 5)}`;
}

const ESTADO_ECG: Record<EstadoEcg, { label: string; cls: string; icon: React.ElementType }> = {
  revisado:   { label: "Revisado",   cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",   icon: CheckCircle2 },
  pendiente:  { label: "Pendiente",  cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400", icon: Clock        },
  en_proceso: { label: "En proceso", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",     icon: Loader2      },
};

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[11px] text-gray-600 dark:text-gray-300">
          {item}
        </span>
      ))}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{label}</p>
      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{children}</div>
    </div>
  );
}

function Seccion({
  icon: Icon, titulo, children,
}: { icon: React.ElementType; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function RegistroDetallePage() {
  const { id, registroId } = useParams<{ id: string; registroId: string }>();
  const router = useRouter();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [registro, setRegistro] = useState<RegistroEcg | null>(null);
  const [revisorNombre, setRevisorNombre] = useState<string | null>(null);
  const [puedeRevisar, setPuedeRevisar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [resPaciente, resRegistro] = await Promise.all([
          fetch(`/api/pacientes/${id}`),
          fetch(`/api/registros-ecg/${registroId}`),
        ]);
        if (resPaciente.status === 404 || resRegistro.status === 404) {
          if (!cancelado) setNotFound(true);
          return;
        }
        if (!resPaciente.ok || !resRegistro.ok) throw new Error();
        const [dataPaciente, dataRegistro] = await Promise.all([
          resPaciente.json(),
          resRegistro.json(),
        ]);
        if (!cancelado) {
          setPaciente(dataPaciente);
          setRegistro(dataRegistro);
        }
        // El médico asignado no siempre es quien revisó (ej. el webmaster
        // puede completar el informe directo). Se intenta resolver el
        // nombre real; si no hay permiso para ver ese usuario, se omite en
        // vez de asumir un rol.
        if (dataRegistro.revisado_por && dataRegistro.revisado_por !== dataRegistro.medico_id) {
          const resRevisor = await fetch(`/api/usuarios/${dataRegistro.revisado_por}`);
          if (resRevisor.ok) {
            const datosRevisor = await resRevisor.json();
            if (!cancelado) setRevisorNombre(datosRevisor.nombre_completo ?? null);
          }
        }
      } catch {
        if (!cancelado) setNotFound(true);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((sesion) => {
        if (!cancelado && sesion) setPuedeRevisar(sesion.permisos?.includes("ecg:revisar") ?? false);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [id, registroId]);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
      </main>
    );
  }

  if (notFound || !paciente || !registro) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 p-6">
        <p className="text-sm text-gray-400 dark:text-gray-500">Registro no encontrado.</p>
        <button onClick={() => router.back()}
          className="mt-4 text-xs text-blue-500 dark:text-blue-400 underline underline-offset-2">
          Volver
        </button>
      </main>
    );
  }

  const est = ESTADO_ECG[registro.estado];
  const Icon = est.icon;

  return (
    <main className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <button
          onClick={() => router.push(`/pacientes/${id}`)}
          className="mb-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500
                     transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {paciente.nombre_completo}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Electrocardiograma
            </h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {formatFechaHora(registro.fecha)} · {registro.duracion_segundos}s
            </p>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${est.cls}`}>
            <Icon className={`h-3.5 w-3.5 ${registro.estado === "en_proceso" ? "animate-spin" : ""}`}
                  strokeWidth={2} />
            {est.label}
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-6 py-6">

        <Seccion icon={Stethoscope} titulo="Asignación">
          <Campo label="Técnico">{registro.tecnico_nombre}</Campo>
          <Campo label="Médico">{registro.medico_nombre ?? <span className="text-gray-300 dark:text-gray-600">Sin médico asignado</span>}</Campo>
        </Seccion>

        <Seccion icon={ClipboardList} titulo="Datos clínicos">
          <Campo label="Síntomas"><Chips items={registro.sintomas} /></Campo>
          <Campo label="Antecedentes"><Chips items={registro.antecedentes} /></Campo>
          {registro.descripcion_sintomas && (
            <div className="sm:col-span-2">
              <Campo label="Descripción de síntomas">{registro.descripcion_sintomas}</Campo>
            </div>
          )}
          {registro.antecedentes_extra && (
            <div className="sm:col-span-2">
              <Campo label="Antecedentes adicionales">{registro.antecedentes_extra}</Campo>
            </div>
          )}
          {registro.notas && (
            <div className="sm:col-span-2">
              <Campo label="Notas">{registro.notas}</Campo>
            </div>
          )}
        </Seccion>

        <Seccion icon={HeartPulse} titulo="Informe">
          {registro.estado === "pendiente" ? (
            <div className="sm:col-span-2 flex flex-col items-start gap-3">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Este estudio aún no tiene informe — está pendiente de revisión por un médico.
              </p>
              {puedeRevisar && (
                <button
                  onClick={() => router.push(`/pacientes/${id}/registros/${registroId}/revisar`)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold
                             text-white transition-colors hover:bg-blue-700"
                >
                  <Stamp className="h-3.5 w-3.5" strokeWidth={2} />
                  Revisar ahora
                </button>
              )}
            </div>
          ) : (
            <>
              <Campo label="Ritmo"><Chips items={registro.ritmo} /></Campo>
              <Campo label="Frecuencia cardíaca">
                {registro.fc_registrada != null ? `${registro.fc_registrada} lpm` : <span className="text-gray-300 dark:text-gray-600">—</span>}
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Alteraciones"><Chips items={registro.alteraciones} /></Campo>
              </div>
              {registro.descripcion_hallazgos && (
                <div className="sm:col-span-2">
                  <Campo label="Hallazgos">{registro.descripcion_hallazgos}</Campo>
                </div>
              )}
              <Campo label="Diagnóstico">{registro.diagnostico ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</Campo>
              <Campo label="Diagnóstico secundario">{registro.diagnostico_secundario ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</Campo>
              {registro.recomendaciones && (
                <div className="sm:col-span-2">
                  <Campo label="Recomendaciones">{registro.recomendaciones}</Campo>
                </div>
              )}
            </>
          )}
        </Seccion>

        {registro.estado === "revisado" && registro.revisado_en && (
          <div className="flex items-center gap-2 px-1 text-xs text-gray-400 dark:text-gray-500">
            <FileHeart className="h-3.5 w-3.5" strokeWidth={1.75} />
            {revisorNombre ?? registro.medico_nombre
              ? `Revisado por ${revisorNombre ?? registro.medico_nombre}`
              : "Revisado"} · {formatFechaHora(registro.revisado_en)}
          </div>
        )}
      </div>
    </main>
  );
}
