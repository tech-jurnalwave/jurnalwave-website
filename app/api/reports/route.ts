import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { z } from 'zod'
import { getJenisForCategory, normalizeCategoryName } from '@/data/haloJurnalCategories'
import { ensureCloudinaryUrl } from '@/lib/cloudinary'

// Skema validasi masukan laporan aduan warga
const ReportInputSchema = z.object({
  title: z.string().min(3, 'Judul laporan minimal 3 karakter').max(200, 'Judul laporan maksimal 200 karakter'),
  description: z.string().optional(),
  reportType: z.string().optional(),
  category: z.string().optional(),
  kategori: z.string().optional(),
  address: z.string().optional(),
  latitude: z.union([z.number(), z.string(), z.null()]).optional(),
  longitude: z.union([z.number(), z.string(), z.null()]).optional(),
  pelaporName: z.string().optional(),
  pelaporPhone: z.string().optional(),
  pelaporEmail: z.string().optional(),
  ticketNumber: z.string().optional(),
  previewUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  isPublic: z.boolean().optional(),
})

// Helper format laporan dari database ke format kompatibel frontend
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReportFromDb(item: any, supportCount = 0, chatCount = 0) {
  const category = normalizeCategoryName(item.reportType || item.kategori || 'Infrastruktur')
  const rawJenis = (item as any).jenis || ''
  const jenis =
    rawJenis && rawJenis.toLowerCase() !== category.toLowerCase()
      ? rawJenis.toLowerCase()
      : getJenisForCategory(category)

  return {
    id: item.id,
    nomor_tiket: item.ticketNumber,
    ticket_number: item.ticketNumber,
    ticketNumber: item.ticketNumber,
    judul: item.title,
    title: item.title,
    deskripsi: item.description,
    description: item.description,
    jenis,
    reportType: category,
    kategori: category,
    lokasi: item.address || 'Sukabumi',
    address: item.address || 'Sukabumi',
    latitude: item.latitude,
    longitude: item.longitude,
    nama_pelapor: (item as any).pelaporName || (item as any).citizenName || 'Warga Sukabumi',
    pelaporName: (item as any).pelaporName || 'Warga Sukabumi',
    telepon: (item as any).pelaporPhone || (item as any).citizenPhone || '',
    pelaporPhone: (item as any).pelaporPhone || '',
    email: (item as any).pelaporEmail || (item as any).citizenEmail || '',
    status: item.status || 'diterima',
    is_public: Boolean(item.isPublic),
    isPublic: Boolean(item.isPublic),
    acc_status: (() => {
      if (item.isPublic === true) return 'publik'
      const logs = item.statusLogs || []
      let lastAccNote = ''
      for (let i = logs.length - 1; i >= 0; i--) {
        const n = (logs[i].note || '').toLowerCase()
        if (
          n.includes('privat') ||
          n.includes('feed publik') ||
          n.includes('ditayangkan') ||
          n.includes('dikembalikan') ||
          n.includes('antrean peninjauan') ||
          n.includes('menunggu acc')
        ) {
          lastAccNote = n
          break
        }
      }
      if (lastAccNote.includes('dikembalikan') || lastAccNote.includes('antrean peninjauan')) {
        return 'menunggu_acc'
      }
      if (lastAccNote.includes('privat')) {
        return 'privat'
      }
      if (item.status === 'diproses' || item.status === 'selesai' || item.status === 'ditolak') {
        return 'privat'
      }
      return 'menunggu_acc'
    })(),
    dukungan_count: supportCount,
    komentar_count: 0,
    chat_messages: [{ count: chatCount }],
    chat_count: chatCount,
    created_at: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    createdAt: item.createdAt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    laporan_lampiran: (item.attachments || []).map((att: any) => {
      const isVid =
        (att.fileType && att.fileType.startsWith('video/')) ||
        att.fileUrl?.startsWith('data:video/') ||
        att.fileUrl?.includes('/video/upload/') ||
        att.fileUrl?.endsWith('.mp4') ||
        att.fileUrl?.endsWith('.webm')
      return {
        id: att.id,
        file_url: att.fileUrl,
        file_type: att.fileType || (isVid ? 'video/mp4' : 'image/jpeg'),
      }
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status_log: (item.statusLogs || []).map((log: any) => ({
      id: log.id,
      status: log.status,
      catatan: log.note || `Status diubah menjadi ${log.status}`,
      created_at: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
    })),
  }
}

// Server-side in-memory cache untuk percepatan respons API (menghilangkan delay antar komponen)
let serverReportsCache: { data: any[]; timestamp: number } | null = null
const SERVER_CACHE_TTL_MS = 10000 // 10 detik memory cache

// Circuit breaker (Fast-Fail): Mencegah antrean timeout jika database cloud lambat
let lastReportsDbFailureTimestamp = 0
const REPORTS_DB_RETRY_MS = 15 * 1000

function invalidateReportsCache() {
  serverReportsCache = null
  lastReportsDbFailureTimestamp = 0
}

// 1. GET: Ambil semua laporan warga dari database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const ticket = searchParams.get('ticket')

    // Respons instan (<1ms) dari memory cache server jika tanpa filter spesifik
    if (!status && !ticket && serverReportsCache && Date.now() - serverReportsCache.timestamp < SERVER_CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        source: 'server-memory-cache',
        data: serverReportsCache.data,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=6',
        },
      })
    }

    // Circuit Breaker: Jika database baru saja timeout < 15 detik lalu, langsung kembalikan cache/fallback (0ms)
    if (Date.now() - lastReportsDbFailureTimestamp < REPORTS_DB_RETRY_MS) {
      return NextResponse.json({
        success: true,
        source: 'fallback-cache',
        data: serverReportsCache?.data?.length ? serverReportsCache.data : [],
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status && status !== 'semua') {
      where.status = status
    }
    if (ticket) {
      const cleanTicket = ticket.trim()
      where.OR = [
        { ticketNumber: { equals: cleanTicket, mode: 'insensitive' } },
        { id: cleanTicket },
      ]
    }

    // Eksekusi query database secara paralel (Promise.all) agar hemat roundtrip latency ke Neon PostgreSQL
    const [dbReports, countRows, chatCountRows] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          attachments: true,
          statusLogs: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT "ticketNumber", COUNT(*)::int as count FROM "report_supports" GROUP BY "ticketNumber"`
      ).catch(() => []),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT "ticketNumber", COUNT(*)::int as count FROM "chat_messages" GROUP BY "ticketNumber"`
      ).catch(() => []),
    ])

    // Hitung dukungan nyata dari tabel report_supports
    const supportCountsMap: Record<string, number> = {}
    if (Array.isArray(countRows)) {
      countRows.forEach((r) => {
        if (r && r.ticketNumber) {
          supportCountsMap[r.ticketNumber] = Number(r.count) || 0
        }
      })
    }

    // Hitung pesan chat koordinasi nyata dari tabel chat_messages
    const chatCountsMap: Record<string, number> = {}
    if (Array.isArray(chatCountRows)) {
      chatCountRows.forEach((r) => {
        if (r && r.ticketNumber) {
          chatCountsMap[r.ticketNumber] = Number(r.count) || 0
          chatCountsMap[String(r.ticketNumber).toUpperCase()] = Number(r.count) || 0
        }
      })
    }

    let mappedData = dbReports.map((r) =>
      mapReportFromDb(
        r,
        supportCountsMap[r.ticketNumber] || 0,
        chatCountsMap[r.ticketNumber] || chatCountsMap[r.id] || 0
      )
    )

    // Simpan ke server memory cache jika request umum (semua aduan)
    if (!status && !ticket) {
      serverReportsCache = {
        data: mappedData,
        timestamp: Date.now(),
      }
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      data: mappedData,
    })
  } catch (error: any) {
    lastReportsDbFailureTimestamp = Date.now()
    console.warn('API Reports GET notice (using fallback):', error?.message || error)
    return NextResponse.json({
      success: true,
      source: 'fallback-cache',
      data: serverReportsCache?.data?.length ? serverReportsCache.data : [],
    }, { status: 200 })
  }
}

