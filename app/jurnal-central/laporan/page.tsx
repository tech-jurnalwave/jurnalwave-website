'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText,
  Search,
  ExternalLink,
  Download,
  RotateCcw,
  X,
  MessageSquare,
  Trash2,
  Check,
  Lock,
  Globe,
  Clock,
  ThumbsUp,
} from 'lucide-react'
import { DummyReport } from '@/data/dummyReports'
import { useAdminData } from '@/context/AdminDataContext'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'

type AccStatus = 'menunggu_acc' | 'publik' | 'privat'

export default function AdminLaporanPage() {
  const confirmDialog = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'semua' | 'menunggu_acc' | 'publik' | 'privat'>('menunggu_acc')
  const { reports: reportsList, isLoadingReports: isLoading, refreshReports } = useAdminData()
  const [chatCounts, setChatCounts] = useState<Record<string, number>>({})
  const [localOverrides, setLocalOverrides] = useState<Record<string, { acc_status?: AccStatus; is_public?: boolean }>>({})

  // Format tanggal rapi
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Muat status override lokal saat pertama kali dibuka
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('halo_jurnal_status_overrides') || '{}')
        setLocalOverrides(saved)
      } catch {}
    }
  }, [])

  // Fungsi penentu status ACC & Hak Tayang
  const getAccStatus = useCallback(
    (r: DummyReport): AccStatus => {
      const targetKey = r.id || r.nomor_tiket
      const override = localOverrides[r.id] || (r.nomor_tiket ? localOverrides[r.nomor_tiket] : null)

      if (override?.acc_status) {
        return override.acc_status
      }

      if (override?.is_public !== undefined) {
        return override.is_public ? 'publik' : 'privat'
      }

      if ((r as any).acc_status) {
        return (r as any).acc_status
      }

      // Default data bawaan:
      // Jika statusnya 'diterima' dan belum ada keputusan ACC eksplisit -> 'menunggu_acc'
      if (r.status === 'diterima' && r.is_public !== true) {
        return 'menunggu_acc'
      }

      // Jika laporan berstatus publik -> 'publik'
      if (r.is_public === true || (r as any).visibilitas === 'publik') {
        return 'publik'
      }

      // Sisanya -> 'privat'
      return 'privat'
    },
    [localOverrides]
  )

  // Eksekusi penetapan ACC & Hak Tayang
  const handleSetAccStatus = async (report: DummyReport, nextStatus: AccStatus) => {
    const isPublic = nextStatus === 'publik'

    // 1. Update optimistik instan
    setLocalOverrides((prev) => ({
      ...prev,
      [report.id]: { acc_status: nextStatus, is_public: isPublic },
      ...(report.nomor_tiket ? { [report.nomor_tiket]: { acc_status: nextStatus, is_public: isPublic } } : {}),
    }))

    // 2. Simpan ke localStorage
    if (typeof window !== 'undefined') {
      try {
        const overrides = JSON.parse(localStorage.getItem('halo_jurnal_status_overrides') || '{}')
        const key = report.nomor_tiket || report.id
        const payload = {
          ...(overrides[key] || {}),
          acc_status: nextStatus,
          is_public: isPublic,
          isPublic: isPublic,
          visibilitas: isPublic ? 'publik' : 'privat',
        }
        overrides[key] = payload
        if (report.id) overrides[report.id] = payload
        if (report.nomor_tiket) overrides[report.nomor_tiket] = payload
        localStorage.setItem('halo_jurnal_status_overrides', JSON.stringify(overrides))

        // Update laporan pengguna
        const userReports = JSON.parse(localStorage.getItem('halo_jurnal_user_reports') || '[]')
        const updated = userReports.map((r: any) => {
          if (r.id === report.id || r.nomor_tiket === report.nomor_tiket) {
            return {
              ...r,
              acc_status: nextStatus,
              is_public: isPublic,
              isPublic: isPublic,
              visibilitas: isPublic ? 'publik' : 'privat',
            }
          }
          return r
        })
        localStorage.setItem('halo_jurnal_user_reports', JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
      } catch {}
    }

    // 3. Kirim ke API backend
    try {
      await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          ticketNumber: report.nomor_tiket,
          is_public: isPublic,
          isPublic: isPublic,
          catatan:
            nextStatus === 'publik'
              ? 'Laporan di-ACC dan ditayangkan ke Feed Publik oleh admin.'
              : nextStatus === 'privat'
              ? 'Laporan di-ACC sebagai aduan privat internal oleh admin.'
              : 'Laporan dikembalikan ke meja antrean peninjauan admin.',
        }),
      })
    } catch (err) {
      console.warn('Gagal mengubah hak tayang via API:', err)
    }

    await refreshReports()
  }

  // Scan jumlah pesan chat warga aktif yang belum dibaca (Unread)
  useEffect(() => {
    const scanChats = () => {
      if (typeof window === 'undefined') return
      try {
        const readSet = new Set<string>(
          JSON.parse(localStorage.getItem('halo_jurnal_read_chats') || '[]')
        )
        const readTicketTimes: Record<string, number> = JSON.parse(
          localStorage.getItem('halo_jurnal_read_ticket_times') || '{}'
        )

        const map: Record<string, number> = {}
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('halo_jurnal_chat_')) {
            const ticketKey = key.replace('halo_jurnal_chat_', '')
            const ticketReadTime = Math.max(
              readTicketTimes[ticketKey] || 0,
              readTicketTimes[ticketKey.toUpperCase()] || 0,
              readTicketTimes[ticketKey.toLowerCase()] || 0
            )

            try {
              const list = JSON.parse(localStorage.getItem(key) || '[]')
              if (Array.isArray(list) && list.length > 0) {
                const unreadCitizenMsgs = list.filter((m: any) => {
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
                })

                if (unreadCitizenMsgs.length > 0) {
                  map[ticketKey] = unreadCitizenMsgs.length
                  map[ticketKey.toUpperCase()] = unreadCitizenMsgs.length
                  map[ticketKey.toLowerCase()] = unreadCitizenMsgs.length
                }
              }
            } catch {}
          }
        }
        setChatCounts(map)
      } catch {}
    }

    scanChats()
    window.addEventListener('storage', scanChats)
    window.addEventListener('focus', scanChats)
    window.addEventListener('openFloatingAdminChat', scanChats)
    return () => {
      window.removeEventListener('storage', scanChats)
      window.removeEventListener('focus', scanChats)
      window.removeEventListener('openFloatingAdminChat', scanChats)
    }
  }, [])

  // Baca query pencarian dari parameter URL jika ada
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const q = sp.get('search')
      if (q) setSearchQuery(q)
      const tabParam = sp.get('tab')
      if (tabParam === 'menunggu_acc' || tabParam === 'publik' || tabParam === 'privat' || tabParam === 'semua') {
        setSelectedTab(tabParam)
      }
    }
  }, [])

  // Hitungan kuota per kategori
  const totalMenungguAcc = useMemo(
    () => reportsList.filter((r) => getAccStatus(r) === 'menunggu_acc').length,
    [reportsList, getAccStatus]
  )
  const totalPublik = useMemo(
    () => reportsList.filter((r) => getAccStatus(r) === 'publik').length,
    [reportsList, getAccStatus]
  )
  const totalPrivat = useMemo(
    () => reportsList.filter((r) => getAccStatus(r) === 'privat').length,
    [reportsList, getAccStatus]
  )

  // Otomatis arahkan ke tab 'menunggu_acc' jika ada laporan baru, atau 'semua' jika tidak ada
  useEffect(() => {
    if (totalMenungguAcc === 0 && selectedTab === 'menunggu_acc') {
      // Biarkan tetap di tab yang dipilih atau default
    }
  }, [totalMenungguAcc, selectedTab])

  // Filter aduan berdasarkan tab & search
  const filteredReports = useMemo(() => {
    return reportsList.filter((r) => {
      // 1. Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = r.judul?.toLowerCase().includes(q)
        const matchTicket = r.nomor_tiket?.toLowerCase().includes(q)
        const matchDesc = r.deskripsi?.toLowerCase().includes(q)
        const matchPelapor = (r.nama_pelapor || (r as any).pelaporName || '').toLowerCase().includes(q)
        if (!matchTitle && !matchTicket && !matchDesc && !matchPelapor) return false
      }

      // 2. Filter Tab
      const st = getAccStatus(r)
      if (selectedTab === 'menunggu_acc' && st !== 'menunggu_acc') return false
      if (selectedTab === 'publik' && st !== 'publik') return false
      if (selectedTab === 'privat' && st !== 'privat') return false

      return true
    })
  }, [reportsList, searchQuery, selectedTab, getAccStatus])

  const PAGE_SIZE = 10
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, selectedTab])

  const visibleReports = useMemo(() => {
    return filteredReports.slice(0, visibleCount)
  }, [filteredReports, visibleCount])

  const handleDeleteReport = async (id: string, ticketNumber?: string) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Aduan?',
      message: 'Yakin ingin menghapus aduan ini secara permanen dari basis data?',
      confirmText: 'Hapus Permanen',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (!isConfirmed) return

    try {
      await fetch(`/api/reports?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        const userReports = JSON.parse(localStorage.getItem('halo_jurnal_user_reports') || '[]')
        const filtered = userReports.filter(
          (r: any) =>
            r.id !== id &&
            r.nomor_tiket !== id &&
            r.ticket_number !== id &&
            (!ticketNumber || r.nomor_tiket !== ticketNumber)
        )
        localStorage.setItem('halo_jurnal_user_reports', JSON.stringify(filtered))
        window.dispatchEvent(new Event('storage'))
      } catch {}
    }

    await refreshReports()
  }

  const handleResetFilter = () => {
    setSearchQuery('')
    setSelectedTab('semua')
    setVisibleCount(PAGE_SIZE)
  }

  // Ekspor CSV
  const handleExportCSV = () => {
    const headers = ['Nomor Tiket', 'Tanggal', 'Judul Pengaduan', 'Status ACC / Hak Tayang', 'Pelapor', 'Dukungan']
    const rows = filteredReports.map((r) => [
      `"${r.nomor_tiket}"`,
      `"${formatDate(r.created_at)}"`,
      `"${r.judul.replace(/"/g, '""')}"`,
      `"${getAccStatus(r)}"`,
      `"${r.nama_pelapor || (r as any).pelaporName || 'Warga Sukabumi'}"`,
      r.dukungan_count || 0,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `aduan-halo-jurnal-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
            Pengaduan Warga
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat moderasi, peninjauan (ACC), dan penetapan hak tayang aduan warga Sukabumi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-2xs cursor-pointer hover:border-[#c00015]/40 hover:text-[#c00015]"
            title="Unduh data aduan ke format CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Tab Terpadu: Tempat ACC vs Status Hak Tayang */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs: Menunggu ACC, Tayang Publik, Privat, Semua */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedTab('menunggu_acc')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedTab === 'menunggu_acc'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Menunggu ACC ({totalMenungguAcc})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('publik')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedTab === 'publik'
                ? 'bg-[#c00015] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Tayang Publik ({totalPublik})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('privat')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedTab === 'privat'
                ? 'bg-[#c00015] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privat ({totalPrivat})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedTab === 'semua'
                ? 'bg-[#c00015] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({reportsList.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor tiket, judul, pelapor..."
              className="w-full pl-9 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(searchQuery || selectedTab !== 'semua') && (
            <button
              onClick={handleResetFilter}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-[#c00015] hover:bg-slate-100 rounded-lg transition cursor-pointer border border-slate-200 shrink-0"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Tabel Tabular Aduan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading && reportsList.length === 0 ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                {selectedTab === 'menunggu_acc'
                  ? 'Tidak ada aduan yang menunggu ACC redaksi'
                  : 'Tidak ada aduan yang sesuai'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {selectedTab === 'menunggu_acc'
                  ? 'Semua laporan baru yang masuk telah selesai ditinjau dan ditentukan hak tayangnya.'
                  : 'Coba ubah kata kunci pencarian atau pilih tab filter lain.'}
              </p>
            </div>
            {selectedTab !== 'semua' && (
              <button
                onClick={handleResetFilter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tampilkan Semua Laporan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap w-[200px]">No. Tiket</th>
                  <th className="py-3 px-4 min-w-[240px]">Judul Pengaduan</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[170px] text-center">Hak Tayang</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[100px] text-center">Dukungan</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[150px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleReports.map((report) => {
                  const reportChatCount =
                    chatCounts[report.id] ||
                    (report.nomor_tiket ? chatCounts[report.nomor_tiket] : 0) ||
                    0
                  const status = getAccStatus(report)

                  return (
                    <tr
                      key={report.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        status === 'privat' ? 'opacity-80' : ''
                      }`}
                    >
                      {/* 1. No Tiket & Chat */}
                      <td className="py-3 px-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {report.nomor_tiket}
                          </span>
                          {reportChatCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#c00015] px-1.5 py-0.5 rounded-full shadow-2xs"
                              title={`${reportChatCount} pesan baru dari warga di tiket ini`}
                            >
                              <MessageSquare className="w-2.5 h-2.5 text-white" />
                              <span>{reportChatCount}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatDate(report.created_at)}
                        </p>
                      </td>

                      {/* 2. Judul & Pelapor */}
                      <td className="py-3 px-4 align-middle min-w-0">
                        <Link
                          href={`/jurnal-central/laporan/${report.id}`}
                          className="font-heading font-semibold text-slate-900 hover:text-[#c00015] transition-colors truncate block text-xs"
                          title={report.judul}
                        >
                          {report.judul}
                        </Link>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          Pelapor: <span className="text-slate-600 font-medium">{report.nama_pelapor || (report as any).pelaporName || 'Warga Sukabumi'}</span>
                        </p>
                      </td>

                      {/* 3. Tempat ACC / Status Hak Tayang */}
                      <td className="py-3 px-4 whitespace-nowrap align-middle text-center">
                        <select
                          value={status}
                          onChange={(e) => handleSetAccStatus(report, e.target.value as AccStatus)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-md border cursor-pointer focus:outline-none transition ${
                            status === 'publik'
                              ? 'bg-red-50 text-[#c00015] border-red-200'
                              : status === 'menunggu_acc'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {status === 'menunggu_acc' && (
                            <option value="menunggu_acc" disabled>
                              Menunggu ACC
                            </option>
                          )}
                          <option value="publik">Tayang Publik</option>
                          <option value="privat">Privat</option>
                        </select>
                      </td>

                      {/* 4. Dukungan Suara Warga */}
                      <td className="py-3 px-4 whitespace-nowrap align-middle text-center text-slate-700 font-semibold text-xs">
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-slate-400" />
                          <span>{report.dukungan_count || 0}</span>
                        </span>
                      </td>

                      {/* 5. Aksi: Chat, Portal/Detail, Hapus */}
                      <td className="py-3 px-4 whitespace-nowrap text-center align-middle">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Chat Warga */}
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
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#c00015] hover:bg-red-50 transition cursor-pointer relative"
                            title="Buka Chat Warga Fullscreen"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {reportChatCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#c00015] ring-2 ring-white" />
                            )}
                          </button>

                          {/* Buka Detail Aduan */}
                          <Link
                            href={`/jurnal-central/laporan/${report.id}`}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title="Buka Detail Aduan & Meja ACC"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Hapus Permanen */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report.id, report.nomor_tiket)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Aduan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
