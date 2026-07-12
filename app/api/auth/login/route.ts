import { NextRequest, NextResponse } from 'next/server'

const USUARIOS_SERVICE_URL = process.env.USUARIOS_SERVICE_URL ?? 'http://localhost:8001'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 // debe coincidir con JWT_EXPIRE_MINUTES en usuarios-service

interface LoginBackendResponse {
  access_token: string
  token_type: string
}

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  let backendResponse: Response
  try {
    backendResponse = await fetch(`${USUARIOS_SERVICE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo conectar con el servidor de autenticación' },
      { status: 502 }
    )
  }

  if (!backendResponse.ok) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
  }

  const { access_token }: LoginBackendResponse = await backendResponse.json()

  const response = NextResponse.json({ ok: true })
  response.cookies.set('auth_token', access_token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
