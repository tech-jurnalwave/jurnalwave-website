'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  MapPin,
  GraduationCap,
  Save,
  X,
  Building2,
  Upload,
  Loader2,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react'
import { Job } from '@/types'
import { DUMMY_JOBS } from '@/data/dummyJobs'
import AdminToast from '@/components/admin/AdminToast'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'
import { convertImageToWebP } from '@/lib/imageUtils'

export default function AdminLokerPage() {
  const confirmDialog = useConfirm()
  const [jobs, setJobs] = useState<Job[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('semua')
  const [selectedStatus, setSelectedStatus] = useState<'semua' | 'aktif' | 'ditutup'>('semua')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)

  // Form State Tambah Loker
  const [newTitle, setNewTitle] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newLogo, setNewLogo] = useState('')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [newSalary, setNewSalary] = useState('')
  const [newType, setNewType] = useState<'Full-Time' | 'Part-Time' | 'Freelance' | 'Remote' | 'Magang'>('Full-Time')
  const [newEducation, setNewEducation] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newRequirements, setNewRequirements] = useState('')
  const [newBenefits, setNewBenefits] = useState('')
  const [newApplyEmail, setNewApplyEmail] = useState('')

  // Edit State Upload
  const [isUploadingEditLogo, setIsUploadingEditLogo] = useState(false)


  // Dropdown menu per baris (portal level)
  const [activeMenuJob, setActiveMenuJob] = useState<Job | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  // Load from API (Neon DB) with localStorage fallback
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const res = await fetch('/api/jobs?all=true', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.data)) {
            setJobs(json.data)
            if (typeof window !== 'undefined') {
              try {
                const activeOnly = json.data.filter((j: Job) => j.isActive !== false)
                localStorage.setItem('jurnal_wave_jobs', JSON.stringify(activeOnly))
              } catch {}
            }
            return
          }
        }
      } catch (err) {
        console.warn('Gagal memuat lowongan dari database server, pakai fallback:', err)
      }

      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('jurnal_wave_jobs')
          if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed)) {
              setJobs(parsed)
              return
            }
          }
        } catch {}
      }
    }
    loadJobs()
  }, [])

  const saveToStorage = (updated: Job[]) => {
    setJobs(updated)
    if (typeof window !== 'undefined') {
      try {
        const activeOnly = updated.filter((j) => j.isActive !== false)
        localStorage.setItem('jurnal_wave_jobs', JSON.stringify(activeOnly))
        window.dispatchEvent(new Event('storage'))
      } catch {}
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Handle Upload Logo (Auto WebP)
  const handleProcessLogoUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    setLoading: (val: boolean) => void
  ) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WebP, dll).')
      return
    }

    try {
      setLoading(true)
      // 1. Konversi otomatis ke WebP di browser (canvas)
      const webpBase64 = await convertImageToWebP(file, { maxDimension: 512, quality: 0.88 })
      
      // 2. Kirim gambar WebP yang sudah ringan ke backend Cloudinary
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: webpBase64 }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        onSuccess(data.url)
        showToast('Logo berhasil dikonversi ke WebP & disimpan!')
      } else {
        alert('Gagal mengunggah logo ke server cloud. Silakan coba kembali.')
      }
    } catch (err) {
      console.error('Error konversi/upload webp logo:', err)
      alert('Gagal mengonversi atau mengunggah logo.')
    } finally {
      setLoading(false)
    }
  }

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const isActive = j.isActive !== false
      const matchType = selectedType === 'semua' || j.type.toLowerCase() === selectedType.toLowerCase()
      const matchStatus =
        selectedStatus === 'semua' ||
        (selectedStatus === 'aktif' && isActive) ||
        (selectedStatus === 'ditutup' && !isActive)
      const matchQuery =
        !searchQuery.trim() ||
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.location.toLowerCase().includes(searchQuery.toLowerCase())
      return matchType && matchStatus && matchQuery
    })
  }, [jobs, selectedType, selectedStatus, searchQuery])

  // Toggle Status Aktif / Ditutup (1-klik)
  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.isActive === false ? true : false
    const updated = jobs.map((j) =>
      j.id === job.id ? { ...j, isActive: newStatus } : j
    )
    saveToStorage(updated)

    try {
      await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, isActive: newStatus }),
      })
    } catch (err) {
      console.warn('Gagal sinkronisasi status ke server:', err)
    }

    showToast(`Lowongan "${job.title}" ${newStatus ? 'diaktifkan' : 'ditutup'}.`)
  }

  // Create Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newCompany.trim()) {
      alert('Judul posisi dan nama perusahaan wajib diisi!')
      return
    }

    const reqList = newRequirements
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)
    const benList = newBenefits
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)

    const cleanApplyLink = newApplyEmail.trim()
    const formattedLink = cleanApplyLink.startsWith('http://') || cleanApplyLink.startsWith('https://') || cleanApplyLink.startsWith('mailto:') || cleanApplyLink.includes('@')
      ? cleanApplyLink
      : cleanApplyLink.startsWith('wa.me')
      ? `https://${cleanApplyLink}`
      : cleanApplyLink.replace(/[^0-9]/g, '').length >= 10
      ? `https://wa.me/${cleanApplyLink.replace(/[^0-9]/g, '')}`
      : `https://${cleanApplyLink}`

    const jobPayload = {
      title: newTitle.trim(),
      company: newCompany.trim(),
      logo: newLogo.trim() || undefined,
      location: newLocation.trim() || 'Sukabumi',
      region: 'Kota Sukabumi',
      salaryRange: newSalary.trim() || 'Kompetitif',
      type: newType,
      education: newEducation.trim() || 'SMA / SMK / D3 / S1',
      description: newDescription.trim() || 'Informasi lengkap terkait lowongan pekerjaan ini.',
      requirements: reqList.length > 0 ? reqList : ['Pendidikan relevan', 'Komunikatif dan bertanggung jawab'],
      benefits: benList.length > 0 ? benList : ['Gaji pokok sesuai kesepakatan', 'BPJS'],
      applyEmail: formattedLink,
      applyUrl: formattedLink,
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobPayload),
      })
      const json = await res.json()
      if (json.success && json.data) {
        const updated = [json.data, ...jobs]
        saveToStorage(updated)
        showToast(`Lowongan "${json.data.title}" berhasil dipublikasikan!`)
      } else {
        throw new Error(json.message || 'Gagal menyimpan ke server')
      }
    } catch (err) {
      console.warn('Menyimpan loker secara lokal:', err)
      const newJob: Job = {
        id: `job-${Date.now()}`,
        ...jobPayload,
        region: 'Kota Sukabumi',
        createdAt: new Date().toISOString(),
      }
      const updated = [newJob, ...jobs]
      saveToStorage(updated)
      showToast(`Lowongan "${newJob.title}" berhasil disimpan secara lokal!`)
    }

    // Reset Form
    setNewTitle('')
    setNewCompany('')
    setNewLogo('')
    setNewLocation('')
    setNewSalary('')
    setNewEducation('')
    setNewDescription('')
    setNewRequirements('')
    setNewBenefits('')
    setNewApplyEmail('')
    setIsCreateModalOpen(false)
  }

  // Open Edit
  const handleOpenEdit = (job: Job) => {
    setEditingJob({ ...job })
    setIsEditModalOpen(true)
  }

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingJob) return

    try {
      const res = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingJob),
      })
      const json = await res.json()
      if (json.success && json.data) {
        const updated = jobs.map((j) => (j.id === editingJob.id ? json.data : j))
        saveToStorage(updated)
        showToast(`Lowongan "${editingJob.title}" berhasil diperbarui!`)
      } else {
        throw new Error(json.message || 'Gagal memperbarui di server')
      }
    } catch {
      const updated = jobs.map((j) => (j.id === editingJob.id ? editingJob : j))
      saveToStorage(updated)
      showToast(`Lowongan "${editingJob.title}" diperbarui secara lokal!`)
    }

    setIsEditModalOpen(false)
    setEditingJob(null)
  }

  // Delete Job
  const handleDeleteJob = async (id: string, title: string) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Lowongan?',
      message: `Yakin ingin menghapus lowongan pekerjaan "${title}"?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (isConfirmed) {
      try {
        await fetch(`/api/jobs?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
      } catch (err) {
        console.warn('Gagal menghapus loker dari server:', err)
      }
      const updated = jobs.filter((j) => j.id !== id)
      saveToStorage(updated)
      showToast(`Lowongan "${title}" telah dihapus.`)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Lowongan Kerja</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {jobs.filter((j) => j.isActive !== false).length} Aktif
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola lowongan pekerjaan yang tayang di portal bursa karir JurnalWave.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/loker"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <span>Lihat di Web</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Lowongan Kerja</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      <AdminToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      {/* 2. Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Filter Status Cepat (Gaya Tab Berita) */}
          {(
            [
              { key: 'semua', label: 'Semua', count: jobs.length },
              { key: 'aktif', label: 'Aktif', count: jobs.filter((j) => j.isActive !== false).length },
              { key: 'ditutup', label: 'Ditutup', count: jobs.filter((j) => j.isActive === false).length },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setSelectedStatus(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedStatus === key
                  ? 'bg-[#c00015] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {label} ({count})
            </button>
          ))}

          <span className="text-slate-300 mx-0.5 hidden sm:inline">|</span>

          {/* Filter Tipe Kerja */}
          {['Full-Time', 'Part-Time', 'Remote', 'Freelance', 'Magang'].map((t) => {
            const count = jobs.filter((j) => j.type.toLowerCase() === t.toLowerCase()).length
            const isActive = selectedType.toLowerCase() === t.toLowerCase()
            return (
              <button
                key={t}
                onClick={() => setSelectedType(isActive ? 'semua' : t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-[#c00015] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {t} ({count})
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari posisi atau perusahaan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c00015]"
          />
        </div>
      </div>

      {/* 3. Tabel Daftar Lowongan Kerja */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 text-xs text-slate-500">
          <span>
            Menampilkan <strong>{filteredJobs.length}</strong> posisi lowongan kerja
          </span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Tidak ada lowongan yang sesuai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 pl-4 pr-3 w-[34%]">Perusahaan &amp; Posisi</th>
                  <th className="py-2.5 px-3 w-[24%]">Lokasi</th>
                  <th className="py-2.5 px-3 w-[16%]">Tipe</th>
                  <th className="py-2.5 px-3 w-[16%]">Gaji</th>
                  <th className="py-2.5 pl-2 pr-4 text-right w-[10%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {filteredJobs.map((job) => {
                  const isActive = job.isActive !== false
                  return (
                  <tr key={job.id} className={`hover:bg-slate-50/70 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
                    {/* Logo + Posisi & Perusahaan */}
                    <td className="py-2.5 pl-4 pr-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-2xs">
                          {job.logo ? (
                            <img
                              src={job.logo}
                              alt={job.company}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none'
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  const fallback = parent.querySelector('.table-fallback')
                                  if (fallback) fallback.classList.remove('hidden')
                                }
                              }}
                            />
                          ) : null}
                          <div className={`table-fallback ${job.logo ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-slate-400`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading font-semibold text-slate-900 text-xs line-clamp-1">
                            {job.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {job.company}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Lokasi */}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#c00015] shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                    </td>

                    {/* Tipe */}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="space-y-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {job.type}
                        </span>
                        {job.education && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{job.education}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Kisaran Gaji */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800 text-xs align-middle">
                      {job.salaryRange}
                    </td>

                    {/* Aksi */}
                    <td className="py-2.5 pl-2 pr-4 whitespace-nowrap text-right align-middle">
                      <div className="inline-flex items-center gap-2 justify-end">
                        {/* Toggle Status — ramping */}
                        <button
                          onClick={() => handleToggleStatus(job)}
                          title={isActive ? 'Tutup lowongan' : 'Aktifkan lowongan'}
                          className="relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none"
                          style={{ backgroundColor: isActive ? '#c00015' : '#d1d5db' }}
                        >
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200"
                            style={{ transform: isActive ? 'translateX(11px)' : 'translateX(1px)' }}
                          />
                        </button>

                        {/* Titik 3 — trigger dropdown */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (activeMenuJob?.id === job.id) {
                              setActiveMenuJob(null)
                              return
                            }
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            const spaceBelow = window.innerHeight - rect.bottom
                            const menuHeight = 135
                            const top = spaceBelow < menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4
                            const right = Math.max(16, document.documentElement.clientWidth - rect.right)
                            setMenuPos({ top, right })
                            setActiveMenuJob(job)
                          }}
                          className={`p-1.5 rounded-md transition cursor-pointer ${
                            activeMenuJob?.id === job.id
                              ? 'bg-slate-200 text-slate-900'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Aksi lainnya"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modal Tambah Lowongan Kerja */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-slate-900">
                Tambah Lowongan Kerja
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              {/* Logo Perusahaan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Logo Perusahaan <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {/* Thumbnail / Placeholder */}
                  {isUploadingLogo ? (
                    <div className="shrink-0 w-14 h-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-[#c00015] bg-white shadow-2xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : newLogo ? (
                    <div className="relative shrink-0 w-14 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white p-1 shadow-2xs flex items-center justify-center">
                      <img
                        src={newLogo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="shrink-0 w-14 h-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-white shadow-2xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                  )}

                  {/* Input URL Logo */}
                  <input
                    type="url"
                    value={newLogo}
                    onChange={(e) => setNewLogo(e.target.value)}
                    placeholder="Masukkan tautan URL logo (https://...)"
                    className="flex-1 min-w-0 h-9 px-3 text-xs rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#c00015]"
                  />

                  {/* Tombol Unggah File */}
                  <label className="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 flex items-center gap-1.5 transition shrink-0 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>{isUploadingLogo ? 'Mengunggah...' : 'Pilih File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleProcessLogoUpload(file, setNewLogo, setIsUploadingLogo)
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Tombol Hapus jika ada logo */}
                  {newLogo && (
                    <button
                      type="button"
                      onClick={() => setNewLogo('')}
                      className="h-9 w-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center justify-center transition cursor-pointer shrink-0"
                      title="Hapus logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Posisi & Nama Perusahaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Posisi / Jabatan <span className="text-[#c00015]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Barista & Staff Kasir"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Perusahaan <span className="text-[#c00015]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Contoh: PT Sukabumi Kuliner Nusantara"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>
              </div>

              {/* Tipe Kerja & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipe Kerja
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015] cursor-pointer"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Remote">Remote</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Magang">Magang</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Contoh: Cikole, Kota Sukabumi"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>
              </div>

              {/* Pendidikan & Gaji */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pendidikan
                  </label>
                  <input
                    type="text"
                    value={newEducation}
                    onChange={(e) => setNewEducation(e.target.value)}
                    placeholder="Contoh: SMA / SMK / D3 / S1"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gaji
                  </label>
                  <input
                    type="text"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    placeholder="Contoh: Rp 2.500.000 - Rp 3.500.000"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>
              </div>

              {/* Deskripsi & Persyaratan (Di Atas Tautan Lamar) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deskripsi Pekerjaan
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Gambaran umum tugas dan tanggung jawab..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Persyaratan
                  </label>
                  <textarea
                    rows={3}
                    value={newRequirements}
                    onChange={(e) => setNewRequirements(e.target.value)}
                    placeholder={'Pria/Wanita maksimal 25 tahun\nPendidikan minimal SMA/SMK\nJujur & disiplin'}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015] leading-relaxed"
                  />
                </div>
              </div>

              {/* Tautan Lamar / WA (Di Bawah) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link / Kontak Pendaftaran <span className="text-[#c00015]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newApplyEmail}
                  onChange={(e) => setNewApplyEmail(e.target.value)}
                  placeholder="Link Google Form / website karir, atau nomor WhatsApp"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white font-bold transition shadow-xs cursor-pointer text-xs"
                >
                  Publikasikan Lowongan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Edit Lowongan Kerja */}
      {isEditModalOpen && editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-slate-900">
                Edit Lowongan Kerja
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingJob(null)
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              {/* Logo Perusahaan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Logo Perusahaan <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {/* Thumbnail / Placeholder */}
                  {isUploadingEditLogo ? (
                    <div className="shrink-0 w-14 h-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-[#c00015] bg-white shadow-2xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : editingJob.logo ? (
                    <div className="relative shrink-0 w-14 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white p-1 shadow-2xs flex items-center justify-center">
                      <img
                        src={editingJob.logo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="shrink-0 w-14 h-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-white shadow-2xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                  )}

                  {/* Input URL Logo */}
                  <input
                    type="url"
                    value={editingJob.logo || ''}
                    onChange={(e) => setEditingJob({ ...editingJob, logo: e.target.value })}
                    placeholder="Masukkan tautan URL logo (https://...)"
                    className="flex-1 min-w-0 h-9 px-3 text-xs rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#c00015]"
                  />

                  {/* Tombol Unggah File */}
                  <label className="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 flex items-center gap-1.5 transition shrink-0 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>{isUploadingEditLogo ? 'Mengunggah...' : 'Pilih File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingEditLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleProcessLogoUpload(
                            file,
                            (url) => setEditingJob({ ...editingJob, logo: url }),
                            setIsUploadingEditLogo
                          )
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Tombol Hapus jika ada logo */}
                  {editingJob.logo && (
                    <button
                      type="button"
                      onClick={() => setEditingJob({ ...editingJob, logo: undefined })}
                      className="h-9 w-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center justify-center transition cursor-pointer shrink-0"
                      title="Hapus logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Posisi & Perusahaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Posisi / Jabatan <span className="text-[#c00015]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingJob.title}
                    onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Perusahaan <span className="text-[#c00015]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingJob.company}
                    onChange={(e) => setEditingJob({ ...editingJob, company: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>
              </div>

              {/* Tipe Kerja & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipe Kerja
                  </label>
                  <select
                    value={editingJob.type}
                    onChange={(e) => setEditingJob({ ...editingJob, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015] cursor-pointer"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Remote">Remote</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Magang">Magang</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={editingJob.location}
                    onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>
              </div>

              {/* Pendidikan & Gaji */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pendidikan
                  </label>
                  <input
                    type="text"
                    value={editingJob.education || ''}
                    onChange={(e) => setEditingJob({ ...editingJob, education: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gaji
                  </label>
                  <input
                    type="text"
                    value={editingJob.salaryRange}
                    onChange={(e) => setEditingJob({ ...editingJob, salaryRange: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi Pekerjaan
                </label>
                <textarea
                  rows={3}
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015] leading-relaxed"
                />
              </div>

              {/* Tautan Lamar */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link / Kontak Pendaftaran <span className="text-[#c00015]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingJob.applyUrl || editingJob.applyEmail}
                  onChange={(e) =>
                    setEditingJob({
                      ...editingJob,
                      applyUrl: e.target.value,
                      applyEmail: e.target.value,
                    })
                  }
                  placeholder="Link Google Form / website karir, atau nomor WhatsApp"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-[#c00015]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingJob(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white font-bold transition shadow-xs cursor-pointer text-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Dropdown Menu Aksi Titik 3 (Render di Root Level agar selalu tajam, solid & tidak terpotong) */}
      {activeMenuJob && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          {/* Backdrop transparan untuk deteksi klik di luar */}
          <div
            className="fixed inset-0"
            onClick={() => setActiveMenuJob(null)}
          />

          {/* Kotak Menu Solid Putih */}
          <div
            className="fixed z-50 w-44 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden py-1 text-xs ring-1 ring-slate-900/5 animate-in fade-in duration-100"
            style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
          >
            <button
              type="button"
              onClick={() => {
                handleOpenEdit(activeMenuJob)
                setActiveMenuJob(null)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-800 hover:bg-slate-50 transition cursor-pointer font-medium text-left"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Edit Lowongan</span>
            </button>

            <Link
              href={`/loker/${activeMenuJob.id}`}
              target="_blank"
              onClick={() => setActiveMenuJob(null)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-800 hover:bg-slate-50 transition cursor-pointer font-medium text-left"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Lihat di Web</span>
            </Link>

            <div className="border-t border-slate-100 my-1" />

            <button
              type="button"
              onClick={() => {
                const jobToDelete = activeMenuJob
                setActiveMenuJob(null)
                handleDeleteJob(jobToDelete.id, jobToDelete.title)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold text-left"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Hapus Lowongan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
