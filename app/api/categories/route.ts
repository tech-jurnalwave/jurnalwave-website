import { NextRequest, NextResponse } from 'next/server'
import {
  getArticleCategories,
  getArticleCategoriesFromDb,
  saveArticleCategoriesToDb,
  CategoryItem,
} from '@/lib/categories'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: Membaca daftar kategori global terkini dari database (dipakai oleh semua admin & publik)
export async function GET() {
  try {
    const categories = await getArticleCategoriesFromDb()
    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (err) {
    console.error('Error GET /api/categories:', err)
    return NextResponse.json({
      success: true,
      data: getArticleCategories(),
    })
  }
}

// POST: Menyimpan pembaruan kategori dari admin dan menyinkronkan secara global ke database
export async function POST(request: NextRequest) {
  try {
    let body: any = null
    try {
      body = await request.json()
    } catch {
      body = null
    }

    // Mendukung berbagai format payload: { categories: [...] }, { data: [...] }, atau array langsung [...]
    const rawCategories = Array.isArray(body)
      ? body
      : Array.isArray(body?.categories)
      ? body.categories
      : Array.isArray(body?.data)
      ? body.data
      : []

    if (!Array.isArray(rawCategories) || rawCategories.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data kategori tidak boleh kosong.' },
        { status: 400 }
      )
    }

    const categories: CategoryItem[] = rawCategories.map((c: any) => ({
      value: String(c.value || c.label || '').toLowerCase().trim(),
      label: String(c.label || c.value || '').trim(),
    }))

    const saved = await saveArticleCategoriesToDb(categories)
    if (!saved) {
      return NextResponse.json(
        { success: false, message: 'Format data kategori tidak valid.' },
        { status: 400 }
      )
    }

    // Revalidasi jalur halaman yang menampilkan daftar kategori
    try {
      revalidatePath('/', 'layout')
      revalidatePath('/berita')
      revalidatePath('/artikel')
      revalidatePath('/halo-jurnal/admin/berita')
    } catch {}

    const updated = await getArticleCategoriesFromDb()

    return NextResponse.json({
      success: true,
      message: 'Daftar kategori berhasil disimpan dan disinkronkan secara global!',
      data: updated,
    })
  } catch (err: unknown) {
    console.error('Error POST /api/categories:', err)
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kendala teknis saat memproses kategori di server.',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
