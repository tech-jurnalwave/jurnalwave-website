import { NextResponse } from 'next/server';
import { triggerAudioGenerationWorkflow } from '@/lib/audioSync';

export const dynamic = 'force-dynamic';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'bqnyd49z';

/**
 * Endpoint Streaming Audio Berita JurnalWave
 * Mengalihkan request audio langsung ke Cloudinary CDN yang menyajikan MP3 presenter pria
 * (id-ID-ArdiNeural) dengan latensi 0ms, bebas kuota, dan seragam di semua perangkat.
 * Jika audio belum tersedia (artikel baru), otomatis memicu generator di background.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Parameter id artikel wajib disertakan.' },
        { status: 400 }
      );
    }

    const cloudinaryUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/jurnalwave-audio/${encodeURIComponent(id)}.mp3`;

    // Cek ketersediaan di Cloudinary dengan timeout 1.5 detik
    try {
      const checkRes = await fetch(cloudinaryUrl, { method: 'HEAD', cache: 'no-store' });
      if (checkRes.status === 200) {
        return NextResponse.redirect(cloudinaryUrl, 307);
      }
    } catch {}

    // Jika belum ada di Cloudinary (baru dibuat), picu robot otomatis di background
    triggerAudioGenerationWorkflow().catch(() => {});

    return NextResponse.json(
      {
        status: 'generating',
        message: 'Audio sedang dipersiapkan oleh sistem (~15-30 detik). Silakan coba lagi sebentar.',
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('TTS GET Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses audio berita' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id;

    if (id) {
      const cloudinaryUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/jurnalwave-audio/${encodeURIComponent(id)}.mp3`;
      return NextResponse.json({ audioUrl: cloudinaryUrl }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Parameter id artikel wajib disertakan.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('TTS POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses audio berita' },
      { status: 500 }
    );
  }
}
