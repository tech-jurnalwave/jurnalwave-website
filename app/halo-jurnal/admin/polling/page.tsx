'use client'

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Edit3,
  Trash2,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import { Poll } from '@/types'
import AdminToast from '@/components/admin/AdminToast'
import { useConfirm } from '@/components/admin/AdminConfirmDialog'

export default function AdminPollingPage() {
  const confirmDialog = useConfirm()
  const [polls, setPolls] = useState<Poll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPollId, setEditingPollId] = useState<string | null>(null)

  // Form State
  const [formQuestion, setFormQuestion] = useState('')
  const [formCategory, setFormCategory] = useState('Sport & E-Sport')
  const [formOptions, setFormOptions] = useState<string[]>(['', '', ''])
  const [formIsActive, setFormIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Tampilkan toast selama 3.5 detik
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Load seluruh polling dari server (dengan fallback localStorage & default)
  const loadPolls = async () => {
    // 1. Coba baca dari localStorage terlebih dahulu untuk instan render
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_admin_polls')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPolls(parsed)
          }
        }
      } catch {}
    }

    try {
      setIsLoading(true)
      const res = await fetch('/api/polls?all=true', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPolls(json.data)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('jurnal_wave_admin_polls', JSON.stringify(json.data))
              const active = json.data.find((p: Poll) => Boolean(p.isActive))
              if (active) {
                localStorage.setItem('jurnal_wave_active_poll', JSON.stringify(active))
              }
            } catch {}
          }
          return
        }
      }
    } catch (err) {
      console.warn('Notice loading polls from server:', err)
    } finally {
      setIsLoading(false)
    }

    // Fallback ke localStorage jika server offline
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_admin_polls')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPolls(parsed)
            return
          }
        }
      } catch {}
    }

    setPolls([])
  }

  useEffect(() => {
    // 1. Muat instan dari localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_admin_polls')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPolls(parsed)
          } else {
            setPolls([])
          }
        } else {
          setPolls([])
        }
      } catch {
        setPolls([])
      }
    }
    loadPolls()
  }, [])

  // Buka modal untuk Tambah Polling Baru
  const handleOpenCreateModal = () => {
    setEditingPollId(null)
    setFormQuestion('')
    setFormCategory('Sport & E-Sport')
    setFormOptions(['', '', ''])
    setFormIsActive(true)
    setIsModalOpen(true)
  }

  // Buka modal untuk Edit Polling yang sudah ada
  const handleOpenEditModal = (poll: Poll) => {
    setEditingPollId(poll.id)
    setFormQuestion(poll.question)
    setFormCategory(poll.category || 'Umum')
    setFormOptions(poll.options.map((o) => o.text))
    setFormIsActive(Boolean(poll.isActive))
    setIsModalOpen(true)
  }

  // Tambah baris opsi baru di modal
  const handleAddOptionField = () => {
    if (formOptions.length >= 6) {
      showToast('Maksimal 6 pilihan jawaban.')
      return
    }
    setFormOptions([...formOptions, ''])
  }

  // Hapus baris opsi di modal
  const handleRemoveOptionField = (idx: number) => {
    if (formOptions.length <= 2) {
      showToast('Minimal harus ada 2 pilihan jawaban.')
      return
    }
    setFormOptions(formOptions.filter((_, i) => i !== idx))
  }

  // Update isi opsi jawaban tertentu
  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...formOptions]
    updated[idx] = val
    setFormOptions(updated)
  }


  // Simpan Polling (Tambah atau Edit)
  const handleSavePoll = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formQuestion.trim()) {
      showToast('Pertanyaan polling tidak boleh kosong!')
      return
    }

    const validOptions = formOptions.map((o) => o.trim()).filter((o) => o.length > 0)
    if (validOptions.length < 2) {
      showToast('Minimal harus ada 2 pilihan jawaban yang valid.')
      return
    }

    try {
      setIsSaving(true)

      if (editingPollId) {
        // Edit Polling
        const currentPoll = polls.find((p) => p.id === editingPollId)
        const updatedOptions = validOptions.map((text) => {
          const matched = currentPoll?.options.find((o) => o.text.trim().toLowerCase() === text.toLowerCase())
          return {
            text,
            votes: matched ? matched.votes : 0,
          }
        })

        const res = await fetch('/api/polls', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPollId,
            question: formQuestion.trim(),
            category: formCategory.trim(),
            isActive: formIsActive,
            options: updatedOptions,
          }),
        })

        if (res.ok) {
          const json = await res.json().catch(() => ({}))
          showToast('Polling berhasil diperbarui.')
        } else {
          showToast('Polling berhasil diperbarui di penyimpanan lokal.')
        }

        let updatedPolls = polls.map((p) => {
          if (p.id === editingPollId) {
            return {
              ...p,
              question: formQuestion.trim(),
              category: formCategory.trim(),
              isActive: formIsActive,
              options: updatedOptions.map((o, idx) => ({ id: `opt-${idx}`, text: o.text, votes: o.votes })),
            }
          }
          return formIsActive ? { ...p, isActive: false } : p
        })
        setPolls(updatedPolls)
        if (typeof window !== 'undefined') {
          localStorage.setItem('jurnal_wave_admin_polls', JSON.stringify(updatedPolls))
          const active = updatedPolls.find((p) => p.isActive)
          if (active) {
            localStorage.setItem('jurnal_wave_active_poll', JSON.stringify(active))
          } else {
            localStorage.removeItem('jurnal_wave_active_poll')
          }
          window.dispatchEvent(new CustomEvent('poll-updated'))
          window.dispatchEvent(new Event('storage'))
        }
        setIsModalOpen(false)
      } else {
        // Tambah Polling Baru
        const newPollItem: Poll = {
          id: `poll-${Date.now()}`,
          question: formQuestion.trim(),
          category: formCategory.trim(),
          isActive: formIsActive,
          createdAt: new Date().toISOString(),
          totalVotes: 0,
          options: validOptions.map((text, idx) => ({ id: `opt-${Date.now()}-${idx}`, text, votes: 0 })),
        }

        const res = await fetch('/api/polls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: formQuestion.trim(),
            category: formCategory.trim(),
            isActive: formIsActive,
            options: validOptions,
          }),
        })

        if (res.ok) {
          showToast('Polling baru berhasil diterbitkan!')
        } else {
          showToast('Polling baru berhasil diterbitkan di penyimpanan lokal!')
        }

        let nextPolls = [newPollItem, ...polls]
        if (formIsActive) {
          nextPolls = nextPolls.map((p) => (p.id === newPollItem.id ? p : { ...p, isActive: false }))
        }
        setPolls(nextPolls)
        if (typeof window !== 'undefined') {
          localStorage.setItem('jurnal_wave_admin_polls', JSON.stringify(nextPolls))
          if (formIsActive) {
            localStorage.setItem('jurnal_wave_active_poll', JSON.stringify(newPollItem))
          }
          window.dispatchEvent(new CustomEvent('poll-updated'))
          window.dispatchEvent(new Event('storage'))
        }
        setIsModalOpen(false)
      }
    } catch (err) {
      console.error('Error saving poll:', err)
      showToast('Terjadi kesalahan sistem saat menyimpan polling.')
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle status aktif/nonaktif polling di beranda
  const handleToggleActive = async (pollId: string, currentActive: boolean) => {
    const nextState = !currentActive

    // 1. Update optimistik instan di state & localStorage (0ms respons visual)
    const updatedPolls = polls.map((p) => {
      if (p.id === pollId) {
        return { ...p, isActive: nextState }
      }
      return nextState ? { ...p, isActive: false } : p
    })
    setPolls(updatedPolls)

    if (typeof window !== 'undefined') {
      localStorage.setItem('jurnal_wave_admin_polls', JSON.stringify(updatedPolls))
      const active = updatedPolls.find((p) => p.isActive)
      if (active) {
        localStorage.setItem('jurnal_wave_active_poll', JSON.stringify(active))
      } else {
        localStorage.removeItem('jurnal_wave_active_poll')
      }
      window.dispatchEvent(new CustomEvent('poll-updated'))
      window.dispatchEvent(new Event('storage'))
    }

    try {
      const res = await fetch('/api/polls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pollId, isActive: nextState }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        showToast(
          nextState
            ? 'Polling berhasil ditayangkan di Beranda.'
            : 'Polling berhasil dinonaktifkan dari Beranda.'
        )
      } else {
        showToast(
          nextState
            ? 'Polling ditayangkan di Beranda (penyimpanan lokal).'
            : 'Polling dinonaktifkan dari Beranda.'
        )
      }
    } catch {
      showToast(
        nextState
          ? 'Polling ditayangkan di Beranda (penyimpanan lokal).'
          : 'Polling dinonaktifkan dari Beranda.'
      )
    }
  }

  // Hapus polling
  const handleDelete = async (pollId: string) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Polling?',
      message: 'Yakin ingin menghapus polling ini secara permanen?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (!isConfirmed) return

    // 1. Update optimistik instan
    const remaining = polls.filter((p) => p.id !== pollId)
    setPolls(remaining)

    if (typeof window !== 'undefined') {
      localStorage.setItem('jurnal_wave_admin_polls', JSON.stringify(remaining))
      const active = remaining.find((p) => p.isActive)
      if (active) {
        localStorage.setItem('jurnal_wave_active_poll', JSON.stringify(active))
      } else {
        localStorage.removeItem('jurnal_wave_active_poll')
      }
      window.dispatchEvent(new CustomEvent('poll-updated'))
      window.dispatchEvent(new Event('storage'))
    }

    try {
      const res = await fetch(`/api/polls?id=${encodeURIComponent(pollId)}`, {
        method: 'DELETE',
      })
      showToast('Polling berhasil dihapus.')
    } catch {
      showToast('Polling berhasil dihapus dari penyimpanan lokal.')
    }
  }

  // Polling aktif saat ini di beranda (hanya jika isActive bernilai true)
  const activePoll = polls.find((p) => Boolean(p.isActive)) || null
  const inactivePolls = polls.filter((p) => !p.isActive)

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      <AdminToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
            Polling Pembaca
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur pertanyaan interaktif dan pantau hasil suara pembaca di beranda website.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPolls}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-2xs cursor-pointer hover:border-[#c00015]/40 hover:text-[#c00015] disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#c00015]' : ''}`} />
            <span>{isLoading ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Polling Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Kartu Polling yang Sedang Aktif di Beranda */}
      {activePoll ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
          {/* Top Bar Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c00015] rounded-none shrink-0" />
              <h2 className="font-heading font-extrabold text-xs sm:text-sm text-slate-900 tracking-wider uppercase">
                POLLING AKTIF DI BERANDA
              </h2>
              <span className="text-[10px] font-bold bg-[#c00015] text-white px-2 py-0.5 rounded uppercase tracking-wider">
                Live
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleToggleActive(activePoll.id, true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer select-none"
                title="Hentikan penayangan polling ini di Beranda"
              >
                <span>Nonaktifkan</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditModal(activePoll)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#c00015] hover:border-[#c00015]/30 transition-colors cursor-pointer select-none"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Polling</span>
              </button>
            </div>
          </div>

          {/* Grid 2-Kolom: Konten & Hasil Suara */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start w-full">
            {/* Kolom Kiri: Pertanyaan & Total Suara */}
            <div className="flex flex-col justify-between h-full space-y-3">
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 leading-snug">
                  {activePoll.question}
                </h3>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Tayang di halaman utama website</span>
                <span className="font-semibold text-slate-800">
                  {(activePoll.totalVotes || 0).toLocaleString('id-ID')} suara masuk
                </span>
              </div>
            </div>

            {/* Kolom Kanan: Rekap Opsi & Progress Bar */}
            <div className="flex flex-col gap-2">
              {activePoll.options.map((opt) => {
                const total = activePoll.totalVotes || 0
                const percentage = total > 0 ? Math.round((opt.votes / total) * 100) : 0

                return (
                  <div
                    key={opt.id}
                    className="py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2.5 text-xs">
                      <span className="font-semibold text-slate-800 truncate">
                        {opt.text}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        <span className="text-slate-500 text-[11px]">
                          {opt.votes.toLocaleString('id-ID')} suara
                        </span>
                        <span className="font-bold text-[#c00015] min-w-8 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#c00015] transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Saat ini tidak ada polling yang aktif di Beranda
          </p>
          <p className="text-xs text-slate-500">
            Aktifkan saklar pada salah satu polling di riwayat bawah untuk menayangkannya, atau buat polling baru.
          </p>
        </div>
      )}

      {/* 3. Tabel Riwayat Polling Tidak Aktif */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-800">Riwayat Polling</span>
            <span className="ml-1 text-slate-400">({inactivePolls.length})</span>
          </div>
          <span className="text-[11px]">Daftar polling yang telah selesai atau tidak aktif</span>
        </div>

        <div className="w-full overflow-x-auto [scrollbar-width:thin]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-[40%]">Pertanyaan</th>
                <th className="py-3 px-4 w-[36%]">Pilihan Jawaban & Hasil Suara</th>
                <th className="py-3 px-3 w-[12%] text-center">Total Suara</th>
                <th className="py-3 px-3 w-[6%] text-center">Tayangkan</th>
                <th className="py-3 px-4 w-[6%] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inactivePolls.map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <p className="font-semibold text-slate-900 leading-snug">
                        {p.question}
                      </p>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="space-y-1">
                        {p.options.map((opt) => {
                          const pct = p.totalVotes && p.totalVotes > 0 ? Math.round((opt.votes / p.totalVotes) * 100) : 0
                          return (
                            <div key={opt.id} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                              <span className="truncate max-w-[200px]">• {opt.text}</span>
                              <span className="font-medium text-[11px] text-slate-500 shrink-0">
                                {opt.votes} ({pct}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-slate-800 whitespace-nowrap align-middle">
                      {(p.totalVotes || 0).toLocaleString('id-ID')}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p.id, false)}
                        title="Klik untuk menayangkan polling ini di Beranda"
                        className="relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none"
                        style={{ backgroundColor: '#d1d5db' }}
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200"
                          style={{ transform: 'translateX(1px)' }}
                        />
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#c00015] hover:border-[#c00015]/40 hover:bg-red-50/40 transition cursor-pointer"
                          title="Edit Polling"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
                          title="Hapus Polling"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {inactivePolls.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    Tidak ada riwayat polling nonaktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Polling (Bisa Manual & Rekomendasi AI) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-heading font-bold text-slate-900 text-sm">
                {editingPollId ? 'Edit Polling' : 'Tambah Polling Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>


            {/* Form Input Utama */}
            <form onSubmit={handleSavePoll} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pertanyaan Polling *
                </label>
                <textarea
                  rows={3}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Contoh: Siapakah pemain terbaik yang layak menerima penghargaan musim ini?"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#c00015]"
                  required
                />
              </div>


              {/* Opsi-opsi Jawaban */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilihan Jawaban (Minimal 2, Maksimal 6) *
                  </label>
                  {formOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOptionField}
                      className="text-xs font-semibold text-[#c00015] hover:underline cursor-pointer"
                    >
                      + Tambah Opsi
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-semibold text-slate-400">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Pilihan Jawaban ${idx + 1}`}
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#c00015]"
                        required
                      />
                      {formOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Hapus Opsi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#c00015] border-slate-300 focus:ring-[#c00015]"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">
                    Jadikan sebagai Polling Aktif di Beranda sekarang
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-[#c00015] hover:bg-[#a00012] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingPollId ? 'Simpan Perubahan' : 'Terbitkan Polling'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
