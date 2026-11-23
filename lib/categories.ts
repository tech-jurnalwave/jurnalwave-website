import fs from 'fs'
import path from 'path'

export interface CategoryItem {
  value: string
  label: string
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { value: 'berita', label: 'Berita' },
  { value: 'kuliner', label: 'Kuliner' },
  { value: 'wisata', label: 'Wisata' },
  { value: 'hiburan', label: 'Hiburan' },
  { value: 'tech', label: 'Tech & Game' },
  { value: 'sport', label: 'Sport' },
  { value: 'inspirasi', label: 'Inspirasi' },
]

declare global {
  // eslint-disable-next-line no-var
  var __jurnalWaveGlobalCategories: CategoryItem[] | undefined
}

const CATEGORIES_FILE_PATH = path.join(process.cwd(), 'data', 'articleCategories.json')

/**
 * Membaca daftar kategori resmi JurnalWave
 * Menggunakan memori global server (globalThis) didukung file persistensi
 */
export function getArticleCategories(): CategoryItem[] {
  // 1. Cek dari RAM memori global server
  if (
    globalThis.__jurnalWaveGlobalCategories &&
    Array.isArray(globalThis.__jurnalWaveGlobalCategories) &&
    globalThis.__jurnalWaveGlobalCategories.length > 0
  ) {
    return globalThis.__jurnalWaveGlobalCategories
  }

  // 2. Cek dari file data/articleCategories.json
  try {
    if (fs.existsSync(CATEGORIES_FILE_PATH)) {
      const raw = fs.readFileSync(CATEGORIES_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned: CategoryItem[] = parsed
          .filter((c: any) => c && typeof c === 'object' && (c.value || c.label))
          .map((c: any) => ({
            value: String(c.value || c.label).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            label: String(c.label || c.value).trim(),
          }))

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
    const dir = path.dirname(CATEGORIES_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CATEGORIES_FILE_PATH, JSON.stringify(cleaned, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Notice saat menulis data/articleCategories.json ke disk:', err)
    // Walaupun penulisan disk ada delay/lock, data di RAM server sudah berhasil tersimpan
  }

  return true
}
