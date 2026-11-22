import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Arahkan akses URL login admin umum langsung ke pintu masuk login staf resmi
  if (
    pathname === '/admin' ||
    pathname === '/admin/login' ||
    pathname === '/halo-jurnal/admin/login' ||
    pathname === '/redaksi/login'
  ) {
    return NextResponse.redirect(new URL('/jw-gate-781', request.url))
  }

  if (
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/redaksi/') ||
    pathname === '/superadmin-auth'
  ) {
    return NextResponse.rewrite(new URL('/_not-found', request.url))
  }

  // 2. Abaikan rute admin resmi dan API agar tidak terjadi loop
  if (pathname.startsWith('/halo-jurnal/admin') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 3. Tangkap jika ada upaya mengetik /admin di URL lain (misal: /reels/admin) -> 404
  const adminMatch = pathname.match(/\/(admin)(?:$|\/)(.*)/)
  if (adminMatch) {
    return NextResponse.rewrite(new URL('/_not-found', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
