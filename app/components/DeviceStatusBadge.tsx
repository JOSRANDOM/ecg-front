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
  connected:    { dot: "bg-green-500",  label: "Dispositivo conectado"  },
  agent_only:   { dot: "bg-yellow-400", label: "Agente activo"          },
  disconnected: { dot: "bg-gray-300",   label: "Sin dispositivo"        },
};

export default function DeviceStatusBadge() {
  const [status, setStatus] = useState<Status>("disconnected");

  useEffect(() => {
    fetchStatus().then(setStatus);
    const id = setInterval(() => fetchStatus().then(setStatus), 5_000);
    return () => clearInterval(id);
  }, []);

  const { dot, label } = CONFIG[status];

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50
                     px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
      <span className={`h-2 w-2 rounded-full ${dot} ${status === "agent_only" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
