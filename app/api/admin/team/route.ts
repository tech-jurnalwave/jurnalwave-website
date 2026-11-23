import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const SUPERADMIN_MEMBER = {
  id: 'team-superadmin',
  name: 'Super Admin',
  email: 'tech.jurnalwave@gmail.com',
  role: 'Superadmin',
  isSuperadmin: true,
  permissions: ['dashboard', 'berita', 'reels', 'loker', 'polling', 'laporan', 'pengguna'],
  status: 'aktif',
  joinedAt: 'Akun Utama (Google SSO)',
}

// 1. GET: Ambil daftar seluruh anggota admin dari database Neon DB
export async function GET(request: NextRequest) {
  try {
    const dbUsers = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
    })

    const staffMembers = dbUsers.map((u) => {
      let meta: any = {}
      try {
        if (u.avatarUrl && u.avatarUrl.startsWith('{')) {
          meta = JSON.parse(u.avatarUrl)
        }
      } catch {}

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        password: meta.password || '',
        isSuperadmin: false,
        permissions: Array.isArray(meta.permissions) && meta.permissions.length > 0
          ? meta.permissions.filter((p: string) => p !== 'pengguna')
          : ['dashboard'],
        status: meta.status === 'cuti' ? 'cuti' : 'aktif',
        joinedAt: meta.joinedAt || u.createdAt.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      }
    })

    // Pastikan Superadmin selalu berada di posisi pertama
    const allMembers = [SUPERADMIN_MEMBER, ...staffMembers]

    return NextResponse.json(
      { success: true, data: allMembers },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.warn('Notice fetching team from DB (offline fallback):', (error as any)?.message || error)
    return NextResponse.json(
      { success: true, data: [SUPERADMIN_MEMBER] },
      { status: 200 }
    )
  }
}

// 2. POST: Tambah atau Perbarui anggota admin di database Neon DB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, role, password, permissions, status, joinedAt } = body

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, message: 'Nama, email, dan jabatan wajib diisi.' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail === 'tech.jurnalwave@gmail.com') {
      return NextResponse.json(
        { success: false, message: 'Akun Superadmin dikelola khusus via Google SSO.' },
        { status: 400 }
      )
    }

    const metaPayload = {
      password: password || '',
      permissions: Array.isArray(permissions)
        ? permissions.filter((p: string) => p !== 'pengguna')
        : ['dashboard'],
      status: status === 'cuti' ? 'cuti' : 'aktif',
      joinedAt: joinedAt || new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    }
    const avatarUrl = JSON.stringify(metaPayload)

    // Simpan atau update di Neon DB
    const existing = await prisma.adminUser.findUnique({
      where: { email: cleanEmail },
    })

    let savedUser
    if (existing) {
      savedUser = await prisma.adminUser.update({
        where: { email: cleanEmail },
        data: {
          name: name.trim(),
          role: role.trim(),
          avatarUrl,
        },
      })
    } else {
      savedUser = await prisma.adminUser.create({
        data: {
          id: id && !id.startsWith('usr-') ? id : undefined,
          name: name.trim(),
          email: cleanEmail,
          role: role.trim(),
          avatarUrl,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Akun admin ${savedUser.name} berhasil disimpan di database server.`,
      data: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        ...metaPayload,
      },
    })
  } catch (error) {
    console.error('Error saving team member to DB:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menyimpan anggota ke database: ' + ((error as any)?.message || 'Koneksi database bermasalah') },
      { status: 500 }
    )
  }
}

// 3. DELETE: Hapus anggota admin dari database Neon DB
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const email = searchParams.get('email')

    if (!id && !email) {
      return NextResponse.json(
        { success: false, message: 'ID atau email anggota wajib disertakan.' },
        { status: 400 }
      )
    }

    if (email?.toLowerCase() === 'tech.jurnalwave@gmail.com' || id === 'team-superadmin') {
      return NextResponse.json(
        { success: false, message: 'Akun Superadmin tidak dapat dihapus.' },
        { status: 403 }
      )
    }

    if (id) {
      await prisma.adminUser.delete({ where: { id } }).catch(async () => {
        if (email) {
          await prisma.adminUser.delete({ where: { email: email.toLowerCase() } })
        }
      })
    } else if (email) {
      await prisma.adminUser.delete({ where: { email: email.toLowerCase() } })
    }

    return NextResponse.json({
      success: true,
      message: 'Anggota admin berhasil dihapus dari database server.',
    })
  } catch (error) {
    console.error('Error deleting team member from DB:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus anggota admin dari database.' },
      { status: 500 }
    )
  }
}
