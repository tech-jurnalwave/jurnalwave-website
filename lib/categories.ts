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

export const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  berita: 'Berita',
  kuliner: 'Kuliner',
  wisata: 'Wisata',
  hiburan: 'Hiburan',
  tech: 'Tech',
  sport: 'Sport & E-Sport',
  inspirasi: 'Inspirasi',
  lifestyle: 'Lifestyle',
  otomotif: 'Otomotif',
  science: 'Science',
  health: 'Health',
}

declare global {
  // eslint-disable-next-line no-var
  var __jurnalWaveGlobalCategories: CategoryItem[] | undefined
}

/**
 * Membaca daftar kategori resmi JurnalWave
 * Menggunakan memori global server (globalThis) atau fallback ke default
 */
export function getArticleCategories(): CategoryItem[] {
  if (
    globalThis.__jurnalWaveGlobalCategories &&
    Array.isArray(globalThis.__jurnalWaveGlobalCategories) &&
    globalThis.__jurnalWaveGlobalCategories.length > 0
  ) {
    return globalThis.__jurnalWaveGlobalCategories
  }
  return DEFAULT_CATEGORIES
}

/**
 * Helper sinkron untuk mengambil label nama kategori dari RAM memori/default
 * 100% aman diimpor oleh Client Component (HomeClient, NewsCard, HeaderNav, dll)
 */
export function getCategoryLabel(slug: string): string {
  if (!slug) return 'Umum'
  const normalized = slug.toLowerCase().trim()
  if (normalized === 'sport-esport' || normalized === 'esport') {
    return getCategoryLabel('sport')
  }
  const list = globalThis.__jurnalWaveGlobalCategories || DEFAULT_CATEGORIES
  const found = list.find((c) => c.value.toLowerCase() === normalized)
  if (found) return found.label
  const def = DEFAULT_CATEGORIES.find((c) => c.value.toLowerCase() === normalized)
  if (def) return def.label
  return CATEGORY_DISPLAY_MAP[normalized] || (slug.charAt(0).toUpperCase() + slug.slice(1))
}

/**
 * Helper untuk mendapatkan URL tujuan kategori secara presisi
 * Contoh: 'sport' -> '/sport-esport', 'tech' -> '/tech', custom -> '/kategori/slug'
 */
export function getCategoryUrl(category: string): string {
  if (!category) return '/artikel'
  const c = category.toLowerCase().trim()
  if (c === 'sport' || c === 'sport-esport' || c === 'esport') return '/sport-esport'
  const standard = ['berita', 'kuliner', 'wisata', 'hiburan', 'tech', 'inspirasi', 'lifestyle', 'otomotif', 'science', 'health']
  if (standard.includes(c)) return `/${c}`
  return `/kategori/${c}`
}
