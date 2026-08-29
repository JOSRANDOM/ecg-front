import { NextRequest, NextResponse } from 'next/server'
import { fetchPacientesService } from '@/lib/pacientesService'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const backendResponse = await fetchPacientesService(`/api/v1/pacientes/${id}/imagenes-ecg`)

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Se reenvía el FormData tal cual — sin fijar Content-Type a mano, para que
  // fetch calcule el boundary multipart correcto.
  const formData = await request.formData()
  const backendResponse = await fetchPacientesService(`/api/v1/pacientes/${id}/imagenes-ecg`, {
    method: 'POST',
    body: formData,
  })

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}
