import { NextRequest, NextResponse } from 'next/server'
import { getArticleCategories, saveArticleCategories, CategoryItem } from '@/lib/categories'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: Membaca daftar kategori global terkini (dipakai oleh semua admin & publik)
export async function GET() {
  try {
    const categories = getArticleCategories()
    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal membaca daftar kategori.',
      },
      { status: 500 }
    )
  }
}

// POST: Menyimpan pembaruan kategori dari admin dan merevalidasi halaman publik
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const categories: CategoryItem[] = body.categories

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data kategori tidak valid atau kosong.' },
        { status: 400 }
      )
    }

    const saved = saveArticleCategories(categories)
    if (!saved) {
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan kategori ke server.' },
        { status: 500 }
      )
    }

    // Revalidasi jalur halaman yang menampilkan daftar kategori
    try {
      revalidatePath('/', 'layout')
      revalidatePath('/berita')
      revalidatePath('/artikel')
      revalidatePath('/halo-jurnal/admin/berita')
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Daftar kategori berhasil disimpan ke server dan disinkronkan secara global!',
      data: categories,
    })
  } catch (err) {
    console.error('Error in /api/categories:', err)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat memproses data kategori.' },
      { status: 500 }
    )
  }
}
