import { NextRequest, NextResponse } from 'next/server'
import { fetchPacientesService } from '@/lib/pacientesService'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const backendResponse = await fetchPacientesService(`/api/v1/pacientes/${id}`)

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const backendResponse = await fetchPacientesService(`/api/v1/pacientes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}
