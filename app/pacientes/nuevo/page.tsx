"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Activity, Play, Square, FileText } from "lucide-react";
import type { EstadoPaciente } from "../_data";

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
}

const INFORME_INICIAL: FormInforme = {
  ritmo: [], fcRegistrada: "", alteraciones: [],
  descripcionHallazgos: "", diagnostico: "",
  diagnosticoSecundario: "", recomendaciones: "",
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

interface FormPaciente {
  nombre:              string;
  documento:           string;
  edad:                string;
  telefono:            string;
  estado:              EstadoPaciente;
  tecnico:             string;
  medico:              string;
  sintomas:            string[];
  descripcionSintomas: string;
  antecedentes:        string[];
  antecedentesExtra:   string;
  notas:               string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TECNICOS        = ["Sofía Restrepo","Andrés Mora"];
const MEDICOS         = ["Dr. Ricardo Montoya","Dr. Camila Vásquez"];

const SINTOMAS_OPCIONES = [
  "Dolor torácico","Disnea","Palpitaciones","Mareos / síncope",
  "Fatiga","Edema en extremidades","Dolor irradiado al brazo","Otros",
];

const ANTECEDENTES_OPCIONES = [
  "Hipertensión arterial","Diabetes mellitus","Cardiopatía previa",
  "EPOC","Tabaquismo","Dislipidemia","Fibrilación auricular","Obesidad",
];

const ESTADO_LABELS: Record<EstadoPaciente, string> = {
  activo: "Activo", pendiente: "Pendiente", inactivo: "Inactivo",
};

const ESTADO_ACTIVE_CLS: Record<EstadoPaciente, string> = {
  activo:    "border-green-500 bg-green-50 text-green-700",
  pendiente: "border-yellow-400 bg-yellow-50 text-yellow-700",
  inactivo:  "border-gray-400 bg-gray-100 text-gray-600",
};

const FORM_INICIAL: FormPaciente = {
  nombre: "", documento: "", edad: "",
  telefono: "", estado: "activo",
  tecnico: "", medico: "",
  sintomas: [], descripcionSintomas: "",
  antecedentes: [], antecedentesExtra: "", notas: "",
};

// ── Small UI helpers ──────────────────────────────────────────────────────────

function inputCls(hasError = false) {
  return `w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm text-gray-700
          placeholder:text-gray-300 outline-none transition focus:bg-white
          ${hasError
            ? "border-red-300 focus:border-red-400"
            : "border-gray-200 focus:border-blue-400"}`;
}

function Field({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </h3>
  );
}

function ChipGroup({
  opciones, seleccionadas, onChange,
}: {
  opciones: string[]; seleccionadas: string[]; onChange: (v: string[]) => void;
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
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
          >
            {op}
          </button>
        );
      })}
    </div>
  );
}

// ── ECG data & canvas ─────────────────────────────────────────────────────────

const LEADS = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];

const LEAD_AMP: Record<string, number> = {
  I: 0.35, II: 0.65, III: 0.30,
  aVR: -0.22, aVL: 0.18, aVF: 0.48,
  V1: 0.28, V2: 0.55, V3: 0.75,
  V4: 0.88, V5: 0.65, V6: 0.42,
};

const ECG_CYCLE = [
  0, 0, 0.04, 0.09, 0.04, 0, 0,
  -0.06, -0.22, 1.0, 0.22, -0.06, 0, 0,
  0, 0.16, 0.36, 0.16, 0, 0, 0, 0, 0,
];
const CYCLE_LEN = ECG_CYCLE.length;

function ecgSample(t: number, lead: string): number {
  return ECG_CYCLE[Math.floor(t) % CYCLE_LEN] * LEAD_AMP[lead];
}

