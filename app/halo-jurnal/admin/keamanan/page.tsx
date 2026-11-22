'use client'

import React, { useState, useEffect } from 'react'
import {
  Laptop,
  Smartphone,
  Tablet,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'
import AdminToast from '@/components/admin/AdminToast'

interface DeviceSessionInfo {
  deviceType: string
  browserName: string
  location: string
  deviceCategory: 'desktop' | 'mobile' | 'tablet'
}

interface TeamMemberSession {
  id: string
  name: string
  email: string
  role: string
  password?: string
  isSuperadmin?: boolean
  permissions?: string[]
  status: 'aktif' | 'cuti'
  joinedAt?: string
  device?: string
  browser?: string
  location?: string
}

const DEFAULT_STAFF_SESSIONS: TeamMemberSession[] = [
  {
    id: 'team-superadmin',
    name: 'Super Admin',
    email: 'tech.jurnalwave@gmail.com',
    role: 'Superadmin',
    isSuperadmin: true,
    permissions: ['dashboard', 'berita', 'reels', 'loker', 'polling', 'laporan', 'pengguna'],
    status: 'aktif',
    joinedAt: 'Akun Utama (Google SSO)',
    device: 'Windows',
    browser: 'Chrome',
    location: 'Sukabumi, Jawa Barat',
  },
]

export default function AdminKeamananPage() {
  const confirmDialog = useConfirm()
  const [toast, setToast] = useState<{ message: string | null; type?: 'success' | 'error' | 'info' }>({
    message: null,
    type: 'success',
  })

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberSession[]>([])
  const [revocationVersions, setRevocationVersions] = useState<number>(0)
  const [restoredInfo, setRestoredInfo] = useState<{
    name: string
    email: string
    newPassword: string
  } | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const [deviceInfo, setDeviceInfo] = useState<DeviceSessionInfo>({
    deviceType: 'Windows',
    browserName: 'Chrome',
    location: 'Sukabumi, Jawa Barat',
    deviceCategory: 'desktop',
  })

  // Deteksi otomatis perangkat & peramban yang sedang aktif digunakan
  useEffect(() => {
    if (typeof window === 'undefined') return

    const ua = navigator.userAgent || ''
    let browser = 'Chrome'
    let deviceType = 'Windows'
    let category: 'desktop' | 'mobile' | 'tablet' = 'desktop'

    // 1. Deteksi Browser
    if (/Edg\//i.test(ua)) {
      browser = 'Edge'
    } else if (/OPR\/|Opera/i.test(ua)) {
      browser = 'Opera'
    } else if (/Firefox\//i.test(ua)) {
      browser = 'Firefox'
    } else if (/Chrome\//i.test(ua)) {
      browser = 'Chrome'
    } else if (/Safari/i.test(ua)) {
      browser = 'Safari'
    }

    // 2. Deteksi Perangkat & Sistem Operasi
    if (/Android/i.test(ua)) {
      deviceType = 'Android'
      category = 'mobile'
    } else if (/iPhone/i.test(ua)) {
      deviceType = 'iOS'
      category = 'mobile'
    } else if (/iPad/i.test(ua)) {
      deviceType = 'iPadOS'
      category = 'tablet'
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      deviceType = 'macOS'
      category = 'desktop'
    } else if (/Windows/i.test(ua)) {
      deviceType = 'Windows'
      category = 'desktop'
    } else if (/Linux/i.test(ua)) {
      deviceType = 'Linux'
      category = 'desktop'
    }

    setDeviceInfo({
      deviceType,
      browserName: browser,
      location: 'Sukabumi, Jawa Barat',
      deviceCategory: category,
    })
  }, [])

  // Muat data profil user aktif dan anggota tim redaksi
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedUser = localStorage.getItem('jurnal_wave_admin_user')
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser))
      }

      const savedTeam = localStorage.getItem('jurnal_wave_team_members')
      if (savedTeam) {
        const parsed = JSON.parse(savedTeam)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged: TeamMemberSession[] = parsed.map((m: any, idx: number) => {
            const fallback = DEFAULT_STAFF_SESSIONS.find(
              (f) => f.email?.toLowerCase() === m.email?.toLowerCase()
            ) || DEFAULT_STAFF_SESSIONS[idx % DEFAULT_STAFF_SESSIONS.length]
            return {
              ...m,
              device: m.device || fallback.device || 'Windows',
              browser: m.browser || fallback.browser || 'Chrome',
              location: m.location || fallback.location || 'Sukabumi, Jawa Barat',
            }
          })
          setTeamMembers(merged)
          return
        }
      }

      setTeamMembers(DEFAULT_STAFF_SESSIONS)
      localStorage.setItem('jurnal_wave_team_members', JSON.stringify(DEFAULT_STAFF_SESSIONS))
    } catch {
      setTeamMembers(DEFAULT_STAFF_SESSIONS)
    }
  }, [revocationVersions])

  const isSuperadmin =
    currentUser?.isSuperadmin === true ||
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'Superadmin' ||
    currentUser?.email === 'admin@jurnalwave.com' ||
    currentUser === null

  const isSessionRevoked = (email: string) => {
    if (typeof window === 'undefined') return false
    const key = `admin_revoked_${email.toLowerCase()}`
    return Boolean(localStorage.getItem(key))
  }

  // 1. Logout Sesi di Perangkat Lain untuk Akun Sendiri
  const handleLogoutAllOtherSessions = () => {
    try {
      localStorage.setItem('admin_session_invalidation_timestamp', Date.now().toString())
      setToast({
        message: 'Sesi di perangkat lain berhasil dihentikan.',
        type: 'success',
      })
    } catch {
      setToast({
        message: 'Gagal menghentikan sesi perangkat lain.',
        type: 'error',
      })
    }
  }

  // 2. Tindakan Superadmin: Paksa Logout Anggota
  const handleForceLogoutMember = async (member: TeamMemberSession) => {
    const confirmed = await confirmDialog({
      title: 'Putus Sesi Login?',
      message: `Sesi login aktif milik ${member.name} (${member.email}) akan diputus seketika. Perangkat bersangkutan akan langsung diarahkan ke halaman login.`,
      variant: 'warning',
      confirmText: 'Ya, Paksa Logout',
      cancelText: 'Batal',
    })

    if (!confirmed) return

    try {
      const key = `admin_revoked_${member.email.toLowerCase()}`
      localStorage.setItem(key, Date.now().toString())

      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('admin_user_updated'))

      setToast({
        message: `Sesi login untuk ${member.name} berhasil diputus.`,
        type: 'success',
      })
      setRevocationVersions((prev) => prev + 1)
    } catch {
      setToast({
        message: 'Gagal memutus sesi anggota.',
        type: 'error',
      })
    }
  }

  // 3. Tindakan Superadmin: Bekukan Akun & Putus Akses Total
  const handleFreezeAndRevokeMember = async (member: TeamMemberSession) => {
    const confirmed = await confirmDialog({
      title: 'BEKUKAN AKUN & PUTUS TOTAL?',
      message: `Tindakan darurat pembajakan: Sesi aktif ${member.name} akan diputus seketika, status akun dibekukan (nonaktif), dan kata sandi lama diacak otomatis sehingga pembajak tidak bisa masuk lagi.`,
      variant: 'danger',
      confirmText: 'Ya, Bekukan & Putus Akses',
      cancelText: 'Batal',
    })

    if (!confirmed) return

    try {
      const scrambledPassword = `FROZEN_${Math.random().toString(36).slice(2, 8).toUpperCase()}!${Date.now()}`

      const updated = teamMembers.map((m) => {
        if (m.email.toLowerCase() === member.email.toLowerCase()) {
          return {
            ...m,
            status: 'cuti' as const,
            password: scrambledPassword,
          }
        }
        return m
      })

      setTeamMembers(updated)
      localStorage.setItem('jurnal_wave_team_members', JSON.stringify(updated))

      const key = `admin_revoked_${member.email.toLowerCase()}`
      localStorage.setItem(key, Date.now().toString())

      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('admin_user_updated'))

      setToast({
        message: `Akun ${member.name} berhasil dibekukan! Sesi diputus dan sandi lama diacak otomatis.`,
        type: 'success',
      })
      setRevocationVersions((prev) => prev + 1)
    } catch {
      setToast({
        message: 'Gagal membekukan akun anggota.',
        type: 'error',
      })
    }
  }

  // 4. Tindakan Superadmin: Pulihkan Akun (Buka Blokir & Buat Sandi Baru)
  const handleUnfreezeMember = async (member: TeamMemberSession) => {
    const confirmed = await confirmDialog({
      title: 'Pulihkan Akses Akun?',
      message: `Aktifkan kembali akun ${member.name}? Sistem akan otomatis membuatkan kata sandi sementara baru yang aman.`,
      variant: 'info',
      confirmText: 'Ya, Pulihkan Akun',
      cancelText: 'Batal',
    })

    if (!confirmed) return

    try {
      const rawFirst = member.name.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'Wave'
      const prefix = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase()
      const newPassword = `${prefix}#2026!${Math.random().toString(36).slice(2, 6).toUpperCase()}`

      const updated = teamMembers.map((m) => {
        if (m.email.toLowerCase() === member.email.toLowerCase()) {
          return {
            ...m,
            status: 'aktif' as const,
            password: newPassword,
          }
        }
        return m
      })

      setTeamMembers(updated)
      localStorage.setItem('jurnal_wave_team_members', JSON.stringify(updated))

      const key = `admin_revoked_${member.email.toLowerCase()}`
      localStorage.removeItem(key)

      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('admin_user_updated'))

      setRestoredInfo({
        name: member.name,
        email: member.email,
        newPassword,
      })

      setToast({
        message: `Akun ${member.name} berhasil diaktifkan kembali! Silakan salin kata sandi barunya.`,
        type: 'success',
      })
      setRevocationVersions((prev) => prev + 1)
    } catch {
      setToast({
        message: 'Gagal memulihkan akun anggota.',
        type: 'error',
      })
    }
  }

  const handleCopyRestoredPassword = () => {
    if (!restoredInfo?.newPassword) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(restoredInfo.newPassword)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2500)
    }
  }

  // Filter anggota tim redaksi selain akun sendiri
  const otherTeamMembers = teamMembers.filter(
    (m) => m.email.toLowerCase() !== currentUser?.email?.toLowerCase() && !m.isSuperadmin
  )

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12 font-sans">
      <AdminToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null })}
      />

      {/* 1. Header Ringkas */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
          Keamanan
        </h1>
      </div>

      {/* 2. Kartu Sesi Aktif Anda Sendiri */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
            {deviceInfo.deviceCategory === 'mobile' ? (
              <Smartphone className="w-5 h-5 text-slate-600" />
            ) : deviceInfo.deviceCategory === 'tablet' ? (
              <Tablet className="w-5 h-5 text-slate-600" />
            ) : (
              <Laptop className="w-5 h-5 text-slate-600" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-slate-900 text-sm">
                Sesi Login Saat Ini
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aktif
              </span>
            </div>

            <p className="text-xs text-slate-500">
              {deviceInfo.browserName} pada {deviceInfo.deviceType} • {deviceInfo.location}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogoutAllOtherSessions}
          className="px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-[#c00015] text-xs font-semibold transition cursor-pointer self-start sm:self-auto shadow-2xs shrink-0"
        >
          Logout Perangkat Lain
        </button>
      </div>

      {/* Banner Sandi Baru Hasil Pemulihan Akun */}
      {restoredInfo && (
        <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-900">
                Akun {restoredInfo.name} Berhasil Dipulihkan!
              </span>
            </div>
            <button
              onClick={() => setRestoredInfo(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold underline"
            >
              Tutup
            </button>
          </div>
          <p className="text-[11px] text-emerald-800">
            Akses akun telah kembali aktif. Segera berikan kata sandi baru sementara ini kepada staf resmi:
          </p>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-emerald-200 max-w-md">
            <code className="text-xs font-mono font-bold text-slate-800 flex-1">
              {restoredInfo.newPassword}
            </code>
            <button
              onClick={handleCopyRestoredPassword}
              className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded transition flex items-center gap-1 shrink-0"
            >
              {copiedPassword ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPassword ? 'Tersalin' : 'Salin Sandi'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Sesi Login Tim (Format Simpel Persis Sesi Superadmin) */}
      {isSuperadmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 sm:px-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-slate-900">
              Sesi Login Tim
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Kendali Superadmin
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {otherTeamMembers.map((member) => {
              const revoked = isSessionRevoked(member.email)
              const isFrozen = member.status === 'cuti'
              const isMobile =
                member.device?.toLowerCase().includes('android') ||
                member.device?.toLowerCase().includes('ios') ||
                member.device?.toLowerCase().includes('smartphone')

              return (
                <div
                  key={member.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-50/50 transition"
                >
                  {/* Bagian Kiri: Ikon Perangkat + 2 Baris Simpel */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                      {isMobile ? (
                        <Smartphone className="w-5 h-5 text-slate-600" />
                      ) : (
                        <Laptop className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-bold text-slate-900 text-sm">
                          {member.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({member.role})
                        </span>

                        {isFrozen ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Akses Dibekukan
                          </span>
                        ) : revoked ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Sesi Terputus
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">
                        {member.browser} pada {member.device} • {member.location}
                      </p>
                    </div>
                  </div>

                  {/* Bagian Kanan: Tombol Aksi Simpel */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {isFrozen ? (
                      <button
                        type="button"
                        onClick={() => handleUnfreezeMember(member)}
                        className="px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
                      >
                        Pulihkan Akun
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleForceLogoutMember(member)}
                          className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                        >
                          Paksa Logout
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFreezeAndRevokeMember(member)}
                          className="px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-[#c00015] text-xs font-semibold transition cursor-pointer shadow-2xs"
                        >
                          Bekukan Akun
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Status Proteksi Sistem */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-heading font-bold text-slate-900 pb-2 border-b border-slate-100">
          Status Proteksi Sistem
        </h2>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700 font-medium">Proteksi Anti-Tebak Sandi (Brute-Force)</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
              Aktif (Maksimal 5x Percobaan)
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700 font-medium">Token Autentikasi Redaksi</span>
            <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
              JWT HTTP-Only Terenkripsi
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700 font-medium">Moderasi &amp; Penangguhan Akun Pelapor</span>
            <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
              Tersinkronisasi di Kelola Pengguna
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
