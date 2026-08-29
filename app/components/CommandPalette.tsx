"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Home, Users, UserCog, ShieldCheck, Settings2, CircleUser, Loader2,
} from "lucide-react";
import type { Paciente } from "../pacientes/_types";

/** Nombre del evento con el que cualquier componente puede pedir que se abra
 * el buscador (ej. el botón de la Navbar) sin tener que levantar estado
 * hasta layout.tsx — el propio CommandPalette es la única fuente de verdad
 * de si está abierto o no. */
export const EVENTO_ABRIR_BUSCADOR = "cardioflow:abrir-buscador";

interface Comando {
  tipo: "nav" | "paciente";
  id: string;
  titulo: string;
  subtitulo?: string;
  icono: React.ElementType;
  ruta: string;
}

const NAVEGACION: Array<Omit<Comando, "tipo">> = [
  { id: "inicio",         titulo: "Inicio",              icono: Home,        ruta: "/" },
  { id: "pacientes",      titulo: "Pacientes",           icono: Users,       ruta: "/pacientes" },
  { id: "archivo-ecg",    titulo: "Buscar ECG",          icono: Search,      ruta: "/archivo-ecg" },
  { id: "usuarios",       titulo: "Usuarios",            icono: UserCog,     ruta: "/usuarios" },
  { id: "roles-permisos", titulo: "Roles y permisos",    icono: ShieldCheck, ruta: "/roles-permisos" },
  { id: "equipos",        titulo: "Administrar equipos", icono: Settings2,   ruta: "/equipos" },
  { id: "mi-usuario",     titulo: "Mi usuario",          icono: CircleUser,  ruta: "/mi-usuario" },
];

export default function CommandPalette() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setQuery("");
    setIndice(0);
  }, []);

  // Atajo de teclado: Cmd+K en macOS, Ctrl+K en Windows/Linux — ambos
  // disparan metaKey/ctrlKey respectivamente en su propio SO, así que un
  // solo chequeo cubre las dos plataformas sin detectar el SO.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      } else if (e.key === "Escape") {
        cerrar();
      }
    }
    function onAbrir() { setAbierto(true); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(EVENTO_ABRIR_BUSCADOR, onAbrir);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(EVENTO_ABRIR_BUSCADOR, onAbrir);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    setCargando(true);
    fetch("/api/pacientes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPacientes(Array.isArray(data) ? data : []))
      .catch(() => setPacientes([]))
      .finally(() => setCargando(false));
    return () => clearTimeout(t);
  }, [abierto]);

  useEffect(() => { setIndice(0); }, [query]);

  const q = query.trim().toLowerCase();
  const qDoc = q.replace(/\./g, "");

  const comandosPacientes: Comando[] = q
    ? pacientes
        .filter((p) =>
          p.nombre_completo.toLowerCase().includes(q) ||
          p.documento.replace(/\./g, "").includes(qDoc)
        )
        .slice(0, 8)
        .map((p) => ({
          tipo: "paciente",
          id: p.id,
          titulo: p.nombre_completo,
          subtitulo: p.documento,
          icono: Users,
          ruta: `/pacientes/${p.id}`,
        }))
    : [];

  const comandosNav: Comando[] = NAVEGACION
    .filter((n) => !q || n.titulo.toLowerCase().includes(q))
    .map((n) => ({ ...n, tipo: "nav" as const }));

  const resultados = [...comandosPacientes, ...comandosNav];

  function ir(ruta: string) {
    router.push(ruta);
    cerrar();
  }

  function onKeyDownInput(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const elegido = resultados[indice];
      if (elegido) ir(elegido.ruta);
    }
  }

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-24 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl
                   dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDownInput}
            placeholder="Buscar paciente o ir a…"
            className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-100
                       outline-none placeholder-gray-300 dark:placeholder-gray-600"
          />
          {cargando && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-gray-300 dark:text-gray-600" strokeWidth={1.75} />}
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {resultados.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">Sin resultados.</p>
          ) : (
            resultados.map((r, i) => {
              const Icon = r.icono;
              return (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => ir(r.ruta)}
                  onMouseEnter={() => setIndice(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors
                             ${i === indice ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800 dark:text-gray-100">{r.titulo}</p>
                    {r.subtitulo && <p className="text-[11px] text-gray-400 dark:text-gray-500">{r.subtitulo}</p>}
                  </div>
                  {r.tipo === "paciente" && (
                    <span className="flex-shrink-0 text-[10px] text-gray-300 dark:text-gray-600">Paciente</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 text-[10px] text-gray-300 dark:text-gray-600">
          ↑↓ para navegar · Enter para ir · Esc para cerrar
        </div>
      </div>
    </div>
  );
}
