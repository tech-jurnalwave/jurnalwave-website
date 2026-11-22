'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminData } from '@/context/AdminDataContext'
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Globe,
  Newspaper,
  Users,
  ExternalLink,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  X,
  MessageSquare,
  Film,
  Briefcase,
  Vote,
} from 'lucide-react'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [adminUser, setAdminUser] = useState({
    name: 'Super Admin',
    email: 'admin@jurnalwave.com',
    role: 'Superadmin',
  })

  const getInitials = (name: string) => {
    if (!name) return 'JW'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  // Tutup popup profil saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  // Dynamic badge counts dari AdminDataContext terpusat (selalu sinkron 0ms)
  const { counts } = useAdminData()

  // Hak akses menu untuk staf admin (null = Superadmin / Akses Penuh)
  const [allowedPermissions, setAllowedPermissions] = useState<string[] | null>(null)

  const syncUserPermissions = () => {
    if (typeof window === 'undefined') return
    try {
      const savedUser = localStorage.getItem('jurnal_wave_admin_user')
      if (savedUser) {
        const parsed = JSON.parse(savedUser)

        const isSuper =
          parsed.role === 'superadmin' ||
          parsed.email === 'admin@jurnalwave.com' ||
          parsed.isSuperadmin === true

        let resolvedName = parsed.name || 'Super Admin'
        let resolvedEmail = parsed.email || 'admin@jurnalwave.com'
        let resolvedRole = isSuper ? 'Superadmin' : parsed.role || 'Staf Redaksi'

        const teamSaved = localStorage.getItem('jurnal_wave_team_members')
        if (teamSaved) {
          try {
            const team = JSON.parse(teamSaved)
            const found = team.find(
              (m: any) => m.email?.toLowerCase() === resolvedEmail.toLowerCase()
            )
            if (found) {
              if (found.name) resolvedName = found.name
              if (found.role) resolvedRole = found.role
            }
          } catch {}
        }

        // Seragamkan nama akun Superadmin default
        if (isSuper && (resolvedName === 'Redaksi JurnalWave' || resolvedName === 'Super Admin JurnalWave')) {
          resolvedName = 'Super Admin'
        }

        setAdminUser({
          name: resolvedName,
          email: resolvedEmail,
          role: resolvedRole,
        })

        if (isSuper) {
          setAllowedPermissions(null) // Superadmin: full access
          return
        }

        // Cari permissions di team members
        if (teamSaved) {
          const team = JSON.parse(teamSaved)
          const found = team.find(
            (m: any) => m.email?.toLowerCase() === parsed.email?.toLowerCase()
          )
          if (found && Array.isArray(found.permissions)) {
            setAllowedPermissions(found.permissions)
            return
          }
        }

        if (Array.isArray(parsed.permissions)) {
          setAllowedPermissions(parsed.permissions)
          return
        }
      }
      setAllowedPermissions(null)
    } catch {}
  }

  useEffect(() => {
    syncUserPermissions()
    window.addEventListener('storage', syncUserPermissions)
    window.addEventListener('admin_user_updated', syncUserPermissions)
    return () => {
      window.removeEventListener('storage', syncUserPermissions)
      window.removeEventListener('admin_user_updated', syncUserPermissions)
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' })
    } catch {}

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_session_valid')
      localStorage.removeItem('jurnal_wave_admin_authenticated')
      localStorage.removeItem('jurnal_wave_admin_user')
    }

    onClose()
    router.replace('/')
  }

  const navSections = [
    {
      title: 'Utama',
      items: [
        {
          name: 'Dashboard',
          href: '/halo-jurnal/admin',
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: 'Redaksi Media',
      items: [
        {
          name: 'Manajemen Konten',
          href: '/halo-jurnal/admin/berita',
          icon: Newspaper,
          badge: null,
        },
        {
          name: 'Wave Reels',
          href: '/halo-jurnal/admin/reels',
          icon: Film,
          badge: null,
        },
        {
          name: 'Lowongan Kerja',
          href: '/halo-jurnal/admin/loker',
          icon: Briefcase,
          badge: null,
        },
        {
          name: 'Polling Pembaca',
          href: '/halo-jurnal/admin/polling',
          icon: Vote,
          badge: null,
        },
      ],
    },
    {
      title: 'Layanan Warga',
      items: [
        {
          name: 'Pengaduan Warga',
          href: '/halo-jurnal/admin/laporan',
          icon: FileText,
          badge: null,
        },
      ],
    },
    {
      title: 'Sistem',
      items: [
        {
          name: 'Kelola Pengguna',
          href: '/halo-jurnal/admin/pengguna',
          icon: Users,
          badge: null,
        },
        {
          name: 'Keamanan',
          href: '/halo-jurnal/admin/keamanan',
          icon: ShieldCheck,
          badge: null,
        },
      ],
    },
  ]

  const HREF_TO_PERMISSION: Record<string, string> = {
    '/halo-jurnal/admin': 'dashboard',
    '/halo-jurnal/admin/berita': 'berita',
    '/halo-jurnal/admin/reels': 'reels',
    '/halo-jurnal/admin/loker': 'loker',
    '/halo-jurnal/admin/polling': 'polling',
    '/halo-jurnal/admin/laporan': 'laporan',
    '/halo-jurnal/admin/pengguna': 'pengguna',
    '/halo-jurnal/admin/keamanan': 'pengguna',
  }

  // Filter menu sidebar berdasarkan hak akses akun yang login
  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!allowedPermissions) return true // Superadmin / Akses Penuh
        const permKey = HREF_TO_PERMISSION[item.href]
        return permKey ? allowedPermissions.includes(permKey) : true
      }),
    }))
    .filter((section) => section.items.length > 0)

  const isActive = (href: string) => {
    if (href === '/halo-jurnal/admin') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Logo Bersih */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
          <Link href="/halo-jurnal/admin" className="flex items-center gap-2.5">
            <img
              src="/halo-jurnal-icon.webp?v=original"
              alt="JurnalCentral"
              className="w-8 h-8 object-contain shrink-0"
            />
            <span className="font-heading font-extrabold text-base tracking-tight text-slate-900">
              Jurnal<span className="text-[#c00015]">Central</span>
            </span>
          </Link>

          {/* Tombol Tutup Mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-800 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigasi Ramping */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {visibleNavSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose()
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-red-50 text-[#c00015] font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#c00015]' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge ? (
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-semibold rounded-md ${(item as any).badgeColor || 'bg-slate-100 text-slate-600'}`}
                        >
                          {item.badge}
                        </span>
                      ) : active ? (
                        <ChevronRight className="w-3.5 h-3.5 text-[#c00015]" />
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Sidebar (Profil Ringkas & Popup Menu Pindah Situs / Keluar) */}
        <div ref={userMenuRef} className="p-3 border-t border-slate-200 bg-slate-50/50 relative">
          {/* Popup Menu Melayang di Atas Profil */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-1.5">
              {/* Info Pengguna */}
              <div className="px-2.5 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">{adminUser.name}</p>
                <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{adminUser.role}</p>
              </div>

              {/* Seksi Pindah Situs */}
              <div className="space-y-0.5">
                <span className="px-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider block py-1">
                  Pindah Situs
                </span>
                <Link
                  href="/"
                  target="_blank"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center justify-between px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition group"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#c00015]" />
                    <span>Portal JurnalWave</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/halo-jurnal"
                  target="_blank"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center justify-between px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition group"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#c00015]" />
                    <span>Portal Hallo Jurnal</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
              </div>

              {/* Seksi Keluar / Logout */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition font-semibold cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>{isLoggingOut ? 'Mengeluarkan sesi...' : 'Keluar dari Akun'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tombol Profil di Dasar Sidebar */}
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full flex items-center justify-between p-2 rounded-xl transition border text-left cursor-pointer ${
              userMenuOpen
                ? 'bg-white border-[#c00015]/40 shadow-xs ring-2 ring-[#c00015]/10'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-red-50 text-[#c00015] flex items-center justify-center font-bold text-xs shrink-0 border border-red-100 shadow-2xs">
                {getInitials(adminUser.name)}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-bold text-slate-800 truncate">{adminUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{adminUser.role}</p>
              </div>
            </div>

            <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>
        </div>
      </aside>
    </>
  )
}
