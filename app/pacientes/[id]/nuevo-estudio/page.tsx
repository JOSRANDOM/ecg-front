"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Activity, Play, Square, FileText, Loader2 } from "lucide-react";
import type { Paciente, UsuarioBasico } from "../../_types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "datos" | "ecg" | "informe";

interface FormInforme {
  ritmo:                string[];
  fcRegistrada:         string;
  alteraciones:         string[];
  descripcionHallazgos: string;
  diagnostico:          string;
  diagnosticoSecundario:string;
  recomendaciones:      string;
  proximoControl:       string;
}

const INFORME_INICIAL: FormInforme = {
  ritmo: [], fcRegistrada: "", alteraciones: [],
  descripcionHallazgos: "", diagnostico: "",
  diagnosticoSecundario: "", recomendaciones: "", proximoControl: "",
};

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

interface FormEstudio {
  tecnicoId:           string;
  medicoId:            string;
  sintomas:            string[];
  descripcionSintomas: string;
  antecedentes:        string[];
  antecedentesExtra:   string;
  notas:               string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FORM_INICIAL: FormEstudio = {
  tecnicoId: "", medicoId: "",
  sintomas: [], descripcionSintomas: "",
  antecedentes: [], antecedentesExtra: "", notas: "",
};

const SINTOMAS_OPCIONES = [
  "Dolor torácico", "Disnea", "Palpitaciones", "Mareos / síncope",
  "Fatiga", "Edema en extremidades", "Dolor irradiado al brazo", "Otros",
];

const ANTECEDENTES_OPCIONES = [
  "Hipertensión arterial", "Diabetes mellitus", "Cardiopatía previa",
  "EPOC", "Tabaquismo", "Dislipidemia", "Fibrilación auricular", "Obesidad",
];

// ── ECG data ──────────────────────────────────────────────────────────────────

const LEADS = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];

const LEAD_AMP: Record<string, number> = {
  I: 0.35, II: 0.65, III: 0.30,
  aVR: -0.22, aVL: 0.18, aVF: 0.48,
  V1: 0.28, V2: 0.55, V3: 0.75,
  V4: 0.88, V5: 0.65, V6: 0.42,
};

// P wave · QRS complex · T wave
const ECG_CYCLE = [
  0, 0, 0.04, 0.09, 0.04, 0, 0,
  -0.06, -0.22, 1.0, 0.22, -0.06, 0, 0,
  0, 0.16, 0.36, 0.16, 0, 0, 0, 0, 0,
];
const CYCLE_LEN = ECG_CYCLE.length;

function ecgSample(t: number, lead: string): number {
  return ECG_CYCLE[Math.floor(t) % CYCLE_LEN] * LEAD_AMP[lead];
}

// ── Chip group ────────────────────────────────────────────────────────────────

