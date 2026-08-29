import { NextRequest, NextResponse } from 'next/server'
import { fetchPacientesService } from '@/lib/pacientesService'

/** Listado global de estudios recientes (sin scope a un paciente), usado
 * por el dashboard. `?limite=6` por defecto lo resuelve pacientes-service. */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString()
  const backendResponse = await fetchPacientesService(`/api/v1/registros-ecg${qs ? `?${qs}` : ''}`)

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}
