import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Blokir akses ke URL tebakan umum: /admin, /admin/*, /redaksi, /superadmin-auth
  // Langsung kembalikan tampilan 404 (Halaman Tidak Ditemukan)
  if (
    pathname === '/admin' ||
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/') ||
    pathname === '/halo-jurnal/admin/login' ||
    pathname === '/redaksi/login' ||
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
