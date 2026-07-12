import { NextRequest, NextResponse } from 'next/server'
import { fetchUsuariosService } from '@/lib/usuariosService'

export async function GET() {
  const backendResponse = await fetchUsuariosService('/api/v1/roles')

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const backendResponse = await fetchUsuariosService('/api/v1/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!backendResponse) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const data = await backendResponse.json().catch(() => null)
  return NextResponse.json(data, { status: backendResponse.status })
}
