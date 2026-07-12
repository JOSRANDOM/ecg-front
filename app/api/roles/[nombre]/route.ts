import { NextRequest, NextResponse } from 'next/server'
import { fetchUsuariosService } from '@/lib/usuariosService'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nombre: string }> }
) {
  const { nombre } = await params
  const body = await request.json()
  const backendResponse = await fetchUsuariosService(`/api/v1/roles/${nombre}`, {
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ nombre: string }> }
) {
  const { nombre } = await params
  const backendResponse = await fetchUsuariosService(`/api/v1/roles/${nombre}`, {
    method: 'DELETE',
  })

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (backendResponse.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}
