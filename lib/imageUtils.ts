/**
 * Utility helper untuk konversi & kompresi gambar otomatis ke format WebP modern.
 * WebP menghemat ukuran file 30% - 80% dibanding JPEG/PNG konvensional
 * tanpa mengorbankan kualitas visual.
 */

export interface ConvertToWebPOptions {
  maxDimension?: number
  quality?: number
  mimeTypeFallback?: string
}

/**
 * Ekspor elemen Canvas ke format WebP Data URL dengan fallback otomatis.
 */
export function canvasToWebP(
  canvas: HTMLCanvasElement,
  quality = 0.85,
  mimeTypeFallback = 'image/jpeg'
): string {
  try {
    const webpData = canvas.toDataURL('image/webp', quality)
    if (webpData && webpData.startsWith('data:image/webp')) {
      return webpData
    }
  } catch {
    // Canvas toDataURL webp gagal atau tidak didukung browser
  }
  return canvas.toDataURL(mimeTypeFallback, quality)
}

/**
 * Konversi File gambar apa pun (JPG, PNG, WebP, dsb.) ke WebP base64 Data URL.
 * Secara otomatis melakukan downscaling proporsional jika melebihi maxDimension.
 */
export function convertImageToWebP(
  file: File,
  options: ConvertToWebPOptions = {}
): Promise<string> {
  const {
    maxDimension = 1200,
    quality = 0.85,
    mimeTypeFallback = 'image/jpeg',
  } = options

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('convertImageToWebP hanya dapat dijalankan di lingkungan peramban (client-side)'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const webpResult = canvasToWebP(canvas, quality, mimeTypeFallback)
        resolve(webpResult)
      }

      img.onerror = () => reject(new Error('Gagal memproses berkas gambar'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Gagal membaca berkas file'))
    reader.readAsDataURL(file)
  })
}
