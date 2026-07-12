"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Status = "connected" | "agent_only" | "disconnected";

async function fetchStatus(): Promise<Status> {
  try {
    const res  = await fetch(`${API_URL}/agent/device-status`, { cache: "no-store" });
    const data = await res.json();
    if (data.detected)        return "connected";
    if (data.agent_connected) return "agent_only";
  } catch { /* ignorar errores de red */ }
  return "disconnected";
}

const CONFIG: Record<Status, { dot: string; label: string }> = {
  connected:    { dot: "bg-green-500",  label: "Dispositivo conectado"          },
  agent_only:   { dot: "bg-yellow-400", label: "Agente activo — sin dispositivo" },
  disconnected: { dot: "bg-gray-300",   label: "Sin dispositivo conectado"       },
};

export default function DeviceStatusBar() {
  const [status, setStatus] = useState<Status>("disconnected");

  useEffect(() => {
    fetchStatus().then(setStatus);
    const id = setInterval(() => fetchStatus().then(setStatus), 5_000);
    return () => clearInterval(id);
  }, []);

  const { dot, label } = CONFIG[status];

  return (
    <div className="w-full border-b border-gray-100 bg-white px-6 py-1.5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot} ${status === "agent_only" ? "animate-pulse" : ""}`} />
        <span className="text-[11px] text-gray-400">{label}</span>
      </div>
    </div>
  );
}
