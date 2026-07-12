import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from './lib/jwt'

const PUBLIC_PATHS = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Las rutas /api/* validan su propia sesión y devuelven 401 en JSON (ver
  // lib/usuariosService.ts y cada route.ts) — si el middleware las
  // redirigiera a /login, un fetch() del cliente seguiría el redirect y
  // recibiría el HTML de /login donde esperaba JSON, rompiendo el parseo.
  // El middleware solo protege navegación de páginas.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sesion = await verificarToken(request.cookies.get('auth_token')?.value)

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