function ChipGroup({ opciones, seleccionadas, onChange }: {
  opciones: string[];
  seleccionadas: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map(op => {
        const active = seleccionadas.includes(op);
        return (
          <button key={op} type="button"
            onClick={() => onChange(
              active ? seleccionadas.filter(s => s !== op) : [...seleccionadas, op]
            )}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors
              ${active
                ? "border-blue-500 bg-blue-50 text-blue-600"
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

// ── ECG canvas ────────────────────────────────────────────────────────────────

function EcgCanvas({
  isRunning,
  onFcUpdate,
}: {
  isRunning: boolean;
  onFcUpdate: (fc: number) => void;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const animRef       = useRef(0);
  const offsetRef     = useRef(0);
  const frameRef      = useRef(0);
  const isRunningRef  = useRef(isRunning);
  const onFcRef       = useRef(onFcUpdate);

  useEffect(() => { isRunningRef.current = isRunning; },  [isRunning]);
  useEffect(() => { onFcRef.current      = onFcUpdate; }, [onFcUpdate]);

  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;
    const ctx       = canvas.getContext("2d")!;

    // Keep canvas pixel-perfect with its container
    const ro = new ResizeObserver(() => {
      canvas.width  = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    ro.observe(container);
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;

    const LABEL_W     = 46;
    const GRID_SM     = 10;
    const GRID_LG     = 50;
    const SPEED       = 1.8;   // px / frame
    const SAMPLES_PX  = 0.45;  // ECG samples per pixel

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      const CW = W - LABEL_W;
      const LH = H / LEADS.length;

      // Background
      ctx.fillStyle = "#050c05";
      ctx.fillRect(0, 0, W, H);

      // Minor grid lines
      ctx.lineWidth    = 0.35;
      ctx.strokeStyle  = "rgba(0,110,0,0.35)";
      for (let x = LABEL_W; x < W; x += GRID_SM) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += GRID_SM) {
        ctx.beginPath(); ctx.moveTo(LABEL_W, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Major grid lines
      ctx.lineWidth    = 0.65;
      ctx.strokeStyle  = "rgba(0,175,0,0.5)";
      for (let x = LABEL_W; x < W; x += GRID_LG) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += GRID_LG) {
        ctx.beginPath(); ctx.moveTo(LABEL_W, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Lead separator lines
      ctx.strokeStyle = "rgba(0,80,0,0.55)";
      ctx.lineWidth   = 0.6;
      for (let i = 1; i < LEADS.length; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * LH); ctx.lineTo(W, i * LH); ctx.stroke();
      }

      // Label column background
      ctx.fillStyle = "#050c05";
      ctx.fillRect(0, 0, LABEL_W, H);

      // Draw each lead
      LEADS.forEach((lead, i) => {
        const midY = (i + 0.5) * LH;
        const scale = LH * 0.30;

        // Label
        ctx.fillStyle  = "#7aaa7a";
        ctx.font       = "11px monospace";
        ctx.textAlign  = "center";
        ctx.fillText(lead, LABEL_W / 2, midY + 4);

        if (!isRunningRef.current) {
          // Flat baseline when stopped
          ctx.strokeStyle = "rgba(160,200,0,0.3)";
          ctx.lineWidth   = 0.8;
          ctx.beginPath();
          ctx.moveTo(LABEL_W, midY);
          ctx.lineTo(W, midY);
          ctx.stroke();
          return;
        }

        // ECG trace
        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth   = 1.15;
        ctx.shadowColor = "rgba(160,255,0,0.3)";
        ctx.shadowBlur  = 2.5;
        ctx.beginPath();
        for (let px = 0; px < CW; px++) {
          const t = (offsetRef.current + px) * SAMPLES_PX;
          const v = ecgSample(t, lead);
          const y = midY - v * scale;
          px === 0 ? ctx.moveTo(LABEL_W, y) : ctx.lineTo(LABEL_W + px, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      if (isRunningRef.current) {
        offsetRef.current += SPEED;
        frameRef.current++;
        if (frameRef.current % 90 === 0) {
          onFcRef.current(70 + Math.round(Math.sin(offsetRef.current / 300) * 6));
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NuevoEstudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [paciente,  setPaciente]  = useState<Paciente | null>(null);
  const [cargando,  setCargando]  = useState(true);
  const [tab,       setTab]       = useState<Tab>("datos");
  const [informe,   setInforme]   = useState<FormInforme>(INFORME_INICIAL);
  const [form,      setForm]      = useState<FormEstudio>(FORM_INICIAL);
  const [running,   setRunning]   = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [fc,        setFc]        = useState(0);
  const [tecnicos,  setTecnicos]  = useState<UsuarioBasico[]>([]);
  const [medicos,   setMedicos]   = useState<UsuarioBasico[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [resPaciente, resTec, resMed] = await Promise.all([
          fetch(`/api/pacientes/${id}`),
          fetch("/api/usuarios?rol=tecnico&activo=true"),
          fetch("/api/usuarios?rol=medico&activo=true"),
        ]);
        if (resPaciente.ok) setPaciente(await resPaciente.json());
        if (resTec.ok) {
          const lista: UsuarioBasico[] = await resTec.json();
          setTecnicos(lista);
          if (lista.length > 0) setForm(prev => ({ ...prev, tecnicoId: lista[0].id }));
        }
        if (resMed.ok) setMedicos(await resMed.json());
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  function setField<K extends keyof FormEstudio>(key: K, val: FormEstudio[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleIniciar() {
    setElapsed(0);
    setFc(72);
    setRunning(true);
  }

  async function handleRegistrar() {
    setRunning(false);
    const tecnico = tecnicos.find(t => t.id === form.tecnicoId);
    if (!tecnico) {
      setErrorGuardar("Selecciona un técnico responsable del estudio.");
      setTab("datos");
      return;
    }
    const medico = medicos.find(m => m.id === form.medicoId);

    setGuardando(true);
    setErrorGuardar("");

    const payloadBase = {
      tecnico_id: tecnico.id,
      tecnico_nombre: tecnico.nombre_completo,
      medico_id: medico?.id ?? null,
      medico_nombre: medico?.nombre_completo ?? null,
      sintomas: form.sintomas,
      descripcion_sintomas: form.descripcionSintomas || null,
      antecedentes: form.antecedentes,
      antecedentes_extra: form.antecedentesExtra || null,
      notas: form.notas || null,
    };

    const tieneInforme = informe.ritmo.length > 0 || informe.alteraciones.length > 0
      || informe.fcRegistrada || informe.descripcionHallazgos
      || informe.diagnostico || informe.diagnosticoSecundario || informe.recomendaciones;

    const payload = tieneInforme ? {
      ...payloadBase,
      ritmo: informe.ritmo,
      fc_registrada: informe.fcRegistrada ? Number(informe.fcRegistrada) : null,
      alteraciones: informe.alteraciones,
      descripcion_hallazgos: informe.descripcionHallazgos || null,
      diagnostico: informe.diagnostico || null,
      diagnostico_secundario: informe.diagnosticoSecundario || null,
      recomendaciones: informe.recomendaciones || null,
      proximo_control: informe.proximoControl || null,
    } : payloadBase;

    try {
      let res = await fetch(`/api/pacientes/${id}/registros-ecg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Sin permiso para incluir el informe (ej. técnico sin ecg:revisar):
      // reintentar sin esa parte, el estudio queda pendiente de revisión.
      if (res.status === 403 && tieneInforme) {
        res = await fetch(`/api/pacientes/${id}/registros-ecg`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadBase),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorGuardar(data?.detail || "No se pudo guardar el estudio.");
        setGuardando(false);
        return;
      }

      router.push(`/pacientes/${id}`);
    } catch {
      setErrorGuardar("No se pudo conectar con el servidor.");
      setGuardando(false);
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (cargando) return (
    <main className="flex flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <Loader2 className="h-6 w-6 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
    </main>
  );

  if (!paciente) return (
    <main className="flex flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <p className="text-sm text-gray-400 dark:text-gray-500">Paciente no encontrado.</p>
    </main>
  );

  return (
    <main className="flex flex-1 flex-col bg-white dark:bg-gray-900 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-3 dark:border-gray-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Volver
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Nuevo estudio —{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-100">{paciente.nombre_completo}</span>
        </p>

        {/* Tab switcher */}
        <div className="ml-auto flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {([
            { key: "datos",   label: "Datos clínicos", Icon: ClipboardList },
            { key: "ecg",     label: "Captura ECG",    Icon: Activity      },
            { key: "informe", label: "Informe",         Icon: FileText      },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors
                ${tab === key
                  ? "bg-white shadow-sm text-gray-800 dark:bg-gray-900 dark:text-gray-100"
                  : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Datos clínicos ─────────────────────────────────────────── */}
      {tab === "datos" && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">

            {/* Asignación */}
            <section>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Asignación
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Técnico</label>
                  <select
                    value={form.tecnicoId}
                    onChange={e => setField("tecnicoId", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                               text-sm text-gray-700 outline-none focus:border-blue-400 focus:bg-white
                               dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-900"
                  >
                    {tecnicos.length === 0 && <option value="">Sin técnicos disponibles</option>}
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Médico</label>
                  <select
                    value={form.medicoId}
                    onChange={e => setField("medicoId", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                               text-sm text-gray-700 outline-none focus:border-blue-400 focus:bg-white
                               dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-900"
                  >
                    <option value="">Sin asignar</option>
                    {medicos.map(m => <option key={m.id} value={m.id}>{m.nombre_completo}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Síntomas */}
            <section>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Síntomas actuales
              </h3>
              <ChipGroup
                opciones={SINTOMAS_OPCIONES}
                seleccionadas={form.sintomas}
                onChange={v => setField("sintomas", v)}
              />
              <textarea
                value={form.descripcionSintomas}
                onChange={e => setField("descripcionSintomas", e.target.value)}
                placeholder="Descripción: inicio, duración, intensidad…"
                rows={3}
                className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                           text-sm text-gray-700 placeholder:text-gray-300 outline-none
                           focus:border-blue-400 focus:bg-white
                           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
              />
            </section>

            {/* Antecedentes */}
            <section>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Antecedentes médicos
              </h3>
              <ChipGroup
                opciones={ANTECEDENTES_OPCIONES}
                seleccionadas={form.antecedentes}
                onChange={v => setField("antecedentes", v)}
              />
              <textarea
                value={form.antecedentesExtra}
                onChange={e => setField("antecedentesExtra", e.target.value)}
                placeholder="Antecedentes adicionales, cirugías, alergias, medicamentos…"
                rows={3}
                className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                           text-sm text-gray-700 placeholder:text-gray-300 outline-none
                           focus:border-blue-400 focus:bg-white
                           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
              />
            </section>

            {/* Notas */}
            <section>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Notas del médico
              </h3>
              <textarea
                value={form.notas}
                onChange={e => setField("notas", e.target.value)}
                placeholder="Observaciones adicionales antes del estudio…"
                rows={2}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                           text-sm text-gray-700 placeholder:text-gray-300 outline-none
                           focus:border-blue-400 focus:bg-white
                           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
              />
            </section>

            <div className="flex justify-end pb-8">
              <button
                onClick={() => setTab("ecg")}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white
                           transition-colors hover:bg-blue-700"
              >
                Continuar a captura →
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Tab: Captura ECG ────────────────────────────────────────────── */}
      {tab === "ecg" && (
        <div className="flex flex-1 overflow-hidden">

          {/* ECG canvas area */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[#050c05]">

            {/* Top info bar */}
            <div className="flex flex-shrink-0 items-center gap-5 border-b border-[#0d1f0d] px-4 py-2">
              {/* Timer */}
              <div>
                <p className="text-[9px] font-mono text-green-700">
                  {running ? "Grabando..." : "Preparar..."}
                </p>
                <p className="font-mono text-xl font-bold leading-none text-[#00ff88]">
                  {mm}:{ss}
                </p>
              </div>
              <div className="h-8 w-px bg-[#0d2a0d]" />
              {/* FC */}
              <div className="text-center">
                <p className="text-[9px] font-mono text-green-700">FC</p>
                <p className="font-mono text-xl font-bold leading-none text-[#00ff88]">
                  {running ? fc : "--"}
                </p>
                <p className="text-[9px] font-mono text-green-800">bpm</p>
              </div>
              <div className="h-8 w-px bg-[#0d2a0d]" />
              {/* Patient */}
              <div>
                <p className="font-mono text-[11px] text-green-400">{paciente.nombre_completo}</p>
                <p className="font-mono text-[10px] text-green-700">
                  {paciente.documento} · {paciente.edad} años · {paciente.tipo_sangre}
                </p>
              </div>
              {/* Speed / gain */}
              <div className="ml-auto flex gap-6 font-mono text-[10px]">
                <span>
                  <span className="text-green-800">Velocidad: </span>
                  <span className="text-green-500">25 mm/s</span>
                </span>
                <span>
                  <span className="text-green-800">Ganancia: </span>
                  <span className="text-green-500">10 mm/mV</span>
                </span>
                <span>
                  <span className="text-green-800">Deriv.: </span>
                  <span className="text-green-500">I II III aVR aVL aVF V1–V6</span>
                </span>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-hidden">
              <EcgCanvas isRunning={running} onFcUpdate={setFc} />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex w-52 flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">

            {/* FC channel */}
            <div className="border-b border-gray-200 p-3 dark:border-gray-700">
              <p className="mb-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-500">
                Canal de Frecuencia Cardíaca
              </p>
              <select className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none
                                 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                {["V5","V1","V2","V3","V4","V6","I","II"].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* View preferences */}
            <div className="border-b border-gray-200 p-3 space-y-2 dark:border-gray-700">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-500">Ver preferencias</p>
              {[
                { label: "Estilo",  opts: ["12 Leads 1 Column","12 Leads 2 Column"] },
                { label: "Speed",   opts: ["25.0 mm/s","50.0 mm/s","12.5 mm/s"] },
                { label: "Gain",    opts: ["10 mm/mV","20 mm/mV","5 mm/mV"] },
              ].map(({ label, opts }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500">{label}</p>
                  <select className="mt-0.5 w-full rounded border border-gray-200 bg-white px-2 py-1
                                     text-[10px] text-gray-600 outline-none
                                     dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="border-b border-gray-200 p-3 space-y-1.5 dark:border-gray-700">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-500">Configuración de filtro</p>
              {[
                { id: "base", label: "Filtro base", def: false },
                { id: "pf",   label: "Filtro PF",   def: true  },
                { id: "emg",  label: "Filtro EMG",  def: false },
              ].map(f => (
                <label key={f.id} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    defaultChecked={f.def}
                    className="h-3 w-3 accent-blue-500"
                  />
                  <span className="text-[10px] text-gray-600 dark:text-gray-300">{f.label}</span>
                </label>
              ))}
            </div>

            {/* Events table */}
            <div className="flex-1 overflow-hidden border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                {["Evento","Reloj","Tiempo"].map(h => (
                  <span key={h} className="px-1 py-1 text-center text-[9px] font-semibold text-gray-500 dark:text-gray-500">
                    {h}
                  </span>
                ))}
              </div>
              {running && elapsed >= 3 && (
                <div className="grid grid-cols-3 px-1 py-1 text-[9px] text-gray-400 dark:text-gray-500">
                  <span className="text-center">Inicio</span>
                  <span className="text-center">00:00</span>
                  <span className="text-center">0s</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2 p-3">
              {!running ? (
                <button
                  onClick={handleIniciar}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2
                             text-xs font-semibold text-white transition-colors hover:bg-green-700"
                >
                  <Play className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                  Iniciar
                </button>
              ) : (
                <button
                  onClick={() => setRunning(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 py-2
                             text-xs font-semibold text-white transition-colors hover:bg-red-600"
                >
                  <Square className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                  Parar
                </button>
              )}

              <button
                onClick={() => { setRunning(false); setTab("informe"); }}
                disabled={running}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-semibold
                           text-blue-600 transition-colors hover:bg-blue-100
                           disabled:cursor-not-allowed disabled:opacity-40
                           dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              >
                Registrar impresión de ECG
              </button>

              <button
                onClick={() => router.back()}
                className="w-full rounded-lg border border-gray-200 py-2 text-xs font-medium
                           text-gray-500 transition-colors hover:bg-gray-100
                           dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800"
              >
                Salir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Tab: Informe ────────────────────────────────────────────────── */}
      {tab === "informe" && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-10 px-6 py-8">

            {/* Ritmo */}
            <section>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Ritmo cardíaco
              </h3>
              <p className="mb-3 text-[11px] text-gray-400 dark:text-gray-500">Seleccione el o los ritmos identificados</p>
              <div className="flex flex-wrap gap-2">
                {RITMO_OPCIONES.map(op => {
                  const active = informe.ritmo.includes(op);
                  return (
                    <button key={op} type="button"
                      onClick={() => setInforme(prev => ({
                        ...prev,
                        ritmo: active ? prev.ritmo.filter(r => r !== op) : [...prev.ritmo, op],
                      }))}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors
                        ${active
                          ? "border-violet-500 bg-violet-50 text-violet-600"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                        }`}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* FC registrada */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Frecuencia cardíaca registrada
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={20} max={300}
                  value={informe.fcRegistrada}
                  onChange={e => setInforme(prev => ({ ...prev, fcRegistrada: e.target.value }))}
                  placeholder="Ej. 75"
                  className="w-32 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm
                             text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:bg-white
                             dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
                />
                <span className="text-sm text-gray-400 dark:text-gray-500">lpm</span>
              </div>
            </section>

            {/* Alteraciones */}
            <section>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Hallazgos / Alteraciones
              </h3>
              <p className="mb-3 text-[11px] text-gray-400 dark:text-gray-500">Marque todas las alteraciones encontradas en el trazado</p>
              <div className="flex flex-wrap gap-2">
                {ALTERACIONES_ECG_OPCIONES.map(op => {
                  const active = informe.alteraciones.includes(op);
                  return (
                    <button key={op} type="button"
                      onClick={() => setInforme(prev => ({
                        ...prev,
                        alteraciones: active
                          ? prev.alteraciones.filter(a => a !== op)
                          : [...prev.alteraciones, op],
                      }))}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors
                        ${active
                          ? "border-rose-400 bg-rose-50 text-rose-600"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                        }`}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={informe.descripcionHallazgos}
                onChange={e => setInforme(prev => ({ ...prev, descripcionHallazgos: e.target.value }))}
                placeholder="Descripción libre de los hallazgos observados en el trazado ECG…"
                rows={4}
                className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                           text-sm text-gray-700 placeholder:text-gray-300 outline-none
                           focus:border-blue-400 focus:bg-white
                           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
              />
            </section>

            {/* Diagnóstico */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Diagnóstico
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Diagnóstico principal
                  </label>
                  <textarea
                    value={informe.diagnostico}
                    onChange={e => setInforme(prev => ({ ...prev, diagnostico: e.target.value }))}
                    placeholder="Ej. Ritmo sinusal con taquicardia leve. Sin alteraciones del segmento ST…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                               text-sm text-gray-700 placeholder:text-gray-300 outline-none
                               focus:border-blue-400 focus:bg-white
                               dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Diagnóstico secundario <span className="text-gray-300 dark:text-gray-600">(opcional)</span>
                  </label>
                  <textarea
                    value={informe.diagnosticoSecundario}
                    onChange={e => setInforme(prev => ({ ...prev, diagnosticoSecundario: e.target.value }))}
                    placeholder="Comorbilidades o hallazgos secundarios…"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                               text-sm text-gray-700 placeholder:text-gray-300 outline-none
                               focus:border-blue-400 focus:bg-white
                               dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
                  />
                </div>
              </div>
            </section>

            {/* Recomendaciones */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Conclusión y recomendaciones
              </h3>
              <textarea
                value={informe.recomendaciones}
                onChange={e => setInforme(prev => ({ ...prev, recomendaciones: e.target.value }))}
                placeholder="Recomendaciones clínicas, seguimiento, derivaciones a especialista…"
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                           text-sm text-gray-700 placeholder:text-gray-300 outline-none
                           focus:border-blue-400 focus:bg-white
                           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:bg-gray-900"
              />
            </section>

            {/* Próximo control */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Próximo control (opcional)
              </h3>
              <input
                type="date"
                value={informe.proximoControl}
                onChange={e => setInforme(prev => ({ ...prev, proximoControl: e.target.value }))}
                className="w-full max-w-[200px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                           text-sm text-gray-700 outline-none
                           focus:border-blue-400 focus:bg-white
                           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-900"
              />
            </section>

            {/* Guardar */}
            <div className="flex flex-col items-end gap-2 pb-10">
              {errorGuardar && <p className="text-xs text-red-500 dark:text-red-400">{errorGuardar}</p>}
              <button
                onClick={handleRegistrar}
                disabled={guardando}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold
                           text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                {guardando ? "Guardando…" : "Guardar informe y finalizar"}
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
