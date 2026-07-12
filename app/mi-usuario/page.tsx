"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Stethoscope, Wrench, Settings, Loader2, User, UserCog,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
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

// Puramente cosmético — la ETIQUETA real (nombre para mostrar) viene de la
// sesión (JWT), no de este mapa. Los roles que no son de los 4 sembrados
// (ej. uno nuevo creado por el webmaster) caen al ícono genérico.
const ICONOS_ROL: Record<string, React.ElementType> = {
  webmaster: Settings,
  administracion: ShieldCheck,
  medico: Stethoscope,
  tecnico: Wrench,
};
const ICONO_GENERICO = UserCog;

function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function generarPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 16);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function MiUsuarioPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioApi | null>(null);
  const [etiquetaRol, setEtiquetaRol] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({ nombre_completo: "", email: "" });
  const [errors, setErrors] = useState<{ nombre_completo?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitExito, setSubmitExito] = useState(false);

  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordExito, setPasswordExito] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  async function cargar() {
    setLoading(true);
    setLoadError("");
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        router.push("/login");
        return;
      }
      if (!meRes.ok) throw new Error("No se pudo cargar tu sesión");
      const me = await meRes.json();
      setEtiquetaRol(me.etiqueta);

      const usuarioRes = await fetch(`/api/usuarios/${me.usuarioId}`);
      if (usuarioRes.status === 401) {
        router.push("/login");
        return;
      }
      if (!usuarioRes.ok) throw new Error("No se pudo cargar tu perfil");
      const datos: UsuarioApi = await usuarioRes.json();

      setUsuario(datos);
      setForm({ nombre_completo: datos.nombre_completo, email: datos.email });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.nombre_completo.trim()) e.nombre_completo = "El nombre es requerido";
    if (!form.email.trim()) e.email = "El correo es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Correo inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario || !validate()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitExito(false);
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Nunca se manda `rol` desde este módulo: nadie puede auto-asignarse
        // un rol distinto, ni siquiera vía este formulario propio.
        body: JSON.stringify({
          nombre_completo: form.nombre_completo.trim(),
          email: form.email.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo guardar los cambios");
      }
      const actualizado: UsuarioApi = await res.json();
      setUsuario(actualizado);
      setSubmitExito(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!usuario) return;
    if (passwordNueva.length < 8) {
      setPasswordError("Mínimo 8 caracteres");
      return;
    }
    setPasswordSubmitting(true);
    setPasswordError("");
    setPasswordExito(false);
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_nueva: passwordNueva }),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo cambiar la contraseña");
      }
      setPasswordExito(true);
      setPasswordNueva("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white">
        <Loader2 className="mb-3 h-6 w-6 animate-spin text-gray-300" />
        <p className="text-sm text-gray-400">Cargando tu perfil…</p>
      </main>
    );
  }

  if (loadError || !usuario) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 text-center">
        <User className="mb-3 h-8 w-8 text-gray-200" strokeWidth={1.5} />
        <p className="text-sm text-gray-400">{loadError || "No se pudo cargar tu perfil"}</p>
      </main>
    );
  }

  const Icon = ICONOS_ROL[usuario.rol] ?? ICONO_GENERICO;

  return (
    <main className="flex flex-1 flex-col bg-white">
      <div className="border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Mi usuario</h1>
        <p className="mt-0.5 text-xs text-gray-400">Tus datos y tu contraseña — solo tú puedes verlos y cambiarlos</p>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-8">

        {/* Identidad — solo lectura */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full
                          bg-teal-100 text-sm font-bold text-teal-700">
            {iniciales(usuario.nombre_completo)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{usuario.nombre_completo}</p>
            <p className="text-xs text-gray-400">@{usuario.username}</p>
          </div>
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-100
                            px-2.5 py-1 text-xs font-medium text-gray-700">
            <Icon className="h-3 w-3" strokeWidth={2} />
            {etiquetaRol}
          </span>
        </div>
        <p className="-mt-6 text-[11px] text-gray-400">
          El usuario y el rol los define administración — no se editan desde aquí.
        </p>

        {/* Datos editables */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Nombre completo</label>
            <input
              type="text"
              value={form.nombre_completo}
              onChange={e => setForm(p => ({ ...p, nombre_completo: e.target.value }))}
              className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                          outline-none transition focus:bg-white focus:ring-2
                          ${errors.nombre_completo
                            ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                            : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
            />
            {errors.nombre_completo && <p className="mt-1 text-xs text-red-500">{errors.nombre_completo}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Correo electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-800
                          outline-none transition focus:bg-white focus:ring-2
                          ${errors.email
                            ? "border-red-300 focus:border-red-300 focus:ring-red-50"
                            : "border-gray-200 focus:border-teal-300 focus:ring-teal-50"}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{submitError}</p>
          )}
          {submitExito && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">Cambios guardados.</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white
                       transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        {/* Cambiar contraseña */}
        <div className="space-y-3 border-t border-gray-100 pt-6">
          <div>
            <p className="text-sm font-medium text-gray-900">Cambiar mi contraseña</p>
            <p className="text-xs text-gray-400">Nadie más puede hacer esto por ti desde aquí.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva contraseña (mínimo 8 caracteres)"
              value={passwordNueva}
              onChange={e => { setPasswordNueva(e.target.value); setPasswordExito(false); }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm
                         text-gray-800 placeholder-gray-300 outline-none transition
                         focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-50"
            />
            <button
              type="button"
              onClick={() => { setPasswordNueva(generarPassword()); setPasswordExito(false); }}
              className="flex-shrink-0 rounded-xl border border-gray-200 px-3 text-xs font-medium
                         text-gray-500 transition-colors hover:bg-gray-50"
            >
              Generar
            </button>
          </div>
          {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
          {passwordExito && (
            <p className="text-xs text-green-600">
              Contraseña actualizada. La próxima vez que inicies sesión, usa la nueva.
            </p>
          )}
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={passwordSubmitting}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium
                       text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {passwordSubmitting ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </div>
      </div>
    </main>
  );
}
