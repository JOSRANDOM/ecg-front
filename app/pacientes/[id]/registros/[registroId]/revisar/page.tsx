"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, HeartPulse } from "lucide-react";
import type { Paciente, RegistroEcg } from "../../../../_types";

const RITMO_OPCIONES = [
  "Sinusal normal","Taquicardia sinusal","Bradicardia sinusal",
  "Fibrilación auricular","Flutter auricular",
  "Taquicardia supraventricular","Ritmo de marcapasos",
];

const ALTERACIONES_ECG_OPCIONES = [
  "Elevación del ST","Depresión del ST","Inversión onda T",
  "Ondas Q patológicas","Bloqueo rama derecha","Bloqueo rama izquierda",
  "Hipertrofia VI","Hipertrofia VD",
  "Extrasístoles ventriculares","Extrasístoles supraventriculares",
];

function ChipGroup({ opciones, seleccionadas, onChange }: {
  opciones: string[];
  seleccionadas: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => {
        const activo = seleccionadas.includes(op);
        return (
          <button key={op} type="button"
            onClick={() => onChange(
              activo ? seleccionadas.filter((s) => s !== op) : [...seleccionadas, op]
            )}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors
              ${activo
                ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
          >
            {op}
          </button>
        );
      })}
    </div>
  );
}

export default function RevisarRegistroPage() {
  const { id, registroId } = useParams<{ id: string; registroId: string }>();
  const router = useRouter();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [registro, setRegistro] = useState<RegistroEcg | null>(null);
  const [medico, setMedico] = useState<{ id: string; nombre_completo: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [ritmo, setRitmo] = useState<string[]>([]);
  const [fcRegistrada, setFcRegistrada] = useState("");
  const [alteraciones, setAlteraciones] = useState<string[]>([]);
  const [descripcionHallazgos, setDescripcionHallazgos] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [diagnosticoSecundario, setDiagnosticoSecundario] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [proximoControl, setProximoControl] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [resPaciente, resRegistro, resMe] = await Promise.all([
          fetch(`/api/pacientes/${id}`),
          fetch(`/api/registros-ecg/${registroId}`),
          fetch("/api/auth/me"),
        ]);
        if (resPaciente.status === 404 || resRegistro.status === 404) {
          if (!cancelado) setNotFound(true);
          return;
        }
        if (!resPaciente.ok || !resRegistro.ok || !resMe.ok) throw new Error();

        const [dataPaciente, dataRegistro, sesion] = await Promise.all([
          resPaciente.json(), resRegistro.json(), resMe.json(),
        ]);
        if (cancelado) return;

        setPaciente(dataPaciente);
        setRegistro(dataRegistro);
        setRitmo(dataRegistro.ritmo ?? []);
        setFcRegistrada(dataRegistro.fc_registrada != null ? String(dataRegistro.fc_registrada) : "");
        setAlteraciones(dataRegistro.alteraciones ?? []);
        setDescripcionHallazgos(dataRegistro.descripcion_hallazgos ?? "");
        setDiagnostico(dataRegistro.diagnostico ?? "");
        setDiagnosticoSecundario(dataRegistro.diagnostico_secundario ?? "");
        setRecomendaciones(dataRegistro.recomendaciones ?? "");
        setProximoControl(dataRegistro.proximo_control ?? "");

        const resUsuario = await fetch(`/api/usuarios/${sesion.usuarioId}`);
        if (resUsuario.ok && !cancelado) {
          const usuario = await resUsuario.json();
          setMedico({ id: usuario.id, nombre_completo: usuario.nombre_completo });
        }
      } catch {
        if (!cancelado) setNotFound(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [id, registroId]);

  async function guardar() {
    if (!diagnostico.trim()) {
      setError("Ingresa al menos un diagnóstico antes de guardar.");
      return;
    }
    setError("");
    setGuardando(true);
    try {
      const res = await fetch(`/api/registros-ecg/${registroId}/revisar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ritmo,
          fc_registrada: fcRegistrada ? Number(fcRegistrada) : null,
          alteraciones,
          descripcion_hallazgos: descripcionHallazgos || null,
          diagnostico: diagnostico || null,
          diagnostico_secundario: diagnosticoSecundario || null,
          recomendaciones: recomendaciones || null,
          proximo_control: proximoControl || null,
          medico_id: medico?.id ?? null,
          medico_nombre: medico?.nombre_completo ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      router.push(`/pacientes/${id}/registros/${registroId}`);
    } catch {
      setError("No se pudo guardar el informe. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
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
        <button onClick={() => router.back()} className="mt-4 text-xs text-blue-500 underline underline-offset-2">
          Volver
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <button
          onClick={() => router.push(`/pacientes/${id}/registros/${registroId}`)}
          className="mb-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500
                     transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Volver al registro
        </button>
        <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Revisar estudio — {paciente.nombre_completo}
        </h1>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          Técnico: {registro.tecnico_nombre} · {registro.fecha.split("T")[0]}
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-6 py-6">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-blue-500 dark:text-blue-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Informe</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Ritmo</label>
              <ChipGroup opciones={RITMO_OPCIONES} seleccionadas={ritmo} onChange={setRitmo} />
            </div>

            <div className="max-w-[160px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Frecuencia cardíaca (lpm)
              </label>
              <input
                type="number"
                value={fcRegistrada}
                onChange={(e) => setFcRegistrada(e.target.value)}
                placeholder="Ej. 75"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                           px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition
                           focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Alteraciones</label>
              <ChipGroup opciones={ALTERACIONES_ECG_OPCIONES} seleccionadas={alteraciones} onChange={setAlteraciones} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Hallazgos</label>
              <textarea
                rows={2}
                value={descripcionHallazgos}
                onChange={(e) => setDescripcionHallazgos(e.target.value)}
                placeholder="Ej. Ritmo sinusal con taquicardia leve, sin alteraciones agudas del ST."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                           px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition
                           focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Diagnóstico <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={2}
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                placeholder="Ej. Ritmo sinusal normal, sin alteraciones significativas."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                           px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition
                           focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Diagnóstico secundario (opcional)
              </label>
              <input
                value={diagnosticoSecundario}
                onChange={(e) => setDiagnosticoSecundario(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                           px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition
                           focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Recomendaciones (opcional)
              </label>
              <textarea
                rows={2}
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                           px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition
                           focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
              />
            </div>

            <div className="max-w-[200px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Próximo control (opcional)
              </label>
              <input
                type="date"
                value={proximoControl}
                onChange={(e) => setProximoControl(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                           px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition
                           focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
        )}

        <button
          onClick={guardar}
          disabled={guardando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5
                     text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {guardando ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Guardando…</> : "Guardar informe"}
        </button>
      </div>
    </main>
  );
}
