'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Newspaper,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  Edit,
  Vote,
} from 'lucide-react'
import { Article, Poll } from '@/types'
import { DummyReport } from '@/data/dummyReports'
import { useAdminData } from '@/context/AdminDataContext'
import { DEFAULT_ACTIVE_POLL } from '@/lib/polls'

const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  berita: 'Berita',
  lifestyle: 'Lifestyle',
  loker: 'Lowongan Kerja',
  otomotif: 'Otomotif',
  sport: 'Sport & E-Sport',
  tech: 'Teknologi',
  teknologi: 'Teknologi',
  science: 'Science',
  health: 'Health',
  kuliner: 'Kuliner',
  wisata: 'Wisata',
  hiburan: 'Hiburan',
  inspirasi: 'Inspirasi',
}

const SAMPLE_SUPPLEMENTAL_ARTICLES: Article[] = []

export default function UnifiedMasterDashboardPage() {
  const {
    articles: contextArticles,
    reports: contextReports,
  } = useAdminData()

  const [articlesList, setArticlesList] = useState<Article[]>(contextArticles)
  const [reportsList, setReportsList] = useState<DummyReport[]>(contextReports)
  const [adminName, setAdminName] = useState('Super Admin')
  const [activePoll, setActivePoll] = useState<Poll | null>(DEFAULT_ACTIVE_POLL)
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({})

  // Ambil nama admin dan overrides lokal
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

  // Sinkronisasi artikel
  useEffect(() => {
    if (contextArticles.length > 0) {
      setArticlesList(contextArticles)
    } else if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_articles')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) setArticlesList(parsed)
        }
      } catch {}
    }
  }, [contextArticles])

  // Sinkronisasi laporan
  useEffect(() => {
    if (contextReports.length > 0) {
      setReportsList(contextReports)
    }
  }, [contextReports])

  // Muat polling aktif
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

  // Gabungan Berita
  const displayArticles = useMemo(() => {
    const combined = [...articlesList, ...SAMPLE_SUPPLEMENTAL_ARTICLES]
    const seen = new Set<string>()
    return combined.filter((a) => {
      const key = (a.slug || a.id || a.title || '').toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [articlesList])

  // Data Aduan Warga
  const displayReports = useMemo(() => {
    return reportsList
  }, [reportsList])

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

  // Metrik Utama
  const totalBerita = displayArticles.length
  const totalAduan = displayReports.length
  const totalVotes = activePoll?.totalVotes || 84

  // Laporan yang menunggu ACC
  const reportsMenungguAcc = useMemo(() => {
    return displayReports.filter((r) => getAccStatus(r) === 'menunggu_acc')
  }, [displayReports, getAccStatus])

  // Aduan Warga dengan Dukungan Tertinggi (Radar Berita)
  const topSupportedReport = useMemo(() => {
    const sorted = [...displayReports].sort(
      (a, b) => (b.dukungan_count || 0) - (a.dukungan_count || 0)
    )
    return sorted[0] || null
  }, [displayReports])

  // 3 Aduan Populer Lainnya
  const popularReports = useMemo(() => {
    const sorted = [...displayReports].sort(
      (a, b) => (b.dukungan_count || 0) - (a.dukungan_count || 0)
    )
    return sorted.slice(1, 4)
  }, [displayReports])

  // Berita Terbaru (4 item)
  const latestArticles = useMemo(() => {
    return displayArticles.slice(0, 4)
  }, [displayArticles])

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

  return (
    <div className="space-y-6">
      {/* 1. Header Minimalis */}
      <div className="pb-1">
        <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
          Selamat Datang, <span className="text-[#c00015]">{adminName}</span>
        </h1>
      </div>

      {/* 2. Tiga Kartu Metrik Inti (Bersih, Nyata, Tanpa Gimmick) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Aduan Warga */}
        <Link
          href="/halo-jurnal/admin/laporan"
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">
              Aduan Warga
            </span>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
                {totalAduan}
              </p>
              <span className="text-[11px] font-medium text-slate-400">
                Total Laporan
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </Link>

        {/* Card 2: Aduan Butuh ACC */}
        <Link
          href="/halo-jurnal/admin/laporan?tab=menunggu_acc"
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">
              Aduan Butuh ACC
            </span>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
                {reportsMenungguAcc.length}
              </p>
              {reportsMenungguAcc.length > 0 ? (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Perlu Ditinjau
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                  Semua Beres
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </Link>

        {/* Card 3: Berita Tayang */}
        <Link
          href="/halo-jurnal/admin/berita"
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#c00015]/40 transition group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">
              Berita Tayang
            </span>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold font-heading text-slate-900 group-hover:text-[#c00015] transition">
                {totalBerita}
              </p>
              <span className="text-[11px] font-medium text-slate-400">
                Artikel Redaksi
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-[#c00015] transition shrink-0">
            <Newspaper className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* 3. Area Inti: Dari Aduan Warga Jadi Berita Redaksi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* PILAR KIRI: Aduan Warga Terpopuler (7 Kolom pada LG)                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                Aduan Warga Terpopuler
              </h2>
              <Link
                href="/halo-jurnal/admin/laporan"
                className="text-[11px] font-semibold text-[#c00015] hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua Aduan</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Aduan Terpanas / Rekomendasi Utama */}
            {topSupportedReport && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                    {topSupportedReport.nomor_tiket}
                  </span>
                  <span className="text-[11px] font-bold text-[#c00015] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {topSupportedReport.dukungan_count || 24} Dukungan Warga
                  </span>
                </div>

                <div>
                  <Link
                    href={`/halo-jurnal/admin/laporan/${topSupportedReport.id}`}
                    className="font-bold text-sm text-slate-900 hover:text-[#c00015] block transition"
                  >
                    {topSupportedReport.judul}
                  </Link>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {topSupportedReport.deskripsi}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500">
                    Pelapor: <strong className="text-slate-800">{topSupportedReport.nama_pelapor || 'Warga Sukabumi'}</strong>
                  </span>

                  <Link
                    href={`/halo-jurnal/admin/berita?ref_ticket=${topSupportedReport.nomor_tiket}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Angkat Jadi Berita</span>
                  </Link>
                </div>
              </div>
            )}

            {/* 3 Aduan Populer Lainnya */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Aduan Warga Populer Lainnya
              </span>
              <div className="space-y-1.5">
                {popularReports.map((rep) => {
                  const statusACC = getAccStatus(rep)
                  return (
                    <div
                      key={rep.id}
                      className="p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 text-[10px]">
                          <span className="font-mono font-semibold text-slate-400">
                            {rep.nomor_tiket}
                          </span>
                          <span className="font-bold text-slate-700">
                            {rep.dukungan_count || 12} Dukungan
                          </span>
                          {statusACC === 'menunggu_acc' && (
                            <span className="font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700">
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
                        title="Detail"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PILAR KANAN: Publikasi Berita & Polling Pembaca (5 Kolom pada LG)          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Publikasi Berita Terbaru */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                Berita Redaksi Terbaru
              </h2>
              <Link
                href="/halo-jurnal/admin/berita"
                className="text-[11px] font-semibold text-[#c00015] hover:underline flex items-center gap-1"
              >
                <span>Kelola Berita</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {latestArticles.map((art) => {
                const catKey = (art.category || '').toLowerCase().trim()
                const catLabel = CATEGORY_DISPLAY_MAP[catKey] || art.category
                return (
                  <div
                    key={art.id}
                    className="flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-slate-50 transition group"
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
                        className="w-11 h-8 rounded-md object-cover bg-slate-100 shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <Link
                          href="/halo-jurnal/admin/berita"
                          className="text-xs font-semibold text-slate-900 hover:text-[#c00015] truncate block transition"
                          title={art.title}
                        >
                          {art.title}
                        </Link>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-bold text-slate-700">{catLabel}</span>
                          <span>&bull;</span>
                          <span className="truncate">{art.reporter || art.author || 'Tim Redaksi'}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/halo-jurnal/admin/berita"
                      className="p-1 text-slate-400 hover:text-[#c00015] transition shrink-0"
                      title="Edit Berita"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. Snapshot Polling Pembaca Aktif */}
          {activePoll && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Vote className="w-3.5 h-3.5 text-[#c00015]" />
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

              <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                {activePoll.question}
              </p>

              {topPollOption && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-800 font-medium truncate max-w-[200px]">
                      {topPollOption.text}
                    </span>
                    <span className="font-bold text-[#c00015]">{topOptionPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#c00015] h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${topOptionPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 pt-0.5">
                    Total partisipasi: <strong className="text-slate-700">{totalVotes} suara</strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
