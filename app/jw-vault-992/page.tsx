'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    google?: any
  }
}

export default function SuperadminSecretAuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '573053429535-1fcs78pqomcj441j1c7898dhhttdqs28.apps.googleusercontent.com'

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

      const rawText = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(rawText)
      } catch {
        setErrorMsg(`Respons server tidak valid (${res.status}). Silakan coba lagi.`)
        return
      }

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
          router.push('/jurnal-central')
          router.refresh()
        }, 500)
      } else {
        setErrorMsg(data.message || 'Akses ditolak. Akun Google ini tidak memiliki otoritas Superadmin.')
      }
    } catch (err: any) {
      setErrorMsg('Kendala koneksi ke server: ' + (err?.message || 'Coba lagi beberapa saat lagi'))
    } finally {
      setLoading(false)
    }
  }

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

      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 selection:bg-[#c00015] selection:text-white">
        <div className="w-full max-w-sm flex flex-col items-center justify-center text-center">
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
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-8">
            Portal Akses Khusus Superadmin JurnalWave.
          </p>

          {/* Notifikasi Error */}
          {errorMsg && (
            <div className="w-full mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2 text-left animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Notifikasi Sukses */}
          {successMsg && (
            <div className="w-full mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2 text-left animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Tombol Google Sign In */}
          <div className="w-full flex flex-col items-center justify-center">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-600 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#c00015]" />
                <span>Memverifikasi akun Google...</span>
              </div>
            ) : (
              <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
