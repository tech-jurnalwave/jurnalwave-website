import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fetchArticleById, fetchArticles } from '@/lib/wordpress';
import os from 'os';
import { EdgeTTS } from '@andresaya/edge-tts';

// Suara resmi presenter berita JurnalWave: Microsoft Azure/Edge Neural Voice (Pria Tegas & Semangat Berita)
const VOICE_NAME = 'id-ID-ArdiNeural';
const VOICE_RATE = '+6%'; // Tempo tegas, bersemangat dan lugas khas pembaca berita
const VOICE_PITCH = '+0Hz'; // Nada alami pria tegas

// Direktori cache audio yang aman baik di lokal maupun di serverless cloud Vercel (/tmp)
const CACHE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'jurnalwave-tts')
  : path.join(process.cwd(), '.cache', 'tts');

function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Cache dir creation notice:', err);
  }
}

// Kamus fonetik istilah serapan & singkatan agar dilafalkan alami oleh TTS Bahasa Indonesia
const PHONETIC_REPLACEMENTS: [RegExp, string][] = [
  // Singkatan umum & Lembaga
  [/\bUMKM\b/g, 'U M K M'],
  [/\bGen[- ]?Z\b/gi, 'Gen Zi'],
  [/\bWIB\b/g, 'W I B'],
  [/\bRp\s*([\d.,]+)/gi, '$1 rupiah'],
  // Musik & Hiburan
  [/\bline[- ]?up\b/gi, 'lain ap'],
  [/\bmerchandise\b/gi, 'mercendais'],
  [/\blive\b/gi, 'laif'],
  [/\bstreaming\b/gi, 'striming'],
  [/\bevent\b/gi, 'ivent'],
  [/\bcreative\b/gi, 'kreatif'],
  [/\bfest\b/gi, 'fes'],
  [/\bshowcase\b/gi, 'syokeis'],
  [/\bteaser\b/gi, 'tiser'],
  [/\btrailer\b/gi, 'treiler'],
  [/\bcomeback\b/gi, 'kambek'],
  // Bisnis & Gaya Hidup
  [/\bbrand\b/gi, 'brend'],
  [/\bbooth\b/gi, 'but'],
  [/\bcoffee shop\b/gi, 'kofi syop'],
  [/\bcold brew\b/gi, 'kold bru'],
  [/\blifestyle\b/gi, 'laifstail'],
  [/\breview\b/gi, 'rivyu'],
  [/\bweekend\b/gi, 'wik-end'],
  [/\bbudget\b/gi, 'bajet'],
  [/\bworkshop\b/gi, 'worsyop'],
  [/\bmeet[- ]?up\b/gi, 'mit ap'],
  // Digital & Teknologi
  [/\bstartup\b/gi, 'start ap'],
  [/\bgadget\b/gi, 'gejet'],
  [/\bsmartphone\b/gi, 'smartfon'],
  [/\bpodcast\b/gi, 'podkes'],
  [/\bonline\b/gi, 'onlain'],
  [/\boffline\b/gi, 'oflain'],
  [/\bupdate\b/gi, 'apdet'],
  [/\bdownload\b/gi, 'daunlod'],
  [/\bupload\b/gi, 'aplod'],
  [/\bgaming\b/gi, 'geming'],
  [/\bgamer\b/gi, 'gemer'],
  [/\bgame\b/gi, 'gem'],
  [/\bcontent creator\b/gi, 'konten krieitor'],
  [/\binfluencer\b/gi, 'influenser'],
  [/\brating\b/gi, 'reiting'],
  [/\bfeedback\b/gi, 'fidbek'],
  [/\bdeadline\b/gi, 'dedlain']
];

// Dekode entitas HTML umum agar tidak dibaca mentah oleh mesin TTS
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, 'dan')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&hellip;/gi, '...')
    .replace(/&mdash;/gi, ', ')
    .replace(/&ndash;/gi, ', ');
}

