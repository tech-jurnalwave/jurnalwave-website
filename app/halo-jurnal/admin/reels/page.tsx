'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Film,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  ExternalLink,
  LayoutGrid,
  List,
  Upload,
  Image as ImageIcon,
  Loader2,
  Play,
} from 'lucide-react'
import { Reel } from '@/types'
import AdminToast from '@/components/admin/AdminToast'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'
import { convertImageToWebP } from '@/lib/imageUtils'

const DEFAULT_REEL_COVER =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=700&q=80'

export default function AdminReelsPage() {
  const confirmDialog = useConfirm()
  const [reels, setReels] = useState<Reel[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReel, setEditingReel] = useState<Reel | null>(null)

  // Form Fields (3 Inti: Link, Judul, Cover)
  const [formSocialUrl, setFormSocialUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formThumbnail, setFormThumbnail] = useState('')
  const [detectedPlatform, setDetectedPlatform] = useState<string>('tiktok')

  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const coverFileInputRef = useRef<HTMLInputElement>(null)

  // Muat Reels dari Database Server & Auto-Sync
  useEffect(() => {
    let isMounted = true

    // 1. Muat seketika dari localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_reels')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setReels(parsed)
          }
        }
      } catch {}
    }

    const loadAndSyncReels = async () => {
      try {
        const res = await fetch('/api/reels', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            if (isMounted) {
              setReels(json.data)
              if (typeof window !== 'undefined') {
                localStorage.setItem('jurnal_wave_reels', JSON.stringify(json.data))
              }
            }
            return
          }
        }
      } catch (err) {
        console.warn('Notice saat memuat reels:', err)
      }

      // Fallback reels resmi jika data server/lokal kosong
      if (isMounted) {
        const fallbackReels: Reel[] = [
          {
            id: 'reel-default-1',
            title: 'Spot Kuliner & Senja Hits Sukabumi',
            platform: 'tiktok',
            socialUrl: 'https://tiktok.com',
            thumbnailUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80',
          },
          {
            id: 'reel-default-2',
            title: 'Suasana Akhir Pekan Alun-Alun Sukabumi',
            platform: 'instagram',
            socialUrl: 'https://instagram.com',
            thumbnailUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=700&q=80',
          },
          {
            id: 'reel-default-3',
            title: 'Update Jalur Wisata & Transportasi Sukabumi',
            platform: 'youtube',
            socialUrl: 'https://youtube.com',
            thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
          },
          {
            id: 'reel-default-4',
            title: 'Tren Nongkrong & Fashion Pemuda Sukabumi',
            platform: 'tiktok',
            socialUrl: 'https://tiktok.com',
            thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80',
          },
        ]
        setReels(fallbackReels)
        if (typeof window !== 'undefined') {
          localStorage.setItem('jurnal_wave_reels', JSON.stringify(fallbackReels))
        }
      }
    }

    loadAndSyncReels()
    return () => {
      isMounted = false
    }
  }, [])

  // Simpan data ke state lokal & kirim event sinkronisasi real-time
  const persistReels = (updated: Reel[], toastText: string) => {
    setReels(updated)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jurnal_wave_reels', JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent('reels-updated'))
        window.dispatchEvent(new Event('storage'))
      } catch (err) {
        console.error('Error saving reels locally:', err)
      }
    }
    setToastMessage(toastText)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Buka Modal Tambah Baru
  const handleOpenCreateModal = () => {
    setEditingReel(null)
    setFormSocialUrl('')
    setFormTitle('')
    setFormThumbnail('')
    setDetectedPlatform('tiktok')
    setIsModalOpen(true)
  }

  // Buka Modal Edit
  const handleOpenEditModal = (reel: Reel) => {
    setEditingReel(reel)
    setFormSocialUrl(reel.socialUrl || reel.videoUrl || '')
    setFormTitle(reel.title || '')
    setFormThumbnail(reel.thumbnailUrl || '')
    setDetectedPlatform(reel.platform || 'tiktok')
    setIsModalOpen(true)
  }

  // Otomatis deteksi platform & ekstrak cover saat link ditempel
  const handleSocialUrlChange = async (url: string) => {
    setFormSocialUrl(url)
    const lower = url.toLowerCase().trim()
    if (!lower) return

    let plat = 'tiktok'
    if (lower.includes('tiktok.com')) {
      plat = 'tiktok'
    } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      plat = 'youtube'
      let ytId = ''
      if (lower.includes('/shorts/')) {
        const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
        if (match && match[1]) ytId = match[1]
      } else if (lower.includes('v=')) {
        const match = url.match(/v=([a-zA-Z0-9_-]+)/)
        if (match && match[1]) ytId = match[1]
      } else if (lower.includes('youtu.be/')) {
        const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
        if (match && match[1]) ytId = match[1]
      }
      if (ytId && !formThumbnail) {
        setFormThumbnail(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`)
      }
    } else if (lower.includes('instagram.com')) {
      plat = 'instagram'
    }
    setDetectedPlatform(plat)

    // Panggil server endpoint /api/reels/metadata untuk ekstrak cover & info otomatis
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      try {
        setIsFetchingMetadata(true)
        const res = await fetch(`/api/reels/metadata?url=${encodeURIComponent(url.trim())}`)
        if (res.ok) {
          const json = await res.json()
          const data = json.data || json
          if (data.thumbnailUrl && !formThumbnail) {
            setFormThumbnail(data.thumbnailUrl)
          }
          if (data.title && !formTitle) {
            setFormTitle(data.title)
          }
        }
      } catch (err) {
        console.warn('Gagal mengambil metadata otomatis:', err)
      } finally {
        setIsFetchingMetadata(false)
      }
    }
  }

  // Upload Foto Cover Manual dari Komputer / HP ke Cloudinary (Auto WebP)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, atau WebP).')
      return
    }

    try {
      setIsUploadingThumbnail(true)
      // 1. Konversi otomatis ke WebP di browser (kompresi hemat kuota)
      const webpBase64 = await convertImageToWebP(file, { maxDimension: 1200, quality: 0.85 })

      // 2. Kirim WebP ke server upload
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: webpBase64 }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        setFormThumbnail(data.url)
        setToastMessage('Foto cover berhasil dikonversi ke WebP & diunggah!')
      } else {
        alert('Gagal mengunggah foto cover. Silakan gunakan link URL.')
      }
    } catch (err) {
      console.error('Error konversi/upload webp cover:', err)
      alert('Gagal mengunggah foto cover.')
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  // Submit Form (Tambah / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || isSaving) return

    setIsSaving(true)
    const finalSocialUrl = formSocialUrl.trim() || 'https://instagram.com'
    const finalThumbnail = formThumbnail.trim() || DEFAULT_REEL_COVER

    try {
      if (editingReel) {
        const res = await fetch(`/api/reels/${editingReel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            platform: detectedPlatform,
            socialUrl: finalSocialUrl,
            thumbnailUrl: finalThumbnail,
          }),
        })

        if (!res.ok) throw new Error('Gagal memperbarui video reels')
        const json = await res.json()
        const updatedItem = json.data || {
          ...editingReel,
          title: formTitle.trim(),
          platform: detectedPlatform,
          socialUrl: finalSocialUrl,
          thumbnailUrl: finalThumbnail,
        }
        const updated = reels.map((r) => (r.id === editingReel.id ? updatedItem : r))
        persistReels(updated, `Video Reels "${formTitle.trim()}" berhasil diperbarui!`)
      } else {
        const res = await fetch('/api/reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            platform: detectedPlatform,
            socialUrl: finalSocialUrl,
            thumbnailUrl: finalThumbnail,
          }),
        })

        if (!res.ok) throw new Error('Gagal menambahkan video reels')
        const json = await res.json()
        const newItem: Reel = json.data || {
          id: `reel-${Date.now()}`,
          title: formTitle.trim(),
          platform: detectedPlatform,
          socialUrl: finalSocialUrl,
          thumbnailUrl: finalThumbnail,
          imageAlt: formTitle.trim(),
        }
        const updated = [newItem, ...reels]
        persistReels(updated, `Video Reels "${formTitle.trim()}" berhasil disimpan!`)
      }
      setIsModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan video.')
    } finally {
      setIsSaving(false)
    }
  }

  // Hapus Video Reels
  const handleDeleteReel = async (id: string, title: string) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Video Reels?',
      message: `Yakin ingin menghapus "${title}"?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (isConfirmed) {
      try {
        const res = await fetch(`/api/reels/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Gagal menghapus video')
        const updated = reels.filter((r) => r.id !== id)
        persistReels(updated, `Video Reels "${title}" telah dihapus.`)
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus video.')
      }
    }
  }

  const renderPlatformBadge = (reel: Reel) => {
    const url = (reel.socialUrl || reel.videoUrl || '').toLowerCase()
    const platform = reel.platform?.toLowerCase()

    if (platform === 'tiktok' || url.includes('tiktok.com')) {
      return (
        <span
          title="Buka di TikTok"
          className="w-6 h-6 rounded-md bg-black border border-white/20 flex items-center justify-center text-white shadow-xs"
        >
          <svg className="w-3 h-3 fill-current text-white" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.36 1.52-1.36 2.53-.02 1.07.47 2.12 1.31 2.78.85.67 2.02.9 3.06.6 1.16-.31 2.11-1.25 2.45-2.39.12-.48.15-.99.14-1.49.01-4.87.01-9.74.01-14.61z" />
          </svg>
        </span>
      )
    }

    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      return (
        <span
          title="Buka di YouTube Shorts"
          className="w-6 h-6 rounded-md bg-[#FF0000] border border-white/20 flex items-center justify-center text-white shadow-xs"
        >
          <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </span>
      )
    }

    // Default: Instagram gradient
    return (
      <span
        title="Buka di Instagram Reels"
        className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] border border-white/20 flex items-center justify-center text-white shadow-xs"
      >
        <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </span>
    )
  }

  // Filtered Reels berdasarkan pencarian judul
  const filteredReels = useMemo(() => {
    if (!searchQuery.trim()) return reels
    const q = searchQuery.toLowerCase()
    return reels.filter((r) => r.title.toLowerCase().includes(q))
  }, [reels, searchQuery])

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Sederhana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Wave Reels</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {reels.length} Konten
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola kurasi video reels beranda portal JurnalWave.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/reels"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <span>Lihat Galeri</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Video Reels</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      <AdminToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      {/* 2. Bar Pencarian & Switch View (Grid vs Tabel) */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul video reels..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015] transition"
          />
        </div>

        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Tampilan Grid 9:16"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Grid 9:16</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Tampilan Tabel"
          >
            <List className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Tabel</span>
          </button>
        </div>
      </div>

      {/* 3. Konten Utama: Grid 9:16 atau Tabel Ringkas */}
      {filteredReels.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
          <Film className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-heading font-semibold text-slate-800 text-sm">Tidak ada video Reels ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Belum ada konten video yang ditambahkan atau kata kunci pencarian tidak cocok.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= TAMPILAN GRID VISUAL 9:16 (IDENTIK DENGAN BERANDA) ================= */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredReels.map((reel) => {
            const targetUrl = reel.socialUrl || reel.videoUrl || 'https://instagram.com'

            return (
              <div
                key={reel.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col group transition hover:shadow-md"
              >
                {/* Kartu Vertikal 9:16 */}
                <div className="relative aspect-[9/16] bg-zinc-950 overflow-hidden">
                  {/* eslint-disable-next-img-element */}
                  <img
                    src={reel.thumbnailUrl}
                    alt={reel.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_REEL_COVER
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  {/* Dark Gradient Overlay & Konten Visual (Selaras 100% dengan Beranda) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/40 flex flex-col justify-between p-2 sm:p-2.5">
                    {/* Top Row: Badge Medsos di pojok kanan */}
                    <div className="flex items-center justify-end w-full z-10">
                      {renderPlatformBadge(reel)}
                    </div>

                    {/* Center Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:bg-[#c00015] group-hover:border-[#c00015] transition-all duration-300">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Content: Title */}
                    <div className="flex flex-col gap-0.5 z-10 pointer-events-none">
                      <p className="text-white font-bold text-[11px] sm:text-xs leading-snug line-clamp-2 drop-shadow-sm group-hover:text-red-200 transition-colors">
                        {reel.title}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bar Tombol Aksi Praktis */}
                <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-600 hover:text-[#c00015] hover:bg-slate-200/60 text-[11px] font-medium transition cursor-pointer"
                    title="Buka Video Asli di Tab Baru"
                  >
                    <ExternalLink className="w-3 h-3 text-[#c00015]" />
                    <span>Buka</span>
                  </a>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleOpenEditModal(reel)}
                      className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer"
                      title="Edit Judul / Link / Cover"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteReel(reel.id, reel.title)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus Video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ================= TAMPILAN TABEL DATA RINGKAS ================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 pl-4 pr-3 whitespace-nowrap w-[70px]">Cover</th>
                  <th className="py-3 px-3">Judul Video</th>
                  <th className="py-3 px-3">Tautan Video</th>
                  <th className="py-3 pl-2 pr-4 whitespace-nowrap w-[100px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReels.map((reel) => {
                  const targetUrl = reel.socialUrl || reel.videoUrl || 'https://instagram.com'

                  return (
                    <tr key={reel.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Thumbnail Mini 9:16 */}
                      <td className="py-2.5 pl-4 pr-3 align-middle">
                        <div className="w-10 h-14 rounded-md overflow-hidden bg-zinc-950 border border-slate-200 relative shrink-0">
                          {/* eslint-disable-next-img-element */}
                          <img
                            src={reel.thumbnailUrl}
                            alt={reel.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_REEL_COVER
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Judul Video */}
                      <td className="py-2.5 px-3 align-middle min-w-0">
                        <p className="font-heading font-semibold text-slate-900 line-clamp-2">
                          {reel.title}
                        </p>
                      </td>

                      {/* Tautan Video */}
                      <td className="py-2.5 px-3 align-middle text-slate-600 truncate max-w-xs font-mono text-[11px]">
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#c00015] hover:underline inline-flex items-center gap-1 text-slate-600"
                        >
                          <span className="truncate max-w-[200px]">{targetUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 pl-2 pr-4 whitespace-nowrap text-center align-middle">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(reel)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReel(reel.id, reel.title)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH / EDIT VIDEO REELS (SUPER SIMPEL) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-[#c00015]" />
                <h3 className="font-heading font-bold text-slate-900 text-sm sm:text-base">
                  {editingReel ? 'Edit Video Reels' : 'Tambah Video Reels'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body - Hanya 3 Kolom Inti */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* 1. Link Video Medsos */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Link Video (TikTok / Instagram / YouTube Shorts) <span className="text-[#c00015]">*</span></span>
                  {isFetchingMetadata && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      <Loader2 className="w-3 h-3 animate-spin" /> Mengambil cover...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={formSocialUrl}
                    onChange={(e) => handleSocialUrlChange(e.target.value)}
                    placeholder="https://vt.tiktok.com/... atau https://youtube.com/shorts/..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#c00015] transition font-mono pr-8"
                  />
                  {isFetchingMetadata && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c00015]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Tempelkan link video, sistem otomatis mencoba mengambil foto cover aslinya.
                </p>
              </div>

              {/* 2. Judul Video Reels */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Judul Video Reels <span className="text-[#c00015]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Masukkan judul video yang tampil di kartu..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#c00015] transition"
                />
              </div>

              {/* 3. Cover Thumbnail (9:16) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Foto Cover (Rasio 9:16)
                </label>

                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {/* Thumbnail Mini Preview */}
                  <div className="w-14 aspect-[9/16] rounded-lg overflow-hidden bg-zinc-950 border border-slate-200 shrink-0 relative shadow-2xs">
                    {formThumbnail ? (
                      /* eslint-disable-next-img-element */
                      <img
                        src={formThumbnail}
                        alt="Preview Cover"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_REEL_COVER
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Input URL & Tombol Upload */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={formThumbnail}
                      onChange={(e) => setFormThumbnail(e.target.value)}
                      placeholder="URL cover (otomatis atau isi manual)..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#c00015] transition"
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={coverFileInputRef}
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploadingThumbnail}
                        onClick={() => coverFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-60"
                      >
                        {isUploadingThumbnail ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c00015]" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-[#c00015]" />
                            <span>Pilih File Gambar</span>
                          </>
                        )}
                      </button>

                      {formThumbnail && (
                        <button
                          type="button"
                          onClick={() => setFormThumbnail('')}
                          className="px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-medium transition cursor-pointer"
                          title="Hapus Cover"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-3 flex items-center justify-end border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : editingReel ? 'Simpan Perubahan' : 'Terbitkan Video Reels'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
