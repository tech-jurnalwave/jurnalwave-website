import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Alihkan akses URL lama admin ke rute staf resmi
  if (
    pathname === '/halo-jurnal/admin/login' ||
    pathname === '/admin/login' ||
    pathname === '/admin'
  ) {
    return NextResponse.redirect(new URL('/redaksi/login', request.url))
  }

  // 2. Abaikan rute admin resmi dan API agar tidak terjadi redirect loop
  if (pathname.startsWith('/halo-jurnal/admin') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 3. Tangkap jika user mengetik /admin di URL lain (misal: /reels/admin)
  const adminMatch = pathname.match(/\/(admin)(?:$|\/)(.*)/)
  if (adminMatch) {
    return NextResponse.redirect(new URL('/redaksi/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