// Bersihkan teks berita agar 100% murni naskah artikel asli (tanpa instruksi/basa-basi)
function cleanArticleText(text: string): string {
  if (!text) return '';
  let cleaned = decodeHtmlEntities(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_#`~[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^(JURNALWAVE\.COM|JURNAL WAVE)(\s*[-–—]\s*)/i, '')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of PHONETIC_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  return cleaned;
}

// Memecah naskah berita panjang menjadi segmen aman (~1500 karakter) di batas kalimat
// Mencegah batas WebSocket EdgeTTS terlampaui dan menjamin 100% isi artikel dibacakan utuh
function splitTextIntoSafeChunks(text: string, maxChunkLength = 1500): string[] {
  if (text.length <= maxChunkLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      if (sentence.length > maxChunkLength) {
        const words = sentence.split(/\s+/);
        let subChunk = '';
        for (const word of words) {
          if ((subChunk + ' ' + word).trim().length <= maxChunkLength) {
            subChunk = subChunk ? `${subChunk} ${word}` : word;
          } else {
            if (subChunk.trim()) chunks.push(subChunk.trim());
            subChunk = word;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

// Menghasilkan audio pria ArdiNeural menggunakan EdgeTTS Node.js (Universal untuk Vercel & Lokal)
async function generateMaleAudioWithEdgeTTS(cleanText: string, cacheFile: string): Promise<Buffer> {
  const chunks = splitTextIntoSafeChunks(cleanText, 1500);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const tts = new EdgeTTS();
    await tts.synthesize(chunk, VOICE_NAME, {
      rate: VOICE_RATE,
      pitch: VOICE_PITCH,
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    });
    const buf = tts.toBuffer();
    if (buf && buf.length > 100) {
      audioBuffers.push(buf);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('EdgeTTS produced empty buffer');
  }

  const combined = Buffer.concat(audioBuffers);
  if (combined.length > 500) {
    try {
      ensureCacheDir();
      fs.writeFileSync(cacheFile, combined);
    } catch (saveErr) {
      console.warn('Could not write cache file:', saveErr);
    }
  }
  return combined;
}

// Mendapatkan buffer audio pria ArdiNeural konsisten 100% untuk seluruh artikel
async function getAudioBuffer(cleanText: string, cacheFile: string): Promise<Buffer> {
  ensureCacheDir();
  // 1. Jika sudah ada di disk cache, baca langsung (0.001 detik)
  if (fs.existsSync(cacheFile)) {
    try {
      const existing = fs.readFileSync(cacheFile);
      if (existing.length > 500) {
        return existing;
      }
    } catch {}
  }

  // 2. Generate audio pria ArdiNeural resmi via Node.js EdgeTTS (bekerja 100% di server Vercel & lokal)
  return await generateMaleAudioWithEdgeTTS(cleanText, cacheFile);
}

// Handler GET: Digunakan oleh pemutar audio HTML5 (<audio src="/api/tts?id=...">)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    let rawText = searchParams.get('text') || '';

    let cacheKey = '';

    if (id) {
      cacheKey = `article-${id}-ardi-v5`;
      if (!rawText) {
        let article: any = await fetchArticleById(id);
        if (!article) {
          const allArticles = await fetchArticles();
          article = allArticles.find((a) => String(a.id) === id || a.slug === id) || null;
        }
        if (article) {
          const title = article.title ? `${article.title.replace(/[.?!]+$/, '')}.` : '';
          const excerpt = article.excerpt ? `${article.excerpt.replace(/[.?!]+$/, '')}.` : '';
          const content = article.content || '';
          rawText = `${title} ${excerpt} ${content}`;
        }
      }
    }

    const clean = cleanArticleText(rawText);
    if (!clean) {
      return NextResponse.json({ error: 'Naskah berita kosong.' }, { status: 400 });
    }

    if (!cacheKey) {
      const hash = crypto.createHash('md5').update(clean).digest('hex').slice(0, 12);
      cacheKey = `text-${hash}-ardi-v5`;
    }

    ensureCacheDir();
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.mp3`);

    const fullBuffer = await getAudioBuffer(clean, cacheFile);
    const total = fullBuffer.length;

    // Dukungan HTTP Range seek (geser maju/mundur 10 detik atau klik slider)
    const range = request.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunksize = end - start + 1;
      const slice = fullBuffer.subarray(start, end + 1);

      return new Response(new Uint8Array(slice), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunksize),
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        },
      });
    }

    return new Response(new Uint8Array(fullBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(total),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('TTS GET Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses audio berita' },
      { status: 500 }
    );
  }
}

// Handler POST: Mendukung pengiriman custom text
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let rawText = body.text || '';
    const id = body.id;

    let cacheKey = '';
    if (id) {
      cacheKey = `article-${id}-ardi-v5`;
      if (!rawText) {
        let article: any = await fetchArticleById(id);
        if (!article) {
          const allArticles = await fetchArticles();
          article = allArticles.find((a) => String(a.id) === id || a.slug === id) || null;
        }
        if (article) {
          const title = article.title ? `${article.title.replace(/[.?!]+$/, '')}.` : '';
          const excerpt = article.excerpt ? `${article.excerpt.replace(/[.?!]+$/, '')}.` : '';
          const content = article.content || '';
          rawText = `${title} ${excerpt} ${content}`;
        }
      }
    }

    const clean = cleanArticleText(rawText);
    if (!clean) {
      return NextResponse.json({ error: 'Naskah teks tidak boleh kosong.' }, { status: 400 });
    }

    if (!cacheKey) {
      const hash = crypto.createHash('md5').update(clean).digest('hex').slice(0, 12);
      cacheKey = `text-${hash}-ardi-v5`;
    }

    ensureCacheDir();
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.mp3`);

    const fullBuffer = await getAudioBuffer(clean, cacheFile);

    return new Response(new Uint8Array(fullBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(fullBuffer.length),
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('TTS POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menghasilkan audio' },
      { status: 500 }
    );
  }
}
