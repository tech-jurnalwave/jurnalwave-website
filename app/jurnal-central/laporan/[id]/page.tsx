'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  User,
  FileText,
  X,
  Check,
  MessageSquare,
  Trash2,
  Loader2,
  Globe,
  Lock,
  Clock,
} from 'lucide-react'
import { DummyReport } from '@/data/dummyReports'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'
import AdminToast from '@/components/admin/AdminToast'

export default function AdminDetailLaporanPage() {
  const confirmDialog = useConfirm()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<DummyReport | null>(null)
  const [currentStatus, setCurrentStatus] = useState<DummyReport['status'] | 'ditolak'>('diterima')
  const [isPublic, setIsPublic] = useState<boolean>(true)
  const [accStatus, setAccStatus] = useState<'menunggu_acc' | 'publik' | 'privat'>('menunggu_acc')
  const [editorialNote, setEditorialNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)

  // Chat message counter
  const [chatMessages, setChatMessages] = useState<any[]>([])

  // Riwayat milestone toggle (default ringkas: 3 terbaru)
  const [showAllLogs, setShowAllLogs] = useState(false)

  // Status logs
  const [statusLogs, setStatusLogs] = useState<
    NonNullable<DummyReport['status_log']>
  >([])

  // Muat data laporan dari database Neon DB via /api/reports (dengan fallback dummy & localStorage)
  useEffect(() => {
    let isMounted = true

    const loadReportDetail = async () => {
      setLoading(true)
      let found: DummyReport | null = null

      // 1. Fetch langsung dari Neon DB via /api/reports?ticket=${encodeURIComponent(id)}
      try {
        const res = await fetch(`/api/reports?ticket=${encodeURIComponent(id)}`, {
          cache: 'no-store',
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            found = json.data[0]
          }
        }
      } catch (err) {
        console.warn('Gagal memuat detail laporan dari API:', err)
      }

      // 2. Fallback: localStorage jika DB tidak mengembalikan
      if (!found && typeof window !== 'undefined') {
        try {
          const userReports = JSON.parse(
            localStorage.getItem('halo_jurnal_user_reports') || '[]'
          )
          const local = userReports.find(
            (r: any) => r.id === id || r.nomor_tiket === id || r.ticket_number === id
          )
          if (local) found = local
        } catch {}
      }

      // 3. Gabungkan dengan localStorage status overrides jika ada
      if (found && typeof window !== 'undefined') {
        try {
          const overrides = JSON.parse(
            localStorage.getItem('halo_jurnal_status_overrides') || '{}'
          )
          const saved =
            overrides[id] ||
            (found.id ? overrides[found.id] : null) ||
            (found.nomor_tiket ? overrides[found.nomor_tiket] : null)

          if (saved) {
            found = {
              ...found,
              status: saved.status || found.status,
              is_public: saved.is_public !== undefined ? saved.is_public : found.is_public,
              status_log: saved.status_log || found.status_log,
            }
          }
        } catch {}
      }

      if (isMounted) {
        if (found) {
          setReport(found)
          setCurrentStatus(found.status || 'diterima')

          // Tentukan status ACC awal
          let initialAcc: 'menunggu_acc' | 'publik' | 'privat' = 'menunggu_acc'
          const savedOverride = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('halo_jurnal_status_overrides') || '{}')[found.id || found.nomor_tiket]
            : null

          if (savedOverride?.acc_status) {
            initialAcc = savedOverride.acc_status
          } else if (found.is_public === true || (found as any).visibilitas === 'publik') {
            initialAcc = 'publik'
          } else if (found.status === 'diterima') {
            initialAcc = 'menunggu_acc'
          } else {
            initialAcc = 'privat'
          }

          setAccStatus(initialAcc)
          setIsPublic(initialAcc === 'publik')
          if (found.status_log && found.status_log.length > 0) {
            setStatusLogs(found.status_log)
          } else {
            setStatusLogs([
              {
                id: 'log-001',
                status: found.status || 'diterima',
                catatan: 'Laporan warga diterima oleh sistem redaksi.',
                created_at: found.created_at || new Date().toISOString(),
              },
            ])
          }
        } else {
          setReport(null)
        }
        setLoading(false)
      }
    }

    if (id) {
      loadReportDetail()
    }

    return () => {
      isMounted = false
    }
  }, [id])

  // Sinkronisasi pesan chat dua arah dengan pelapor
  const syncChatMessages = async () => {
    const targetTicket = report?.nomor_tiket || id
    const targetId = report?.id || id
    let dbMessages: any[] = []

    try {
      const res = await fetch(`/api/chat?ticketNumber=${encodeURIComponent(targetTicket)}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          dbMessages = json.data
        }
      }
    } catch {}

    let merged = dbMessages
    if (typeof window !== 'undefined') {
      if (dbMessages.length > 0) {
        merged = dbMessages
        localStorage.setItem(`halo_jurnal_chat_${targetId}`, JSON.stringify(dbMessages))
        if (targetTicket) {
          localStorage.setItem(`halo_jurnal_chat_${targetTicket}`, JSON.stringify(dbMessages))
        }
      } else {
        const local = JSON.parse(
          localStorage.getItem(`halo_jurnal_chat_${targetId}`) ||
          (targetTicket ? localStorage.getItem(`halo_jurnal_chat_${targetTicket}`) : null) ||
          '[]'
        )
        merged = local
      }
    }
    setChatMessages(merged)
  }

  useEffect(() => {
    syncChatMessages()
    const handleStorageChange = () => {
      syncChatMessages()
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleStorageChange)

    const pollInterval = setInterval(() => {
      syncChatMessages()
    }, 3000)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [report?.id, report?.nomor_tiket, id])

  const unreadCount = useMemo(() => {
    if (typeof window === 'undefined' || !chatMessages.length) return 0
    try {
      const readSet = new Set<string>(
        JSON.parse(localStorage.getItem('halo_jurnal_read_chats') || '[]')
      )
      const readTicketTimes: Record<string, number> = JSON.parse(
        localStorage.getItem('halo_jurnal_read_ticket_times') || '{}'
      )
      const ticketKey = report?.nomor_tiket || id
      const ticketReadTime = Math.max(
        readTicketTimes[ticketKey] || 0,
        readTicketTimes[ticketKey.toUpperCase()] || 0,
        readTicketTimes[ticketKey.toLowerCase()] || 0,
        readTicketTimes[id] || 0
      )

      return chatMessages.filter((m: any) => {
        const isCitizen =
          m.sender_id !== 'admin-redaksi' &&
          m.sender_id !== 'admin' &&
          m.profiles?.role !== 'admin' &&
          m.profiles?.role !== 'redaksi' &&
          m.role !== 'admin' &&
          m.role !== 'redaksi' &&
          !(m.sender_name && m.sender_name.toLowerCase().includes('redaksi'))
        if (!isCitizen) return false
        if (m.id && readSet.has(String(m.id))) return false
        const msgTime = new Date(m.created_at).getTime()
        if (ticketReadTime && msgTime <= ticketReadTime) return false
        return true
      }).length
    } catch {
      return 0
    }
  }, [chatMessages, report?.nomor_tiket, id])

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-[#c00015]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900">Memuat Detail Investigasi Laporan...</h2>
          <p className="text-xs text-slate-500">
            Sedang menghubungkan ke basis data redaksi untuk tiket <code>{id}</code>
          </p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Laporan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">
            ID tiket <code>{id}</code> tidak terdaftar di sistem.
          </p>
        </div>
        <Link
          href="/jurnal-central/laporan"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Laporan</span>
        </Link>
      </div>
    )
  }

  // Format tanggal
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // Eksekusi Simpan Keputusan Redaksi (Terpadu: Status, Visibilitas, Catatan)
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const hasStatusChanged = currentStatus !== report.status
    const hasVisibilityChanged = isPublic !== report.is_public
    const customNote = editorialNote.trim()

    const isInspirasi =
      (report.jenis || '').toLowerCase() === 'inspirasi' ||
      (report.kategori || '').toLowerCase().includes('inspirasi')

    const statusLabels: Record<string, string> = isInspirasi
      ? {
          diterima: 'Menunggu Kurasi',
          diproses: 'Sedang Dikurasi',
          ditindaklanjuti: 'Diangkat Liputan Berita',
          selesai: 'Disetujui & Tayang',
          ditolak: 'Tidak Lolos Kurasi',
        }
      : {
          diterima: 'Diterima',
          diproses: 'Diproses',
          ditindaklanjuti: 'Ditindaklanjuti',
          selesai: 'Selesai',
          ditolak: 'Ditolak',
        }

    let defaultNote = ''
    if (customNote) {
      defaultNote = customNote
    } else if (isInspirasi) {
      if (currentStatus === 'selesai') {
        defaultNote = 'Cerita inspirasi warga telah disetujui redaksi dan ditayangkan di Feed Inspirasi Sukabumi.'
      } else if (currentStatus === 'ditindaklanjuti') {
        defaultNote = '🌟 Cerita inspirasi terpilih untuk diangkat menjadi liputan berita resmi Jurnal Sukabumi!'
      } else if (currentStatus === 'diproses') {
        defaultNote = 'Redaksi sedang mengurasi kelayakan dan memvalidasi materi cerita inspirasi.'
      } else if (currentStatus === 'ditolak') {
        defaultNote = 'Cerita inspirasi belum memenuhi standar kurasi redaksi Hallo Jurnal.'
      } else {
        defaultNote = 'Cerita inspirasi diterima dan mengantre di meja kurasi redaksi.'
      }
    } else if (hasStatusChanged && hasVisibilityChanged) {
      defaultNote = `Tahap diubah ke "${statusLabels[currentStatus] || currentStatus}" dan visibilitas diatur ke "${isPublic ? 'Tayang Publik' : 'Privat'}".`
    } else if (hasStatusChanged) {
      defaultNote = `Tahap penanganan diubah ke "${statusLabels[currentStatus] || currentStatus}".`
    } else if (hasVisibilityChanged) {
      defaultNote = `Visibilitas laporan diatur ke "${isPublic ? 'Tayang Publik' : 'Privat'}".`
    } else {
      defaultNote = `Keputusan redaksi diperbarui.`
    }

    const shouldAddLog = hasStatusChanged || hasVisibilityChanged || !!customNote

    const updatedLogs = shouldAddLog
      ? [
          {
            id: `log-${Date.now()}`,
            status: currentStatus,
            catatan: defaultNote,
            created_at: new Date().toISOString(),
          },
          ...statusLogs,
        ]
      : statusLogs

    setStatusLogs(updatedLogs)
    setEditorialNote('')

    // 1. Update state report lokal seketika
    const updatedReport: DummyReport = {
      ...report,
      status: currentStatus,
      is_public: isPublic,
      status_log: updatedLogs,
    }
    setReport(updatedReport)



    // 3. Simpan ke localStorage agar sinkron dengan Feed Publik & Halaman Warga
    // Kirim pembaruan status ke MySQL XAMPP via API
    try {
      await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          ticketNumber: report.nomor_tiket,
          status: currentStatus,
          is_public: isPublic,
          catatan: defaultNote,
        }),
      })
    } catch (err) {
      console.warn('Gagal simpan pembaruan status ke MySQL:', err)
    }

    if (typeof window !== 'undefined') {
      try {
        const overrides = JSON.parse(
          localStorage.getItem('halo_jurnal_status_overrides') || '{}'
        )
        const payload = {
          status: currentStatus,
          is_public: isPublic,
          status_log: updatedLogs,
        }
        overrides[report.id] = payload
        if (report.nomor_tiket) {
          overrides[report.nomor_tiket] = payload
        }
        localStorage.setItem(
          'halo_jurnal_status_overrides',
          JSON.stringify(overrides)
        )

        // Perbarui data user reports jika ada
        const userReports = JSON.parse(
          localStorage.getItem('halo_jurnal_user_reports') || '[]'
        )
        const updatedUserReports = userReports.map((r: any) =>
          r.id === report.id || r.ticket_number === report.id || r.nomor_tiket === report.id
            ? { ...r, status: currentStatus, is_public: isPublic, status_log: updatedLogs }
            : r
        )
        localStorage.setItem(
          'halo_jurnal_user_reports',
          JSON.stringify(updatedUserReports)
        )
        window.dispatchEvent(new Event('storage'))
      } catch (err) {
        console.error('Error saving status override:', err)
      }
    }

    setToastMessage('Keputusan redaksi berhasil disimpan.')
    setIsSubmitting(false)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  // Update status ACC & Hak Tayang secara instan
  const handleUpdateAccStatus = async (nextStatus: 'menunggu_acc' | 'publik' | 'privat') => {
    const isPub = nextStatus === 'publik'
    setAccStatus(nextStatus)
    setIsPublic(isPub)
    if (report) {
      setReport({ ...report, is_public: isPub, ...(report as any), acc_status: nextStatus })
    }

    if (typeof window !== 'undefined' && report) {
      try {
        const overrides = JSON.parse(
          localStorage.getItem('halo_jurnal_status_overrides') || '{}'
        )
        const payload = {
          status: report.status || 'diterima',
          acc_status: nextStatus,
          is_public: isPub,
          isPublic: isPub,
          visibilitas: isPub ? 'publik' : 'privat',
        }
        overrides[report.id] = { ...(overrides[report.id] || {}), ...payload }
        if (report.nomor_tiket) {
          overrides[report.nomor_tiket] = { ...(overrides[report.nomor_tiket] || {}), ...payload }
        }
        localStorage.setItem('halo_jurnal_status_overrides', JSON.stringify(overrides))

        const userReports = JSON.parse(
          localStorage.getItem('halo_jurnal_user_reports') || '[]'
        )
        const updatedUserReports = userReports.map((r: any) =>
          r.id === report.id || r.ticket_number === report.id || r.nomor_tiket === report.id
            ? { ...r, acc_status: nextStatus, is_public: isPub, isPublic: isPub, visibilitas: isPub ? 'publik' : 'privat' }
            : r
        )
        localStorage.setItem('halo_jurnal_user_reports', JSON.stringify(updatedUserReports))
        window.dispatchEvent(new Event('storage'))
      } catch (err) {
        console.error('Error saving status override:', err)
      }
    }

    try {
      await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report?.id,
          ticketNumber: report?.nomor_tiket,
          is_public: isPub,
          isPublic: isPub,
          catatan:
            nextStatus === 'publik'
              ? 'Laporan di-ACC dan ditayangkan ke Feed Publik oleh admin.'
              : nextStatus === 'privat'
              ? 'Laporan di-ACC sebagai aduan privat internal oleh admin.'
              : 'Laporan dikembalikan ke antrean peninjauan redaksi.',
        }),
      })
    } catch (err) {
      console.warn('Gagal mengubah hak tayang via API:', err)
    }

    const statusLabel =
      nextStatus === 'publik'
        ? 'Tayang di Feed Publik'
        : nextStatus === 'privat'
        ? 'Arsip Privat Redaksi'
        : 'Menunggu ACC'

    setToastMessage(`Hak tayang diubah: ${statusLabel}`)
    setTimeout(() => {
      setToastMessage(null)
    }, 2500)
  }

  const handleDeleteReport = async () => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Aduan?',
      message: 'Yakin ingin menghapus aduan ini secara permanen?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (!isConfirmed) {
      return
    }

    try {
      await fetch(`/api/reports?id=${encodeURIComponent(report.id)}`, {
        method: 'DELETE',
      })
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        const userReports = JSON.parse(
          localStorage.getItem('halo_jurnal_user_reports') || '[]'
        )
        const filtered = userReports.filter(
          (r: any) =>
            r.id !== report.id &&
            r.nomor_tiket !== report.id &&
            r.ticket_number !== report.id &&
            r.nomor_tiket !== report.nomor_tiket
        )
        localStorage.setItem('halo_jurnal_user_reports', JSON.stringify(filtered))
        window.dispatchEvent(new Event('storage'))
      } catch {}
    }

    router.replace('/jurnal-central/laporan')
  }

  // Format kategori (Title Case)
  const formatCategory = (cat?: string) => {
    if (!cat) return 'Umum'
    return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()
  }

  // Helper warna badge status (Sinkron 1-to-1 dengan Alur Tiket Warga & Alur Kurasi Inspirasi)
  const getStatusBadgeConfig = (status: string) => {
    const isInspirasi =
      (report.jenis || '').toLowerCase() === 'inspirasi' ||
      (report.kategori || '').toLowerCase().includes('inspirasi')

    if (isInspirasi) {
      switch (status) {
        case 'selesai':
        case 'ditayangkan':
          return {
            label: 'Disetujui & Tayang',
            bg: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
          }
        case 'ditindaklanjuti':
          return {
            label: '🌟 Liputan Berita',
            bg: 'bg-amber-50 text-amber-900 border border-amber-200',
          }
        case 'diproses':
        case 'konfirmasi':
          return {
            label: 'Sedang Dikurasi',
            bg: 'bg-sky-50 text-sky-800 border border-sky-200',
          }
        case 'ditolak':
          return {
            label: 'Tidak Lolos Kurasi',
            bg: 'bg-rose-50 text-rose-800 border border-rose-200',
          }
        default:
          return {
            label: 'Menunggu Kurasi',
            bg: 'bg-slate-100 text-slate-800 border border-slate-200',
          }
      }
    }

    switch (status) {
      case 'selesai':
      case 'ditayangkan':
        return {
          label: 'Selesai',
          bg: 'bg-slate-100 text-slate-800 border border-slate-200',
        }
      case 'diproses':
      case 'konfirmasi':
        return {
          label: 'Diproses',
          bg: 'bg-slate-100 text-slate-800 border border-slate-200',
        }
      case 'ditindaklanjuti':
        return {
          label: 'Ditindaklanjuti',
          bg: 'bg-slate-100 text-slate-800 border border-slate-200',
        }
      case 'ditolak':
        return {
          label: 'Ditolak',
          bg: 'bg-slate-100 text-slate-800 border border-slate-200',
        }
      default:
        return {
          label: 'Diterima',
          bg: 'bg-slate-100 text-slate-800 border border-slate-200',
        }
    }
  }

  const isInspirasi =
    (report.jenis || '').toLowerCase() === 'inspirasi' ||
    (report.kategori || '').toLowerCase().includes('inspirasi')

  const currentBadge = getStatusBadgeConfig(report.status)

  // Data kontak pelapor
  const residentPhone =
    (report as any)?.phone ||
    (report as any)?.user_phone ||
    (report as any)?.telepon ||
    '0857-2345-6789'

  // Dedup log status untuk menghilangkan pesan spam berulang
  const cleanedLogs = statusLogs.filter((log, idx, arr) => {
    if (idx === 0) return true
    const prev = arr[idx - 1]
    return !(prev.status === log.status && prev.catatan === log.catatan)
  })

  // Tampilkan 3 riwayat terbaru jika mode ringkas aktif
  const visibleLogs = showAllLogs ? cleanedLogs : cleanedLogs.slice(0, 3)

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/jurnal-central/laporan"
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Kembali ke Daftar Aduan"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              Detail Pengaduan Warga
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/halo-jurnal/laporan/${report.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-2xs hover:border-[#c00015]/40 hover:text-[#c00015]"
            title="Lihat Tampilan Warga di Portal"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Lihat di Portal</span>
          </Link>
        </div>
      </div>

      {/* 2. Grid Dua Kolom: Kiri (Dokumen Aduan Warga) & Kanan (Pengaturan Hak Tayang) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= KOLOM KIRI (7 Col): DOKUMEN ADUAN WARGA ================= */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-5">
            {/* Judul & Teks Aduan Warga */}
            <div className="space-y-2.5">
              <h2 className="text-lg font-heading font-bold text-slate-900 leading-snug">
                {report.judul}
              </h2>
              <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed text-justify [text-align-last:left] py-0.5">
                {report.deskripsi
                  ? report.deskripsi
                      .split(/\n+/)
                      .map((p: string) => p.trim())
                      .filter(Boolean)
                      .map((paragraf: string, idx: number) => (
                        <p key={idx} className="leading-relaxed">
                          {paragraf}
                        </p>
                      ))
                  : null}
              </div>
            </div>

            {/* Identitas Pelapor & Akses Chat */}
            {(() => {
              const rawPhone =
                (report as any)?.phone ||
                (report as any)?.pelaporPhone ||
                (report as any)?.telepon ||
                '081234567890'
              const pelaporNama =
                (report as any)?.pelaporName ||
                (report as any)?.nama_pelapor ||
                'Warga Sukabumi'
              const isAnonim = Boolean((report as any).is_anonim || (report as any).is_anonymous)

              return (
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {pelaporNama}
                        </span>
                        {isAnonim && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Anonim
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Kontak Telepon: <strong className="text-slate-700">{rawPhone}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('openFloatingAdminChat', {
                            detail: {
                              ticketNumber: report.nomor_tiket || report.id,
                              isMaximized: true,
                            },
                          })
                        )
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-semibold transition shadow-2xs cursor-pointer shrink-0"
                      title="Buka Ruang Obrolan Web Resmi Hallo Jurnal Fullscreen"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Buka Chat</span>
                      {unreadCount > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.2 bg-white/25 text-white rounded text-[10px] font-bold">
                          {unreadCount} baru
                        </span>
                      )}
                    </button>

                    {/* Tombol Tangguhkan / Aktifkan Akun Pelapor */}
                    {(() => {
                      const cId = (report as any)?.user_id || (report as any)?.userId || report?.nomor_tiket
                      const cPhone = (report as any)?.phone || (report as any)?.pelaporPhone || (report as any)?.telepon || rawPhone
                      const cEmail = (report as any)?.email || (report as any)?.pelaporEmail || ''

                      // Cek status penangguhan di localStorage overrides
                      let isSuspended = false
                      if (typeof window !== 'undefined') {
                        try {
                          const overrides = JSON.parse(
                            localStorage.getItem('halo_jurnal_citizen_status_overrides') || '{}'
                          )
                          if (
                            overrides[cId] === false ||
                            (cPhone && overrides[cPhone] === false) ||
                            (cEmail && overrides[cEmail] === false)
                          ) {
                            isSuspended = true
                          }
                        } catch {}
                      }

                      const handleToggleSuspend = async () => {
                        const nextSuspended = !isSuspended
                        const actionName = nextSuspended ? 'Tangguhkan Akun Pelapor?' : 'Aktifkan Akun Pelapor?'
                        const actionDesc = nextSuspended
                          ? `Yakin ingin menangguhkan akun pelapor ${pelaporNama} (${cPhone})? Pelapor tidak akan bisa login dan tidak dapat mengirim aduan baru.`
                          : `Aktifkan kembali akun pelapor ${pelaporNama}? Warga akan dapat login dan mengakses layanan kembali.`

                        const isConfirmed = await confirmDialog({
                          title: actionName,
                          message: actionDesc,
                          confirmText: nextSuspended ? 'Tangguhkan' : 'Aktifkan',
                          cancelText: 'Batal',
                          variant: nextSuspended ? 'warning' : 'success',
                        })
                        if (!isConfirmed) return

                        if (typeof window !== 'undefined') {
                          try {
                            const overrides = JSON.parse(
                              localStorage.getItem('halo_jurnal_citizen_status_overrides') || '{}'
                            )
                            overrides[cId] = !nextSuspended
                            if (cPhone) overrides[cPhone] = !nextSuspended
                            if (cEmail) overrides[cEmail] = !nextSuspended
                            localStorage.setItem('halo_jurnal_citizen_status_overrides', JSON.stringify(overrides))

                            const cached = JSON.parse(localStorage.getItem('halo_jurnal_all_citizens') || '[]')
                            if (Array.isArray(cached) && cached.length > 0) {
                              const updated = cached.map((c: any) =>
                                c.id === cId || c.phone === cPhone || (cEmail && c.email === cEmail)
                                  ? { ...c, isVerified: !nextSuspended }
                                  : c
                              )
                              localStorage.setItem('halo_jurnal_all_citizens', JSON.stringify(updated))
                            }
                            window.dispatchEvent(new Event('storage'))
                          } catch {}
                        }

                        // Sinkronisasi API backend
                        try {
                          await fetch('/api/admin/citizens', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              citizenId: cId,
                              action: 'toggle_status',
                            }),
                          })
                        } catch {}
                      }

                      return isSuspended ? (
                        <button
                          type="button"
                          onClick={handleToggleSuspend}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[#c00015] hover:bg-red-100 text-xs font-semibold transition cursor-pointer shrink-0"
                          title="Akun warga ini sedang ditangguhkan. Klik untuk mengaktifkan kembali."
                        >
                          <span>Akun Ditangguhkan (Aktifkan)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleToggleSuspend}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer shrink-0"
                          title="Tangguhkan akun pelapor ini agar tidak bisa lapor dan login"
                        >
                          <span>Tangguhkan Akun</span>
                        </button>
                      )
                    })()}
                  </div>
                </div>
              )
            })()}

            {/* Galeri Foto/Video Bukti Lampiran */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Berkas Bukti Lampiran ({report.laporan_lampiran?.length || 0})
                </h3>
                <span className="text-[11px] text-slate-400">Foto &amp; Video Bukti</span>
              </div>

              {report.laporan_lampiran && report.laporan_lampiran.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {report.laporan_lampiran.map((lamp, i) => {
                    const isVid =
                      (lamp.file_type && lamp.file_type.startsWith('video/')) ||
                      lamp.file_url?.startsWith('data:video/') ||
                      lamp.file_url?.includes('/video/upload/') ||
                      lamp.file_url?.endsWith('.mp4') ||
                      lamp.file_url?.endsWith('.webm')
                    if (isVid) {
                      return (
                        <div
                          key={lamp.id || i}
                          className="rounded-lg border border-slate-200 overflow-hidden bg-black aspect-video relative"
                        >
                          <video
                            src={lamp.file_url}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )
                    }
                    return (
                      <div
                        key={lamp.id || i}
                        onClick={() => setActivePhoto(lamp.file_url)}
                        className="group cursor-pointer rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-video relative"
                      >
                        <img
                          src={lamp.file_url}
                          alt={`Bukti aduan ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                          Perbesar ↗
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-50 border border-slate-100">
                  Pelapor tidak mengunggah lampiran foto/video fisik.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ================= KOLOM KANAN (5 Col): MEJA EKSEKUSI REDAKSI ================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Panel Meja ACC & Hak Tayang Aduan */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-heading font-extrabold text-slate-900 uppercase tracking-wider">
                Keputusan ACC &amp; Hak Tayang
              </h3>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  accStatus === 'publik'
                    ? 'bg-red-50 text-[#c00015] border border-red-200'
                    : accStatus === 'menunggu_acc'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {accStatus === 'publik'
                  ? 'Tayang Publik'
                  : accStatus === 'menunggu_acc'
                  ? 'Menunggu ACC'
                  : 'Privat'}
              </span>
            </div>

            {/* Opsi Pilihan Meja ACC: Publik & Privat */}
            <div className="space-y-1.5">
              {/* Opsi 1: Tayang Publik */}
              <button
                type="button"
                onClick={() => handleUpdateAccStatus('publik')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between text-xs font-semibold ${
                  accStatus === 'publik'
                    ? 'bg-red-50/60 border-[#c00015] text-[#c00015]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Tayang di Feed Publik</span>
                {accStatus === 'publik' && (
                  <span className="w-2 h-2 rounded-full bg-[#c00015]" />
                )}
              </button>

              {/* Opsi 2: Arsip Privat */}
              <button
                type="button"
                onClick={() => handleUpdateAccStatus('privat')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between text-xs font-semibold ${
                  accStatus === 'privat'
                    ? 'bg-slate-100 border-slate-700 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Arsip Privat Redaksi</span>
                {accStatus === 'privat' && (
                  <span className="w-2 h-2 rounded-full bg-slate-800" />
                )}
              </button>
            </div>

            {/* Ringkasan Metadata Aduan */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-100/60">
                <span>Nomor Tiket</span>
                <span className="font-mono font-bold text-slate-800">{report.nomor_tiket}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-100/60">
                <span>Tanggal Lapor</span>
                <span className="font-semibold text-slate-700">{formatDate(report.created_at)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-100/60">
                <span>Dukungan Warga</span>
                <span className="font-bold text-slate-800">{report.dukungan_count || 0} suara</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 py-1">
                <span>Lokasi Kejadian</span>
                <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                  {report.lokasi || (report as any).address || 'Sukabumi'}
                </span>
              </div>
            </div>

            {/* Tombol Hapus Aduan */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDeleteReport}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Aduan Ini Secara Permanen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Zoom Foto Resolusi Penuh (Mobile Friendly Close Button) */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            {activePhoto.startsWith('data:video/') || activePhoto.endsWith('.mp4') || activePhoto.endsWith('.webm') ? (
              <video
                src={activePhoto}
                controls
                autoPlay
                className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
              />
            ) : (
              <img
                src={activePhoto}
                alt="Foto Bukti Diperbesar"
                className="max-h-[85vh] max-w-full w-auto rounded-xl object-contain shadow-2xl"
              />
            )}
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-2 right-2 sm:-top-3 sm:-right-3 p-2 bg-slate-900/90 hover:bg-black text-white rounded-full shadow-lg transition"
              title="Tutup foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Toast Notifikasi Standar Meja Redaksi */}
      <AdminToast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  )
}
