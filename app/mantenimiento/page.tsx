import { Wrench } from "lucide-react";

export default function MantenimientoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
        <Wrench className="h-6 w-6 text-white" strokeWidth={2} />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-gray-900">Cardioflow E3</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        La plataforma está en mantenimiento por el momento. Estamos trabajando para que vuelva a
        estar disponible lo antes posible.
      </p>
      <p className="mt-6 text-[11px] text-gray-300">Vuelve a intentarlo en unos minutos.</p>
    </div>
  );
}
