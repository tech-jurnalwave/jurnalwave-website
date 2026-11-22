'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Users,
} from 'lucide-react'

export default function RedaksiStaffLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [lockCountdown, setLockCountdown] = useState<number>(0)

  // Countdown timer jika terkena rate limit
  useEffect(() => {
    if (lockCountdown <= 0) return
    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lockCountdown])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Mohon isi alamat email dan kata sandi Anda.')
      return
    }

    // Jika Superadmin mencoba login via form staf
    if (email.trim().toLowerCase() === 'tech.jurnalwave@gmail.com') {
      setErrorMsg('Akun Superadmin wajib masuk melalui Portal Superadmin khusus menggunakan Akun Google.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      // Ambil daftar anggota tim lokal dari localStorage jika ada
      let teamMembers: any[] = []
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('jurnal_wave_team_members')
          if (raw) teamMembers = JSON.parse(raw)
        } catch {}
      }

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, teamMembers }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Login berhasil! Mengalihkan ke meja kerja redaksi...')
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('admin_session_valid', 'true')
          localStorage.setItem(
            'jurnal_wave_admin_user',
            JSON.stringify({
              ...(json.user || { name: 'Staf Redaksi', email }),
              loginTime: Date.now(),
            })
          )
        }
        setTimeout(() => {
          router.push('/halo-jurnal/admin')
          router.refresh()
        }, 500)
      } else {
        if (json.locked && json.remainingSec) {
          setLockCountdown(json.remainingSec)
        }
        setErrorMsg(json.message || 'Email atau kata sandi staf tidak cocok.')
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server autentikasi: ' + (err?.message || 'Koneksi bermasalah'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 font-sans antialiased selection:bg-[#c00015] selection:text-white">
      {/* Header Kecil */}
      <div className="w-full max-w-md flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
        <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
          Portal Staf Redaksi
        </span>
      </div>

      {/* Card Utama */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm my-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#c00015]/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-[#c00015]" />
          </div>
          <h1 className="font-heading font-extrabold text-xl text-slate-900 tracking-tight">
            Masuk Staf Redaksi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khusus wartawan, reporter, &amp; redaktur pelaksana JurnalWave
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Resmi Staf
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama.staf@jurnalwave.com"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] focus:ring-1 focus:ring-[#c00015] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi staf"
                className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] focus:ring-1 focus:ring-[#c00015] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || lockCountdown > 0}
            className="w-full py-2.5 px-4 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs sm:text-sm font-semibold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi Staf...</span>
              </span>
            ) : lockCountdown > 0 ? (
              <span>Terkunci Sementara ({lockCountdown}s)</span>
            ) : (
              <>
                <span>Masuk Meja Redaksi</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-500">
            Pemilik / Superadmin?{' '}
            <Link href="/superadmin-auth" className="text-[#c00015] font-semibold hover:underline">
              Masuk Portal Superadmin
            </Link>
          </span>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        © 2026 JurnalWave — Akses Khusus Tim Redaksi Terdaftar.
      </footer>
    </div>
  )
}
