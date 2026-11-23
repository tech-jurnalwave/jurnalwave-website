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

const CATEGORIES_FILE_PATH = path.join(process.cwd(), 'data', 'articleCategories.json')

// In-Memory global cache untuk performa tinggi
let memoryCategories: CategoryItem[] | null = null

export function getArticleCategories(): CategoryItem[] {
  if (memoryCategories && memoryCategories.length > 0) {
    return memoryCategories
  }

  try {
    if (fs.existsSync(CATEGORIES_FILE_PATH)) {
      const raw = fs.readFileSync(CATEGORIES_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCategories = parsed
        return parsed
      }
    }
  } catch (err) {
    console.warn('Gagal membaca data/articleCategories.json:', err)
  }

  memoryCategories = DEFAULT_CATEGORIES
  return DEFAULT_CATEGORIES
}

export function saveArticleCategories(categories: CategoryItem[]): boolean {
  if (!Array.isArray(categories) || categories.length === 0) return false

  memoryCategories = categories

  try {
    const dir = path.dirname(CATEGORIES_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CATEGORIES_FILE_PATH, JSON.stringify(categories, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Gagal menyimpan data/articleCategories.json:', err)
    return false
  }
}
