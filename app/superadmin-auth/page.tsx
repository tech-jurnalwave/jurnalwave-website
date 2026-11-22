'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { ShieldAlert, ShieldCheck, Loader2, ArrowLeft, Lock } from 'lucide-react'

declare global {
  interface Window {
    google?: any
  }
}

export default function SuperadminAuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '573053429535-1fcs78pqomcj441j1c7898dhhttdqs28.apps.googleusercontent.com'

  // Handler respon dari Google Identity Services
  const handleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      setErrorMsg('Gagal menerima token kredensial dari Google.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/admin/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Login Superadmin berhasil!')
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('admin_session_valid', 'true')
          localStorage.setItem(
            'jurnal_wave_admin_user',
            JSON.stringify({
              ...(data.user || { name: 'Super Admin', email: 'tech.jurnalwave@gmail.com' }),
              loginTime: Date.now(),
            })
          )
        }
        setTimeout(() => {
          router.push('/halo-jurnal/admin')
          router.refresh()
        }, 600)
      } else {
        setErrorMsg(data.message || 'Akses ditolak: Akun Google ini tidak memiliki izin Superadmin.')
      }
    } catch (err: any) {
      setErrorMsg('Kendala koneksi ke server autentikasi: ' + (err?.message || 'Coba lagi beberapa saat lagi'))
    } finally {
      setLoading(false)
    }
  }

  // Inisialisasi tombol Google Sign-In saat library Google termuat
  useEffect(() => {
    if (scriptLoaded && window.google && googleClientId && googleBtnRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 320,
        })
      } catch (e) {
        console.warn('Google GSI render notice:', e)
      }
    }
  }, [scriptLoaded, googleClientId])

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="min-h-screen bg-[#0f1115] text-[#e3e2e6] flex flex-col justify-between items-center p-4 sm:p-6 font-sans antialiased selection:bg-[#c00015] selection:text-white relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c00015]/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header */}
        <div className="w-full max-w-md flex items-center justify-between py-2 z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Portal</span>
          </Link>
          <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
            Master Secure Access
          </span>
        </div>

        {/* Card Container */}
        <div className="w-full max-w-md bg-[#16181d] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 my-auto">
          {/* Logo & Judul */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#c00015]/10 border border-[#c00015]/30 flex items-center justify-center shadow-inner">
              <Lock className="w-7 h-7 text-[#c00015]" />
            </div>

            <h1 className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              Portal Superadmin
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Jalur kendali utama sistem &amp; redaksi <strong>JurnalWave</strong>
            </p>
          </div>

          {/* Alert Error */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Alert Sukses */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Kontainer Tombol Google Sign In */}
          <div className="space-y-4 pt-2">
            <div className="bg-[#1f222a] border border-slate-700/60 rounded-xl p-4 text-center">
              <div className="text-[11px] text-slate-400 mb-3 font-medium">
                Otoritas Tunggal Master Redaksi:
                <div className="font-mono text-emerald-400 text-xs mt-0.5">
                  tech.jurnalwave@gmail.com
                </div>
              </div>

              {googleClientId ? (
                <div className="flex flex-col items-center justify-center min-h-[50px]">
                  {loading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-300 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#c00015]" />
                      <span>Memverifikasi Otoritas Google...</span>
                    </div>
                  ) : (
                    <div ref={googleBtnRef} className="w-full flex justify-center" />
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-left">
                  <div className="text-xs font-semibold text-amber-300 mb-1">
                    Google Client ID Belum Terpasang
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Masukkan <code className="bg-black/40 px-1 py-0.5 rounded text-amber-400">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> ke file <code className="bg-black/40 px-1 py-0.5 rounded text-amber-400">.env</code> agar tombol Google Sign In dapat tampil secara otomatis.
                  </p>
                </div>
              )}
            </div>

            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-500">
                Staf redaksi biasa?{' '}
                <Link href="/redaksi/login" className="text-slate-400 hover:text-white underline">
                  Masuk via Portal Staf
                </Link>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-md text-center py-4 z-10">
          <p className="text-[11px] text-slate-500">
            © 2026 JurnalWave — Dedicated Master Control. Seluruh akses tercatat dan diawasi.
          </p>
        </div>
      </div>
    </>
  )
}
