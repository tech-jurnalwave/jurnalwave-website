'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  GraduationCap,
  Briefcase,
  Banknote,
  Bookmark,
  Share2,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { Job } from '@/types';
import { DUMMY_JOBS } from '@/data/dummyJobs';
import { formatJobDate } from '@/components/cards/JobCard';
import { isJobSaved, toggleJobBookmark } from '@/lib/bookmarks';

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [allJobs, setAllJobs] = useState<Job[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jurnal_wave_jobs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DUMMY_JOBS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    const syncSaved = () => {
      setIsSaved(isJobSaved(id));
    };
    syncSaved();
    window.addEventListener('storage', syncSaved);
    window.addEventListener('bookmarks-updated', syncSaved);
    return () => {
      window.removeEventListener('storage', syncSaved);
      window.removeEventListener('bookmarks-updated', syncSaved);
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const fetchJobDetail = async () => {
      try {
        const res = await fetch('/api/jobs');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            if (isMounted) setAllJobs(json.data);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('jurnal_wave_jobs', JSON.stringify(json.data));
              } catch {}
            }
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }

      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('jurnal_wave_jobs');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              setAllJobs(parsed);
            }
          }
        } catch {}
      }
    };

    fetchJobDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleBookmark = () => {
    if (!id) return;
    const next = toggleJobBookmark(id);
    setIsSaved(next);
  };

  const job = allJobs.find(j => j.id === id) || DUMMY_JOBS.find(j => j.id === id);

  // 1. Tampilan Loading Skeleton jika data masih dimuat dan belum ditemukan di cache
  if (!job && isLoading) {
    return (
      <div className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-5 pb-20 flex flex-col min-w-0">
        <div className="mb-3.5">
          <Link
            href="/loker"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#c00015] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Lowongan Kerja</span>
          </Link>
        </div>

        {/* Skeleton Header */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xs mb-4 flex flex-col gap-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-200 dark:bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-4 bg-slate-100 dark:bg-zinc-800/60 rounded w-1/3" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
            <div className="space-y-1.5 w-1/2">
              <div className="h-3.5 bg-slate-100 dark:bg-zinc-800 rounded w-1/3" />
              <div className="h-3.5 bg-slate-100 dark:bg-zinc-800 rounded w-1/2" />
            </div>
            <div className="h-9 w-28 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
          </div>
        </div>

        {/* Skeleton Detail Konten */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xs animate-pulse space-y-5">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/4" />
            <div className="h-3.5 bg-slate-100 dark:bg-zinc-800 rounded w-full" />
            <div className="h-3.5 bg-slate-100 dark:bg-zinc-800 rounded w-5/6" />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/3" />
            <div className="h-3.5 bg-slate-100 dark:bg-zinc-800 rounded w-2/3" />
            <div className="h-3.5 bg-slate-100 dark:bg-zinc-800 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Tampilan Tidak Ditemukan hanya jika sudah selesai loading dan benar-benar tidak ada
  if (!job) {
    return (
      <div className="flex flex-1 mx-auto max-w-container-max w-full px-margin-mobile md:px-margin-desktop py-20 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <Briefcase className="w-12 h-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Lowongan Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500 mb-6">
            Lowongan kerja yang Anda cari tidak tersedia atau telah ditutup.
          </p>
          <Link
            href="/loker"
            className="px-5 py-2.5 rounded-full bg-[#c00015] text-white font-bold text-sm"
          >
            Kembali ke Daftar Loker
          </Link>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      if (navigator.share) {
        navigator.share({
          title: job.title,
          text: `Lowongan kerja ${job.title} di ${job.company}`,
          url: window.location.href
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link lowongan berhasil disalin ke clipboard!');
      }
    }
  };

  const handleApply = () => {
    const rawLink = (job.applyUrl || job.applyEmail || '').trim();
    if (!rawLink) {
      alert('Tautan pendaftaran belum tersedia untuk lowongan ini.');
      return;
    }

    if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
      window.open(rawLink, '_blank', 'noopener,noreferrer');
      return;
    }

    if (rawLink.startsWith('wa.me/')) {
      window.open(`https://${rawLink}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (rawLink.includes('@') && !rawLink.includes('/')) {
      window.location.href = `mailto:${rawLink}?subject=Lamaran%20Pekerjaan%20-%20${encodeURIComponent(job.title)}%20-%20[Nama%20Lengkap]`;
      return;
    }

    const cleanDigits = rawLink.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 10) {
      const waNum = cleanDigits.startsWith('0') ? '62' + cleanDigits.slice(1) : cleanDigits;
      window.open(`https://wa.me/${waNum}?text=Halo%20saya%20tertarik%20melamar%20posisi%20${encodeURIComponent(job.title)}%20di%20${encodeURIComponent(job.company)}`, '_blank', 'noopener,noreferrer');
      return;
    }

    window.open(`https://${rawLink}`, '_blank', 'noopener,noreferrer');
  };

  const defaultBenefits = [
    'Gaji pokok sesuai UMK',
    'BPJS Kesehatan & Ketenagakerjaan',
    'Tunjangan makan & transportasi',
    'Jenjang karir yang jelas'
  ];

  return (
    <div className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-5 pb-20 flex flex-col min-w-0">
      <main className="w-full flex flex-col min-w-0">
        {/* Back Link */}
        <div className="mb-3.5">
          <Link
            href="/loker"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#c00015] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Kembali ke Lowongan Kerja</span>
          </Link>
        </div>

        {/* ================= 1. HEADER KARTU LOKER (Sleek Modern & Compact) ================= */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xs mb-4 flex flex-col gap-3.5 sm:gap-4">
          {/* Baris Atas: Ikon + Judul/Perusahaan di Kiri, Simpan & Share di Kanan Atas */}
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700/60 flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-2xs">
                {job.logo ? (
                  <img
                    src={job.logo}
                    alt={job.company}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.logo-fallback');
                        if (fallback) fallback.classList.remove('hidden');
                      }
                    }}
                  />
                ) : null}
                <div className={`logo-fallback ${job.logo ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-slate-400 dark:text-zinc-500`}>
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.8] text-[#c00015]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-heading font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-snug">
                  {job.title}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-zinc-400 mt-0.5">
                  {job.company}
                </p>
              </div>
            </div>

            {/* Kanan Atas: Tombol Simpan & Share */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleToggleBookmark}
                aria-label="Simpan Lowongan"
                title={isSaved ? 'Tersimpan (Klik untuk batal)' : 'Simpan Lowongan'}
                className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  isSaved
                    ? 'border-[#c00015] bg-[#c00015]/10 text-[#c00015]'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-[#c00015] hover:border-[#c00015] bg-white dark:bg-zinc-900'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                aria-label="Bagikan Lowongan"
                title="Bagikan Lowongan"
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-[#c00015] hover:border-[#c00015] bg-white dark:bg-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Baris Bawah: Metadata Mengurut ke Bawah di Kiri + Lamar Sekarang & Dibutuhkan Segera di Kanan Bawah */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
            {/* List Vertikal: Gaji, Lokasi, Tipe, Pendidikan */}
            <div className="flex flex-col gap-2 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#c00015] shrink-0" />
                <span className="font-bold text-[#c00015] dark:text-rose-400">
                  {job.salaryRange}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{job.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{job.education || 'Minimal SMA/SMK'}</span>
              </div>
            </div>

            {/* Kanan Bawah: Teks Status & Tombol Lamar Sekarang */}
            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 self-end w-full sm:w-auto">
              {job.isActive === false ? (
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                  Lowongan Telah Ditutup
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                  Dibutuhkan Segera
                </span>
              )}

              {job.isActive === false ? (
                <button
                  disabled
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 font-bold text-xs sm:text-sm cursor-not-allowed text-center flex items-center justify-center gap-1.5"
                >
                  <span>Pendaftaran Ditutup</span>
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#c00015] hover:bg-[#a00012] text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5"
                >
                  <span>Lamar Sekarang</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================= 2. KONTEN DETAIL UTAMA (Single Unified Flow) ================= */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xs mb-8 flex flex-col gap-6">
          {/* Deskripsi Pekerjaan */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              Deskripsi Pekerjaan
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </section>

          {/* Kualifikasi */}
          <section className="flex flex-col gap-2.5 pt-5 border-t border-slate-100 dark:border-zinc-800">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              Kualifikasi &amp; Persyaratan
            </h3>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 flex flex-col gap-1.5 leading-relaxed">
              {job.requirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </section>

          {/* Benefit & Fasilitas */}
          <section className="flex flex-col gap-2.5 pt-5 border-t border-slate-100 dark:border-zinc-800">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Benefit &amp; Fasilitas
            </h3>
            <div className="flex flex-wrap gap-2">
              {(job.benefits && job.benefits.length > 0 ? job.benefits : defaultBenefits).map((ben, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60"
                >
                  {ben}
                </span>
              ))}
            </div>
          </section>

          {/* Hari & Jam Kerja (Inline Compact) */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/50 text-xs">
            <div>
              <span className="block text-slate-500 font-medium">Hari Kerja</span>
              <span className="block font-bold text-slate-900 dark:text-zinc-100 mt-0.5">Senin - Jumat</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Jam Kerja</span>
              <span className="block font-bold text-slate-900 dark:text-zinc-100 mt-0.5">08:30 - 17:30 WIB</span>
            </div>
          </div>

          {/* Tentang Perusahaan (Minimalis) */}
          <section className="flex flex-col gap-1.5 pt-5 border-t border-slate-100 dark:border-zinc-800">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
              Tentang {job.company}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              {job.company} merupakan salah satu entitas usaha terpercaya yang beroperasi di wilayah Sukabumi dan sekitarnya, berkomitmen memberikan kontribusi nyata serta peluang karir yang berkelanjutan bagi talenta lokal.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
