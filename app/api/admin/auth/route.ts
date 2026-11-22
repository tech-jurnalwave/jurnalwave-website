import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  ADMIN_COOKIE_NAME,
  signAdminToken,
  getAdminSession,
} from '@/lib/auth'
import { z } from 'zod'

// Skema validasi input form login admin
const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid').trim().toLowerCase(),
  password: z.string().min(1, 'Kata sandi wajib diisi').trim(),
  teamMembers: z.array(z.any()).optional(),
})

// Rate limiter in-memory untuk proteksi anti-brute force tebak kata sandi
const loginAttempts = new Map<string, { count: number; lockUntil: number }>()

function checkRateLimit(key: string): { locked: boolean; remainingSec: number } {
  const record = loginAttempts.get(key)
  if (!record) return { locked: false, remainingSec: 0 }
  const now = Date.now()
  if (record.lockUntil > now) {
    return { locked: true, remainingSec: Math.ceil((record.lockUntil - now) / 1000) }
  }
  return { locked: false, remainingSec: 0 }
}

function recordFailedAttempt(key: string): { locked: boolean; remainingSec: number; attempts: number } {
  const now = Date.now()
  const record = loginAttempts.get(key) || { count: 0, lockUntil: 0 }
  record.count += 1
  if (record.count >= 5) {
    record.lockUntil = now + 120 * 1000 // Kunci 2 menit (120 detik)
    record.count = 0
    loginAttempts.set(key, record)
    return { locked: true, remainingSec: 120, attempts: 5 }
  }
  loginAttempts.set(key, record)
  return { locked: false, remainingSec: 0, attempts: record.count }
}

function resetAttempts(key: string): void {
  loginAttempts.delete(key)
}

// 1. POST: Login Admin & Terbitkan HTTP-Only Cookie JWT
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const parseResult = LoginSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || 'Input tidak valid'
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 })
    }

    const { email, password, teamMembers } = parseResult.data

    // Cek Rate Limit Anti-Brute Force
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
    const rateLimitKey = `${clientIp}_${email}`
    const { locked, remainingSec } = checkRateLimit(rateLimitKey)

    if (locked) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          remainingSec,
          message: `Terlalu banyak percobaan gagal. Akses login terkunci sementara selama ${remainingSec} detik demi keamanan.`,
        },
        { status: 429 }
      )
    }

    // 1. Proteksi Khusus Superadmin: Tidak dapat login via form staf biasa
    if (email === 'tech.jurnalwave@gmail.com') {
      return NextResponse.json(
        {
          success: false,
          message: 'Kombinasi email atau kata sandi admin salah.',
        },
        { status: 401 }
      )
    }

    // 2. Verifikasi staf admin langsung dari Database Server Neon DB
    let matchedMember: any = null
    let isValid = false

    try {
      const dbUser = await prisma.adminUser.findUnique({
        where: { email },
      })

      if (dbUser) {
        let meta: any = {}
        try {
          if (dbUser.avatarUrl && dbUser.avatarUrl.startsWith('{')) {
            meta = JSON.parse(dbUser.avatarUrl)
          }
        } catch {}

        if (meta.status === 'cuti') {
          return NextResponse.json(
            {
              success: false,
              message: 'Akun Anda sedang dinonaktifkan (status cuti). Silakan hubungi Superadmin.',
            },
            { status: 403 }
          )
        }

        if (meta.password && meta.password === password) {
          isValid = true
          matchedMember = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            permissions:
              Array.isArray(meta.permissions) && meta.permissions.length > 0
                ? meta.permissions
                : ['dashboard', 'berita'],
            isSuperadmin: false,
          }
        }
      }
    } catch (err) {
      console.warn('Neon DB admin lookup notice:', err)
    }

    // 3. Fallback: Verifikasi dari daftar anggota staf jika dikirim oleh client
    if (!isValid && Array.isArray(teamMembers)) {
      const clientMatch = teamMembers.find(
        (m: any) => m.email?.toLowerCase() === email.toLowerCase()
      )
      if (clientMatch) {
        if (clientMatch.status === 'cuti') {
          return NextResponse.json(
            {
              success: false,
              message: 'Akun Anda sedang dinonaktifkan (status cuti). Silakan hubungi Superadmin.',
            },
            { status: 403 }
          )
        }
        if (clientMatch.password && clientMatch.password === password) {
          isValid = true
          matchedMember = clientMatch
        }
      }
    }

    if (!isValid) {
      const failInfo = recordFailedAttempt(rateLimitKey)
      if (failInfo.locked) {
        return NextResponse.json(
          {
            success: false,
            locked: true,
            remainingSec: failInfo.remainingSec,
            message: 'Terlalu banyak percobaan salah (5x). Form login dikunci sementara selama 2 menit.',
          },
          { status: 429 }
        )
      }

      const sisaTersisa = 5 - failInfo.attempts
      return NextResponse.json(
        {
          success: false,
          attemptsLeft: sisaTersisa,
          message: `Kombinasi email atau kata sandi admin salah. (${sisaTersisa} percobaan tersisa sebelum terkunci)`,
        },
        { status: 401 }
      )
    }

    // Login sukses: reset batas percobaan gagal
    resetAttempts(rateLimitKey)

    const userPayload = {
      id: matchedMember?.id || 'staff-member',
      name: matchedMember?.name || 'Staf Redaksi',
      email: matchedMember?.email || email,
      role: matchedMember?.role || 'staf',
      isSuperadmin: false,
      permissions:
        matchedMember?.permissions || ['dashboard'],
    }

    // Buat JWT Token aman berumur 7 hari
    const token = await signAdminToken(userPayload)

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil! Mengalihkan ke Dashboard Admin...',
      user: userPayload,
    })

    // Set HTTP-Only Cookie (tidak bisa dicuri oleh JavaScript/Inspect Element)
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    })

    return response
  } catch (error: any) {
    console.error('API Admin Auth error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem: ' + (error?.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

// 2. GET: Cek Status Sesi Login Berdasarkan Token JWT
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request)

    if (session) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
        },
      })
    }

    return NextResponse.json({
      authenticated: false,
    })
  } catch {
    return NextResponse.json({
      authenticated: false,
    })
  }
}

// 3. DELETE: Logout / Keluar
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Berhasil keluar dari akun admin.',
  })

  // Hapus cookie sesi resmi
  response.cookies.delete(ADMIN_COOKIE_NAME)

  return response
}
