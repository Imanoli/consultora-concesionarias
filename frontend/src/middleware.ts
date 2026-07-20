import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth(function middleware(req) {
  const isLoggedIn  = !!req.auth
  const pathname    = req.nextUrl.pathname
  const isPublic    = pathname.startsWith('/login')
    || pathname.startsWith('/api/auth')
    || pathname.startsWith('/q/')                      // vista publica de presupuestos (sin login)
    || pathname.startsWith('/backend/api/public/')      // descargas publicas (PDF) proxiadas al backend

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  // Redirigir usuario ya autenticado fuera del login
  if (isLoggedIn && pathname === '/login') {
    const clientId = (req.auth as any)?.user?.clientId as string | null
    const target   = clientId ? `/dashboard/${clientId}` : '/dashboard'
    return NextResponse.redirect(new URL(target, req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
}
