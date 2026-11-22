/**
 * Real-time Weather Sync Utility
 * Menyediakan single source of truth untuk data cuaca antara Header (WeatherWidget)
 * dan Halaman Prakiraan Cuaca (/cuaca / CuacaView).
 */

export interface SyncedWeatherData {
  temperature: number
  condition: string
  iconName: string
  locationName: string
  locationId: string
  updatedAt: number
}

const STORAGE_KEY = 'jurnal_synced_weather'
const SYNC_EVENT_NAME = 'jurnal_weather_sync'

/**
 * Mengambil cuaca tersinkronisasi terbaru dari penyimpanan lokal
 */
export function getLatestSyncedWeather(): SyncedWeatherData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SyncedWeatherData
    if (parsed && typeof parsed.temperature === 'number') {
      return parsed
    }
  } catch {
    // Ignore storage parse error
  }
  return null
}

/**
 * Menyiarkan data cuaca terbaru ke seluruh komponen di window peramban
 */
export function syncWeatherToGlobal(data: {
  temperature: number
  condition?: string
  iconName?: string
  locationName?: string
  locationId?: string
}): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getLatestSyncedWeather()
    const payload: SyncedWeatherData = {
      temperature: Math.round(data.temperature),
      condition: data.condition || existing?.condition || 'Berawan',
      iconName: data.iconName || existing?.iconName || 'CloudSun',
      locationName: data.locationName || existing?.locationName || 'Kota Sukabumi',
      locationId: data.locationId || existing?.locationId || 'kota',
      updatedAt: Date.now(),
    }

    const serialized = JSON.stringify(payload)
    sessionStorage.setItem(STORAGE_KEY, serialized)
    localStorage.setItem(STORAGE_KEY, serialized)

    window.dispatchEvent(
      new CustomEvent<SyncedWeatherData>(SYNC_EVENT_NAME, { detail: payload })
    )
  } catch {
    // Ignore storage write error
  }
}

/**
 * Berlangganan event sinkronisasi cuaca secara reaktif
 */
export function onWeatherSync(
  callback: (weather: SyncedWeatherData) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<SyncedWeatherData>
    if (customEvent.detail && typeof customEvent.detail.temperature === 'number') {
      callback(customEvent.detail)
    }
  }

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as SyncedWeatherData
        if (parsed && typeof parsed.temperature === 'number') {
          callback(parsed)
        }
      } catch {}
    }
  }

  window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}
