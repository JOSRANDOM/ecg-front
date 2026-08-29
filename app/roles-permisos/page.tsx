"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ShieldAlert, Check, Plus, X, Trash2, Save,
} from "lucide-react";

// ── Tipos (reflejan RolResponse de usuarios-service) ────────────────────────

interface RolInfo {
  nombre: string;
  etiqueta: string;
  permisos: string[];
  es_sistema: boolean;
}

interface Sesion {
  permisos: string[];
}

interface NuevoRolForm {
  nombre: string;
  etiqueta: string;
  permisos: Set<string>;
}

// Catálogo de permisos: FIJO — cada uno protege un endpoint específico ya
// escrito en usuarios-service (ver domain/rbac.py). Los ROLES son dinámicos
// (se leen del backend); los permisos que se les puede asignar, no.
const GRUPOS: { recurso: string; permisos: { id: string; label: string }[] }[] = [
  {
    recurso: "Usuarios",
    permisos: [
      { id: "usuarios:leer", label: "Ver usuarios" },
      { id: "usuarios:crear", label: "Crear usuarios" },
      { id: "usuarios:actualizar", label: "Editar usuarios / resetear contraseñas" },
      { id: "usuarios:eliminar", label: "Desactivar usuarios" },
    ],
  },
  {
    recurso: "Pacientes",
    permisos: [
      { id: "pacientes:leer", label: "Ver pacientes" },
      { id: "pacientes:crear", label: "Registrar pacientes" },
      { id: "pacientes:actualizar", label: "Editar historial de pacientes" },
    ],
  },
  {
    recurso: "ECG",
    permisos: [
      { id: "ecg:leer", label: "Ver estudios ECG" },
      { id: "ecg:crear", label: "Registrar estudios ECG" },
      { id: "ecg:revisar", label: "Revisar / diagnosticar estudios" },
    ],
  },
  {
    recurso: "Equipos",
    permisos: [
      { id: "equipos:leer", label: "Ver equipos" },
      { id: "equipos:administrar", label: "Registrar / configurar equipos" },
    ],
  },
  {
    recurso: "Sistema",
    permisos: [
      { id: "roles:leer", label: "Ver esta matriz de roles y permisos" },
      { id: "roles:crear", label: "Crear roles" },
      { id: "roles:actualizar", label: "Editar permisos de un rol" },
      { id: "roles:eliminar", label: "Eliminar roles" },
    ],
  },
];

const NOMBRE_ROL_REGEX = /^[a-z0-9_-]+$/;
const FORM_VACIO: NuevoRolForm = { nombre: "", etiqueta: "", permisos: new Set() };

