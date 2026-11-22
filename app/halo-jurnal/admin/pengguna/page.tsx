'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import CitizenDirectoryTab from '@/components/admin/CitizenDirectoryTab'
import AdminToast from '@/components/admin/AdminToast'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Pencil,
  Trash2,
  X,
  Crown,
  LayoutDashboard,
  Newspaper,
  Film,
  Briefcase,
  Vote,
  FileText,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  CheckCheck,
  KeyRound,
} from 'lucide-react'

type AdminMenuKey =
  | 'dashboard'
  | 'berita'
  | 'reels'
  | 'loker'
  | 'polling'
  | 'laporan'
  | 'pengguna'

interface AdminMenuPermission {
  key: AdminMenuKey
  label: string
  href: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const AVAILABLE_PERMISSIONS: AdminMenuPermission[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/halo-jurnal/admin',
    description: 'Statistik & performa portal',
    icon: LayoutDashboard,
  },
  {
    key: 'berita',
    label: 'Manajemen Konten',
    href: '/halo-jurnal/admin/berita',
    description: 'Tulis & kelola berita redaksi',
    icon: Newspaper,
  },
  {
    key: 'reels',
    label: 'Wave Reels',
    href: '/halo-jurnal/admin/reels',
    description: 'Kelola feed video reels',
    icon: Film,
  },
  {
    key: 'loker',
    label: 'Lowongan Kerja',
    href: '/halo-jurnal/admin/loker',
    description: 'Kelola loker Sukabumi',
    icon: Briefcase,
  },
  {
    key: 'polling',
    label: 'Polling Pembaca',
    href: '/halo-jurnal/admin/polling',
    description: 'Buat & publikasi polling suara',
    icon: Vote,
  },
  {
    key: 'laporan',
    label: 'Pengaduan Warga',
    href: '/halo-jurnal/admin/laporan',
    description: 'Moderasi aduan & chat pelapor',
    icon: FileText,
  },
  {
    key: 'pengguna',
    label: 'Kelola Pengguna',
    href: '/halo-jurnal/admin/pengguna',
    description: 'Hak akses staf & akun warga',
    icon: Users,
  },
]

interface TeamMember {
  id: string
  name: string
  email: string
  role: string // custom string yang bisa diketik manual
  password?: string
  isSuperadmin?: boolean
  permissions: AdminMenuKey[]
  status: 'aktif' | 'cuti'
  joinedAt: string
}

const DEFAULT_TEAM: TeamMember[] = [
  {
    id: 'team-superadmin',
    name: 'Super Admin',
    email: 'tech.jurnalwave@gmail.com',
    role: 'Superadmin',
    isSuperadmin: true,
    permissions: ['dashboard', 'berita', 'reels', 'loker', 'polling', 'laporan', 'pengguna'],
    status: 'aktif',
    joinedAt: 'Akun Utama (Google SSO)',
  },
]

