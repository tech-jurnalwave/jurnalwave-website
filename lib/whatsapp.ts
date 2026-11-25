/**
 * Modul Pengiriman Pesan WhatsApp Resmi (Fonnte API Gateway)
 * Mode Ketat (Strict): OTP 100% Asli Dikirimkan ke WhatsApp Warga
 */

export interface WhatsAppSendResult {
  success: boolean
  message: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail?: any
}

/**
 * Format nomor telepon Indonesia menjadi standar 62...
 */
export function formatIndonesianPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1)
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

/**
 * Mengirimkan pesan kode OTP ke nomor WhatsApp pengguna via Fonnte Gateway
 */
export async function sendWhatsAppOtp(
  rawPhone: string,
  otpCode: string,
  recipientName?: string
): Promise<WhatsAppSendResult> {
  const token = process.env.FONNTE_TOKEN?.trim()

  if (!token || token === 'your_fonnte_token_here') {
    return {
      success: false,
      message: 'Token FONNTE_TOKEN belum diatur di file .env.',
    }
  }

  const target = formatIndonesianPhone(rawPhone)
  const greeting = recipientName ? `Halo *${recipientName}*,\n\n` : 'Halo,\n\n'
  const message = `${greeting}Kode verifikasi OTP pendaftaran akun warga *Hallo Jurnal (JurnalWave)* Anda adalah:\n\n*${otpCode}*\n\nKode ini berlaku selama *10 menit*. Jangan berikan kode ini kepada siapa pun demi keamanan akun Anda.`

  try {
    const formData = new URLSearchParams()
    formData.append('target', target)
    formData.append('message', message)
    formData.append('countryCode', '62')

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    })

    const data = await res.json()

    if (data.status === true || data.status === 'true') {
      return {
        success: true,
        message: 'Kode OTP berhasil dikirimkan ke WhatsApp Anda.',
        detail: data,
      }
    } else {
      console.warn('Fonnte send response:', data)
      return {
        success: false,
        message: data.reason || data.detail || 'Gagal mengirim pesan WhatsApp. Pastikan perangkat WhatsApp gateway aktif.',
        detail: data,
      }
    }
  } catch (err: unknown) {
    console.error('Error menghubungi Fonnte API:', err)
    return {
      success: false,
      message: 'Kendala koneksi ke server WhatsApp Gateway.',
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}
