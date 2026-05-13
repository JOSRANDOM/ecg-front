"use client";

import { useEffect, useRef, useState } from "react";

// ── Tipos ────────────────────────────────────────────────────────────────────

type Phase =
  | "idle"       // sin acción
  | "polling"    // sondeando la API    → LED amarillo
  | "connected"  // dispositivo detectado → LED verde
  | "error";     // timeout / fallo    → LED rojo

type LedColor = "none" | "yellow" | "green" | "red";

interface DeviceInfo {
  device_name: string | null;
  port: string | null;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 90_000;

const LED_COLOR: Record<Phase, LedColor> = {
  idle:      "none",
  polling:   "yellow",
  connected: "green",
  error:     "red",
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

function Led({ color }: { color: LedColor }) {
  if (color === "none") return null;

  const dot: Record<Exclude<LedColor, "none">, string> = {
    yellow: "bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.6)] animate-pulse",
    green:  "bg-green-400  shadow-[0_0_8px_2px_rgba(74,222,128,0.6)]",
    red:    "bg-red-500    shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]",
  };

  return <span className={`h-3 w-3 flex-shrink-0 rounded-full ${dot[color]}`} />;
}

function StatusRow({ phase }: { phase: Phase }) {
  const color = LED_COLOR[phase];

  const text: Partial<Record<Phase, string>> = {
    polling:   "Ejecuta el archivo descargado y espera la conexión...",
    connected: "Dispositivo sincronizado",
    error:     "No se detectó el dispositivo.",
  };

  const textColor: Record<LedColor, string> = {
    none:   "",
    yellow: "text-gray-500",
    green:  "text-green-700",
    red:    "text-red-600",
  };

  if (phase === "idle") return null;

  return (
    <div className="flex items-center gap-2.5">
      <Led color={color} />
      <span className={`text-sm ${textColor[color]}`}>{text[phase]}</span>
    </div>
  );
}

function DeviceDetails({ device }: { device: DeviceInfo }) {
  return (
    <div className="rounded-xl bg-green-50 px-4 py-3 space-y-1">
      {device.device_name && (
        <p className="text-xs text-gray-500">
          Dispositivo:{" "}
          <span className="font-medium text-gray-800">{device.device_name}</span>
        </p>
      )}
      {device.port && (
        <p className="text-xs text-gray-500">
          Puerto:{" "}
          <span className="font-mono font-semibold text-gray-800">{device.port}</span>
        </p>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function DeviceCard() {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [device, setDevice]         = useState<DeviceInfo | null>(null);
  const [errMsg, setErrMsg]         = useState<string | null>(null);
  const [agentReady, setAgentReady] = useState<boolean | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    // Resetear en cada ejecución del efecto (necesario para React StrictMode)
    mountedRef.current = true;

    fetch(`${API_URL}/agent/info`)
      .then(res => res.json())
      .then(data => { if (mountedRef.current) setAgentReady(data.disponible === true); })
      .catch(() => { if (mountedRef.current) setAgentReady(false); });

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

      if (res.ok && data.detected) {
        clearTimers();
        setDevice({ device_name: data.device_name, port: data.port });
        setPhase("connected");
      }
    } catch {
      // fallos individuales se ignoran; el timeout maneja el caso total
    }
  }

  function startPolling() {
    if (!mountedRef.current) return;
    setPhase("polling");

    intervalRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      clearTimers();
      setPhase("error");
      setErrMsg("No se detectó el dispositivo. Asegúrate de que el electrocardiógrafo esté conectado por USB.");
    }, POLL_TIMEOUT_MS);
  }

  function handleSync() {
    clearTimers();
    setDevice(null);
    setErrMsg(null);

    // Dispara la descarga del ejecutable
    const link = document.createElement("a");
    link.href = `${API_URL}/agent/download`;
    link.download = "agente_contec.exe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    startPolling();
  }

  const ledColor  = LED_COLOR[phase];
  const isBusy    = ledColor === "yellow";

  const buttonDisabled = isBusy || agentReady !== true;

  const buttonLabel =
    agentReady === null  ? "Verificando..." :
    agentReady === false ? "Agente no disponible" :
    isBusy               ? "Esperando agente..." :
    phase === "connected" ? "Volver a sincronizar" :
                           "Sincronizar dispositivo";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-md">

      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Electrocardiógrafo</h2>
          <p className="text-xs text-gray-400 mt-0.5">CONTEC E3</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
          USB / COM
        </span>
      </div>

      {/* Área de estado */}
      <div className="mb-6 min-h-[88px] space-y-3">
        {phase === "idle" && (
          agentReady === null ? (
            <p className="text-sm text-gray-400">Verificando disponibilidad...</p>
          ) : agentReady === false ? (
            <p className="text-sm text-red-500">El agente no está disponible. Contacta al administrador.</p>
          ) : (
            <p className="text-sm text-gray-400">Sin dispositivo conectado.</p>
          )
        )}

        <StatusRow phase={phase} />

        {phase === "connected" && device && <DeviceDetails device={device} />}

        {phase === "error" && errMsg && (
          <div className="rounded-xl bg-red-50 px-4 py-3">
            <p className="text-xs text-red-600">{errMsg}</p>
          </div>
        )}
      </div>

      {/* Botón principal */}
      <button
        onClick={handleSync}
        disabled={buttonDisabled}
        className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white
                   transition-colors hover:bg-blue-700 active:bg-blue-800
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
