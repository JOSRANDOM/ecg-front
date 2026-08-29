import { cookies } from 'next/headers'

const PACIENTES_SERVICE_URL = process.env.PACIENTES_SERVICE_URL ?? 'http://localhost:8002'

/** Reenvía una request a pacientes-service con el JWT de la cookie httpOnly
 * como Authorization: Bearer <token>. Devuelve null si no hay sesión — el
 * caller decide cómo responder (normalmente 401). Centraliza esto para que
 * las rutas /api/pacientes* y /api/registros-ecg* no dupliquen el manejo de
 * la cookie (mismo patrón que fetchUsuariosService). */
export async function fetchPacientesService(
  path: string,
  init: RequestInit = {}
): Promise<Response | null> {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return null

  return fetch(`${PACIENTES_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}
