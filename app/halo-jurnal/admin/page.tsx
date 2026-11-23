'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Newspaper,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  Vote,
  Film,
  Briefcase,
  Building2,
  Play,
  TrendingUp,
} from 'lucide-react'
import { Article, Poll, Reel, Job } from '@/types'
import { DummyReport } from '@/data/dummyReports'
import { useAdminData } from '@/context/AdminDataContext'
import { DEFAULT_ACTIVE_POLL } from '@/lib/polls'

const DEFAULT_REEL_COVER =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=720&auto=format&fit=crop'

export default function UnifiedMasterDashboardPage() {
  const {
    articles: contextArticles,
    reports: contextReports,
  } = useAdminData()

  const [articlesList, setArticlesList] = useState<Article[]>(contextArticles)
  const [reportsList, setReportsList] = useState<DummyReport[]>(contextReports)
  const [reelsList, setReelsList] = useState<Reel[]>([])
  const [jobsList, setJobsList] = useState<Job[]>([])
  const [adminName, setAdminName] = useState('Super Admin')
  const [activePoll, setActivePoll] = useState<Poll | null>(DEFAULT_ACTIVE_POLL)
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({})
  const [aduanTab, setAduanTab] = useState<'populer' | 'terbaru'>('populer')

  // 1. Ambil nama admin dan overrides status lokal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('jurnal_wave_admin_user')
        if (savedUser) {
          const parsed = JSON.parse(savedUser)
          let name = parsed.name || 'Super Admin'
          if (name === 'Redaksi JurnalWave' || name === 'Super Admin JurnalWave') {
            name = 'Super Admin'
          }
          setAdminName(name)
        }
      } catch {}

      try {
        const ov = JSON.parse(localStorage.getItem('halo_jurnal_status_overrides') || '{}')
        setLocalOverrides(ov)
      } catch {}
    }
  }, [])

  // 2. Sinkronisasi artikel (Context -> LocalStorage -> API Server)
  useEffect(() => {
    if (contextArticles.length > 0) {
      setArticlesList(contextArticles)
    } else {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('jurnal_wave_articles')
          if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length > 0) setArticlesList(parsed)
          }
        } catch {}
      }

      fetch('/api/articles', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setArticlesList(json.data)
          }
        })
        .catch(() => {})
    }
  }, [contextArticles])

  // 3. Sinkronisasi laporan warga
  useEffect(() => {
    if (contextReports.length > 0) {
      setReportsList(contextReports)
    } else {
      fetch('/api/reports', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setReportsList(json.data)
          }
        })
        .catch(() => {})
    }
  }, [contextReports])

  // 4. Sinkronisasi video Wave Reels (LocalStorage -> API Server)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_admin_reels')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) setReelsList(parsed)
        }
      } catch {}
    }

    fetch('/api/reels', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setReelsList(json.data)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('jurnal_wave_admin_reels', JSON.stringify(json.data))
            } catch {}
          }
        }
      })
      .catch((err) => console.warn('Notice fetching reels in dashboard:', err))
  }, [])

  // 5. Sinkronisasi lowongan kerja / Loker (LocalStorage -> API Server)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_jobs')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) setJobsList(parsed)
        }
      } catch {}
    }

    fetch('/api/jobs?all=true', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setJobsList(json.data)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('jurnal_wave_jobs', JSON.stringify(json.data))
            } catch {}
          }
        }
      })
      .catch((err) => console.warn('Notice fetching jobs in dashboard:', err))
  }, [])

  // 6. Muat polling aktif
  useEffect(() => {
    const loadActivePoll = async () => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('jurnal_wave_admin_polls')
          if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const act = parsed.find((p: any) => p.isActive) || parsed[0]
              if (act) setActivePoll(act)
            }
          }
        } catch {}
      }

      try {
        const res = await fetch('/api/polls')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setActivePoll(json.data)
          }
        }
      } catch {}
    }

    loadActivePoll()
  }, [])

  // Helper resolusi status ACC & Hak Tayang
  const getAccStatus = useCallback(
    (r: DummyReport): 'menunggu_acc' | 'publik' | 'privat' => {
      const override = localOverrides[r.id] || (r.nomor_tiket ? localOverrides[r.nomor_tiket] : null)
      if (override?.acc_status) return override.acc_status
      if (override?.is_public !== undefined) return override.is_public ? 'publik' : 'privat'

      if ((r as any).acc_status) return (r as any).acc_status
      if (r.status === 'diterima' && r.is_public !== true) return 'menunggu_acc'
      if (r.is_public === true || (r as any).visibilitas === 'publik') return 'publik'
      return 'privat'
    },
    [localOverrides]
  )

  // Metrik Utama (5 Kartu)
  const totalBerita = articlesList.length
  const totalReels = reelsList.length
  const totalJobs = jobsList.length
  const totalAduan = reportsList.length
  const reportsMenungguAcc = useMemo(() => {
    return reportsList.filter((r) => getAccStatus(r) === 'menunggu_acc')
  }, [reportsList, getAccStatus])
  const totalVotes = activePoll?.totalVotes || 84

  // Aduan Warga Populer (Dukungan Tertinggi)
  const sortedByPopularReports = useMemo(() => {
    return [...reportsList].sort(
      (a, b) => (b.dukungan_count || 0) - (a.dukungan_count || 0)
    )
  }, [reportsList])

  const topSupportedReport = useMemo(() => {
    return sortedByPopularReports[0] || null
  }, [sortedByPopularReports])

  const otherPopularReports = useMemo(() => {
    return sortedByPopularReports.slice(1, 5)
  }, [sortedByPopularReports])

  // Aduan Warga Terbaru (Berdasarkan waktu masuk)
  const latestReports = useMemo(() => {
    return [...reportsList].slice(0, 5)
  }, [reportsList])

  // Berita Terbaru (5 item)
  const latestArticles = useMemo(() => {
    return articlesList.slice(0, 5)
  }, [articlesList])

  // Reels Terbaru (4 item - lebih besar & proporsional)
  const latestReels = useMemo(() => {
    return reelsList.slice(0, 4)
  }, [reelsList])

  // Loker Terbaru (3 item)
  const latestJobs = useMemo(() => {
    return jobsList.slice(0, 3)
  }, [jobsList])

  // Polling Teratas
  const topPollOption = useMemo(() => {
    if (!activePoll?.options || activePoll.options.length === 0) return null
    return [...activePoll.options].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0]
  }, [activePoll])

  const topOptionPct = useMemo(() => {
    if (!topPollOption || !activePoll || !activePoll.totalVotes || activePoll.totalVotes === 0) {
      return 65
    }
    return Math.round(((topPollOption.votes || 0) / activePoll.totalVotes) * 100)
  }, [topPollOption, activePoll])

  // Helper render platform badge reels dengan logo resmi (tanpa teks)
  const renderReelPlatformTag = (reel: Reel) => {
    const url = (reel.socialUrl || reel.videoUrl || '').toLowerCase()
    const platform = reel.platform?.toLowerCase()

    if (platform === 'tiktok' || url.includes('tiktok.com')) {
      return (
        <span
          title="TikTok"
          className="w-5 h-5 rounded-md bg-black/90 border border-white/20 flex items-center justify-center text-white shadow-xs"
        >
          <svg className="w-2.5 h-2.5 fill-current text-white" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.36 1.52-1.36 2.53-.02 1.07.47 2.12 1.31 2.78.85.67 2.02.9 3.06.6 1.16-.31 2.11-1.25 2.45-2.39.12-.48.15-.99.14-1.49.01-4.87.01-9.74.01-14.61z" />
          </svg>
        </span>
      )
    }

    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      return (
        <span
          title="YouTube Shorts"
          className="w-5 h-5 rounded-md bg-[#FF0000] border border-white/20 flex items-center justify-center text-white shadow-xs"
        >
          <svg className="w-2.5 h-2.5 fill-current text-white" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </span>
      )
    }

    // Default: Instagram gradient
    return (
      <span
        title="Instagram Reels"
        className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] border border-white/20 flex items-center justify-center text-white shadow-xs"
      >
        <svg className="w-2.5 h-2.5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Header Minimalis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
          Selamat Datang, <span className="text-[#c00015]">{adminName}</span>
        </h1>
        <span className="text-xs text-slate-500 font-medium">
          Pusat Kendali Redaksi &amp; Aspirasi Warga Sukabumi
        </span>
      </div>

      {/* 2. Lima Kartu Metrik Utama (Bersih, Responsif, Sinkron Server) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Artikel */}
        <Link
          href="/halo-jurnal/admin/berita"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">
              Total Artikel
            </span>
            <p className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
              {totalBerita}
            </p>
            <span className="text-[10px] font-medium text-slate-400 block truncate">
              Berita Redaksi
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0 ml-2">
            <Newspaper className="w-4 h-4" />
          </div>
        </Link>

        {/* Card 2: Total Reel */}
        <Link
          href="/halo-jurnal/admin/reels"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">
              Total Reel
            </span>
            <p className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
              {totalReels}
            </p>
            <span className="text-[10px] font-medium text-slate-400 block truncate">
              Wave Reels
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0 ml-2">
            <Film className="w-4 h-4" />
          </div>
        </Link>

        {/* Card 3: Total Lowongan */}
        <Link
          href="/halo-jurnal/admin/loker"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">
              Total Lowongan
            </span>
            <p className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
              {totalJobs}
            </p>
            <span className="text-[10px] font-medium text-slate-400 block truncate">
              Loker Sukabumi
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0 ml-2">
            <Briefcase className="w-4 h-4" />
          </div>
        </Link>

        {/* Card 4: Total Aduan */}
        <Link
          href="/halo-jurnal/admin/laporan"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">
              Total Aduan
            </span>
            <p className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
              {totalAduan}
            </p>
            <span className="text-[10px] font-medium text-slate-400 block truncate">
              Aspirasi Warga
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0 ml-2">
            <FileText className="w-4 h-4" />
          </div>
        </Link>

        {/* Card 5: Aduan Butuh ACC */}
        <Link
          href="/halo-jurnal/admin/laporan?tab=menunggu_acc"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between col-span-2 sm:col-span-1"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">
              Aduan Butuh ACC
            </span>
            <div className="flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
                {reportsMenungguAcc.length}
              </p>
              {reportsMenungguAcc.length > 0 ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                  Perlu Ditinjau
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded shrink-0">
                  Beres
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium text-slate-400 block truncate">
              Verifikasi Tayang
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0 ml-2">
            <Clock className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* 3. Area Konten Utama: 2 Pilar Terpadu (LG 7:5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* PILAR KIRI (7 Kolom pada LG): Aduan Warga & Artikel Berita                */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Aduan Warga (Terbaru & Terpopuler) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded bg-red-50 text-[#c00015]">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                  Aduan Warga Sukabumi
                </h2>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                {/* Switch Tab: Terpopuler vs Terbaru */}
                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setAduanTab('populer')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                      aduanTab === 'populer'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3 text-[#c00015]" />
                    <span>Terpopuler</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAduanTab('terbaru')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                      aduanTab === 'terbaru'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-[#c00015]" />
                    <span>Terbaru</span>
                  </button>
                </div>

                <Link
                  href="/halo-jurnal/admin/laporan"
                  className="text-[11px] font-semibold text-[#c00015] hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>Semua</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Sorotan Aduan Terpanas (Hanya tampil jika ada data) */}
            {topSupportedReport && aduanTab === 'populer' && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {topSupportedReport.nomor_tiket}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Pelapor: {topSupportedReport.nama_pelapor || 'Warga'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#c00015] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {topSupportedReport.dukungan_count || 24} Dukungan Warga
                  </span>
                </div>

                <div>
                  <Link
                    href={`/halo-jurnal/admin/laporan/${topSupportedReport.id}`}
                    className="font-bold text-xs sm:text-sm text-slate-900 hover:text-[#c00015] block transition leading-snug"
                  >
                    {topSupportedReport.judul}
                  </Link>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {topSupportedReport.deskripsi}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400">
                    {topSupportedReport.created_at || 'Baru saja'} • {topSupportedReport.lokasi || 'Sukabumi'}
                  </span>

                  <Link
                    href={`/halo-jurnal/admin/berita?ref_ticket=${topSupportedReport.nomor_tiket}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-[11px] font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Angkat Berita</span>
                  </Link>
                </div>
              </div>
            )}

            {/* List Item Aduan Warga (Terbaru / Terpopuler) */}
            <div className="space-y-1.5 pt-1">
              {(aduanTab === 'populer' ? otherPopularReports : latestReports).map((rep) => {
                const statusACC = getAccStatus(rep)
                return (
                  <div
                    key={rep.id}
                    className="p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] flex-wrap">
                        <span className="font-mono font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                          {rep.nomor_tiket}
                        </span>
                        <span className="font-bold text-slate-700">
                          {rep.dukungan_count || 0} Dukungan
                        </span>
                        <span>&bull;</span>
                        <span className="text-slate-400 truncate max-w-[120px]">
                          {rep.nama_pelapor || 'Warga'}
                        </span>
                        {statusACC === 'menunggu_acc' && (
                          <span className="font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px]">
                            Butuh ACC
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/halo-jurnal/admin/laporan/${rep.id}`}
                        className="text-xs font-semibold text-slate-900 group-hover:text-[#c00015] truncate block transition"
                        title={rep.judul}
                      >
                        {rep.judul}
                      </Link>
                    </div>

                    <Link
                      href={`/halo-jurnal/admin/laporan/${rep.id}`}
                      className="text-slate-400 group-hover:text-[#c00015] transition shrink-0 p-1"
                      title="Lihat Detail"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )
              })}

              {(aduanTab === 'populer' ? otherPopularReports : latestReports).length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">
                  Belum ada laporan warga yang tercatat.
                </p>
              )}
            </div>
          </div>

          {/* 2. Artikel Redaksi Terbaru */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded bg-red-50 text-[#c00015]">
                  <Newspaper className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                  Artikel Redaksi Terbaru
                </h2>
              </div>
              <Link
                href="/halo-jurnal/admin/berita"
                className="text-[11px] font-semibold text-[#c00015] hover:underline flex items-center gap-1"
              >
                <span>Kelola Berita</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-1.5">
              {latestArticles.map((art) => (
                <Link
                  key={art.id}
                  href="/halo-jurnal/admin/berita"
                  className="p-1.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition flex items-center justify-between gap-2.5 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        if (!target.src.endsWith('/hero-banner.webp')) target.src = '/hero-banner.webp'
                      }}
                      className="w-12 h-9 rounded-md object-cover bg-slate-100 shrink-0 border border-slate-200"
                    />
                    <span
                      className="text-xs font-semibold text-slate-900 group-hover:text-[#c00015] truncate transition"
                      title={art.title}
                    >
                      {art.title}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#c00015] group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              ))}

              {latestArticles.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-3">
                  Belum ada artikel yang diterbitkan.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PILAR KANAN (5 Kolom pada LG): Polling, Reels & Loker                    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Snapshot Polling Pembaca Aktif */}
          {activePoll && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded bg-red-50 text-[#c00015]">
                    <Vote className="w-3.5 h-3.5 text-[#c00015]" />
                  </span>
                  <h2 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                    Polling Pembaca Aktif
                  </h2>
                </div>
                <Link
                  href="/halo-jurnal/admin/polling"
                  className="text-[11px] font-semibold text-[#c00015] hover:underline flex items-center gap-1"
                >
                  <span>Kelola Polling</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900 truncate" title={activePoll.question}>
                  {activePoll.question}
                </p>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {totalVotes} suara
                </span>
              </div>

              {topPollOption && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 font-medium truncate max-w-[240px]">
                      {topPollOption.text}
                    </span>
                    <span className="font-bold text-[#c00015] text-xs shrink-0">{topOptionPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#c00015] h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${topOptionPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Wave Reels Terbaru (Proporsi Lebih Besar) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded bg-red-50 text-[#c00015]">
                  <Film className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                  Wave Reels Terbaru
                </h2>
              </div>
              <Link
                href="/halo-jurnal/admin/reels"
                className="text-[11px] font-semibold text-[#c00015] hover:underline flex items-center gap-1"
              >
                <span>Kelola Reels</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Grid 4 Kartu Mini Reels 9:16 Lebih Besar & Jelas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {latestReels.map((reel) => {
                const targetUrl = (reel.socialUrl || reel.videoUrl || '').trim() || '#'
                return (
                  <a
                    key={reel.id}
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-xl overflow-hidden aspect-[9/16] bg-zinc-900 border border-slate-200 shadow-2xs flex flex-col justify-between p-2 transition hover:scale-[1.03] hover:shadow-md cursor-pointer"
                    title={reel.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={reel.thumbnailUrl}
                      alt={reel.title}
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = DEFAULT_REEL_COVER
                      }}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

                    {/* Top: Platform Logo Tag */}
                    <div className="relative z-10 flex justify-end">
                      {renderReelPlatformTag(reel)}
                    </div>

                    {/* Center: Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                      <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center text-white border border-white/50">
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom: Title */}
                    <div className="relative z-10">
                      <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight drop-shadow-xs group-hover:text-red-200 transition-colors">
                        {reel.title}
                      </p>
                    </div>
                  </a>
                )
              })}

              {latestReels.length === 0 && (
                <div className="col-span-2 sm:col-span-4 text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
                  Belum ada video reels.
                </div>
              )}
            </div>
          </div>

          {/* 3. Lowongan Kerja (Loker) Terbaru */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded bg-red-50 text-[#c00015]">
                  <Briefcase className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                  Loker Terbaru
                </h2>
              </div>
              <Link
                href="/halo-jurnal/admin/loker"
                className="text-[11px] font-semibold text-[#c00015] hover:underline flex items-center gap-1"
              >
                <span>Kelola Loker</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-1.5">
              {latestJobs.map((job) => (
                <Link
                  key={job.id}
                  href="/halo-jurnal/admin/loker"
                  className="p-2 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-slate-500">
                      {job.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={job.logo} alt={job.company} className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-4 h-4 text-[#c00015]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-xs font-bold text-slate-900 group-hover:text-[#c00015] truncate transition leading-snug"
                        title={job.title}
                      >
                        {job.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        <strong className="text-slate-700">{job.company}</strong> • {job.location || 'Sukabumi'}
                      </p>
                    </div>
                  </div>

                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {job.type || 'Full-Time'}
                  </span>
                </Link>
              ))}

              {latestJobs.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-3">
                  Belum ada lowongan kerja aktif.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