function EcgCanvas({
  isRunning, onFcUpdate,
}: {
  isRunning: boolean; onFcUpdate: (fc: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef(0);
  const offsetRef    = useRef(0);
  const frameRef     = useRef(0);
  const runRef       = useRef(isRunning);
  const fcCbRef      = useRef(onFcUpdate);

  useEffect(() => { runRef.current  = isRunning;   }, [isRunning]);
  useEffect(() => { fcCbRef.current = onFcUpdate;  }, [onFcUpdate]);

  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;
    const ctx       = canvas.getContext("2d")!;

    const ro = new ResizeObserver(() => {
      canvas.width  = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    ro.observe(container);
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;

    const LABEL_W = 46, GRID_SM = 10, GRID_LG = 50, SPEED = 1.8, SPX = 0.45;

    function draw() {
      const W = canvas.width, H = canvas.height;
      const CW = W - LABEL_W, LH = H / LEADS.length;

      ctx.fillStyle = "#050c05";
      ctx.fillRect(0, 0, W, H);

      ctx.lineWidth = 0.35;
      ctx.strokeStyle = "rgba(0,110,0,0.35)";
      for (let x = LABEL_W; x < W; x += GRID_SM) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += GRID_SM)        { ctx.beginPath(); ctx.moveTo(LABEL_W,y); ctx.lineTo(W,y); ctx.stroke(); }

      ctx.lineWidth = 0.65;
      ctx.strokeStyle = "rgba(0,175,0,0.5)";
      for (let x = LABEL_W; x < W; x += GRID_LG) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += GRID_LG)        { ctx.beginPath(); ctx.moveTo(LABEL_W,y); ctx.lineTo(W,y); ctx.stroke(); }

      ctx.strokeStyle = "rgba(0,80,0,0.55)";
      ctx.lineWidth = 0.6;
      for (let i = 1; i < LEADS.length; i++) {
        ctx.beginPath(); ctx.moveTo(0, i*LH); ctx.lineTo(W, i*LH); ctx.stroke();
      }

      ctx.fillStyle = "#050c05";
      ctx.fillRect(0, 0, LABEL_W, H);

      LEADS.forEach((lead, i) => {
        const midY = (i + 0.5) * LH, scale = LH * 0.30;

        ctx.fillStyle = "#7aaa7a";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(lead, LABEL_W / 2, midY + 4);

        if (!runRef.current) {
          ctx.strokeStyle = "rgba(160,200,0,0.3)";
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(LABEL_W, midY); ctx.lineTo(W, midY); ctx.stroke();
          return;
        }

        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth = 1.15;
        ctx.shadowColor = "rgba(160,255,0,0.3)";
        ctx.shadowBlur = 2.5;
        ctx.beginPath();
        for (let px = 0; px < CW; px++) {
          const v = ecgSample((offsetRef.current + px) * SPX, lead);
          const y = midY - v * scale;
          px === 0 ? ctx.moveTo(LABEL_W, y) : ctx.lineTo(LABEL_W + px, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      if (runRef.current) {
        offsetRef.current += SPEED;
        frameRef.current++;
        if (frameRef.current % 90 === 0) {
          fcCbRef.current(70 + Math.round(Math.sin(offsetRef.current / 300) * 6));
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NuevoPacientePage() {
  const router = useRouter();

  const [tab,     setTab]     = useState<Tab>("datos");
  const [informe, setInforme] = useState<FormInforme>(INFORME_INICIAL);
  const [form,    setForm]    = useState<FormPaciente>(FORM_INICIAL);
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormPaciente, string>>>({});
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [fc,      setFc]      = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  function set<K extends keyof FormPaciente>(key: K, val: FormPaciente[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormPaciente, string>> = {};
    if (!form.nombre.trim())    e.nombre    = "Requerido";
    if (!form.documento.trim()) e.documento = "Requerido";
    if (!form.telefono.trim())  e.telefono  = "Requerido";
    const edadN = Number(form.edad);
    if (!form.edad.trim() || isNaN(edadN) || edadN < 1 || edadN > 120)
      e.edad = "Ingresa una edad válida (1–120)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleContinuar() {
    if (!validate()) return;
    setTab("ecg");
    window.scrollTo(0, 0);
  }

  function handleRegistrar() {
    setRunning(false);
    router.push("/pacientes");
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <main className="flex flex-1 flex-col bg-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Volver
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <p className="text-xs font-semibold text-gray-800">Registrar nuevo paciente</p>

        {/* Tab switcher */}
        <div className="ml-auto flex rounded-xl bg-gray-100 p-1">
          {([
            { key: "datos",   label: "Datos del paciente", Icon: ClipboardList },
            { key: "ecg",     label: "Captura ECG",        Icon: Activity      },
            { key: "informe", label: "Informe",             Icon: FileText      },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => key === "ecg" ? handleContinuar() : setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors
                ${tab === key
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-400 hover:text-gray-600"
                }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Datos del paciente ─────────────────────────────────────── */}
      {tab === "datos" && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-10 px-6 py-8">

            {/* Identificación */}
            <section>
              <SectionTitle>Identificación del paciente</SectionTitle>
              <div className="space-y-4">
                <Field label="Nombre completo" error={errors.nombre} required>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => set("nombre", e.target.value)}
                    placeholder="Ej. María Fernanda López"
                    className={inputCls(!!errors.nombre)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Número de documento" error={errors.documento} required>
                    <input
                      type="text"
                      value={form.documento}
                      onChange={e => set("documento", e.target.value)}
                      placeholder="Ej. 1.023.456.789"
                      className={inputCls(!!errors.documento)}
                    />
                  </Field>
                  <Field label="Edad" error={errors.edad} required>
                    <input
                      type="number"
                      min={1} max={120}
                      value={form.edad}
                      onChange={e => set("edad", e.target.value)}
                      placeholder="Ej. 45"
                      className={inputCls(!!errors.edad)}
                    />
                  </Field>
                </div>

                <Field label="Teléfono" error={errors.telefono} required>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={e => set("telefono", e.target.value)}
                    placeholder="Ej. +57 310 234 5678"
                    className={inputCls(!!errors.telefono)}
                  />
                </Field>

                <Field label="Estado">
                  <div className="flex gap-2">
                    {(["activo","pendiente","inactivo"] as EstadoPaciente[]).map(est => (
                      <button
                        key={est}
                        type="button"
                        onClick={() => set("estado", est)}
                        className={`flex-1 rounded-xl border py-2 text-[11px] font-medium transition-colors
                          ${form.estado === est
                            ? ESTADO_ACTIVE_CLS[est]
                            : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                          }`}
                      >
                        {ESTADO_LABELS[est]}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </section>

            {/* Asignación */}
            <section>
              <SectionTitle>Asignación</SectionTitle>
              <div className="space-y-3">
                <Field label="Médico">
                  <select
                    value={form.medico}
                    onChange={e => set("medico", e.target.value)}
                    className={inputCls()}
                  >
                    <option value="">Sin asignar</option>
                    {MEDICOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>

                {form.tecnico ? (
                  <Field label="Técnico">
                    <div className="flex gap-2">
                      <select
                        value={form.tecnico}
                        onChange={e => set("tecnico", e.target.value)}
                        className={`${inputCls()} flex-1`}
                      >
                        {TECNICOS.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => set("tecnico", "")}
                        className="rounded-xl border border-gray-200 px-3 text-xs text-gray-400
                                   transition-colors hover:border-red-200 hover:text-red-400"
                      >
                        Quitar
                      </button>
                    </div>
                  </Field>
                ) : (
                  <button
                    type="button"
                    onClick={() => set("tecnico", TECNICOS[0])}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300
                               px-4 py-2.5 text-xs font-medium text-gray-400 transition-colors
                               hover:border-blue-400 hover:text-blue-500"
                  >
                    <span className="text-base leading-none">+</span>
                    Asignar técnico
                  </button>
                )}
              </div>
            </section>

            {/* Síntomas actuales */}
            <section>
              <SectionTitle>Síntomas actuales</SectionTitle>
              <ChipGroup
                opciones={SINTOMAS_OPCIONES}
                seleccionadas={form.sintomas}
                onChange={v => set("sintomas", v)}
              />
              <textarea
                value={form.descripcionSintomas}
                onChange={e => set("descripcionSintomas", e.target.value)}
                placeholder="Descripción: inicio, duración, intensidad…"
                rows={3}
                className={`mt-3 w-full resize-none ${inputCls()}`}
              />
            </section>

            {/* Antecedentes médicos */}
            <section>
              <SectionTitle>Antecedentes médicos</SectionTitle>
              <ChipGroup
                opciones={ANTECEDENTES_OPCIONES}
                seleccionadas={form.antecedentes}
                onChange={v => set("antecedentes", v)}
              />
              <textarea
                value={form.antecedentesExtra}
                onChange={e => set("antecedentesExtra", e.target.value)}
                placeholder="Antecedentes adicionales, cirugías, alergias, medicamentos…"
                rows={3}
                className={`mt-3 w-full resize-none ${inputCls()}`}
              />
            </section>

            {/* Notas del médico */}
            <section>
              <SectionTitle>Notas del médico</SectionTitle>
              <textarea
                value={form.notas}
                onChange={e => set("notas", e.target.value)}
                placeholder="Observaciones clínicas previas al estudio ECG…"
                rows={4}
                className={`w-full resize-none ${inputCls()}`}
              />
            </section>

            {/* CTA */}
            <div className="flex justify-end pb-10">
              <button
                onClick={handleContinuar}
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white
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

          {/* Canvas area */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[#050c05]">

            {/* Top bar */}
            <div className="flex flex-shrink-0 items-center gap-5 border-b border-[#0d1f0d] px-4 py-2">
              <div>
                <p className="text-[9px] font-mono text-green-700">
                  {running ? "Grabando..." : "Preparar..."}
                </p>
                <p className="font-mono text-xl font-bold leading-none text-[#00ff88]">
                  {mm}:{ss}
                </p>
              </div>
              <div className="h-8 w-px bg-[#0d2a0d]" />
              <div className="text-center">
                <p className="text-[9px] font-mono text-green-700">FC</p>
                <p className="font-mono text-xl font-bold leading-none text-[#00ff88]">
                  {running ? fc : "--"}
                </p>
                <p className="text-[9px] font-mono text-green-800">bpm</p>
              </div>
              <div className="h-8 w-px bg-[#0d2a0d]" />
              <div>
                <p className="font-mono text-[11px] text-green-400">
                  {form.nombre || "Nuevo paciente"}
                </p>
                <p className="font-mono text-[10px] text-green-700">
                  {form.documento} · {form.edad} años
                </p>
              </div>
              <div className="ml-auto flex gap-6 font-mono text-[10px]">
                <span><span className="text-green-800">Velocidad: </span><span className="text-green-500">25 mm/s</span></span>
                <span><span className="text-green-800">Ganancia: </span><span className="text-green-500">10 mm/mV</span></span>
                <span><span className="text-green-800">Deriv.: </span><span className="text-green-500">I II III aVR aVL aVF V1–V6</span></span>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-hidden">
              <EcgCanvas isRunning={running} onFcUpdate={setFc} />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex w-52 flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50">

            <div className="border-b border-gray-200 p-3">
              <p className="mb-1.5 text-[10px] font-semibold text-gray-500">Canal de Frecuencia Cardíaca</p>
              <select className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none">
                {["V5","V1","V2","V3","V4","V6","I","II"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <div className="border-b border-gray-200 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-gray-500">Ver preferencias</p>
              {[
                { label: "Estilo", opts: ["12 Leads 1 Column","12 Leads 2 Column"] },
                { label: "Speed",  opts: ["25.0 mm/s","50.0 mm/s","12.5 mm/s"]   },
                { label: "Gain",   opts: ["10 mm/mV","20 mm/mV","5 mm/mV"]       },
              ].map(({ label, opts }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-500">{label}</p>
                  <select className="mt-0.5 w-full rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 outline-none">
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="border-b border-gray-200 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-500">Configuración de filtro</p>
              {[
                { id: "base", label: "Filtro base", def: false },
                { id: "pf",   label: "Filtro PF",   def: true  },
                { id: "emg",  label: "Filtro EMG",  def: false },
              ].map(f => (
                <label key={f.id} className="flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" defaultChecked={f.def} className="h-3 w-3 accent-blue-500" />
                  <span className="text-[10px] text-gray-600">{f.label}</span>
                </label>
              ))}
            </div>

            <div className="flex-1 overflow-hidden border-b border-gray-200">
              <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-100">
                {["Evento","Reloj","Tiempo"].map(h => (
                  <span key={h} className="px-1 py-1 text-center text-[9px] font-semibold text-gray-500">{h}</span>
                ))}
              </div>
              {running && elapsed >= 3 && (
                <div className="grid grid-cols-3 px-1 py-1 text-[9px] text-gray-400">
                  <span className="text-center">Inicio</span>
                  <span className="text-center">00:00</span>
                  <span className="text-center">0s</span>
                </div>
              )}
            </div>

            <div className="space-y-2 p-3">
              {!running ? (
                <button
                  onClick={() => { setElapsed(0); setFc(72); setRunning(true); }}
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
                           disabled:cursor-not-allowed disabled:opacity-40"
              >
                Registrar impresión de ECG
              </button>
              <button
                onClick={() => router.back()}
                className="w-full rounded-lg border border-gray-200 py-2 text-xs font-medium
                           text-gray-500 transition-colors hover:bg-gray-100"
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
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Ritmo cardíaco
              </h3>
              <p className="mb-3 text-[11px] text-gray-400">Seleccione el o los ritmos identificados</p>
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
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
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
                             text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:bg-white"
                />
                <span className="text-sm text-gray-400">lpm</span>
              </div>
            </section>

            {/* Alteraciones */}
            <section>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Hallazgos / Alteraciones
              </h3>
              <p className="mb-3 text-[11px] text-gray-400">Marque todas las alteraciones encontradas en el trazado</p>
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
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
                           focus:border-blue-400 focus:bg-white"
              />
            </section>

            {/* Diagnóstico */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Diagnóstico
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Diagnóstico principal
                  </label>
                  <textarea
                    value={informe.diagnostico}
                    onChange={e => setInforme(prev => ({ ...prev, diagnostico: e.target.value }))}
                    placeholder="Ej. Ritmo sinusal con taquicardia leve. Sin alteraciones del segmento ST…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                               text-sm text-gray-700 placeholder:text-gray-300 outline-none
                               focus:border-blue-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Diagnóstico secundario <span className="text-gray-300">(opcional)</span>
                  </label>
                  <textarea
                    value={informe.diagnosticoSecundario}
                    onChange={e => setInforme(prev => ({ ...prev, diagnosticoSecundario: e.target.value }))}
                    placeholder="Comorbilidades o hallazgos secundarios…"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                               text-sm text-gray-700 placeholder:text-gray-300 outline-none
                               focus:border-blue-400 focus:bg-white"
                  />
                </div>
              </div>
            </section>

            {/* Recomendaciones */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Conclusión y recomendaciones
              </h3>
              <textarea
                value={informe.recomendaciones}
                onChange={e => setInforme(prev => ({ ...prev, recomendaciones: e.target.value }))}
                placeholder="Recomendaciones clínicas, seguimiento, derivaciones a especialista…"
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5
                           text-sm text-gray-700 placeholder:text-gray-300 outline-none
                           focus:border-blue-400 focus:bg-white"
              />
            </section>

            {/* Guardar */}
            <div className="flex justify-end pb-10">
              <button
                onClick={handleRegistrar}
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white
                           transition-colors hover:bg-blue-700"
              >
                Guardar informe y finalizar
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
