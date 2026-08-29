import { NextRequest, NextResponse } from 'next/server'
import { fetchPacientesService } from '@/lib/pacientesService'

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString()
  const backendResponse = await fetchPacientesService(`/api/v1/auditoria${qs ? `?${qs}` : ''}`)

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}
