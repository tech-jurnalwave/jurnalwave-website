import crypto from 'crypto';

export interface CloudinaryUploadResult {
  success: boolean;
  url: string;
  publicId?: string;
  error?: string;
}

export async function uploadToCloudinary(options: {
  buffer?: Buffer;
  base64?: string;
  folder?: string;
  mimeType?: string;
}): Promise<CloudinaryUploadResult> {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      success: false,
      url: '',
      error: 'Konfigurasi kredensial Cloudinary belum lengkap',
    };
  }

  let finalBase64 = '';
  let finalMime = options.mimeType || 'image/jpeg';

  if (options.base64) {
    const raw = options.base64.trim();
    if (raw.startsWith('data:')) {
      const match = raw.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (match && match.length === 3) {
        finalMime = match[1];
        finalBase64 = match[2];
      } else {
        finalBase64 = raw.replace(/^data:[^;]+;base64,/, '');
      }
    } else {
      finalBase64 = raw;
    }
  } else if (options.buffer) {
    finalBase64 = options.buffer.toString('base64');
  } else {
    return {
      success: false,
      url: '',
      error: 'Tidak ada data file atau base64 yang diberikan',
    };
  }

  try {
    const timestamp = Math.round(Date.now() / 1000).toString();
    const folder = options.folder || 'jurnalwave-uploads';
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const form = new FormData();
    form.append('file', `data:${finalMime};base64,${finalBase64}`);
    form.append('api_key', apiKey);
    form.append('timestamp', timestamp);
    form.append('signature', signature);
    form.append('folder', folder);

    const isVideo = finalMime.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        url: '',
        error: `Cloudinary error ${res.status}: ${errText}`,
      };
    }

    const data = await res.json();
    let optimizedUrl = data.secure_url || data.url;

    // Tambahkan transformasi otomatis f_auto,q_auto:
    // - Gambar: Otomatis WebP / AVIF (sangat hemat ukuran & tajam)
    // - Video: Otomatis WebM untuk Chrome/Android & MP4 untuk Safari/iOS (streaming cepat & hemat kuota)
    if (optimizedUrl && optimizedUrl.includes('/upload/') && !optimizedUrl.includes('/upload/f_auto')) {
      optimizedUrl = optimizedUrl.replace('/upload/', '/upload/f_auto,q_auto/');
    }

    return {
      success: true,
      url: optimizedUrl,
      publicId: data.public_id,
    };
  } catch (err) {
    return {
      success: false,
      url: '',
      error: (err as any)?.message || String(err),
    };
  }
}

/**
 * Helper untuk mengubah URL gambar/lampiran apapun:
 * Jika Base64, otomatis unggah ke Cloudinary CDN.
 * Jika sudah URL biasa (http/https), kembalikan apa adanya.
 */
export async function ensureCloudinaryUrl(
  inputUrl?: string | null,
  folder = 'jurnalwave-media'
): Promise<string> {
  if (!inputUrl || !inputUrl.trim()) return '';
  const trimmed = inputUrl.trim();

  // Jika bukan base64, kembalikan URL yang ada
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Jika Base64, upload ke Cloudinary CDN
  try {
    const res = await uploadToCloudinary({ base64: trimmed, folder });
    if (res.success && res.url) {
      return res.url;
    }
  } catch (err) {
    console.warn('Gagal mengunggah base64 ke Cloudinary CDN:', err);
  }

  return trimmed;
}

/**
 * Ekstrak publicId dan resourceType dari URL Cloudinary
 */
export function extractCloudinaryPublicId(
  url?: string | null
): { publicId: string; resourceType: 'image' | 'video' } | null {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }

  try {
    const isVideo = url.includes('/video/upload/');
    const resourceType: 'image' | 'video' = isVideo ? 'video' : 'image';

    const uploadIdx = url.indexOf('/upload/');
    if (uploadIdx === -1) return null;

    let pathAfterUpload = url.substring(uploadIdx + '/upload/'.length);
    const queryIdx = pathAfterUpload.indexOf('?');
    if (queryIdx !== -1) {
      pathAfterUpload = pathAfterUpload.substring(0, queryIdx);
    }

    const segments = pathAfterUpload.split('/');
    const cleanSegments: string[] = [];

    for (const seg of segments) {
      if (!seg) continue;
      // Lewati segmen transformasi (f_auto,q_auto, w_500, c_fill, dll)
      if (
        seg.includes(',') ||
        seg.startsWith('c_') ||
        seg.startsWith('w_') ||
        seg.startsWith('h_') ||
        seg.startsWith('q_') ||
        seg.startsWith('f_')
      ) {
        continue;
      }
      // Lewati versi (v1712345678)
      if (/^v\d+$/.test(seg)) {
        continue;
      }
      cleanSegments.push(seg);
    }

    if (cleanSegments.length === 0) return null;

    // Hilangkan ekstensi file pada segmen terakhir
    const lastSeg = cleanSegments[cleanSegments.length - 1];
    const dotIdx = lastSeg.lastIndexOf('.');
    if (dotIdx !== -1) {
      cleanSegments[cleanSegments.length - 1] = lastSeg.substring(0, dotIdx);
    }

    const publicId = cleanSegments.join('/');
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

/**
 * Hapus aset (gambar/video) dari Cloudinary CDN
 */
export async function deleteFromCloudinary(
  urlOrPublicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<{ success: boolean; result?: string; error?: string }> {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  if (!cloudName || !apiKey || !apiSecret) {
    return { success: false, error: 'Konfigurasi kredensial Cloudinary belum lengkap' };
  }

  let publicId = urlOrPublicId;
  let targetType = resourceType;

  if (urlOrPublicId.includes('res.cloudinary.com')) {
    const extracted = extractCloudinaryPublicId(urlOrPublicId);
    if (!extracted) {
      return { success: false, error: 'Bukan format URL Cloudinary yang valid' };
    }
    publicId = extracted.publicId;
    targetType = extracted.resourceType;
  }

  if (!publicId || publicId.trim() === '' || publicId === 'hero-banner') {
    return { success: false, error: 'Invalid publicId' };
  }

  try {
    const timestamp = Math.round(Date.now() / 1000).toString();
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('api_key', apiKey);
    form.append('timestamp', timestamp);
    form.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${targetType}/destroy`, {
      method: 'POST',
      body: form,
    });

    const json = await res.json().catch(() => null);
    if (res.ok && json && (json.result === 'ok' || json.result === 'not found')) {
      return { success: true, result: json.result };
    }
    return { success: false, error: json?.error?.message || json?.result || `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
