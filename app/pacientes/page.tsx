"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Activity, UserPlus } from "lucide-react";
import { PACIENTES, type EstadoPaciente } from "./_data";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFecha(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MESES[month - 1]}. ${year}`;
}

const ESTADO_CONFIG: Record<EstadoPaciente, { label: string; cls: string }> = {
  activo:    { label: "Activo",    cls: "bg-green-50 text-green-700"   },
  pendiente: { label: "Pendiente", cls: "bg-yellow-50 text-yellow-700" },
  inactivo:  { label: "Inactivo",  cls: "bg-gray-100 text-gray-500"    },
};

function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
];

function avatarColor(id: string) {
  return AVATAR_COLORS[parseInt(id) % AVATAR_COLORS.length];
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PacientesPage() {
  const router  = useRouter();
  const [query, setQuery] = useState("");

  const filtrados = PACIENTES.filter(p => {
    const q = query.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.documento.replace(/\./g, "").includes(q.replace(/\./g, ""))
    );
  });

  return (
    <main className="flex flex-1 flex-col bg-white">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Pacientes</h1>
            <p className="mt-0.5 text-xs text-gray-400">{PACIENTES.length} pacientes registrados</p>
          </div>
          <button
            onClick={() => router.push("/pacientes/nuevo")}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold
                       text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
            Registrar nuevo paciente
          </button>
        </div>

        {/* Búsqueda */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Buscar por nombre o documento…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4
                         text-sm text-gray-800 placeholder-gray-300 outline-none
                         transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Activity className="mb-3 h-8 w-8 text-gray-200" strokeWidth={1.5} />
              <p className="text-sm text-gray-400">
                Sin resultados para <span className="font-medium">&ldquo;{query}&rdquo;</span>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtrados.map(p => {
                const estado = ESTADO_CONFIG[p.estado];
                return (
                  <li key={p.id}>
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="flex w-full items-center gap-4 rounded-xl px-2 py-3.5
                                 transition-colors hover:bg-gray-50"
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center
                                      rounded-full text-xs font-bold ${avatarColor(p.id)}`}>
                        {iniciales(p.nombre)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">{p.nombre}</p>
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${estado.cls}`}>
                            {estado.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                          <span>{p.documento}</span>
                          <span>·</span>
                          <span>{p.edad} años</span>
                          <span>·</span>
                          <span>
                            {p.ultimoEcg
                              ? <>Último ECG: {formatFecha(p.ultimoEcg)}</>
                              : "Sin ECG registrado"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" strokeWidth={1.75} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </main>
  );
}
