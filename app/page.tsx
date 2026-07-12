import { Users, Activity, Clock, CheckCircle } from "lucide-react";
import { PACIENTES } from "./pacientes/_data";
import type { EstadoEcg } from "./pacientes/_data";
import DashboardChart from "./components/DashboardChart";

const allRegistros = PACIENTES.flatMap((p) =>
  p.registros.map((r) => ({ ...r, paciente: p.nombre }))
);

const totalPacientes   = PACIENTES.length;
const pacientesActivos = PACIENTES.filter((p) => p.estado === "activo").length;
const totalEstudios    = allRegistros.length;
const sinRevisar       = allRegistros.filter(
  (r) => r.estado === "pendiente" || r.estado === "en_proceso"
).length;

const recientes = [...allRegistros]
  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  .slice(0, 6);

const chartData = [
  { mes: "Dic", estudios: 1 },
  { mes: "Ene", estudios: 2 },
  { mes: "Feb", estudios: 3 },
  { mes: "Mar", estudios: 3 },
  { mes: "Abr", estudios: 2 },
  { mes: "May", estudios: 3 },
];

const estadoBadge: Record<EstadoEcg, { label: string; cls: string }> = {
  revisado:   { label: "Revisado",   cls: "bg-green-50 text-green-600" },
  pendiente:  { label: "Pendiente",  cls: "bg-amber-50 text-amber-600" },
  en_proceso: { label: "En proceso", cls: "bg-blue-50 text-blue-600"  },
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Home() {
  return (
    <main className="flex-1 bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Panel principal</h2>
          <p className="mt-0.5 text-sm text-gray-400">Resumen de actividad del sistema</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Pacientes"
            value={totalPacientes}
            sub={`${pacientesActivos} activos`}
            icon={<Users className="h-4 w-4 text-violet-600" strokeWidth={1.75} />}
            iconBg="bg-violet-50"
          />
          <StatCard
            label="Estudios ECG"
            value={totalEstudios}
            sub="total registrados"
            icon={<Activity className="h-4 w-4 text-blue-600" strokeWidth={1.75} />}
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Sin revisar"
            value={sinRevisar}
            sub="pendientes / en proceso"
            icon={<Clock className="h-4 w-4 text-amber-500" strokeWidth={1.75} />}
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Revisados"
            value={totalEstudios - sinRevisar}
            sub="completados"
            icon={<CheckCircle className="h-4 w-4 text-green-600" strokeWidth={1.75} />}
            iconBg="bg-green-50"
          />
        </div>

        {/* Chart + recent studies */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

          {/* Bar chart */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700">Estudios por mes</h3>
            <p className="mt-0.5 text-xs text-gray-400">Últimos 6 meses</p>
            <div className="mt-4">
              <DashboardChart data={chartData} />
            </div>
          </div>

          {/* Recent studies */}
          <div className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-gray-700">Estudios recientes</h3>
              <p className="mt-0.5 text-xs text-gray-400">Últimos registros ECG</p>
            </div>
            <div className="divide-y divide-gray-50">
              {recientes.map((r) => {
                const badge = estadoBadge[r.estado];
                return (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{r.paciente}</p>
                      <p className="text-xs text-gray-400">
                        {r.tecnico} · {formatFecha(r.fecha)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label, value, sub, icon, iconBg,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}
