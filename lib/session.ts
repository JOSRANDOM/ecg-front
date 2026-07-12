import { cookies } from 'next/headers'
import { verificarToken, type SesionUsuario } from './jwt'

/** Para usar en Server Components / Route Handlers (usa next/headers, no
 * disponible en middleware.ts — ahí se llama verificarToken directamente). */
export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const token = (await cookies()).get('auth_token')?.value
  return verificarToken(token)
}
