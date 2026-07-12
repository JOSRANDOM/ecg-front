import { cookies } from 'next/headers'

const USUARIOS_SERVICE_URL = process.env.USUARIOS_SERVICE_URL ?? 'http://localhost:8001'

/** Reenvía una request a usuarios-service con el JWT de la cookie httpOnly
 * como Authorization: Bearer <token>. Devuelve null si no hay sesión — el
 * caller decide cómo responder (normalmente 401). Centraliza esto para que
 * las rutas /api/usuarios/* no dupliquen el manejo de la cookie. */
export async function fetchUsuariosService(
  path: string,
  init: RequestInit = {}
): Promise<Response | null> {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return null

  return fetch(`${USUARIOS_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}
