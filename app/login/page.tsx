"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Error al iniciar sesión");
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <Activity className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Cardioflow E3</h1>
            <p className="mt-0.5 text-sm text-gray-400">Inicia sesión para continuar</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-100 bg-white px-8 py-8 shadow-sm"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600" htmlFor="username">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm
                           text-gray-900 outline-none transition-colors
                           focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder="jmori"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm
                           text-gray-900 outline-none transition-colors
                           focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white
                         transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-[11px] text-gray-300">CONTEC E3 · v0.1</p>
      </div>
    </div>
  );
}
