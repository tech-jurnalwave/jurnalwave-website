import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'bqnyd49z';

/**
 * Endpoint Streaming Audio Berita JurnalWave
 * Mengalihkan request audio langsung ke Cloudinary CDN yang menyajikan MP3 presenter pria
 * (id-ID-ArdiNeural) dengan latensi 0ms, bebas kuota, dan seragam di semua perangkat.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const cloudinaryUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/jurnalwave-audio/${encodeURIComponent(id)}.mp3`;
      return NextResponse.redirect(cloudinaryUrl, 307);
    }

    return NextResponse.json(
      { error: 'Parameter id artikel wajib disertakan.' },
      { status: 400 }
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
