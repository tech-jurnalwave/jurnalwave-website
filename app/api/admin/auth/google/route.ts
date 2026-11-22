import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME, signAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const SUPERADMIN_OFFICIAL_EMAIL =
  process.env.SUPERADMIN_GOOGLE_EMAIL?.trim().toLowerCase() || 'tech.jurnalwave@gmail.com'

/**
 * POST /api/admin/auth/google
 * Menerima Google ID Token dari Google Identity Services (GIS),
 * memverifikasi keaslian token langsung ke server Google OAuth2,
 * dan memastikan email yang masuk PERSIS cocok dengan tech.jurnalwave@gmail.com
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential } = body

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Google Credential Token tidak valid atau tidak disertakan.' },
        { status: 400 }
      )
    }

    // 1. Verifikasi Google ID Token langsung ke endpoint resmi Google
    const googleVerifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: 'no-store' }
    )

    if (!googleVerifyRes.ok) {
      return NextResponse.json(
        { success: false, message: 'Verifikasi token Google gagal atau sesi telah kadaluarsa.' },
        { status: 401 }
      )
    }

    const tokenPayload = await googleVerifyRes.json()

    const email = (tokenPayload.email || '').trim().toLowerCase()
    const isEmailVerified = tokenPayload.email_verified === 'true' || tokenPayload.email_verified === true
    const name = tokenPayload.name || 'Super Admin JurnalWave'
    const picture = tokenPayload.picture || ''

    if (!email || !isEmailVerified) {
      return NextResponse.json(
        { success: false, message: 'Email Google belum terverifikasi oleh Google.' },
        { status: 403 }
      )
    }

    // 2. Proteksi Mutlak: Hanya email tech.jurnalwave@gmail.com yang diizinkan!
    if (email !== SUPERADMIN_OFFICIAL_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          message: `Akses Ditolak! Akun Google (${email}) tidak memiliki otoritas Superadmin JurnalWave. Hanya ${SUPERADMIN_OFFICIAL_EMAIL} yang berhak masuk.`,
        },
        { status: 403 }
      )
    }

    // 3. Terbitkan JWT Token Sesi Superadmin resmi
    const adminPayload = {
      id: 'superadmin-master',
      name,
      email,
      role: 'superadmin',
      picture,
    }

    const sessionToken = await signAdminToken(adminPayload)

    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi Superadmin berhasil! Mengalihkan ke Pusat Kendali Redaksi...',
      user: adminPayload,
    })

    // Pasang HTTP-Only Cookie terenkripsi (7 hari)
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 hari
    })

    return response
  } catch (error: any) {
    console.error('Google Superadmin Auth Error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kendala pada server saat memproses login Google: ' + error.message },
      { status: 500 }
    )
  }
}
