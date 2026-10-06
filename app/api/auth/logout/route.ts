import { NextRequest, NextResponse } from 'next/server'

const USUARIOS_SERVICE_URL = process.env.USUARIOS_SERVICE_URL ?? 'http://localhost:8001'

// Antes esto solo borraba la cookie: el JWT en sí seguía siendo válido
// hasta expirar solo (60 min) si alguien más lo tenía (hallazgo de
// auditoría de seguridad). Ahora avisa a usuarios-service para que revoque
// el token server-side (tokens_validos_desde) antes de borrar la cookie.
// Si la llamada al backend falla, igual se borra la cookie local — un
// logout no debe quedar trabado por un problema de red, aunque el token
// viejo siga técnicamente vivo hasta expirar.
export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value

  if (token) {
    try {
      await fetch(`${USUARIOS_SERVICE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Red caída o backend no disponible: seguimos con el logout local.
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('auth_token')
  return response
}
