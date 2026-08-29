import DeviceCard from "../components/DeviceCard";

export default function EquiposPage() {
  return (
    <main className="flex flex-1 flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Administrar equipos</h1>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Conecta y sincroniza el electrocardiógrafo CONTEC E3</p>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 items-start justify-center px-6 py-10">
        <DeviceCard />
      </div>
    </main>
  );
}
