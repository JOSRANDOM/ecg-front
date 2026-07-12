"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, X, UserCog, ShieldCheck, Stethoscope, Wrench, Settings,
  ChevronRight, Loader2, Trash2, RefreshCcw, Pencil,
} from "lucide-react";

// ── Tipos (reflejan UsuarioResponse / CrearUsuarioRequest de usuarios-service) ─
// `rol` es un string libre — los roles son dinámicos (el webmaster los crea
// desde /roles-permisos), así que no hay un union type fijo.

interface UsuarioApi {
  id: string;
  username: string;
  email: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
}

interface RolInfo {
  nombre: string;
  etiqueta: string;
  permisos: string[];
  es_sistema: boolean;
}

interface FormData {
  username: string;
  nombre_completo: string;
  email: string;
  password: string;
  rol: string;
}

interface EditFormData {
  nombre_completo: string;
  email: string;
}

interface Sesion {
  usuarioId: string;
  username: string;
  rol: string;
  permisos: string[];
}

const FORM_EMPTY: FormData = {
  username: "", nombre_completo: "", email: "", password: "", rol: "",
};

// ── Config visual de perfiles ───────────────────────────────────────────────
// La ETIQUETA y los PERMISOS de cada rol vienen siempre del backend
// (GET /api/roles) — esto es solo apariencia. Los 4 roles sembrados tienen
// ícono/color curados; cualquier rol nuevo que cree el webmaster cae a un
// estilo genérico, porque no hay forma de anticipar qué ícono le queda.

const ICONOS_ROL: Record<string, React.ElementType> = {
  webmaster: Settings,
  administracion: ShieldCheck,
  medico: Stethoscope,
  tecnico: Wrench,
};