export default function RolesPermisosPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RolInfo[]>([]);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAutorizado, setNoAutorizado] = useState(false);
  const [error, setError] = useState("");

  // Edición local de permisos por rol, antes de guardar — separado del
  // `roles` recién cargado para poder detectar "hay cambios sin guardar".
  const [edicion, setEdicion] = useState<Record<string, Set<string>>>({});
  const [guardando, setGuardando] = useState<Record<string, boolean>>({});
  const [errorGuardado, setErrorGuardado] = useState<Record<string, string>>({});
  const [eliminando, setEliminando] = useState<Record<string, boolean>>({});

  const [panelCrearOpen, setPanelCrearOpen] = useState(false);
  const [formCrear, setFormCrear] = useState<NuevoRolForm>(FORM_VACIO);
  const [erroresCrear, setErroresCrear] = useState<{ nombre?: string; etiqueta?: string }>({});
  const [crearSubmitting, setCrearSubmitting] = useState(false);
  const [crearError, setCrearError] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [rolesRes, sesionRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/auth/me"),
      ]);
      if (rolesRes.status === 401 || sesionRes.status === 401) {
        router.push("/login");
        return;
      }
      if (sesionRes.ok) {
        const s: Sesion = await sesionRes.json();
        setSesion(s);
        if (!s.permisos.includes("roles:leer")) {
          setNoAutorizado(true);
          return;
        }
      }
      if (rolesRes.status === 403) {
        setNoAutorizado(true);
        return;
      }
      if (!rolesRes.ok) throw new Error("No se pudo cargar la matriz de roles");

      const data: RolInfo[] = await rolesRes.json();
      setRoles(data);
      setEdicion(Object.fromEntries(data.map(r => [r.nombre, new Set(r.permisos)])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const puedeCrear = sesion?.permisos.includes("roles:crear") ?? false;
  const puedeActualizar = sesion?.permisos.includes("roles:actualizar") ?? false;
  const puedeEliminar = sesion?.permisos.includes("roles:eliminar") ?? false;

  function tienePermiso(rolNombre: string, permisoId: string): boolean {
    return edicion[rolNombre]?.has(permisoId) ?? false;
  }

  function togglePermiso(rolNombre: string, permisoId: string) {
    if (!puedeActualizar) return;
    setEdicion(prev => {
      const actual = new Set(prev[rolNombre] ?? []);
      if (actual.has(permisoId)) actual.delete(permisoId);
      else actual.add(permisoId);
      return { ...prev, [rolNombre]: actual };
    });
  }

  function hayCambios(rolNombre: string): boolean {
    const original = roles.find(r => r.nombre === rolNombre)?.permisos ?? [];
    const editado = edicion[rolNombre] ?? new Set();
    return (
      original.length !== editado.size || original.some(p => !editado.has(p))
    );
  }

  async function guardarRol(rolNombre: string) {
    setGuardando(prev => ({ ...prev, [rolNombre]: true }));
    setErrorGuardado(prev => ({ ...prev, [rolNombre]: "" }));
    try {
      const res = await fetch(`/api/roles/${rolNombre}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisos: Array.from(edicion[rolNombre] ?? []) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo guardar");
      }
      const actualizado: RolInfo = await res.json();
      setRoles(prev => prev.map(r => (r.nombre === rolNombre ? actualizado : r)));
    } catch (err) {
      setErrorGuardado(prev => ({
        ...prev,
        [rolNombre]: err instanceof Error ? err.message : "Error inesperado",
      }));
    } finally {
      setGuardando(prev => ({ ...prev, [rolNombre]: false }));
    }
  }

  async function eliminarRol(rolNombre: string, etiqueta: string) {
    if (!confirm(`¿Eliminar el rol "${etiqueta}"? Esto no se puede deshacer.`)) return;
    setEliminando(prev => ({ ...prev, [rolNombre]: true }));
    try {
      const res = await fetch(`/api/roles/${rolNombre}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo eliminar el rol");
      }
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el rol");
    } finally {
      setEliminando(prev => ({ ...prev, [rolNombre]: false }));
    }
  }

  function abrirPanelCrear() {
    setFormCrear(FORM_VACIO);
    setErroresCrear({});
    setCrearError("");
    setPanelCrearOpen(true);
  }

  function toggleNuevoPermiso(permisoId: string) {
    setFormCrear(prev => {
      const permisos = new Set(prev.permisos);
      if (permisos.has(permisoId)) permisos.delete(permisoId);
      else permisos.add(permisoId);
      return { ...prev, permisos };
    });
  }

  function validarCrear(): boolean {
    const e: typeof erroresCrear = {};
    if (!NOMBRE_ROL_REGEX.test(formCrear.nombre)) {
      e.nombre = "Solo minúsculas, números, guiones y guiones bajos";
    }
    if (!formCrear.etiqueta.trim()) e.etiqueta = "La etiqueta es requerida";
    setErroresCrear(e);
    return Object.keys(e).length === 0;
  }

  async function handleCrearSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validarCrear()) return;
    setCrearSubmitting(true);
    setCrearError("");
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formCrear.nombre.trim(),
          etiqueta: formCrear.etiqueta.trim(),
          permisos: Array.from(formCrear.permisos),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo crear el rol");
      }
      await cargar();
      setPanelCrearOpen(false);
    } catch (err) {
      setCrearError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCrearSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="mb-3 h-6 w-6 animate-spin text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>
      </main>
    );
  }

  if (noAutorizado) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 px-6 text-center">
        <ShieldAlert className="mb-3 h-8 w-8 text-gray-200 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No tienes acceso a este módulo</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Roles y permisos es exclusivo del perfil Webmaster.</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-900 px-6 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Roles y permisos</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Qué puede hacer cada perfil. Marca/desmarca y guarda por columna.
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={abrirPanelCrear}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm
                       font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Crear rol
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-2 text-left text-xs font-medium text-gray-400 dark:text-gray-500">
                Permiso
              </th>
              {roles.map(rol => (
                <th key={rol.nombre} className="px-3 py-2 text-center align-bottom">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{rol.etiqueta}</span>
                    <div className="flex items-center gap-1">
                      {hayCambios(rol.nombre) && puedeActualizar && (
                        <button
                          onClick={() => guardarRol(rol.nombre)}
                          disabled={guardando[rol.nombre]}
                          title="Guardar cambios de este rol"
                          className="flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1
                                     text-[10px] font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                          <Save className="h-3 w-3" strokeWidth={2} />
                          {guardando[rol.nombre] ? "…" : "Guardar"}
                        </button>
                      )}
                      {puedeEliminar && !rol.es_sistema && (
                        <button
                          onClick={() => eliminarRol(rol.nombre, rol.etiqueta)}
                          disabled={eliminando[rol.nombre]}
                          title="Eliminar rol"
                          className="rounded-lg p-1 text-gray-300 dark:text-gray-600 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 disabled:opacity-60"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                    {errorGuardado[rol.nombre] && (
                      <p className="max-w-[8rem] text-[10px] text-red-500 dark:text-red-400">{errorGuardado[rol.nombre]}</p>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map(grupo => (
              <Fragment key={grupo.recurso}>
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                  >
                    {grupo.recurso}
                  </td>
                </tr>
                {grupo.permisos.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-2.5 text-gray-700 dark:text-gray-300">{p.label}</td>
                    {roles.map(rol => (
                      <td key={rol.nombre} className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => togglePermiso(rol.nombre, p.id)}
                          disabled={!puedeActualizar}
                          className={`mx-auto flex h-5 w-5 items-center justify-center rounded
                                      border transition-colors
                                      ${tienePermiso(rol.nombre, p.id)
                                        ? "border-teal-500 bg-teal-500"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"}
                                      ${puedeActualizar ? "cursor-pointer hover:border-teal-400" : "cursor-default"}`}
                        >
                          {tienePermiso(rol.nombre, p.id) && (
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Panel crear rol ─────────────────────────────────────────────────── */}

      {panelCrearOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => !crearSubmitting && setPanelCrearOpen(false)} />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white dark:bg-gray-900 shadow-xl
                    transition-transform duration-300 ease-in-out
                    ${panelCrearOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-5">
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Crear rol</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Nombre, etiqueta y permisos iniciales</p>
          </div>
          <button
            onClick={() => setPanelCrearOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCrearSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-6 py-6">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Nombre (slug, no editable después)
              </label>
              <input
                type="text"
                placeholder="Ej. recepcion"
                value={formCrear.nombre}
                onChange={e => setFormCrear(p => ({ ...p, nombre: e.target.value.toLowerCase() }))}
                className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100
                            placeholder-gray-300 dark:placeholder-gray-600 outline-none transition focus:bg-white dark:focus:bg-gray-900 focus:ring-2
                            ${erroresCrear.nombre
                              ? "border-red-300 dark:border-red-500/50 focus:border-red-300 dark:focus:border-red-500/50 focus:ring-red-50 dark:focus:ring-red-500/20"
                              : "border-gray-200 dark:border-gray-700 focus:border-teal-300 focus:ring-teal-50 dark:focus:ring-teal-500/20"}`}
              />
              {erroresCrear.nombre && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{erroresCrear.nombre}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Etiqueta</label>
              <input
                type="text"
                placeholder="Ej. Recepción"
                value={formCrear.etiqueta}
                onChange={e => setFormCrear(p => ({ ...p, etiqueta: e.target.value }))}
                className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100
                            placeholder-gray-300 dark:placeholder-gray-600 outline-none transition focus:bg-white dark:focus:bg-gray-900 focus:ring-2
                            ${erroresCrear.etiqueta
                              ? "border-red-300 dark:border-red-500/50 focus:border-red-300 dark:focus:border-red-500/50 focus:ring-red-50 dark:focus:ring-red-500/20"
                              : "border-gray-200 dark:border-gray-700 focus:border-teal-300 focus:ring-teal-50 dark:focus:ring-teal-500/20"}`}
              />
              {erroresCrear.etiqueta && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{erroresCrear.etiqueta}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Permisos</label>
              <div className="space-y-3">
                {GRUPOS.map(grupo => (
                  <div key={grupo.recurso}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-300 dark:text-gray-600">
                      {grupo.recurso}
                    </p>
                    <div className="space-y-1">
                      {grupo.permisos.map(p => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={formCrear.permisos.has(p.id)}
                            onChange={() => toggleNuevoPermiso(p.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {crearError && (
              <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">{crearError}</p>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
            <button
              type="submit"
              disabled={crearSubmitting}
              className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-white
                         transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {crearSubmitting ? "Creando…" : "Crear rol"}
            </button>
          </div>
        </form>
      </aside>
    </main>
  );
}
