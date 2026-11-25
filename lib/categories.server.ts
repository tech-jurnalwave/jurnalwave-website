import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES, getArticleCategories, CategoryItem } from '@/lib/categories'

/**
 * Membaca daftar kategori resmi dari Database Neon (PostgreSQL)
 * Sinkronisasi 100% konsisten antar Admin & Pengunjung Publik
 */
export async function getArticleCategoriesFromDb(): Promise<CategoryItem[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ value: string; label: string; order: number }>>`
      SELECT value, label, "order" FROM categories ORDER BY "order" ASC
    `
    if (Array.isArray(rows) && rows.length > 0) {
      const cleaned: CategoryItem[] = rows.map((r) => ({
        value: String(r.value).toLowerCase().trim(),
        label: String(r.label).trim(),
      }))
      globalThis.__jurnalWaveGlobalCategories = cleaned
      return cleaned
    }
  } catch (err) {
    console.warn('Notice saat membaca kategori dari database:', err)
  }

  return getArticleCategories()
}

/**
 * Helper untuk mengambil label nama resmi kategori dari Database Neon
 * Dipakai oleh seluruh halaman kategori, judul menu, dan metadata di sisi server
 */
export async function getCategoryLabelFromDb(slug: string): Promise<string> {
  const categories = await getArticleCategoriesFromDb()
  const found = categories.find((c) => c.value.toLowerCase() === slug.toLowerCase())
  if (found) return found.label
  const fallback = DEFAULT_CATEGORIES.find((c) => c.value.toLowerCase() === slug.toLowerCase())
  return fallback ? fallback.label : (slug.charAt(0).toUpperCase() + slug.slice(1))
}

/**
 * Menyimpan pembaruan kategori secara permanen ke Database Neon
 */
export async function saveArticleCategoriesToDb(categories: CategoryItem[]): Promise<boolean> {
  if (!Array.isArray(categories) || categories.length === 0) {
    return false
  }

  const cleaned: CategoryItem[] = categories
    .filter((c) => c && typeof c === 'object' && (c.value || c.label))
    .map((c) => ({
      value: String(c.value || c.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      label: String(c.label || c.value).trim(),
    }))
    .filter((c) => c.value.length > 0 && c.label.length > 0)

  if (cleaned.length === 0) {
    return false
  }

  // Update RAM memori server global (instan)
  globalThis.__jurnalWaveGlobalCategories = cleaned

  // Simpan ke PostgreSQL database di Neon
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM categories`)
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i]
      await prisma.$executeRawUnsafe(
        `INSERT INTO categories (id, value, label, "order", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        `cat_${c.value}_${i}`,
        c.value,
        c.label,
        i + 1
      )
    }
  } catch (dbErr) {
    console.error('Error menyimpan kategori ke database:', dbErr)
    return false
  }

  return true
}
