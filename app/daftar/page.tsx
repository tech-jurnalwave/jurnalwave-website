'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Phone,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'

export default function DaftarPage() {
  const router = useRouter()

  // Form State: Nama Lengkap, Nomor WhatsApp, Kode OTP, Kata Sandi
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP Verification State
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Global UI State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [success, setSuccess] = useState(false)

  // Countdown timer untuk jeda kirim ulang OTP
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // Kirim Kode OTP Asli ke WhatsApp Warga via Fonnte
  const handleSendOtp = async () => {
    setError('')
    setInfoMessage('')

    const cleanPhone = phone.replace(/[^0-9]/g, '')
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 14) {
      setError('Masukkan nomor WhatsApp yang valid (10-14 digit angka).')
      return
    }

    setOtpSending(true)
    try {
      const res = await fetch('/api/auth/citizen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-wa-otp',
          phone: cleanPhone,
          fullName: fullName.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal mengirim kode OTP ke WhatsApp Anda. Pastikan nomor aktif.')
        return
      }

      setOtpSent(true)
      setOtpVerified(false)
      setCountdown(60) // Cooldown 60 detik
      if (data.otpDemo) {
        setInfoMessage(`${data.message || 'Kode OTP berhasil dibuat.'} (Mode Pengujian: Gunakan kode verifikasi ${data.otpDemo})`)
      } else {
        setInfoMessage(data.message || `Kode verifikasi OTP telah dikirimkan ke WhatsApp ${cleanPhone}.`)
      }
    } catch {
      setError('Terjadi kendala jaringan saat mengirim kode OTP ke WhatsApp.')
    } finally {
      setOtpSending(false)
    }
  }

  // Verifikasi Kode OTP yang dimasukkan Warga
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const targetOtp = (codeToVerify || otpCode).trim()
    const cleanPhone = phone.replace(/[^0-9]/g, '')

    if (!targetOtp || targetOtp.length < 6) {
      setError('Masukkan 6 digit kode OTP yang diterima di WhatsApp Anda.')
      return
    }

    setError('')
    setInfoMessage('')
    setOtpVerifying(true)

    try {
      const res = await fetch('/api/auth/citizen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-wa-otp',
          phone: cleanPhone,
          otpCode: targetOtp,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || 'Kode OTP tidak cocok atau sudah kedaluwarsa.')
        return
      }

      setOtpVerified(true)
      setInfoMessage('Nomor WhatsApp terverifikasi! Silakan buat kata sandi untuk menyelesaikan pendaftaran.')
    } catch {
      setError('Terjadi kendala saat memverifikasi kode OTP.')
    } finally {
      setOtpVerifying(false)
    }
  }

  // Submit Pendaftaran Akun Warga
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    const cleanName = fullName.trim()
    const cleanPhone = phone.replace(/[^0-9]/g, '')

    if (!cleanName || cleanName.length < 2) {
      setError('Mohon masukkan nama lengkap Anda (minimal 2 karakter).')
      return
    }

    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 14) {
      setError('Masukkan nomor WhatsApp yang valid (10-14 digit angka).')
      return
    }

    if (!otpSent) {
      setError('Mohon klik "Kirim OTP" untuk menerima kode verifikasi di WhatsApp Anda.')
      return
    }

    if (!otpVerified) {
      if (!otpCode || otpCode.length < 6) {
        setError('Mohon masukkan 6 digit kode OTP yang dikirimkan ke WhatsApp Anda.')
        return
      }
      handleVerifyOtp(otpCode)
      return
    }

    if (!password || password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/citizen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register-wa',
          fullName: cleanName,
          phone: cleanPhone,
          otpCode: otpCode.trim(),
          password,
          domisili: 'Sukabumi',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal mendaftarkan akun. Silakan coba kembali.')
        return
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('halo_jurnal_current_user', JSON.stringify(data.user))
        window.dispatchEvent(new Event('storage'))
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/halo-jurnal/beranda')
        router.refresh()
      }, 1000)
    } catch {
      setError('Terjadi kendala koneksi ke server saat pendaftaran. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10">
      {/* Navigasi Kembali ke Beranda di Atas Card */}
      <div className="w-full max-w-5xl mb-4 flex items-center justify-start">
        <Link
          href="/halo-jurnal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      {/* Kartu Utama Berperbandingan Proporsional */}
      <div className="w-full max-w-5xl bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
        {/* Subtle Background Glow Khas Hallo Jurnal */}
        <div className="absolute -left-12 -top-12 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* SISI KIRI: MASKOT (& Logo pada Mobile) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center self-stretch">
            {/* Logo Badge Resmi Hallo Jurnal - Hanya di Mobile (di Atas Maskot, Rata Kiri) */}
            <div className="self-start flex md:hidden items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/halo-jurnal-icon.webp?v=original"
                  alt="Hallo Jurnal Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-heading font-black text-base text-on-surface tracking-tight leading-none">
                  Hallo Jurnal
                </span>
                <span className="text-[10px] text-secondary font-medium tracking-tight mt-0.5">
                  Aspirasi &amp; Aduan Sukabumi
                </span>
              </div>
            </div>

            <div className="relative w-full flex flex-col items-center justify-center pointer-events-none">
              <div className="absolute w-48 h-48 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hallo-jurnal-presenter.webp"
                alt="Hallo Jurnal Presenter"
                className="relative w-1/2 max-w-[160px] md:w-3/4 md:max-w-[240px] object-contain drop-shadow-xl select-none"
              />
              <div className="w-16 md:w-20 h-2 bg-black/8 blur-sm rounded-full -mt-1 pointer-events-none" />
            </div>
          </div>

          {/* SISI KANAN: KONTEN PENDAFTARAN */}
          <div className="md:col-span-7 flex flex-col justify-center py-2">
            {/* Logo Badge Resmi Hallo Jurnal - Hanya di Desktop/Tablet */}
            <div className="hidden md:flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/halo-jurnal-icon.webp?v=original"
                  alt="Hallo Jurnal Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-black text-base text-on-surface tracking-tight leading-none">
                  Hallo Jurnal
                </span>
                <span className="text-[10px] text-secondary font-medium tracking-tight mt-0.5">
                  Aspirasi &amp; Aduan Sukabumi
                </span>
              </div>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="font-heading font-bold text-xl text-on-surface">Pendaftaran Berhasil!</h2>
                <p className="text-xs text-secondary max-w-sm mx-auto">
                  Akun warga Anda telah terverifikasi dan aktif. Mengalihkan Anda langsung ke portal beranda...
                </p>
                <div className="flex justify-center pt-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-primary tracking-tight mb-1">
                  Daftar Akun Warga
                </h1>
                <p className="text-xs sm:text-sm text-secondary font-medium tracking-tight mb-4">
                  Daftar akun pelapor terverifikasi resmi dengan Nomor WhatsApp Anda.
                </p>

                {error && (
                  <div className="p-3 mb-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">{error}</div>
                  </div>
                )}

                {infoMessage && !error && (
                  <div className="p-3 mb-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">{infoMessage}</div>
                  </div>
                )}

                {/* FORMULIR PENDAFTARAN MURNI WHATSAPP + STRICT OTP */}
                <form onSubmit={handleRegister} className="space-y-3.5">
                  {/* Kolom 1: Nama Lengkap */}
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-surface-container-low border border-outline-variant/80 rounded-lg text-on-surface placeholder:text-secondary focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Kolom 2: Nomor WhatsApp dengan Tombol Kirim OTP */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-on-surface">
                        Nomor WhatsApp
                      </label>
                      {otpVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        disabled={otpVerified}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          if (otpSent && !otpVerified) {
                            setOtpSent(false)
                          }
                        }}
                        placeholder="Contoh: 081234567890"
                        required
                        className="w-full pl-10 pr-28 py-2.5 text-xs sm:text-sm bg-surface-container-low border border-outline-variant/80 rounded-lg text-on-surface placeholder:text-secondary focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-75 disabled:bg-surface-container"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        {otpVerified ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpVerified(false)
                              setOtpSent(false)
                              setOtpCode('')
                            }}
                            className="text-[11px] text-secondary hover:text-primary font-medium px-2 py-1 cursor-pointer transition-colors"
                          >
                            Ubah
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpSending || countdown > 0 || phone.replace(/[^0-9]/g, '').length < 10}
                            className="px-2.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-[11px] font-semibold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                          >
                            {otpSending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : countdown > 0 ? (
                              <span>{countdown}s</span>
                            ) : otpSent ? (
                              <span>Kirim Ulang</span>
                            ) : (
                              <span>Kirim OTP</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kolom 3: Input Kode OTP WhatsApp (Muncul saat OTP dikirim & belum terverifikasi) */}
                  {otpSent && !otpVerified && (
                    <div className="p-3 rounded-xl bg-surface-container border border-primary/20 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Masukkan 6 Digit Kode OTP WhatsApp</span>
                        </label>
                      </div>

                      <div className="relative flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                            setOtpCode(val)
                            if (val.length === 6) {
                              handleVerifyOtp(val)
                            }
                          }}
                          placeholder="Contoh: 123456"
                          className="flex-1 px-3 py-2 text-center text-sm font-bold tracking-widest bg-surface-container-lowest border border-outline-variant/80 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyOtp()}
                          disabled={otpVerifying || otpCode.length < 6}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                        >
                          {otpVerifying ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Verifikasi</span>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-secondary">
                        Kode verifikasi 6 digit telah dikirimkan ke pesan WhatsApp Anda. Berlaku selama 10 menit.
                      </p>
                    </div>
                  )}

                  {/* Kolom 4: Kata Sandi */}
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        required
                        className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-surface-container-low border border-outline-variant/80 rounded-lg text-on-surface placeholder:text-secondary focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface cursor-pointer p-1"
                        title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Micro Callout Jaminan Privasi Pelapor */}
                  <div className="p-2.5 rounded-xl bg-surface-container-low/80 border border-outline-variant/50 text-[11px] text-secondary flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-on-surface">Privasi Aman:</strong> Nomor WhatsApp hanya digunakan untuk verifikasi aduan warga. Anda selalu dapat memilih opsi <span className="font-semibold text-primary">&quot;Laporkan Anonim&quot;</span> saat mengirim aduan.
                    </p>
                  </div>

                  {/* Tombol Utama: DAFTAR AKUN */}
                  <button
                    type="submit"
                    disabled={loading || !otpVerified}
                    className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-heading font-bold text-xs sm:text-sm tracking-tight transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-2 pt-2.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mendaftarkan Akun...</span>
                      </>
                    ) : !otpVerified ? (
                      <span>Verifikasi WhatsApp untuk Mendaftar</span>
                    ) : (
                      <span>Daftar Akun Warga</span>
                    )}
                  </button>
                </form>

                {/* Footer Link ke Halaman Masuk */}
                <div className="mt-5 pt-3.5 border-t border-outline-variant/60 text-center">
                  <p className="text-xs text-secondary">
                    Sudah memiliki akun warga?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                      Masuk ke Akun Anda
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
