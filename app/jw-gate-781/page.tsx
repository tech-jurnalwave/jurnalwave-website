'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
} from 'lucide-react'

export default function AdminStaffSecretLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [lockCountdown, setLockCountdown] = useState<number>(0)

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

    if (email.trim().toLowerCase() === 'tech.jurnalwave@gmail.com') {
      setErrorMsg('Email atau kata sandi tidak cocok.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
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
        setSuccessMsg(json.message || 'Login berhasil! Mengalihkan ke meja redaksi...')
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('admin_session_valid', 'true')
          localStorage.setItem(
            'jurnal_wave_admin_user',
            JSON.stringify({
              ...(json.user || { name: 'Admin', email }),
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
        setErrorMsg(json.message || 'Email atau kata sandi tidak cocok.')
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server: ' + (err?.message || 'Koneksi bermasalah'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 selection:bg-[#c00015] selection:text-white">
      <div className="w-full max-w-sm flex flex-col items-center justify-center">
        {/* Logo JurnalWave */}
        <div className="flex justify-center mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-jurnal-wave.webp?v=2"
            alt="JurnalWave"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>

        {/* Teks Minimalis Sesuai Referensi */}
        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-7 text-center">
          Portal Akses Khusus Admin JurnalWave.
        </p>

        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2 animate-in fade-in">
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-3.5">
          <div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] focus:ring-1 focus:ring-[#c00015] transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] focus:ring-1 focus:ring-[#c00015] transition shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || lockCountdown > 0}
            className="w-full py-3 px-4 rounded-xl bg-[#c00015] hover:bg-[#a00012] text-white text-xs sm:text-sm font-semibold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </span>
            ) : lockCountdown > 0 ? (
              <span>Terkunci ({lockCountdown}s)</span>
            ) : (
              <span>Masuk Meja Redaksi</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