export default function AdminTimRedaksiPage() {
  const confirmDialog = useConfirm()
  const [activeTab, setActiveTab] = useState<'redaksi' | 'warga'>('redaksi')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [citizenCount, setCitizenCount] = useState<number>(5)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false)
  const [isPasswordManuallyEdited, setIsPasswordManuallyEdited] = useState(false)
  const [formPermissions, setFormPermissions] = useState<AdminMenuKey[]>([])

  // Generator Email Otomatis (Format: nama.belakang@jurnalwave.com)
  const generateEmailFromName = (fullName: string) => {
    const parts = fullName
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((part) => part.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean)

    if (parts.length === 0) return ''
    if (parts.length === 1) return `${parts[0]}@jurnalwave.com`
    return `${parts[0]}.${parts.slice(1).join('.')}@jurnalwave.com`
  }

  // Handler saat nama diubah
  const handleNameChange = (newName: string) => {
    setFormName(newName)

    // Jika mode tambah dan email belum diedit manual, update email secara otomatis
    if (!editingMemberId && !isEmailManuallyEdited) {
      setFormEmail(generateEmailFromName(newName))
    }

    // Jika mode tambah dan sandi belum diedit manual, sesuaikan sandi dengan nama baru
    if (!editingMemberId && !isPasswordManuallyEdited) {
      setFormPassword(generateRandomPassword(newName))
    }
  }

  const handleEmailChange = (newEmail: string) => {
    setFormEmail(newEmail)
    setIsEmailManuallyEdited(true)
  }

  // Generator Kata Sandi Acak Super Aman (Berbasis Nama / Prefix + 4 Digit + Karakter Unik)
  const generateRandomPassword = (customName?: string) => {
    const rawName = (customName !== undefined ? customName : formName).trim()
    const firstName = rawName.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '')
    const prefix = firstName
      ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      : 'Wave'

    const specialPool = ['@', '#', '!', '$', '%', '&']
    const sym1 = specialPool[Math.floor(Math.random() * specialPool.length)]
    const sym2 = specialPool[Math.floor(Math.random() * specialPool.length)]
    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
    const salt1 = letters[Math.floor(Math.random() * letters.length)]
    const salt2 = letters[Math.floor(Math.random() * letters.length)]

    return `${prefix}${sym1}${randomDigits}${sym2}${salt1}${salt2}`
  }

  const handleCopyPassword = () => {
    if (!formPassword) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formPassword)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2500)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('tab') === 'warga') {
        setActiveTab('warga')
      }

      // Ambil jumlah akun warga
      try {
        const cached = localStorage.getItem('halo_jurnal_all_citizens')
        if (cached) {
          const list = JSON.parse(cached)
          if (Array.isArray(list) && list.length > 0) {
            setCitizenCount(list.length)
          }
        }
      } catch {}

      fetch('/api/admin/citizens', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setCitizenCount(json.data.length)
          }
        })
        .catch(() => {})
    }
  }, [])

  // Muat data dari localStorage dan database Neon DB
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_team_members')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMembers(parsed)
          }
        }
      } catch (err) {
        console.error('Error loading team members from storage:', err)
      }
    }

    // Ambil data terbaru langsung dari database server & auto-sync data lokal
    fetch('/api/admin/team', { cache: 'no-store' })
      .then((res) => res.json())
      .then(async (json) => {
        if (json.success && Array.isArray(json.data)) {
          const dbMembers = [...json.data]

          // Cek jika ada anggota di localStorage yang belum masuk ke database server
          if (typeof window !== 'undefined') {
            try {
              const saved = localStorage.getItem('jurnal_wave_team_members')
              if (saved) {
                const localMembers = JSON.parse(saved)
                if (Array.isArray(localMembers)) {
                  for (const localM of localMembers) {
                    if (
                      localM.email &&
                      !localM.isSuperadmin &&
                      localM.email.toLowerCase() !== 'tech.jurnalwave@gmail.com' &&
                      !dbMembers.some((dm: any) => dm.email?.toLowerCase() === localM.email.toLowerCase())
                    ) {
                      // Otomatis simpan akun lokal yang ada ke Neon DB server
                      await fetch('/api/admin/team', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(localM),
                      }).catch(() => {})
                      dbMembers.push(localM)
                    }
                  }
                }
              }
            } catch {}
          }

          setMembers(dbMembers)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('jurnal_wave_team_members', JSON.stringify(dbMembers))
            } catch {}
          }
        }
      })
      .catch((err) => console.warn('Notice loading team from DB:', err))
  }, [])

  const persistMembers = (updated: TeamMember[]) => {
    setMembers(updated)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jurnal_wave_team_members', JSON.stringify(updated))

        // Sinkronisasi data sesi admin yang sedang login
        const currentRaw = localStorage.getItem('jurnal_wave_admin_user')
        if (currentRaw) {
          const current = JSON.parse(currentRaw)
          const matched = updated.find(
            (m) => m.email.toLowerCase() === current.email?.toLowerCase()
          )
          if (matched) {
            localStorage.setItem(
              'jurnal_wave_admin_user',
              JSON.stringify({
                ...current,
                name: matched.name,
                role: matched.role,
                isSuperadmin: matched.isSuperadmin,
                permissions: matched.permissions,
              })
            )
          }
        }

        window.dispatchEvent(new Event('storage'))
        window.dispatchEvent(new CustomEvent('admin_user_updated'))
      } catch (err) {
        console.error('Error saving team members:', err)
      }
    }
  }

  // Buka Modal Tambah
  const handleOpenCreateModal = () => {
    setEditingMemberId(null)
    setFormName('')
    setFormEmail('')
    setFormRole('')
    setIsEmailManuallyEdited(false)
    setIsPasswordManuallyEdited(false)
    const initialPwd = generateRandomPassword('')
    setFormPassword(initialPwd)
    setShowPassword(true)
    setIsCopied(false)
    setFormPermissions(['dashboard', 'berita'])
    setIsModalOpen(true)
  }

  // Buka Modal Edit
  const handleOpenEditModal = (member: TeamMember) => {
    setEditingMemberId(member.id)
    setFormName(member.name)
    setFormEmail(member.email)
    setFormRole(member.role)
    setIsEmailManuallyEdited(true)
    setIsPasswordManuallyEdited(true)
    setFormPassword(member.password || '')
    setShowPassword(false)
    setIsCopied(false)
    setFormPermissions(member.permissions || [])
    setIsModalOpen(true)
  }

  // Toggle Single Permission Checkbox
  const handleTogglePermission = (key: AdminMenuKey) => {
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  // Pilih Semua Permission
  const handleSelectAllPermissions = () => {
    setFormPermissions(AVAILABLE_PERMISSIONS.map((p) => p.key))
  }

  // Kosongkan Permission (Minimal sisakan dashboard)
  const handleClearPermissions = () => {
    setFormPermissions(['dashboard'])
  }

  // Simpan Anggota (Tambah atau Update)
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim() || !formRole.trim()) return

    if (editingMemberId) {
      // Mode Edit
      let targetMember: TeamMember | null = null
      const updated = members.map((m) => {
        if (m.id === editingMemberId) {
          targetMember = {
            ...m,
            name: formName.trim(),
            email: formEmail.trim().toLowerCase(),
            role: formRole.trim(),
            password: formPassword.trim() || m.password || generateRandomPassword(formName.trim()),
            permissions: m.isSuperadmin
              ? (AVAILABLE_PERMISSIONS.map((p) => p.key) as AdminMenuKey[])
              : formPermissions.length > 0
              ? formPermissions
              : (['dashboard'] as AdminMenuKey[]),
          }
          return targetMember
        }
        return m
      })

      persistMembers(updated)
      if (targetMember) {
        fetch('/api/admin/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetMember),
        }).catch((err) => console.error('Error updating team member on server:', err))
      }

      setIsModalOpen(false)
      setToastMessage(`Pengaturan akun untuk "${formName.trim()}" berhasil disimpan di database server!`)
      setTimeout(() => setToastMessage(null), 3500)
    } else {
      // Mode Tambah Baru
      const newMember: TeamMember = {
        id: `usr-${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole.trim(),
        password: formPassword.trim() || generateRandomPassword(formName.trim()),
        isSuperadmin: false,
        permissions: formPermissions.length > 0 ? formPermissions : (['dashboard'] as AdminMenuKey[]),
        status: 'aktif',
        joinedAt: 'Baru saja',
      }

      const updated = [...members, newMember]
      persistMembers(updated)

      fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      }).catch((err) => console.error('Error saving new team member to server:', err))

      setIsModalOpen(false)
      setToastMessage(`Akun admin "${newMember.name}" berhasil ditambahkan ke database server!`)
      setTimeout(() => setToastMessage(null), 3500)
    }
  }

  // Toggle Status Cuti / Aktif
  const handleToggleStatus = (id: string) => {
    const target = members.find((m) => m.id === id)
    if (target?.isSuperadmin) {
      setToastMessage('Akun Superadmin tidak dapat dinonaktifkan.')
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    const newStatus = target?.status === 'aktif' ? ('cuti' as const) : ('aktif' as const)
    const updated = members.map((m) =>
      m.id === id
        ? { ...m, status: newStatus }
        : m
    )
    persistMembers(updated)

    if (target) {
      fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, status: newStatus }),
      }).catch((err) => console.error('Error updating status on server:', err))
    }

    setToastMessage('Status operasional akun diperbarui di database.')
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Hapus Anggota
  const handleDeleteMember = async (id: string, name: string) => {
    const target = members.find((m) => m.id === id)
    if (target?.isSuperadmin) {
      setToastMessage('Akun Superadmin diproteksi dan tidak dapat dihapus.')
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    const isConfirmed = await confirmDialog({
      title: 'Hapus Anggota Admin?',
      message: `Yakin ingin menghapus akun "${name}" secara permanen? Akses login dan kewenangan akun ini akan dicabut dari server.`,
      confirmText: 'Hapus Akun',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (isConfirmed) {
      const updated = members.filter((m) => m.id !== id)
      persistMembers(updated)

      fetch(`/api/admin/team?id=${encodeURIComponent(id)}&email=${encodeURIComponent(target?.email || '')}`, {
        method: 'DELETE',
      }).catch((err) => console.error('Error deleting team member from server:', err))

      setToastMessage(`Akun admin "${name}" berhasil dihapus dari database server.`)
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  // Filter Search
  const filteredMembers = members.filter((m) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = m.name.toLowerCase().includes(q)
      const matchEmail = m.email.toLowerCase().includes(q)
      const matchRole = m.role.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchRole) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* 1. Header Halaman */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-heading font-bold text-slate-900 tracking-tight">
          Kelola Pengguna Sistem
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pusat kendali akun tim redaksi, hak akses menu, dan daftar nomor kontak warga pelapor Hallo Jurnal.
        </p>
      </div>

      {/* Tab Switcher: Akun Tim Admin vs Akun Warga */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('redaksi')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'redaksi'
              ? 'bg-[#c00015] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Akun Tim Admin</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === 'redaksi'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {members.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('warga')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'warga'
              ? 'bg-[#c00015] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Akun Warga</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === 'warga'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {citizenCount}
          </span>
        </button>
      </div>

      {activeTab === 'warga' ? (
        <CitizenDirectoryTab onCountChange={setCitizenCount} />
      ) : (
        <>
          {/* Toast Alert */}
          <AdminToast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />

          {/* Banner Pintu Masuk Login Staf Resmi */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 sm:p-4 rounded-xl border border-slate-700 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="font-heading font-bold text-xs sm:text-sm text-white">
                  Tautan Login Staf Redaksi (Portal Rahasia)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Kirimkan tautan login resmi ini beserta email dan kata sandi yang telah Anda buat kepada staf.
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <code className="text-[11px] font-mono font-semibold bg-black/50 text-amber-300 px-2.5 py-0.5 rounded border border-white/10">
                  {typeof window !== 'undefined' ? `${window.location.origin}/jw-gate-781` : '/jw-gate-781'}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/jw-gate-781` : '/jw-gate-781'
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(url)
                  setToastMessage('✓ Tautan login staf (/jw-gate-781) berhasil disalin ke clipboard!')
                  setTimeout(() => setToastMessage(null), 3500)
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Salin Tautan Login Staf</span>
            </button>
          </div>

          {/* Toolbar: Search & Tombol Tambah Anggota */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama anggota, email, atau jabatan..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] focus:ring-1 focus:ring-[#c00015] transition"
              />
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-semibold transition shadow-2xs cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Anggota Admin</span>
            </button>
          </div>

          {/* Tabel Tim Admin */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Staf &amp; Email</th>
                    <th className="py-3 px-4">Jabatan / Role</th>
                    <th className="py-3 px-4">Hak Akses Menu</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => {
                    const isAllAllowed =
                      member.isSuperadmin ||
                      member.permissions?.length === AVAILABLE_PERMISSIONS.length

                    return (
                      <tr
                        key={member.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          member.status !== 'aktif' ? 'bg-slate-50/60 opacity-60' : ''
                        }`}
                      >
                        {/* Nama & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {member.isSuperadmin ? (
                              <div
                                className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center shrink-0"
                                title="Akun Superadmin Utama"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate text-xs">
                                {member.name}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px] block truncate">
                                {member.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Jabatan / Peran (Teks Manual) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {member.isSuperadmin ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                              <span>Superadmin</span>
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-800">
                              {member.role}
                            </span>
                          )}
                        </td>

                        {/* Hak Akses Menu */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isAllAllowed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
                              <span>Akses Penuh</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                              title={
                                member.permissions && member.permissions.length > 0
                                  ? member.permissions
                                      .map((pKey) => AVAILABLE_PERMISSIONS.find((p) => p.key === pKey)?.label || pKey)
                                      .join(', ')
                                  : 'Hanya Dashboard'
                              }
                            >
                              {member.permissions && member.permissions.length > 0
                                ? `${member.permissions.length} Menu Diizinkan`
                                : '1 Menu Diizinkan'}
                            </span>
                          )}
                        </td>

                        {/* Status (Toggle Merah) */}
                        <td className="py-3.5 px-4">
                          {member.isSuperadmin ? (
                            <span className="text-xs font-semibold text-emerald-700">
                              Selalu Aktif
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(member.id)}
                                className="relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none"
                                style={{
                                  backgroundColor: member.status === 'aktif' ? '#c00015' : '#cbd5e1',
                                }}
                                title={
                                  member.status === 'aktif'
                                    ? 'Status: Aktif (klik untuk set cuti)'
                                    : 'Status: Cuti (klik untuk aktifkan)'
                                }
                              >
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200"
                                  style={{
                                    transform:
                                      member.status === 'aktif'
                                        ? 'translateX(11px)'
                                        : 'translateX(1px)',
                                  }}
                                />
                              </button>
                              <span
                                className={`text-xs font-semibold ${
                                  member.status === 'aktif' ? 'text-slate-800' : 'text-slate-400'
                                }`}
                              >
                                {member.status === 'aktif' ? 'Aktif' : 'Cuti'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Tombol Edit Hak Akses & Peran */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(member)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit Hak Akses & Peran"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Hapus (Disabled untuk Superadmin) */}
                            {!member.isSuperadmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id, member.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Hapus Anggota Admin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Tambah / Edit Anggota Tim & Hak Akses */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
                {/* Modal Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-slate-900">
                    {editingMemberId ? 'Edit Anggota Admin' : 'Tambah Anggota Admin'}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSaveMember} className="p-5 space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Nama staf"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#c00015]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="nama.staf@jurnalwave.com"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#c00015]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Jabatan / Role
                    </label>
                    <input
                      type="text"
                      required
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      placeholder="Contoh: Editor Berita"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#c00015]"
                    />
                  </div>

                  {/* Kata Sandi Akun dengan Generator Otomatis */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">
                        {editingMemberId ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Akun'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newPwd = generateRandomPassword()
                          setFormPassword(newPwd)
                          setIsPasswordManuallyEdited(false)
                          setShowPassword(true)
                          setIsCopied(false)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c00015] hover:text-[#900010] cursor-pointer"
                        title="Klik berulang kali untuk menghasilkan kombinasi sandi acak baru"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Acak Sandi Aman</span>
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formPassword}
                        onChange={(e) => {
                          setFormPassword(e.target.value)
                          setIsPasswordManuallyEdited(true)
                        }}
                        placeholder={
                          editingMemberId
                            ? 'Kosongkan jika tidak ingin mengubah sandi'
                            : 'Ketik sandi atau klik tombol Acak Sandi'
                        }
                        className="w-full pl-3 pr-20 py-2 text-xs font-mono rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#c00015]"
                        required={!editingMemberId}
                      />
                      <div className="absolute right-1.5 flex items-center gap-1">
                        {formPassword && (
                          <button
                            type="button"
                            onClick={handleCopyPassword}
                            className={`p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer ${
                              isCopied ? 'text-emerald-600 hover:text-emerald-700' : ''
                            }`}
                            title={isCopied ? 'Tersalin ke clipboard!' : 'Salin sandi ke clipboard'}
                          >
                            {isCopied ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                          title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isCopied && (
                      <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                        ✓ Kata sandi berhasil disalin! Berikan kata sandi ini dan tautan login (/jw-gate-781) kepada staf.
                      </span>
                    )}
                  </div>

                  {/* Hak Akses Menu */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-700">
                        Hak Akses Menu
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={handleSelectAllPermissions}
                          className="text-[#c00015] font-semibold hover:underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={handleClearPermissions}
                          className="text-slate-400 hover:text-slate-700 hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const isChecked = formPermissions.includes(perm.key)
                        return (
                          <label
                            key={perm.key}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition select-none ${
                              isChecked ? 'text-slate-900 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.key)}
                              className="rounded text-[#c00015] focus:ring-[#c00015] cursor-pointer"
                            />
                            <span className="truncate text-xs">{perm.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tombol Simpan */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white font-semibold transition shadow-xs cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
