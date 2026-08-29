"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileHeart, CheckCircle2, Clock, Loader2,
  Stethoscope, ClipboardList, HeartPulse, Stamp, Printer,
  CalendarClock, History, ChevronDown,
} from "lucide-react";
import {
  type EstadoEcg, type Paciente, type RegistroEcg, type VersionInforme,
} from "../../../_types";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFechaHora(iso: string) {
  const [fecha, hora] = iso.split("T");
  const [y, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1]}. ${y} · ${(hora ?? "").slice(0, 5)}`;
}

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1]}. ${y}`;
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
  icon: Icon, titulo, accion, children,
}: { icon: React.ElementType; titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
        {accion && <div className="ml-auto">{accion}</div>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// ── Reporte imprimible ───────────────────────────────────────────────────────
// Solo visible al imprimir (window.print → "Guardar como PDF"). Colores fijos
// a propósito, sin variantes dark: — un PDF clínico debe verse igual sin
// importar el tema con el que se generó, y nunca en fondo negro.

function CampoImpreso({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-[13px] text-gray-900">{valor || "—"}</p>
    </div>
  );
}

function ListaImpresa({ items }: { items: string[] }) {
  return <>{items.length > 0 ? items.join(", ") : "—"}</>;
}

function ReporteImprimible({
  paciente, registro, revisorNombre,
}: { paciente: Paciente; registro: RegistroEcg; revisorNombre: string | null }) {
  return (
    <div className="hidden print:block text-black">
      <div className="mb-6 flex items-center justify-between border-b-2 border-gray-900 pb-3">
        <div>
          <p className="text-lg font-bold">Cardioflow E3</p>
          <p className="text-xs text-gray-600">Informe de Electrocardiograma</p>
        </div>
        <p className="text-[10px] text-gray-500">
          Generado el {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3 border border-gray-300 p-3">
        <CampoImpreso label="Paciente" valor={paciente.nombre_completo} />
        <CampoImpreso label="Documento" valor={paciente.documento} />
        <CampoImpreso label="Edad" valor={`${paciente.edad} años`} />
        <CampoImpreso label="Tipo de sangre" valor={paciente.tipo_sangre} />
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3">
        <CampoImpreso label="Fecha del estudio" valor={formatFechaHora(registro.fecha)} />
        <CampoImpreso label="Duración" valor={`${registro.duracion_segundos}s`} />
        <CampoImpreso label="Técnico" valor={registro.tecnico_nombre} />
        <CampoImpreso label="Médico" valor={registro.medico_nombre ?? "Sin asignar"} />
      </div>

      <div className="mb-5">
        <p className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wide">Datos clínicos</p>
        <div className="grid grid-cols-2 gap-3">
          <CampoImpreso label="Síntomas" valor={<ListaImpresa items={registro.sintomas} />} />
          <CampoImpreso label="Antecedentes" valor={<ListaImpresa items={registro.antecedentes} />} />
          {registro.descripcion_sintomas && (
            <div className="col-span-2"><CampoImpreso label="Descripción de síntomas" valor={registro.descripcion_sintomas} /></div>
          )}
          {registro.antecedentes_extra && (
            <div className="col-span-2"><CampoImpreso label="Antecedentes adicionales" valor={registro.antecedentes_extra} /></div>
          )}
          {registro.notas && (
            <div className="col-span-2"><CampoImpreso label="Notas" valor={registro.notas} /></div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <p className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wide">Informe</p>
        {registro.estado === "pendiente" ? (
          <p className="text-[13px] text-gray-500">Estudio pendiente de revisión médica.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <CampoImpreso label="Ritmo" valor={<ListaImpresa items={registro.ritmo} />} />
            <CampoImpreso label="Frecuencia cardíaca" valor={registro.fc_registrada != null ? `${registro.fc_registrada} lpm` : null} />
            <div className="col-span-2"><CampoImpreso label="Alteraciones" valor={<ListaImpresa items={registro.alteraciones} />} /></div>
            {registro.descripcion_hallazgos && (
              <div className="col-span-2"><CampoImpreso label="Hallazgos" valor={registro.descripcion_hallazgos} /></div>
            )}
            <CampoImpreso label="Diagnóstico" valor={registro.diagnostico} />
            <CampoImpreso label="Diagnóstico secundario" valor={registro.diagnostico_secundario} />
            {registro.recomendaciones && (
              <div className="col-span-2"><CampoImpreso label="Recomendaciones" valor={registro.recomendaciones} /></div>
            )}
            {registro.proximo_control && (
              <CampoImpreso label="Próximo control" valor={formatFecha(registro.proximo_control)} />
            )}
          </div>
        )}
      </div>

      <div className="mt-16 grid grid-cols-2 gap-8">
        <div className="border-t border-gray-400 pt-1 text-center text-[10px] text-gray-500">
          Firma del médico responsable
        </div>
        <div className="border-t border-gray-400 pt-1 text-center text-[10px] text-gray-500">
          Sello de la institución
        </div>
      </div>

      {registro.estado === "revisado" && registro.revisado_en && (
        <p className="mt-6 text-[10px] text-gray-400">
          {(revisorNombre ?? registro.medico_nombre) ? `Revisado por ${revisorNombre ?? registro.medico_nombre}` : "Revisado"}
          {" "}· {formatFechaHora(registro.revisado_en)}
        </p>
      )}
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
  const [versiones, setVersiones] = useState<VersionInforme[]>([]);
  const [historialAbierto, setHistorialAbierto] = useState(false);

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
    fetch(`/api/registros-ecg/${registroId}/versiones`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (!cancelado) setVersiones(Array.isArray(data) ? data : []); })
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
    <main className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950 print:bg-white">
      <div className="print:hidden border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700
                         px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors
                         hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Descargar informe en PDF"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
              Descargar PDF
            </button>
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${est.cls}`}>
              <Icon className={`h-3.5 w-3.5 ${registro.estado === "en_proceso" ? "animate-spin" : ""}`}
                    strokeWidth={2} />
              {est.label}
            </span>
          </div>
        </div>
      </div>

      <ReporteImprimible paciente={paciente} registro={registro} revisorNombre={revisorNombre} />

      <div className="print:hidden mx-auto w-full max-w-3xl flex-1 space-y-4 px-6 py-6">

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

        <Seccion
          icon={HeartPulse}
          titulo="Informe"
          accion={registro.estado !== "pendiente" && puedeRevisar ? (
            <button
              onClick={() => router.push(`/pacientes/${id}/registros/${registroId}/revisar`)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700
                         px-3 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-colors
                         hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Stamp className="h-3 w-3" strokeWidth={2} />
              Corregir informe
            </button>
          ) : undefined}
        >
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
              {registro.proximo_control && (
                <div className="sm:col-span-2 flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-2">
                  <CalendarClock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" strokeWidth={1.75} />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Próximo control: {formatFecha(registro.proximo_control)}
                  </span>
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

        {versiones.length > 0 && (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <button
              onClick={() => setHistorialAbierto((v) => !v)}
              className="flex w-full items-center gap-2 px-5 py-4 text-left"
            >
              <History className="h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={1.75} />
              <h2 className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Historial de revisiones ({versiones.length})
              </h2>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${historialAbierto ? "rotate-180" : ""}`}
                strokeWidth={1.75}
              />
            </button>

            {historialAbierto && (
              <div className="space-y-3 border-t border-gray-50 dark:border-gray-800 px-5 py-4">
                {versiones.map((v) => (
                  <div key={v.id} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Versión {v.version} · reemplazada por <span className="font-medium text-gray-600 dark:text-gray-300">{v.reemplazado_por_nombre}</span> · {formatFechaHora(v.creado_en)}
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Campo label="Diagnóstico">{v.diagnostico ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</Campo>
                      <Campo label="Frecuencia cardíaca">
                        {v.fc_registrada != null ? `${v.fc_registrada} lpm` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </Campo>
                      {v.descripcion_hallazgos && (
                        <div className="sm:col-span-2"><Campo label="Hallazgos">{v.descripcion_hallazgos}</Campo></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