const COLORES_ROL: Record<string, { color: string; bg: string; badge: string }> = {
  webmaster: { color: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-50 text-blue-700" },
  administracion: { color: "text-indigo-600", bg: "bg-indigo-50", badge: "bg-indigo-50 text-indigo-700" },
  medico: { color: "text-violet-600", bg: "bg-violet-50", badge: "bg-violet-50 text-violet-700" },
  tecnico: { color: "text-teal-600", bg: "bg-teal-50", badge: "bg-teal-50 text-teal-700" },
};
const COLOR_GENERICO = { color: "text-gray-600", bg: "bg-gray-100", badge: "bg-gray-100 text-gray-700" };

const DESCRIPCIONES_ROL: Record<string, string> = {
  webmaster: "Acceso total a la plataforma.",
  administracion: "Gestiona cuentas de personal y pacientes.",
  medico: "Consulta y revisa registros ECG.",
  tecnico: "Administra y sincroniza dispositivos CONTEC E3.",
};

function perfilConfig(roles: RolInfo[], nombre: string) {
  const rol = roles.find(r => r.nombre === nombre);
  return {
    label: rol?.etiqueta ?? nombre,
    descripcion:
      DESCRIPCIONES_ROL[nombre] ??
      `${rol?.permisos.length ?? 0} permiso${rol?.permisos.length === 1 ? "" : "s"} asignado(s)`,
    icon: ICONOS_ROL[nombre] ?? UserCog,
    ...(COLORES_ROL[nombre] ?? COLOR_GENERICO),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function generarPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 16);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [roles, setRoles] = useState<RolInfo[]>([]);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<FormData>(FORM_EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [editUsuario, setEditUsuario] = useState<UsuarioApi | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ nombre_completo: "", email: "" });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditFormData, string>>>({});
  const [editMostrarRol, setEditMostrarRol] = useState(false);
  const [editRolNuevo, setEditRolNuevo] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState("");

  const [editMostrarPassword, setEditMostrarPassword] = useState(false);
  const [editPasswordNueva, setEditPasswordNueva] = useState("");
  const [editPasswordError, setEditPasswordError] = useState("");
  const [editPasswordExito, setEditPasswordExito] = useState(false);
  const [editPasswordSubmitting, setEditPasswordSubmitting] = useState(false);

  async function cargar() {
    setLoading(true);
    setLoadError("");
    try {
      const [usuariosRes, sesionRes, rolesRes] = await Promise.all([
        fetch("/api/usuarios"),
        fetch("/api/auth/me"),
        fetch("/api/roles"),
      ]);

      // 401 en cualquiera significa que la sesión ya no es válida (vencida,
      // revocada, o con un rol que dejó de existir) — no tiene sentido
      // mostrar un error genérico, hay que forzar login de nuevo.
      if (usuariosRes.status === 401 || sesionRes.status === 401 || rolesRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!usuariosRes.ok) throw new Error("No se pudo cargar la lista de usuarios");
      setUsuarios(await usuariosRes.json());
      if (sesionRes.ok) setSesion(await sesionRes.json());
      // Si falla (no debería: todo el que llega aquí tiene usuarios:leer),
      // se degrada con roles=[] — los badges muestran el nombre crudo y el
      // selector de perfil queda vacío, en vez de romper la página entera.
      if (rolesRes.ok) setRoles(await rolesRes.json());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const puedeCrear = sesion?.permisos.includes("usuarios:crear") ?? false;
  const puedeEliminar = sesion?.permisos.includes("usuarios:eliminar") ?? false;
  const puedeActualizar = sesion?.permisos.includes("usuarios:actualizar") ?? false;

  const filtrados = usuarios.filter(u => {
    const q = query.toLowerCase();
    return (
      u.nombre_completo.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  function openPanel() {
    setForm(FORM_EMPTY);
    setErrors({});
    setSubmitError("");
    setPanelOpen(true);
  }

  function closePanel() {
    if (submitting) return;
    setPanelOpen(false);
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.username.trim()) e.username = "El usuario es requerido";
    if (!form.nombre_completo.trim()) e.nombre_completo = "El nombre es requerido";
    if (!form.email.trim()) e.email = "El correo es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Correo inválido";
    if (!form.password || form.password.length < 8) e.password = "Mínimo 8 caracteres";
    if (!form.rol) e.rol = "Selecciona un perfil";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          nombre_completo: form.nombre_completo.trim(),
          email: form.email.trim(),
          password: form.password,
          rol: form.rol,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo crear el usuario");
      }
      await cargar();
      setPanelOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function desactivar(id: string, nombre: string) {
    if (!confirm(`¿Desactivar a ${nombre}? Podrá volver a activarse desde la base de datos.`)) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      await cargar();
    } catch {
      setLoadError("No se pudo desactivar el usuario");
    }
  }

  function abrirEdicion(u: UsuarioApi) {
    setEditUsuario(u);
    setEditForm({ nombre_completo: u.nombre_completo, email: u.email });
    setEditErrors({});
    setEditSubmitError("");
    // El selector de rol arranca oculto a propósito: cambiar el rol de
    // alguien es una acción aparte, no algo que se toca sin querer al
    // editar el nombre. Ver nota de seguridad en usuarios-service/CLAUDE.md.
    setEditMostrarRol(false);
    setEditRolNuevo(null);
    setEditMostrarPassword(false);
    setEditPasswordNueva("");
    setEditPasswordError("");
    setEditPasswordExito(false);
  }

  function cerrarEdicion() {
    if (editSubmitting || editPasswordSubmitting) return;
    setEditUsuario(null);
  }

  async function handleResetPassword() {
    if (!editUsuario) return;
    if (editPasswordNueva.length < 8) {
      setEditPasswordError("Mínimo 8 caracteres");
      return;
    }
    setEditPasswordSubmitting(true);
    setEditPasswordError("");
    setEditPasswordExito(false);
    try {
      const res = await fetch(`/api/usuarios/${editUsuario.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_nueva: editPasswordNueva }),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo restablecer la contraseña");
      }
      setEditPasswordExito(true);
    } catch (err) {
      setEditPasswordError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEditPasswordSubmitting(false);
    }
  }

  function validateEdit(): boolean {
    const e: typeof editErrors = {};
    if (!editForm.nombre_completo.trim()) e.nombre_completo = "El nombre es requerido";
    if (!editForm.email.trim()) e.email = "El correo es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) e.email = "Correo inválido";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUsuario || !validateEdit()) return;
    setEditSubmitting(true);
    setEditSubmitError("");
    try {
      const cambioDeRol = editRolNuevo && editRolNuevo !== editUsuario.rol;
      const res = await fetch(`/api/usuarios/${editUsuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: editForm.nombre_completo.trim(),
          email: editForm.email.trim(),
          // Solo se manda `rol` si de verdad se eligió uno distinto — el
          // backend trata la sola presencia de este campo como "intento de
          // cambiar el rol" y exige el permiso correspondiente aunque el
          // valor termine siendo el mismo.
          ...(cambioDeRol ? { rol: editRolNuevo } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo actualizar el usuario");
      }
      await cargar();
      setEditUsuario(null);
    } catch (err) {
      setEditSubmitError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col bg-white">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Usuarios</h1>
          <p className="mt-0.5 text-xs text-gray-400">
            {loading ? "Cargando…" : `${usuarios.length} usuarios registrados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            disabled={loading}
            title="Recargar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200
                       text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
          </button>
          {puedeCrear && (
            <button
              onClick={openPanel}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm
                         font-medium text-white transition-colors hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Crear usuario
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o correo…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4
                       text-sm text-gray-800 placeholder-gray-300 outline-none
                       transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-50"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loadError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{loadError}</p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-gray-300" />
            <p className="text-sm text-gray-400">Cargando usuarios…</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UserCog className="mb-3 h-8 w-8 text-gray-200" strokeWidth={1.5} />
            <p className="text-sm text-gray-400">
              {query ? (
                <>Sin resultados para <span className="font-medium">&quot;{query}&quot;</span></>
              ) : (
                "Todavía no hay usuarios registrados"
              )}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtrados.map(u => {
              const pc = perfilConfig(roles, u.rol);
              const Icon = pc.icon;
              return (
                <li
                  key={u.id}
                  onClick={() => puedeActualizar && abrirEdicion(u)}
                  className={`flex items-center gap-4 rounded-xl px-2 py-3.5 hover:bg-gray-50
                             ${puedeActualizar ? "cursor-pointer" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center
                                  rounded-full text-xs font-bold ${avatarColor(u.id)}`}>
                    {iniciales(u.nombre_completo)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{u.nombre_completo}</p>
                      {!u.activo && (
                        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5
                                         text-[10px] font-medium text-gray-400">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      <span>@{u.username}</span>
                      <span>·</span>
                      <span>{u.email}</span>
                      <span>·</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                        text-[10px] font-medium ${pc.badge}`}>
                        <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                        {pc.label}
                      </span>
                    </div>
                  </div>

                  {puedeEliminar && u.activo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); desactivar(u.id, u.nombre_completo); }}
                      title="Desactivar"
                      className="flex-shrink-0 rounded-lg p-2 text-gray-300 transition-colors
                                 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  )}
                  {puedeActualizar ? (
                    <Pencil className="h-3.5 w-3.5 flex-shrink-0 text-gray-200" strokeWidth={1.75} />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" strokeWidth={1.75} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Panel crear usuario ─────────────────────────────────────────────── */}

      {panelOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={closePanel} />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl
                    transition-transform duration-300 ease-in-out
                    ${panelOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-base font-semibold text-gray-900">Crear usuario</p>
            <p className="text-xs text-gray-400">Completa los datos y selecciona un perfil</p>
          </div>
          <button
            onClick={closePanel}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-6 py-6">

            {/* Usuario (login) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Usuario (login)
              </label>
              <input
                type="text"
                placeholder="Ej. jperez"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                            placeholder-gray-300 outline-none transition
                            focus:bg-white focus:ring-2
                            ${errors.username
                              ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                              : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                type="text"
                placeholder="Ej. Dr. Juan Pérez"
                value={form.nombre_completo}
                onChange={e => setForm(p => ({ ...p, nombre_completo: e.target.value }))}
                className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                            placeholder-gray-300 outline-none transition
                            focus:bg-white focus:ring-2
                            ${errors.nombre_completo
                              ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                              : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
              />
              {errors.nombre_completo && (
                <p className="mt-1 text-xs text-red-500">{errors.nombre_completo}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="usuario@cardioflow.co"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                            placeholder-gray-300 outline-none transition
                            focus:bg-white focus:ring-2
                            ${errors.email
                              ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                              : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Contraseña temporal */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Contraseña temporal
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                              placeholder-gray-300 outline-none transition
                              focus:bg-white focus:ring-2
                              ${errors.password
                                ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                                : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
                />
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, password: generarPassword() }))}
                  className="flex-shrink-0 rounded-xl border border-gray-200 px-3 text-xs font-medium
                             text-gray-500 transition-colors hover:bg-gray-50"
                >
                  Generar
                </button>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Compártela con la persona por un canal seguro — no queda guardada en ningún lado.
              </p>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Perfil */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Perfil
              </label>
              <div className="space-y-2">
                {roles.map(({ nombre }) => {
                  const { label, descripcion, icon: Icon, color, bg } = perfilConfig(roles, nombre);
                  const selected = form.rol === nombre;
                  return (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, rol: nombre }))}
                      className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left
                                  transition-all
                                  ${selected
                                    ? "border-teal-400 bg-teal-50/60"
                                    : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                                       rounded-lg ${selected ? bg : "bg-white"}`}>
                        <Icon className={`h-4 w-4 ${selected ? color : "text-gray-400"}`} strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${selected ? "text-gray-900" : "text-gray-600"}`}>
                          {label}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{descripcion}</p>
                      </div>
                      <div className={`ml-auto mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors
                                       ${selected ? "border-teal-500 bg-teal-500" : "border-gray-200 bg-white"}`}>
                        {selected && (
                          <svg viewBox="0 0 8 8" className="h-full w-full" fill="white">
                            <polyline points="1.5,4 3.5,6 6.5,2" strokeWidth={1.5} stroke="white" fill="none" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.rol && (
                <p className="mt-1.5 text-xs text-red-500">{errors.rol}</p>
              )}
            </div>

            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{submitError}</p>
            )}
          </div>

          {/* Footer del panel */}
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white
                         transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      </aside>

      {/* ── Panel editar usuario ────────────────────────────────────────────── */}

      {editUsuario && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={cerrarEdicion} />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl
                    transition-transform duration-300 ease-in-out
                    ${editUsuario ? "translate-x-0" : "translate-x-full"}`}
      >
        {editUsuario && (
          <>
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-base font-semibold text-gray-900">Editar usuario</p>
                <p className="text-xs text-gray-400">@{editUsuario.username}</p>
              </div>
              <button
                onClick={cerrarEdicion}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleEditSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-5 px-6 py-6">

                {/* Nombre */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={editForm.nombre_completo}
                    onChange={e => setEditForm(p => ({ ...p, nombre_completo: e.target.value }))}
                    className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                                outline-none transition focus:bg-white focus:ring-2
                                ${editErrors.nombre_completo
                                  ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                                  : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
                  />
                  {editErrors.nombre_completo && (
                    <p className="mt-1 text-xs text-red-500">{editErrors.nombre_completo}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                    className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                                outline-none transition focus:bg-white focus:ring-2
                                ${editErrors.email
                                  ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                                  : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
                  />
                  {editErrors.email && (
                    <p className="mt-1 text-xs text-red-500">{editErrors.email}</p>
                  )}
                </div>

                {/* Rol — acción separada a propósito, no se cambia por accidente */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Perfil
                  </label>

                  {!editMostrarRol ? (
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                      {(() => {
                        const pc = perfilConfig(roles, editRolNuevo ?? editUsuario.rol);
                        const Icon = pc.icon;
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1
                                            text-xs font-medium ${pc.badge}`}>
                            <Icon className="h-3 w-3" strokeWidth={2} />
                            {pc.label}
                          </span>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => setEditMostrarRol(true)}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        Cambiar rol
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {roles.map(({ nombre }) => {
                        const { label, descripcion, icon: Icon, color, bg } = perfilConfig(roles, nombre);
                        const selected = (editRolNuevo ?? editUsuario.rol) === nombre;
                        return (
                          <button
                            key={nombre}
                            type="button"
                            onClick={() => setEditRolNuevo(nombre)}
                            className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left
                                        transition-all
                                        ${selected
                                          ? "border-teal-400 bg-teal-50/60"
                                          : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}
                          >
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                                             rounded-lg ${selected ? bg : "bg-white"}`}>
                              <Icon className={`h-4 w-4 ${selected ? color : "text-gray-400"}`} strokeWidth={1.75} />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${selected ? "text-gray-900" : "text-gray-600"}`}>
                                {label}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{descripcion}</p>
                            </div>
                            <div className={`ml-auto mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors
                                             ${selected ? "border-teal-500 bg-teal-500" : "border-gray-200 bg-white"}`}>
                              {selected && (
                                <svg viewBox="0 0 8 8" className="h-full w-full" fill="white">
                                  <polyline points="1.5,4 3.5,6 6.5,2" strokeWidth={1.5} stroke="white" fill="none" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {editRolNuevo && editRolNuevo !== editUsuario.rol && (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          Vas a cambiar el rol de <strong>{perfilConfig(roles, editUsuario.rol).label}</strong> a{" "}
                          <strong>{perfilConfig(roles, editRolNuevo).label}</strong>.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {editSubmitError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{editSubmitError}</p>
                )}

                {/* Restablecer contraseña — acción independiente, endpoint aparte */}
                <div className="border-t border-gray-100 pt-5">
                  {!editMostrarPassword ? (
                    <button
                      type="button"
                      onClick={() => setEditMostrarPassword(true)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-800"
                    >
                      Restablecer contraseña…
                    </button>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">
                        Nueva contraseña temporal
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Mínimo 8 caracteres"
                          value={editPasswordNueva}
                          onChange={e => { setEditPasswordNueva(e.target.value); setEditPasswordExito(false); }}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm
                                     text-gray-800 placeholder-gray-300 outline-none transition
                                     focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-50"
                        />
                        <button
                          type="button"
                          onClick={() => { setEditPasswordNueva(generarPassword()); setEditPasswordExito(false); }}
                          className="flex-shrink-0 rounded-xl border border-gray-200 px-3 text-xs font-medium
                                     text-gray-500 transition-colors hover:bg-gray-50"
                        >
                          Generar
                        </button>
                      </div>
                      {editPasswordError && (
                        <p className="mt-1 text-xs text-red-500">{editPasswordError}</p>
                      )}
                      {editPasswordExito && (
                        <p className="mt-1 text-xs text-green-600">
                          Contraseña actualizada — compártela con {editUsuario.nombre_completo} por un canal seguro.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={editPasswordSubmitting}
                        className="mt-2 w-full rounded-xl border border-gray-200 py-2 text-sm font-medium
                                   text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                      >
                        {editPasswordSubmitting ? "Restableciendo…" : "Restablecer contraseña"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer del panel */}
              <div className="border-t border-gray-100 px-6 py-4">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white
                             transition-colors hover:bg-teal-700 disabled:opacity-60"
                >
                  {editSubmitting ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </>
        )}
      </aside>

    </main>
  );
}