// 2. POST: Kirim pengaduan baru warga ke database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Normalisasi input untuk Zod
    const normalizedData = {
      ...body,
      title: (body.title || body.judul || '').trim(),
      description: (body.description || body.deskripsi || '').trim(),
      reportType: body.reportType || body.jenis || body.kategori || 'infrastruktur',
      address: body.address || body.lokasi || 'Sukabumi',
      pelaporName: body.pelaporName || body.nama_pelapor || body.citizenName || body.nama || 'Warga Sukabumi',
      pelaporPhone: body.pelaporPhone || body.citizenPhone || body.telepon || undefined,
      pelaporEmail: body.pelaporEmail || body.citizenEmail || body.email || undefined,
    }

    const validation = ReportInputSchema.safeParse(normalizedData)
    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message || 'Data laporan tidak valid'
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 })
    }

    const data = validation.data
    const title = data.title
    const description = data.description || title

    // Generate nomor tiket unik anti-tabrakan
    let ticketNumber = (data.ticketNumber || body.ticket_number || body.nomor_tiket || '').trim()

    // Cek apakah nomor tiket sudah digunakan di database atau belum disediakan
    const existingReports = await prisma.report.findMany({
      select: { ticketNumber: true },
    })
    const usedTickets = new Set(existingReports.map((r) => r.ticketNumber.toUpperCase()))

    if (!ticketNumber || usedTickets.has(ticketNumber.toUpperCase())) {
      let maxNum = 9
      for (const r of existingReports) {
        const match = r.ticketNumber.match(/HJ-(\d+)/i)
        if (match) {
          const num = parseInt(match[1], 10)
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      }
      let nextNum = maxNum + 1
      let candidate = `HJ-${String(nextNum).padStart(3, '0')}`
      while (usedTickets.has(candidate.toUpperCase())) {
        nextNum++
        candidate = `HJ-${String(nextNum).padStart(3, '0')}`
      }
      ticketNumber = candidate
    }

    // Lampiran berkas (foto/video) jika ada (dengan deduplikasi pencegah upload ganda)
    const attachmentItems: { fileUrl: string; fileType: string }[] = []
    const seenRawUrls = new Set<string>()

    const processAttachment = async (rawUrl: string, explicitType?: string | null) => {
      if (!rawUrl || typeof rawUrl !== 'string') return
      const trimmedUrl = rawUrl.trim()
      if (!trimmedUrl || seenRawUrls.has(trimmedUrl)) return
      seenRawUrls.add(trimmedUrl)

      // Cek apakah trimmedUrl sudah pernah tersimpan
      if (attachmentItems.some((att) => att.fileUrl === trimmedUrl)) return

      const isVid =
        (explicitType && explicitType.startsWith('video/')) ||
        trimmedUrl.startsWith('data:video/') ||
        trimmedUrl.includes('/video/upload/') ||
        trimmedUrl.endsWith('.mp4') ||
        trimmedUrl.endsWith('.webm')
      const safeUrl = await ensureCloudinaryUrl(trimmedUrl, 'jurnalwave-laporan')
      seenRawUrls.add(safeUrl)

      if (!attachmentItems.some((att) => att.fileUrl === safeUrl)) {
        attachmentItems.push({
          fileUrl: safeUrl,
          fileType: explicitType || (isVid ? 'video/mp4' : 'image/jpeg'),
        })
      }
    }

    if (data.previewUrl) {
      await processAttachment(data.previewUrl)
    }
    if (data.imageUrl) {
      await processAttachment(data.imageUrl)
    }
    if (Array.isArray(body.attachments)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const a of body.attachments) {
        const url = typeof a === 'string' ? a : a.file_url || a.fileUrl || a.url
        const type = typeof a === 'object' ? a.file_type || a.fileType : null
        if (url) {
          await processAttachment(url, type)
        }
      }
    }

    const created = await prisma.report.create({
      data: {
        ticketNumber,
        title,
        description,
        reportType: (data.kategori || data.category || data.reportType || 'Infrastruktur').trim(),
        address: data.address || 'Sukabumi',
        latitude: data.latitude ? parseFloat(String(data.latitude)) : null,
        longitude: data.longitude ? parseFloat(String(data.longitude)) : null,
        pelaporName: data.pelaporName || 'Warga Sukabumi',
        pelaporPhone: data.pelaporPhone || null,
        pelaporEmail: data.pelaporEmail || null,
        status: 'diterima',
        isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : false,
        attachments: {
          create: attachmentItems.map((att) => ({
            fileUrl: att.fileUrl,
            fileType: att.fileType,
          })),
        },
        statusLogs: {
          create: [
            {
              status: 'diterima',
              note: 'Laporan baru diterima oleh sistem Hallo Jurnal (Menunggu ACC Redaksi)',
            },
          ],
        },
      },
      include: {
        attachments: true,
        statusLogs: true,
      },
    })

    invalidateReportsCache()

    return NextResponse.json(
      {
        success: true,
        message: 'Laporan berhasil disimpan ke database!',
        ticketNumber: created.ticketNumber,
        data: mapReportFromDb(created),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('API Reports POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menyimpan laporan: ' + error.message },
      { status: 500 }
    )
  }
}

