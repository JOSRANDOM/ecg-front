"use client";

import { useEffect, useRef, useState } from "react";

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
  index:       number;
  status:      StepStatus;
  activeColor?: "blue" | "yellow";
}) {
  const base = "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300";

  if (status === "done")
    return (
      <div className={`${base} bg-green-500 text-white`}>
        <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <polyline points="2,6 5,9 10,3" />
        </svg>
      </div>
    );

  if (status === "error")
    return (
      <div className={`${base} bg-red-500 text-white`}>✕</div>
    );

  if (status === "active") {
    const activeCls = activeColor === "yellow"
      ? "bg-yellow-400 text-white ring-4 ring-yellow-100 animate-pulse"
      : "bg-blue-600 text-white ring-4 ring-blue-100";
    return (
      <div className={`${base} ${activeCls}`}>{index}</div>
    );
  }

  return (
    <div className={`${base} bg-gray-100 text-gray-400`}>{index}</div>
  );
}

function StepConnector({ topDone }: { topDone: boolean }) {
  return (
    <div className="ml-3.5 h-4 w-px transition-colors duration-300"
         style={{ backgroundColor: topDone ? "#22c55e" : "#e5e7eb" }} />
  );
}

function StepItem({
  index, label, hint, status, activeColor = "blue", action,
}: {
  index:       number;
  label:       string;
  hint?:       string;
  status:      StepStatus;
  activeColor?: "blue" | "yellow";
  action?:     { label: string; onClick: () => void };
}) {
  const labelColor =
    status === "done"   ? "text-green-700" :
    status === "active" && activeColor === "yellow" ? "text-yellow-600" :
    status === "active" ? "text-blue-700"  :
    status === "error"  ? "text-red-600"   :
                          "text-gray-400";

  return (
    <div className="flex items-start gap-3">
      <StepIcon index={index} status={status} activeColor={activeColor} />
      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium transition-colors duration-300 ${labelColor}`}>{label}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs text-blue-500 hover:text-blue-700 underline-offset-2 underline leading-none"
            >
              {action.label}
            </button>
          )}
        </div>
        {hint && (
          <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
        )}
      </div>
    </div>
  );
}

function DeviceList({ devices }: { devices: DeviceInfo[] }) {
  if (devices.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Dispositivos detectados
      </p>
      {devices.map((d, i) => (
        <div key={i} className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 space-y-1">
          {d.device_name && (
            <p className="text-xs text-gray-500">
              Dispositivo:{" "}
              <span className="font-medium text-gray-800">{d.device_name}</span>
            </p>
          )}
          {d.port && (
            <p className="text-xs text-gray-500">
              Puerto:{" "}
              <span className="font-mono font-semibold text-gray-800">{d.port}</span>
            </p>
          )}
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
        // Paso 2: el agente se conectó vía WebSocket a la plataforma
        if (!connectionDoneRef.current && data.agent_connected === true) {
          connectionDoneRef.current = true;
          setSteps(prev => ({ ...prev, connection: "done", detection: "active" }));
        }

        // Paso 3: dispositivo detectado
        if (data.detected) {
          clearTimers();
          setDevices([{ device_name: data.device_name, port: data.port }]);
          setSteps(prev => ({ ...prev, detection: "done" }));
        }
      }
    } catch {
      // fallos individuales se ignoran; el timeout maneja el caso total
    }
  }

  function startFlow() {
    connectionDoneRef.current = false;
    setDevices([]);
    setStarted(true);

    // Paso 1 — descarga
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

      // Paso 2 & 3 — polling
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
    steps.download === "error" ||
    steps.connection === "error" ||
    steps.detection === "error";

  const stepHints: Record<keyof Steps, Partial<Record<StepStatus, string>>> = {
    download: {
      active: "Iniciando descarga...",
      done:   "agente_contec.exe descargado",
    },
    connection: {
      active: "Ejecuta el archivo descargado y espera...",
      done:   "Agente conectado a la plataforma",
      error:  "No se pudo conectar. Revisa que el agente esté en ejecución.",
    },
    detection: {
      active: "Buscando dispositivos USB...",
      done:   `${devices.length} dispositivo${devices.length !== 1 ? "s" : ""} encontrado${devices.length !== 1 ? "s" : ""}`,
      error:  "No se detectó ningún dispositivo. Verifica la conexión USB.",
    },
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-md">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Electrocardiógrafo</h2>
          <p className="text-xs text-gray-400 mt-0.5">CONTEC E3</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
          USB / COM
        </span>
      </div>

      {/* Stepper */}
      <div className="mb-6">
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

        {/* Lista de dispositivos */}
        <DeviceList devices={devices} />
      </div>

      {/* Botón */}
      {!started ? (
        <button
          onClick={startFlow}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white
                     transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          Iniciar sincronización
        </button>
      ) : (isComplete || hasError) ? (
        <button
          onClick={reset}
          className="w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700
                     transition-colors hover:bg-gray-200 active:bg-gray-300"
        >
          Reiniciar
        </button>
      ) : null}
    </div>
  );
}
