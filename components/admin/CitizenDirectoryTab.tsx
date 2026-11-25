'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  Phone,
  FileText,
  RotateCcw,
  X,
  Loader2,
} from 'lucide-react'
import AdminToast from '@/components/admin/AdminToast'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'

interface CitizenItem {
  id: string
  email: string
  fullName: string
  phone: string
  isVerified: boolean
  createdAt: string
  totalReports: number
}

interface CitizenDirectoryTabProps {
  onCountChange?: (count: number) => void
}

export default function CitizenDirectoryTab({ onCountChange }: CitizenDirectoryTabProps = {}) {
  const confirmDialog = useConfirm()
  const [citizens, setCitizens] = useState<CitizenItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'semua' | 'aktif' | 'ditangguhkan'>('semua')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Load citizens data from API
  const loadCitizens = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/citizens', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          let list = json.data
          if (typeof window !== 'undefined') {
            try {
              const overrides = JSON.parse(
                localStorage.getItem('halo_jurnal_citizen_status_overrides') || '{}'
              )
              list = list.map((c: CitizenItem) => {
                if (typeof overrides[c.id] === 'boolean') {
                  return { ...c, isVerified: overrides[c.id] }
                }
                return c
              })
            } catch {}
            localStorage.setItem('halo_jurnal_all_citizens', JSON.stringify(list))
          }
          setCitizens(list)
          onCountChange?.(list.length)
        }
      }
    } catch (err) {
      console.warn('Notice fetching citizens:', err)
      if (typeof window !== 'undefined') {
        try {
          const cached = JSON.parse(localStorage.getItem('halo_jurnal_all_citizens') || '[]')
          if (Array.isArray(cached) && cached.length > 0) {
            setCitizens(cached)
            onCountChange?.(cached.length)
          }
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCitizens()
  }, [])

  // Filter list
  const filteredCitizens = useMemo(() => {
    return citizens.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (c.fullName || '').toLowerCase().includes(q)
        const matchPhone = (c.phone || '').includes(q)
        if (!matchName && !matchPhone) return false
      }

      if (statusFilter === 'aktif' && !c.isVerified) return false
      if (statusFilter === 'ditangguhkan' && c.isVerified) return false

      return true
    })
  }, [citizens, searchQuery, statusFilter])

  // Handle Toggle Status Akun (Aktif / Tangguhkan)
  const handleToggleStatus = async (citizen: CitizenItem) => {
    const isDeactivating = citizen.isVerified
    const isConfirmed = await confirmDialog({
      title: isDeactivating ? 'Tangguhkan Akun Pelapor?' : 'Aktifkan Akun Pelapor?',
      message: `Yakin ingin ${isDeactivating ? 'menangguhkan (blokir)' : 'mengaktifkan kembali'} akses pelapor ${citizen.fullName} (${citizen.phone})?`,
      confirmText: isDeactivating ? 'Tangguhkan' : 'Aktifkan',
      cancelText: 'Batal',
      variant: isDeactivating ? 'warning' : 'success',
    })
    if (!isConfirmed) return

    const nextStatus = !citizen.isVerified

    // 1. Optimistic UI update (0ms respon instan)
    setCitizens((prev) =>
      prev.map((c) => (c.id === citizen.id ? { ...c, isVerified: nextStatus } : c))
    )

    // 2. Simpan di localStorage overrides agar persist saat refresh
    if (typeof window !== 'undefined') {
      try {
        const overrides = JSON.parse(
          localStorage.getItem('halo_jurnal_citizen_status_overrides') || '{}'
        )
        overrides[citizen.id] = nextStatus
        localStorage.setItem('halo_jurnal_citizen_status_overrides', JSON.stringify(overrides))

        const cached = JSON.parse(localStorage.getItem('halo_jurnal_all_citizens') || '[]')
        if (Array.isArray(cached) && cached.length > 0) {
          const updated = cached.map((c: any) =>
            c.id === citizen.id ? { ...c, isVerified: nextStatus } : c
          )
          localStorage.setItem('halo_jurnal_all_citizens', JSON.stringify(updated))
        }
      } catch {}
    }

    setToastMessage(
      `Status akun ${citizen.fullName} berhasil ${nextStatus ? 'diaktifkan' : 'ditangguhkan'}.`
    )
    setTimeout(() => setToastMessage(null), 3500)

    // 3. Sinkronisasi API ke backend
    try {
      await fetch('/api/admin/citizens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId: citizen.id,
          action: 'toggle_status',
        }),
      })
    } catch (err) {
      console.warn('Notice syncing citizen status to API:', err)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toast Alert */}
      <AdminToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      {/* Toolbar: Pencarian Ringkas & Filter Status */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau nomor telepon WhatsApp..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] focus:ring-1 focus:ring-[#c00015] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('semua')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                statusFilter === 'semua'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('aktif')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                statusFilter === 'aktif'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ditangguhkan')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                statusFilter === 'ditangguhkan'
                  ? 'bg-white text-rose-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ditangguhkan
            </button>
          </div>

          <button
            onClick={loadCitizens}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer shrink-0"
            title="Segarkan Data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#c00015]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabel Direktori Akun Warga */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#c00015] mx-auto" />
            <p className="text-xs text-slate-500">Memuat data akun warga...</p>
          </div>
        ) : filteredCitizens.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Tidak ada akun warga yang cocok</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada nomor warga yang terdaftar.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nama &amp; Nomor WhatsApp</th>
                  <th className="py-3 px-4 text-center w-[130px]">Aduan Masuk</th>
                  <th className="py-3 px-4 w-[130px]">Status Akun</th>
                  <th className="py-3 px-4 text-center w-[140px]">Aksi Kendali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCitizens.map((citizen) => {
                  return (
                    <tr
                      key={citizen.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !citizen.isVerified ? 'bg-slate-50/60 opacity-60' : ''
                      }`}
                    >
                      {/* Nama & Nomor Telepon */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-heading font-bold text-slate-900 text-xs">
                            {citizen.fullName || 'Warga Tanpa Nama'}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-600 inline-flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {citizen.phone}
                          </span>
                        </div>
                      </td>

                      {/* Aduan Masuk */}
                      <td className="py-3.5 px-4 align-middle text-center">
                        {citizen.totalReports > 0 ? (
                          <Link
                            href={`/jurnal-central/laporan?search=${encodeURIComponent(citizen.phone || citizen.fullName)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-[#c00015] font-semibold text-xs transition"
                            title="Buka daftar aduan dari nomor ini"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{citizen.totalReports} Laporan</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs">0 Laporan</span>
                        )}
                      </td>

                      {/* Status Akun */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(citizen)}
                            className="relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none"
                            style={{ backgroundColor: citizen.isVerified ? '#c00015' : '#cbd5e1' }}
                            title={citizen.isVerified ? 'Status: Aktif (klik untuk tangguhkan)' : 'Status: Ditangguhkan (klik untuk aktifkan)'}
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200"
                              style={{
                                transform: citizen.isVerified ? 'translateX(11px)' : 'translateX(1px)',
                              }}
                            />
                          </button>
                          <span className={`text-xs font-semibold ${citizen.isVerified ? 'text-slate-800' : 'text-slate-400'}`}>
                            {citizen.isVerified ? 'Aktif' : 'Ditangguhkan'}
                          </span>
                        </div>
                      </td>

                      {/* Aksi Kendali */}
                      <td className="py-3.5 px-4 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(citizen)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            citizen.isVerified
                              ? 'border-slate-200 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 shadow-2xs'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-2xs'
                          }`}
                          title={citizen.isVerified ? 'Tangguhkan Akun (Blokir)' : 'Aktifkan Kembali Akun'}
                        >
                          {citizen.isVerified ? (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                              <span>Tangguhkan</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Aktifkan</span>
                            </>
                          )}
                        </button>
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
