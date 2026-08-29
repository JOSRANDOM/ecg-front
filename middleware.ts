import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from './lib/jwt'

const PUBLIC_PATHS = ['/login']
const MAINTENANCE_PATH = '/mantenimiento'
// Tolerante a "TRUE"/" true "/etc — un env var mal tipeado (mayúsculas,
// espacio de más) no debe dejar el modo mantenimiento silenciosamente
// apagado cuando alguien cree que lo activó.
const MAINTENANCE_MODE = (process.env.MAINTENANCE_MODE ?? '').trim().toLowerCase() === 'true'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Las rutas /api/* validan su propia sesión y devuelven 401 en JSON (ver
  // lib/usuariosService.ts y cada route.ts) — si el middleware las
  // redirigiera a /login, un fetch() del cliente seguiría el redirect y
  // recibiría el HTML de /login donde esperaba JSON, rompiendo el parseo.
  // El middleware solo protege navegación de páginas. En mantenimiento no
  // hace falta bloquearlas aparte: las páginas que las llaman ya no se
  // renderizan, así que nadie las invoca.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Mantenimiento tiene prioridad sobre todo lo demás — incluido el login.
  // Se activa/desactiva solo con MAINTENANCE_MODE en .env, sin tocar código.
  if (MAINTENANCE_MODE) {
    if (pathname.startsWith(MAINTENANCE_PATH)) {
      return NextResponse.next()
    }
    return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url))
  }

  // Con mantenimiento desactivado, /mantenimiento no debe quedar accesible
  // directamente (evita que alguien la tenga cacheada/en favoritos).
  if (pathname.startsWith(MAINTENANCE_PATH)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const sesion = await verificarToken(request.cookies.get('auth_token')?.value)

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // Ya autenticado y visitando /login manualmente (ej. entró por historial
    // o marcador): no tiene sentido mostrarle el form de nuevo, se ve el
    // navbar de sesión activa apilado sobre el login. Lo mandamos al panel.
    if (sesion) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!sesion) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
