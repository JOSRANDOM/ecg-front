import DeviceCard from "./components/DeviceCard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Panel de dispositivos</h1>
        <p className="mt-1 text-sm text-gray-500">Gestión del electrocardiógrafo CONTEC E3</p>
      </div>
      <DeviceCard />
    </main>
  );
}