// 3. PUT: Update status laporan warga (Diterima -> Diproses -> Selesai / Ditolak)
export async function PUT(request: NextRequest) {
  try {
    // Verifikasi hak akses admin sebelum mengubah status laporan
    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses ditolak: Anda harus login sebagai admin untuk memperbarui laporan warga.',
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const id = body.id || body.ticketNumber || body.nomor_tiket

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID atau nomor tiket laporan diperlukan' }, { status: 400 })
    }

    // Cari report berdasarkan ID atau ticketNumber
    const existing = await prisma.report.findFirst({
      where: {
        OR: [{ id: String(id) }, { ticketNumber: String(id) }],
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Laporan tidak ditemukan' }, { status: 404 })
    }

    const newStatus = body.status || existing.status

    const nextAccStatus = body.acc_status || body.accStatus
    let isPublicVal = existing.isPublic
    if (nextAccStatus === 'publik') {
      isPublicVal = true
    } else if (nextAccStatus === 'privat' || nextAccStatus === 'menunggu_acc') {
      isPublicVal = false
    } else if (body.is_public !== undefined) {
      isPublicVal = Boolean(body.is_public)
    } else if (body.isPublic !== undefined) {
      isPublicVal = Boolean(body.isPublic)
    }

    let note = body.catatan || body.note
    if (!note) {
      if (nextAccStatus === 'publik' || isPublicVal === true) {
        note = 'Laporan di-ACC dan ditayangkan ke Feed Publik oleh admin.'
      } else if (nextAccStatus === 'privat') {
        note = 'Laporan di-ACC sebagai aduan privat internal oleh admin.'
      } else if (nextAccStatus === 'menunggu_acc') {
        note = 'Laporan dikembalikan ke antrean peninjauan redaksi.'
      } else {
        note = `Status laporan diubah menjadi ${newStatus}`
      }
    }

    // Update status report dan tambahkan log riwayat
    const updated = await prisma.report.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        isPublic: isPublicVal,
        statusLogs: {
          create: {
            status: newStatus,
            note,
          },
        },
      },
      include: {
        attachments: true,
        statusLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    invalidateReportsCache()

    return NextResponse.json({
      success: true,
      message: `Status laporan berhasil diubah menjadi ${newStatus}!`,
      data: mapReportFromDb(updated),
    })
  } catch (error: any) {
    console.error('API Reports PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui laporan: ' + error.message },
      { status: 500 }
    )
  }
}

// 4. DELETE: Hapus laporan aduan warga secara permanen oleh admin
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses ditolak: Anda harus login sebagai admin untuk menghapus aduan warga.',
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || searchParams.get('ticketNumber')

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID atau nomor tiket diperlukan' }, { status: 400 })
    }

    const existing = await prisma.report.findFirst({
      where: {
        OR: [{ id: String(id) }, { ticketNumber: String(id) }],
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Aduan tidak ditemukan' }, { status: 404 })
    }

    await prisma.report.delete({
      where: { id: existing.id },
    })

    invalidateReportsCache()

    return NextResponse.json({
      success: true,
      message: 'Aduan berhasil dihapus secara permanen!',
    })
  } catch (error: any) {
    console.error('API Reports DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus aduan: ' + error.message },
      { status: 500 }
    )
  }
}
