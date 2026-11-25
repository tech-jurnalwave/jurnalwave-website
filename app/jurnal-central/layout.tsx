'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import FloatingAdminChat from '@/components/admin/FloatingAdminChat'
import { AdminDataProvider } from '@/context/AdminDataContext'
import { ConfirmDialogProvider } from '@/components/admin/AdminConfirmDialog'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Status autentikasi konsisten null pada initial render untuk mencegah hydration mismatch
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const isLoginPage = false

  useEffect(() => {
    // Jika sedang di halaman login, tidak perlu cek autentikasi di layout
    if (isLoginPage) {
      setIsAuthenticated(true)
      return
    }

    // Baca cache sesi klien segera setelah hidrasi selesai agar transisi instan
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('admin_session_valid') === 'true') {
        setIsAuthenticated(true)
      }
    } catch {}

    let isMounted = true

    const verifyAdmin = async () => {
      try {
        // Verifikasi status sesi resmi server via HTTP-Only Cookie
        const res = await fetch('/api/admin/auth', {
          method: 'GET',
          cache: 'no-store',
        })
        const data = await res.json()

        if (!isMounted) return

        if (data.authenticated) {
          setIsAuthenticated(true)
          try {
            sessionStorage.setItem('admin_session_valid', 'true')
          } catch {}
        } else {
          setIsAuthenticated(false)
          try {
            sessionStorage.removeItem('admin_session_valid')
          } catch {}
          router.replace('/')
        }
      } catch {
        if (!isMounted) return
        setIsAuthenticated(false)
        try {
          sessionStorage.removeItem('admin_session_valid')
        } catch {}
        router.replace('/')
      }
    }

    verifyAdmin()

    return () => {
      isMounted = false
    }
  }, [pathname, isLoginPage, router])

  // Pemantauan real-time pemutusan sesi & pembekuan akun darurat dari Superadmin
  useEffect(() => {
    if (isLoginPage) return

    const checkRevocation = async () => {
      try {
        if (typeof window === 'undefined') return
        const savedUser = localStorage.getItem('jurnal_wave_admin_user')
        if (!savedUser) return
        const user = JSON.parse(savedUser)
        const email = user.email?.toLowerCase()
        if (!email) return

        // Superadmin master tidak terpengaruh oleh revokasi sesi staf
        if (email === 'admin@jurnalwave.com' && (user.isSuperadmin || user.role === 'superadmin')) {
          return
        }

        const revokedAt = localStorage.getItem(`admin_revoked_${email}`)
        const loginTime = user.loginTime || 0
        const isSessionRevoked = Boolean(revokedAt && Number(revokedAt) > Number(loginTime))

        let isAccountFrozen = false
        const teamSaved = localStorage.getItem('jurnal_wave_team_members')
        if (teamSaved) {
          try {
            const team = JSON.parse(teamSaved)
            const found = team.find((m: any) => m.email?.toLowerCase() === email)
            if (found && found.status === 'cuti') {
              isAccountFrozen = true
            }
          } catch {}
        }

        if (isSessionRevoked || isAccountFrozen) {
          try {
            await fetch('/api/admin/auth', { method: 'DELETE' })
          } catch {}
          sessionStorage.removeItem('admin_session_valid')
          localStorage.removeItem('jurnal_wave_admin_user')
          setIsAuthenticated(false)
          router.replace(
            `/jw-gate-781?reason=${isAccountFrozen ? 'frozen' : 'revoked'}`
          )
        }
      } catch {}
    }

    const interval = setInterval(checkRevocation, 3000)
    window.addEventListener('storage', checkRevocation)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', checkRevocation)
    }
  }, [isLoginPage, router])

  // Jika di halaman login, tampilkan halaman login utuh
  if (isLoginPage) {
    return <>{children}</>
  }

  // Tampilan transisi saat verifikasi keamanan berlangsung
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#fbf9f9] flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#c00015]" />
      </div>
    )
  }

  // Layout Dashboard Admin Utama jika sudah terautentikasi
  return (
    <AdminDataProvider>
      <ConfirmDialogProvider>
        <div className="min-h-screen bg-[#fbf9f9] text-[#1b1c1c] flex font-sans antialiased selection:bg-[#c00015] selection:text-white">
          {/* Sidebar Navigasi Kiri */}
          <AdminSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Konten Utama Kanan */}
          <div className="flex-1 flex flex-col lg:pl-64 min-w-0 transition-all duration-200">
            {/* Topbar Header */}
            <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            {/* Konten Halaman */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {children}
            </main>
          </div>

          {/* Widget Chat Warga Mengambang (Floating Action Bubble) */}
          <FloatingAdminChat />
        </div>
      </ConfirmDialogProvider>
    </AdminDataProvider>
  )
}
