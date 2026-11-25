import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export interface CategoryItem {
  value: string
  label: string
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { value: 'berita', label: 'Berita' },
  { value: 'kuliner', label: 'Kuliner' },
  { value: 'wisata', label: 'Wisata' },
  { value: 'hiburan', label: 'Hiburan' },
  { value: 'tech', label: 'Tech' },
  { value: 'sport', label: 'Sport & E-Sport' },
  { value: 'inspirasi', label: 'Inspirasi' },
]

declare global {
  // eslint-disable-next-line no-var
  var __jurnalWaveGlobalCategories: CategoryItem[] | undefined
}

function resolveCategoriesFilePath(): string {
  const cwd = process.cwd()
  const candidate1 = path.join(cwd, 'data', 'articleCategories.json')
  if (fs.existsSync(candidate1)) return candidate1

  const candidate2 = path.resolve(cwd, '..', 'data', 'articleCategories.json')
  if (fs.existsSync(candidate2)) return candidate2

  return candidate1
}

/**
 * Membaca daftar kategori resmi JurnalWave
 * Menggunakan memori global server (globalThis) didukung file persistensi
 */
export function getArticleCategories(): CategoryItem[] {
  // 1. Cek dari RAM memori global server (tercepat & konsisten)
  if (
    globalThis.__jurnalWaveGlobalCategories &&
    Array.isArray(globalThis.__jurnalWaveGlobalCategories) &&
    globalThis.__jurnalWaveGlobalCategories.length > 0
  ) {
    return globalThis.__jurnalWaveGlobalCategories
  }

  // 2. Cek dari file data/articleCategories.json
  try {
    const filePath = resolveCategoriesFilePath()
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleaned: CategoryItem[] = parsed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c && typeof c === 'object' && (c.value || c.label))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => ({
            value: String(c.value || c.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            label: String(c.label || c.value).trim(),
          }))
          .filter((c) => c.value.length > 0 && c.label.length > 0)

        if (cleaned.length > 0) {
          globalThis.__jurnalWaveGlobalCategories = cleaned
          return cleaned
        }
      }
    }
  } catch (err) {
    console.warn('Notice saat membaca data/articleCategories.json:', err)
  }

  // 3. Fallback ke 7 Kategori Resmi JurnalWave
  globalThis.__jurnalWaveGlobalCategories = DEFAULT_CATEGORIES
  return DEFAULT_CATEGORIES
}

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
 * Dipakai oleh seluruh halaman kategori, judul menu, dan metadata
 */
export async function getCategoryLabelFromDb(slug: string): Promise<string> {
  const categories = await getArticleCategoriesFromDb()
  const found = categories.find((c) => c.value.toLowerCase() === slug.toLowerCase())
  if (found) return found.label
  const fallback = DEFAULT_CATEGORIES.find((c) => c.value.toLowerCase() === slug.toLowerCase())
  return fallback ? fallback.label : (slug.charAt(0).toUpperCase() + slug.slice(1))
}

/**
 * Helper sinkron untuk mengambil label nama kategori dari RAM memori/default
 */
export function getCategoryLabel(slug: string): string {
  const list = globalThis.__jurnalWaveGlobalCategories || DEFAULT_CATEGORIES
  const found = list.find((c) => c.value.toLowerCase() === slug.toLowerCase())
  if (found) return found.label
  const def = DEFAULT_CATEGORIES.find((c) => c.value.toLowerCase() === slug.toLowerCase())
  return def ? def.label : (slug.charAt(0).toUpperCase() + slug.slice(1))
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
  }

  // Simpan juga ke file lokal jika filesystem mengizinkan
  try {
    const filePath = resolveCategoriesFilePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8')
  } catch {}

  return true
}

/**
 * Menyimpan pembaruan kategori secara permanen
 * Update RAM memori global server + simpan ke file fisik
 */
export function saveArticleCategories(categories: CategoryItem[]): boolean {
  if (!Array.isArray(categories) || categories.length === 0) {
    return false
  }

  // Bersihkan dan normalisasi data kategori
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

  // Simpan ke RAM server global agar instan aktif ke seluruh request API berikutnya
  globalThis.__jurnalWaveGlobalCategories = cleaned

  // Simpan ke file fisik data/articleCategories.json
  try {
    const filePath = resolveCategoriesFilePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Notice saat menulis data/articleCategories.json ke disk:', err)
  }

  return true
}
