import { Users, Activity, Clock, CheckCircle } from "lucide-react";
import { fetchPacientesService } from "@/lib/pacientesService";
import type { EstadoEcg, Paciente, RegistroEcg } from "./pacientes/_types";
import DashboardChart from "./components/DashboardChart";

const estadoBadge: Record<EstadoEcg, { label: string; cls: string }> = {
  revisado:   { label: "Revisado",   cls: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" },
  pendiente:  { label: "Pendiente",  cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  en_proceso: { label: "En proceso", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"  },
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/** Los últimos `cantidad` meses (incluido el actual), del más antiguo al más
 * reciente — para que el eje X del gráfico se lea en orden cronológico. */
function ultimosMeses(cantidad: number, ahora: Date) {
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (cantidad - 1 - i), 1);
    return { anio: d.getFullYear(), mesIndex: d.getMonth(), label: MESES_CORTOS[d.getMonth()] };
  });
}

interface RegistroConPaciente extends RegistroEcg {
  paciente_nombre: string;
}

async function cargarDatos(): Promise<{
  pacientes: Paciente[];
  todos: RegistroConPaciente[];
}> {
  // Sin endpoint de /stats dedicado (ver plan): traemos hasta 1000 registros
  // globales y reducimos aquí mismo — a la escala de una clínica esto es
  // más simple que mantener contadores agregados en el backend.
  const [resPacientes, resRegistros] = await Promise.all([
    fetchPacientesService("/api/v1/pacientes"),
    fetchPacientesService("/api/v1/registros-ecg?limite=1000"),
  ]);

  if (!resPacientes || !resRegistros || !resPacientes.ok || !resRegistros.ok) {
    return { pacientes: [], todos: [] };
  }

  const pacientes: Paciente[] = await resPacientes.json();
  const registros: RegistroEcg[] = await resRegistros.json();

  const nombrePorId = new Map(pacientes.map((p) => [p.id, p.nombre_completo]));
  const todos = registros.map((r) => ({
    ...r,
    paciente_nombre: nombrePorId.get(r.paciente_id) ?? "Paciente",
  }));

  return { pacientes, todos };
}

export default async function Home() {
  const { pacientes, todos } = await cargarDatos();

  const totalPacientes   = pacientes.length;
  const pacientesActivos = pacientes.filter((p) => p.estado === "activo").length;
  const totalEstudios    = todos.length;
  const sinRevisar       = todos.filter(
    (r) => r.estado === "pendiente" || r.estado === "en_proceso"
  ).length;
  const recientes        = todos.slice(0, 6);

  const chartData = ultimosMeses(6, new Date()).map(({ anio, mesIndex, label }) => ({
    mes: label,
    estudios: todos.filter((r) => {
      const fecha = new Date(r.fecha);
      return fecha.getFullYear() === anio && fecha.getMonth() === mesIndex;
    }).length,
  }));

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-950 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Panel principal</h2>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">Resumen de actividad del sistema</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Pacientes"
            value={totalPacientes}
            sub={`${pacientesActivos} activos`}
            icon={<Users className="h-4 w-4 text-violet-600 dark:text-violet-400" strokeWidth={1.75} />}
            iconBg="bg-violet-50 dark:bg-violet-500/10"
          />
          <StatCard
            label="Estudios ECG"
            value={totalEstudios}
            sub="total registrados"
            icon={<Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />}
            iconBg="bg-blue-50 dark:bg-blue-500/10"
          />
          <StatCard
            label="Sin revisar"
            value={sinRevisar}
            sub="pendientes / en proceso"
            icon={<Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" strokeWidth={1.75} />}
            iconBg="bg-amber-50 dark:bg-amber-500/10"
          />
          <StatCard
            label="Revisados"
            value={totalEstudios - sinRevisar}
            sub="completados"
            icon={<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.75} />}
            iconBg="bg-green-50 dark:bg-green-500/10"
          />
        </div>

        {/* Chart + recent studies */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

          {/* Bar chart */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Estudios por mes</h3>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Últimos 6 meses</p>
            <div className="mt-4">
              <DashboardChart data={chartData} />
            </div>
          </div>

          {/* Recent studies */}
          <div className="lg:col-span-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Estudios recientes</h3>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Últimos registros ECG</p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {recientes.length === 0 ? (
                <p className="px-5 pb-5 text-xs text-gray-400 dark:text-gray-500">Sin estudios registrados todavía.</p>
              ) : recientes.map((r) => {
                const badge = estadoBadge[r.estado];
                return (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{r.paciente_nombre}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {r.tecnico_nombre} · {formatFecha(r.fecha)}
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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>
    </div>
  );
}
