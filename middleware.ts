import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminTokenEdge, ADMIN_COOKIE_NAME } from '@/lib/auth.edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Lewatkan semua panggilan API server secara langsung agar tidak terganggu oleh rewrite halaman
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 2. Blokir rute lama /admin, /redaksi, dan /superadmin-auth secara senyap (Ghost Mode -> 404 Not Found)
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/redaksi' ||
    pathname.startsWith('/redaksi/') ||
    pathname === '/superadmin-auth' ||
    pathname.startsWith('/superadmin-auth/')
  ) {
    return NextResponse.rewrite(new URL('/_not-found', request.url))
  }

  // 3. Blokir total semua akses ke jalur lama /halo-jurnal/admin (Ghost Mode -> 404 Not Found)
  if (pathname === '/halo-jurnal/admin' || pathname.startsWith('/halo-jurnal/admin/')) {
    return NextResponse.rewrite(new URL('/_not-found', request.url))
  }

  // 4. Pintu Gerbang Rahasia Jurnal Central (/jurnal-central)
  // Dilindungi dengan Server-Side Ghost Mode: Pengunjung tanpa otentikasi resmi akan langsung menerima 404 Not Found murni
  if (pathname === '/jurnal-central' || pathname.startsWith('/jurnal-central/')) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    const isValidAdmin = await verifyAdminTokenEdge(token)

    if (!isValidAdmin) {
      // Pengunjung liar / scanner / peretas tidak akan pernah tahu URL ini ada
      return NextResponse.rewrite(new URL('/_not-found', request.url))
    }

    return NextResponse.next()
  }

  // 5. Tangkap jika ada upaya menyisipkan /admin di URL halaman publik lain (misal: /reels/admin) -> 404
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
