"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, RotateCcw, Usb, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "done" | "error";

interface Steps {
  download:   StepStatus;
  connection: StepStatus;
  detection:  StepStatus;
}

interface DeviceInfo {
  device_name: string | null;
  port:        string | null;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const API_URL          = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 90_000;

const INITIAL_STEPS: Steps = {
  download:   "pending",
  connection: "pending",
  detection:  "pending",
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

function StepIcon({ index, status, activeColor = "blue" }: {
  index:        number;
  status:       StepStatus;
  activeColor?: "blue" | "yellow";
}) {
  if (status === "done")
    return <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-500" strokeWidth={1.75} />;

  if (status === "error")
    return <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-400" strokeWidth={1.75} />;

  if (status === "active") {
    if (activeColor === "yellow")
      return (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full
                         bg-yellow-400 text-[11px] font-bold text-white ring-4 ring-yellow-50">
          {index}
        </span>
      );
    return (
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full
                       bg-blue-600 text-[11px] font-bold text-white ring-4 ring-blue-50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full
                     border border-gray-200 bg-white text-[11px] font-semibold text-gray-300">
      {index}
    </span>
  );
}

function StepConnector({ topDone }: { topDone: boolean }) {
  return (
    <div className="ml-3 my-1 h-5 w-px transition-colors duration-500"
         style={{ backgroundColor: topDone ? "#22c55e" : "#e5e7eb" }} />
  );
}

function StepItem({
  index, label, hint, status, activeColor = "blue", action,
}: {
  index:        number;
  label:        string;
  hint?:        string;
  status:       StepStatus;
  activeColor?: "blue" | "yellow";
  action?:      { label: string; onClick: () => void };
}) {
  const labelColor =
    status === "done"                               ? "text-green-700" :
    status === "active" && activeColor === "yellow" ? "text-yellow-600" :
    status === "active"                             ? "text-blue-700"  :
    status === "error"                              ? "text-red-500"   :
                                                      "text-gray-400";

  return (
    <div className="flex items-start gap-3">
      <StepIcon index={index} status={status} activeColor={activeColor} />
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium transition-colors duration-300 ${labelColor}`}>
            {label}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs text-blue-500 underline underline-offset-2 hover:text-blue-700"
            >
              {action.label}
            </button>
          )}
        </div>
        {hint && (
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{hint}</p>
        )}
      </div>
    </div>
  );
}

function DeviceList({ devices }: { devices: DeviceInfo[] }) {
  if (devices.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {devices.map((d, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-green-100
                                bg-green-50 px-4 py-3">
          <Usb className="h-4 w-4 flex-shrink-0 text-green-500" strokeWidth={1.75} />
          <div className="min-w-0">
            {d.device_name && (
              <p className="truncate text-xs font-medium text-gray-800">{d.device_name}</p>
            )}
            {d.port && (
              <p className="text-[11px] text-gray-400">
                Puerto: <span className="font-mono font-semibold text-gray-600">{d.port}</span>
              </p>
            )}
          </div>
          <span className="ml-auto flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5
                           text-[10px] font-semibold text-green-700">
            Conectado
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function DeviceCard() {
  const [steps,   setSteps]   = useState<Steps>(INITIAL_STEPS);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [started, setStarted] = useState(false);

  const intervalRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef        = useRef(true);
  const connectionDoneRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, []);

  function clearTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
  }

  async function pollOnce() {
    try {
      const res  = await fetch(`${API_URL}/agent/device-status`);
      const data = await res.json();
      if (!mountedRef.current) return;

      if (res.ok) {
        if (!connectionDoneRef.current && data.agent_connected === true) {
          connectionDoneRef.current = true;
          setSteps(prev => ({ ...prev, connection: "done", detection: "active" }));
        }
        if (data.detected) {
          clearTimers();
          setDevices([{ device_name: data.device_name, port: data.port }]);
          setSteps(prev => ({ ...prev, detection: "done" }));
        }
      }
    } catch { /* ignorar */ }
  }

  function startFlow() {
    connectionDoneRef.current = false;
    setDevices([]);
    setStarted(true);
    setSteps({ download: "active", connection: "pending", detection: "pending" });

    const link = document.createElement("a");
    link.href     = `${API_URL}/agent/download`;
    link.download = "agente_contec.exe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      if (!mountedRef.current) return;
      setSteps({ download: "done", connection: "active", detection: "pending" });

      intervalRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
      timeoutRef.current  = setTimeout(() => {
        if (!mountedRef.current) return;
        clearTimers();
        setSteps(prev => {
          if (prev.detection  === "active") return { ...prev, detection:  "error" };
          if (prev.connection === "active") return { ...prev, connection: "error" };
          return prev;
        });
      }, POLL_TIMEOUT_MS);
    }, 1_200);
  }

  function retryDetection() {
    clearTimers();
    setDevices([]);
    setSteps(prev => ({ ...prev, detection: "active" }));

    intervalRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
    timeoutRef.current  = setTimeout(() => {
      if (!mountedRef.current) return;
      clearTimers();
      setSteps(prev => {
        if (prev.detection === "active") return { ...prev, detection: "error" };
        return prev;
      });
    }, POLL_TIMEOUT_MS);
  }

  function reset() {
    clearTimers();
    connectionDoneRef.current = false;
    setStarted(false);
    setDevices([]);
    setSteps(INITIAL_STEPS);
  }

  const isComplete = steps.detection === "done";
  const hasError   =
    steps.download   === "error" ||
    steps.connection === "error" ||
    steps.detection  === "error";

  const stepHints: Record<keyof Steps, Partial<Record<StepStatus, string>>> = {
    download: {
      active: "Iniciando descarga del agente...",
      done:   "agente_contec.exe descargado correctamente",
    },
    connection: {
      active: "Ejecuta el archivo descargado y espera la conexión...",
      done:   "Agente conectado a la plataforma",
      error:  "No se pudo conectar. Revisa que el agente esté en ejecución.",
    },
    detection: {
      active: "Buscando dispositivos USB conectados...",
      done:   `${devices.length} dispositivo${devices.length !== 1 ? "s" : ""} encontrado${devices.length !== 1 ? "s" : ""}`,
      error:  "No se detectó ningún dispositivo. Verifica la conexión USB.",
    },
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm">

      {/* Device header */}
      <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center
                        rounded-xl bg-blue-50">
          <Cpu className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Electrocardiógrafo</p>
          <p className="text-xs text-gray-400">CONTEC E3</p>
        </div>
        <span className="flex-shrink-0 rounded-full border border-gray-100 bg-gray-50
                         px-2.5 py-1 text-[11px] font-medium text-gray-500">
          USB / COM
        </span>
      </div>

      {/* Stepper */}
      <div className="px-6 py-5">
        <StepItem
          index={1}
          label="Descargar agente"
          hint={stepHints.download[steps.download]}
          status={steps.download}
        />
        <StepConnector topDone={steps.download === "done"} />
        <StepItem
          index={2}
          label="Conexión agente ↔ plataforma"
          hint={stepHints.connection[steps.connection]}
          status={steps.connection}
        />
        <StepConnector topDone={steps.connection === "done"} />
        <StepItem
          index={3}
          label="Detección de dispositivos"
          hint={stepHints.detection[steps.detection]}
          status={steps.detection}
          activeColor="yellow"
          action={
            (steps.detection === "active" || steps.detection === "error")
              ? { label: "Volver a buscar", onClick: retryDetection }
              : undefined
          }
        />

        <DeviceList devices={devices} />
      </div>

      {/* Footer / acción */}
      <div className="border-t border-gray-100 px-6 py-4">
        {!started ? (
          <button
            onClick={startFlow}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white
                       transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            Iniciar sincronización
          </button>
        ) : (isComplete || hasError) ? (
          <button
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-xl
                       bg-gray-50 py-2.5 text-sm font-medium text-gray-600
                       transition-colors hover:bg-gray-100"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Reiniciar
          </button>
        ) : (
          <p className="text-center text-xs text-gray-400">
            Proceso en curso — no cierres esta ventana
          </p>
        )}
      </div>
    </div>
  );
}
