'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Menu,
  Search,
  Bell,
  FileText,
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminData } from '@/context/AdminDataContext'

interface AdminHeaderProps {
  onToggleSidebar: () => void
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { reports, refreshReports } = useAdminData()
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [readReportIds, setReadReportIds] = useState<string[]>([])

  // Muat status laporan yang sudah ditandai dibaca
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('halo_jurnal_read_reports') || '[]')
        if (Array.isArray(saved)) {
          setReadReportIds(saved)
        }
      } catch {}
    }
  }, [])

  // Filter laporan baru berstatus 'diterima' (perlu ditinjau redaksi)
  const pendingReports = useMemo(() => {
    return [...reports]
      .filter((r) => r.status === 'diterima')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [reports])

  // Laporan baru yang belum dibaca
  const unreadReports = useMemo(() => {
    return pendingReports.filter((r) => !readReportIds.includes(r.id))
  }, [pendingReports, readReportIds])

  const unreadCount = unreadReports.length

  const markAllReportsAsRead = () => {
    if (typeof window !== 'undefined') {
      try {
        const allIds = pendingReports.map((r) => r.id)
        const merged = Array.from(new Set([...readReportIds, ...allIds]))
        localStorage.setItem('halo_jurnal_read_reports', JSON.stringify(merged))
        setReadReportIds(merged)
      } catch {}
    }
  }

  const markReportAsRead = (id: string) => {
    if (typeof window !== 'undefined') {
      try {
        const merged = Array.from(new Set([...readReportIds, id]))
        localStorage.setItem('halo_jurnal_read_reports', JSON.stringify(merged))
        setReadReportIds(merged)
      } catch {}
    }
  }



  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (pathname.includes('/berita')) {
        router.push(`/jurnal-central/berita?search=${encodeURIComponent(searchQuery.trim())}`)
      } else {
        router.push(`/jurnal-central/laporan?search=${encodeURIComponent(searchQuery.trim())}`)
      }
    }
  }

  // Menentukan teks breadcrumb secara dinamis sesuai halaman aktif
  const getBreadcrumb = () => {
    if (pathname === '/jurnal-central' || pathname === '/jurnal-central/dashboard') {
      return { section: 'Jurnal Central', page: 'Dashboard', sectionHref: '/jurnal-central' }
    }
    if (pathname?.startsWith('/jurnal-central/laporan/')) {
      return { section: 'Hallo Jurnal', page: 'Detail Pengaduan Warga', sectionHref: '/jurnal-central/laporan' }
    }
    if (pathname === '/jurnal-central/laporan') {
      return { section: 'Hallo Jurnal', page: 'Buku Induk Pengaduan', sectionHref: '/jurnal-central/laporan' }
    }
    if (pathname === '/jurnal-central/chat') {
      return { section: 'Hallo Jurnal', page: 'Pusat Chat Warga', sectionHref: '/jurnal-central/chat' }
    }
    if (pathname === '/jurnal-central/berita') {
      return { section: 'JurnalWave', page: 'Manajemen Konten', sectionHref: '/jurnal-central/berita' }
    }
    if (pathname === '/jurnal-central/reels') {
      return { section: 'JurnalWave', page: 'Wave Reels', sectionHref: '/jurnal-central/reels' }
    }
    if (pathname === '/jurnal-central/loker') {
      return { section: 'JurnalWave', page: 'Lowongan Kerja', sectionHref: '/jurnal-central/loker' }
    }
    if (pathname === '/jurnal-central/polling') {
      return { section: 'JurnalWave', page: 'Polling Pembaca', sectionHref: '/jurnal-central/polling' }
    }
    if (pathname === '/jurnal-central/pengguna') {
      return { section: 'Sistem', page: 'Kelola Pengguna', sectionHref: '/jurnal-central/pengguna' }
    }
    if (pathname === '/jurnal-central/keamanan') {
      return { section: 'Sistem', page: 'Keamanan Akun', sectionHref: '/jurnal-central/keamanan' }
    }
    return { section: 'Jurnal Central', page: 'Ruang Kerja Redaksi', sectionHref: '/jurnal-central' }
  }

  const breadcrumb = getBreadcrumb()

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Kiri: Toggle Sidebar Mobile & Breadcrumb Dinamis */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb Dinamis & Presisi */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href={breadcrumb.sectionHref}
              className="hover:text-slate-900 transition-colors"
            >
              {breadcrumb.section}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">{breadcrumb.page}</span>
          </div>
        </div>

        {/* Tengah: Quick Search Bar Minimalis */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Cari nomor tiket (HJ-...), nama pelapor, atau artikel... (Enter)"
              className="w-full pl-9 pr-12 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] focus:ring-1 focus:ring-[#c00015] transition"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Kanan: Notifikasi */}
        <div className="flex items-center gap-2.5">
          {/* Lonceng Notifikasi Aduan Warga Baru */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer"
              aria-label="Notifikasi Aduan Warga"
              title="Notifikasi Aduan Warga Baru"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#c00015] text-white shadow-2xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Notifikasi */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 -mr-2 sm:mr-0 mt-2 w-[calc(100vw-32px)] sm:w-92 max-w-sm rounded-xl bg-white border border-slate-200 shadow-xl p-3.5 z-40 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        Notifikasi
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-500/10 text-[#c00015]">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllReportsAsRead}
                        className="text-[11px] text-[#c00015] hover:underline font-semibold cursor-pointer"
                      >
                        Tandai dibaca
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {/* Daftar Notifikasi Laporan Terbaru */}
                    {pendingReports.slice(0, 5).map((r) => {
                      const isUnread = !readReportIds.includes(r.id)
                      return (
                        <Link
                          key={r.id}
                          href={`/jurnal-central/laporan/${r.id}`}
                          onClick={() => {
                            setShowNotifications(false)
                            markReportAsRead(r.id)
                          }}
                          className={`block p-2.5 rounded-lg border transition space-y-1 ${
                            isUnread
                              ? 'bg-red-50/40 hover:bg-red-50 border-red-100'
                              : 'bg-white hover:bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <FileText className="w-3.5 h-3.5 text-[#c00015] shrink-0" />
                              <span className="truncate">{r.judul}</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-1">
                              {r.nomor_tiket}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span className="truncate">
                              Pelapor: <strong className="text-slate-700">{r.nama_pelapor || r.pelaporName || 'Warga'}</strong>
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                              {new Date(r.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        </Link>
                      )
                    })}

                    {/* Notifikasi Kosong jika tidak ada laporan baru */}
                    {pendingReports.length === 0 && (
                      <div className="text-center py-6 text-slate-400 space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700">Tidak ada notifikasi baru</p>
                        <p className="text-[10px] text-slate-400">Pemberitahuan aktivitas sistem akan muncul di sini.</p>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/jurnal-central/laporan"
                    onClick={() => setShowNotifications(false)}
                    className="block text-center w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition"
                  >
                    Lihat Semua Laporan &rarr;
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
