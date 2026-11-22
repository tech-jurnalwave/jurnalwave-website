'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import { Reel } from '@/types';

interface ReelsSectionProps {
  reels?: Reel[];
  hideSeeAll?: boolean;
  hideHeader?: boolean;
  isGalleryPage?: boolean;
  title?: string;
  subtitle?: string;
  limit?: number;
}

export const ReelsSection: React.FC<ReelsSectionProps> = ({
  reels = [],
  hideSeeAll = false,
  hideHeader = false,
  isGalleryPage = false,
  title = 'Wave Reels',
  subtitle,
  limit
}) => {
  const [currentReels, setCurrentReels] = useState<Reel[]>(reels);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Muat seketika dari localStorage agar video reels yang diunggah pengguna langsung muncul
    const syncLocalReels = () => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('jurnal_wave_reels');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              setCurrentReels(parsed);
              return true;
            }
          }
        } catch {}
      }
      return false;
    };

    const hasLocal = syncLocalReels();

    const fetchLatestReels = async () => {
      try {
        const res = await fetch('/api/reels', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0 && isMounted) {
            setCurrentReels(json.data);
            if (typeof window !== 'undefined') {
              localStorage.setItem('jurnal_wave_reels', JSON.stringify(json.data));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch reels from server:', err);
      }
    };

    if (reels && reels.length > 0) {
      if (!hasLocal) setCurrentReels(reels);
    } else {
      fetchLatestReels();
    }

    const handleUpdate = () => {
      syncLocalReels();
      fetchLatestReels();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('reels-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('reels-updated', handleUpdate);
    };
  }, [reels]);

  const filteredReels = useMemo(() => {
    let list = currentReels;
    if (limit && limit > 0) {
      list = list.slice(0, limit);
    }
    return list;
  }, [currentReels, limit]);

  const handleScrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  if (!isGalleryPage && filteredReels.length === 0) {
    return null;
  }

  const renderPlatformBadge = (reel: Reel) => {
    const url = (reel.socialUrl || reel.videoUrl || '').toLowerCase();
    const platform = reel.platform?.toLowerCase();

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
      );
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
      );
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
    );
  };

  return (
    <section className={hideHeader ? 'my-2' : 'border-t border-slate-100 dark:border-zinc-800 pt-4 mt-2 mb-4'}>
      {/* Header ala SukabumiUpdate (dengan garis merah dan tombol Geser) */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 sm:h-5 bg-[#c00015] rounded-none shrink-0 inline-block" />
            <h2 className="font-heading font-extrabold text-sm sm:text-base tracking-wider uppercase text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{title}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Geser Carousel */}
            {!isGalleryPage && (
              <button
                type="button"
                onClick={handleScrollRight}
                aria-label="Geser Video Reels"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 transition cursor-pointer"
              >
                <span>Geser</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {!hideSeeAll && (
              <Link
                href="/reels"
                className="text-xs font-semibold text-[#c00015] hover:text-[#a00012] flex items-center gap-1 transition"
              >
                <span>Lihat Semua</span>
                <span className="text-[10px]">›</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Responsive Layout: Compact Horizontal Slider atau Gallery Grid */}
      {filteredReels.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
          Belum ada video reels yang tersedia.
        </div>
      ) : (
        <div
          ref={sliderRef}
          className={
            isGalleryPage
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'
              : 'flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2'
          }
        >
          {filteredReels.map((reel) => {
            const targetUrl = reel.socialUrl || reel.videoUrl || 'https://instagram.com';

            return (
              <a
                key={reel.id}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Buka "${reel.title}" di ${reel.platform || 'Medsos'}`}
                className={`relative ${
                  isGalleryPage
                    ? 'w-full'
                    : 'w-[150px] sm:w-[165px] md:w-[175px] shrink-0 snap-start'
                } aspect-[9/16] rounded-xl overflow-hidden group cursor-pointer bg-zinc-950 shadow-2xs hover:shadow-md transition-all duration-300 block select-none border border-slate-200/20`}
              >
                {/* Image Poster */}
                {/* eslint-disable-next-img-element */}
                <img
                  src={reel.thumbnailUrl}
                  alt={reel.imageAlt || reel.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/40 flex flex-col justify-between p-2 sm:p-2.5">
                  {/* Top Row: Badge Medsos */}
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
                  <div className="flex flex-col gap-0.5 z-10">
                    <p className="text-white font-bold text-[11px] sm:text-xs leading-snug line-clamp-2 drop-shadow-sm group-hover:text-red-200 transition-colors">
                      {reel.title}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
};
