import { jwtVerify } from 'jose'

export interface SesionUsuario {
  usuarioId: string
  username: string
  rol: string
  etiqueta: string
  permisos: string[]
}

const secretKey = process.env.AUTH_JWT_SECRET
  ? new TextEncoder().encode(process.env.AUTH_JWT_SECRET)
  : null

/** Verifica firma HS256 y expiración contra AUTH_JWT_SECRET (= JWT_SECRET de
 * usuarios-service). Devuelve null si el token falta, expiró o fue
 * manipulado — nunca lanza, para que middleware.ts y los server components
 * puedan usarlo sin try/catch propio.
 *
 * A diferencia de versiones anteriores, NO valida `rol` contra una lista
 * fija: los roles son dinámicos (el webmaster los crea desde
 * /roles-permisos), así que cualquier string firmado por usuarios-service
 * es válido por definición — la validación real ocurrió al emitir el
 * token (RolRepository.obtener_por_nombre en autenticar_usuario.py). */
export async function verificarToken(token: string | undefined): Promise<SesionUsuario | null> {
  if (!token || !secretKey) return null

  try {
    const { payload } = await jwtVerify(token, secretKey)
    const rol = String(payload.rol ?? '')
    if (!rol) return null

    return {
      usuarioId: String(payload.sub ?? ''),
      username: String(payload.username ?? ''),
      rol,
      etiqueta: String(payload.etiqueta ?? rol),
      permisos: Array.isArray(payload.permisos) ? (payload.permisos as string[]) : [],
    }
  } catch {
    return null
  }
}
