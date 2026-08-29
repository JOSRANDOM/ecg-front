"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Home, Users, Settings2, Activity, UserCog, CircleUser, ShieldCheck, Search, FileSpreadsheet, History } from "lucide-react";
import LogoutButton from "./LogoutButton";

interface Props {
  permisos: string[];
}

export default function NavDrawer({ permisos }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const puedeVerRoles = permisos.includes("roles:leer");
  const puedeVerAuditoria = permisos.includes("auditoria:leer");

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white dark:bg-gray-950
                    transition-transform duration-300 ease-in-out
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">Cardioflow E3</span>
          </div>
          <button
            onClick={close}
            className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6">
          <div className="h-px bg-gray-100 dark:bg-gray-800" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1">
          {/* Inicio — link sutil */}
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-500
                       transition-colors hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Home className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            Inicio
          </Link>

          {/* Mi usuario — accesible a cualquier rol, es sobre uno mismo */}
          <Link
            href="/mi-usuario"
            onClick={close}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-500
                       transition-colors hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <CircleUser className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            Mi usuario
          </Link>

          <div className="pt-2 pb-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-600">
              Módulos
            </p>
          </div>

          {/* Pacientes — botón primario */}
          <Link
            href="/pacientes"
            onClick={close}
            className="flex w-full items-center gap-3 rounded-xl bg-violet-600 px-4 py-3
                       text-sm font-medium text-white transition-colors hover:bg-violet-700"
          >
            <Users className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Pacientes
          </Link>

          {/* Buscar ECG — imágenes manuales, ver ecg:leer en el JWT del rol */}
          <Link
            href="/archivo-ecg"
            onClick={close}
            className="flex w-full items-center gap-3 rounded-xl bg-amber-600 px-4 py-3
                       text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            <Search className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Buscar ECG
          </Link>

          {/* Usuarios */}
          <Link
            href="/usuarios"
            onClick={close}
            className="flex w-full items-center gap-3 rounded-xl bg-teal-600 px-4 py-3
                       text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <UserCog className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Usuarios
          </Link>

          {/* Auditoría — exclusivo de quien tenga auditoria:leer */}
          {puedeVerAuditoria && (
            <Link
              href="/auditoria"
              onClick={close}
              className="flex w-full items-center gap-3 rounded-xl bg-gray-700 px-4 py-3
                         text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <History className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              Auditoría
            </Link>
          )}

          {/* Roles y permisos — exclusivo de webmaster */}
          {puedeVerRoles && (
            <Link
              href="/roles-permisos"
              onClick={close}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-700 px-4 py-3
                         text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <ShieldCheck className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              Roles y permisos
            </Link>
          )}

          {/* Administrar equipos */}
          <Link
            href="/equipos"
            onClick={close}
            className="flex w-full items-center gap-3 rounded-xl bg-blue-600 px-4 py-3
                       text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Settings2 className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Administrar equipos
          </Link>

          {/* Reportes */}
          <Link
            href="/reportes"
            onClick={close}
            className="flex w-full items-center gap-3 rounded-xl bg-rose-600 px-4 py-3
                       text-sm font-medium text-white transition-colors hover:bg-rose-700"
          >
            <FileSpreadsheet className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Reportes
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <LogoutButton variant="full" />
          <p className="mt-3 px-3 text-[11px] text-gray-300 dark:text-gray-600">CONTEC E3 · v0.1</p>
        </div>
      </aside>
    </>
  );
}
