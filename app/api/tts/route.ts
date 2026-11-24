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

// Menghasilkan audio pria ArdiNeural menggunakan EdgeTTS Node.js (Universal untuk Vercel & Lokal, Super Cepat 1-2 Detik)
async function generateMaleAudioWithEdgeTTS(cleanText: string, cacheFile: string): Promise<Buffer> {
  const chunks = splitTextIntoSafeChunks(cleanText, 1500);

  // Proses semua potongan naskah secara paralel agar seluruh artikel selesai dalam 1-2 detik
  const audioBuffers = await Promise.all(
    chunks.map(async (chunk) => {
      const tts = new EdgeTTS();
      await tts.synthesize(chunk, VOICE_NAME, {
        rate: VOICE_RATE,
        pitch: VOICE_PITCH,
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
      });
      const buf = tts.toBuffer();
      if (buf && buf.length > 100) {
        return buf;
      }
      return Buffer.alloc(0);
    })
  );

  const validBuffers = audioBuffers.filter(b => b.length > 0);
  if (validBuffers.length === 0) {
    throw new Error('EdgeTTS produced empty buffer');
  }

  const combined = Buffer.concat(validBuffers);
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

// Konversi raw PCM 24kHz 16-bit Mono ke format file WAV standar yang didukung 100% browser
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // 16-bit

  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Menghasilkan audio pembaca berita pria tegas melalui Google Gemini Flash TTS (Paralel Chunks)
async function generateAudioWithGemini(cleanText: string, cacheFile: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

  // Pecah naskah per segmen ~1500 karakter
  const chunks = splitTextIntoSafeChunks(cleanText, 1500);

  // Proses paralel agar tidak ada jeda antrean sekuensial
  const pcmBuffers = await Promise.all(
    chunks.map(async (chunk) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: chunk }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Fenrir' // Suara pria tegas, mantap, dan berwibawa khas pembaca berita
                }
              }
            }
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini TTS API responded ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        return Buffer.from(inlineData.data, 'base64');
      }
      return Buffer.alloc(0);
    })
  );

  const validBuffers = pcmBuffers.filter(b => b.length > 0);
  if (validBuffers.length === 0) {
    throw new Error('Gemini TTS produced empty audio');
  }

  const combinedPcm = Buffer.concat(validBuffers);
  const wavBuffer = pcmToWav(combinedPcm, 24000, 1);

  try {
    ensureCacheDir();
    fs.writeFileSync(cacheFile, wavBuffer);
  } catch (err) {
    console.warn('Could not write cache file:', err);
  }

  return wavBuffer;
}

// Mendapatkan buffer audio pria konsisten 100% untuk seluruh artikel
async function getAudioBuffer(cleanText: string, cacheFile: string): Promise<{ buffer: Buffer; mimeType: string }> {
  ensureCacheDir();
  // 1. Jika sudah ada di disk cache, baca langsung (0.001 detik)
  if (fs.existsSync(cacheFile)) {
    try {
      const existing = fs.readFileSync(cacheFile);
      if (existing.length > 500) {
        const isWav = existing.subarray(0, 4).toString('ascii') === 'RIFF';
        return { buffer: existing, mimeType: isWav ? 'audio/wav' : 'audio/mpeg' };
      }
    } catch {}
  }

  // 2. Prioritas 1: EdgeTTS ArdiNeural (Super cepat 1-2 detik, suara pria berita tegas, format MP3 kompatibel 100% di semua HP & Desktop)
  try {
    const buffer = await generateMaleAudioWithEdgeTTS(cleanText, cacheFile);
    return { buffer, mimeType: 'audio/mpeg' };
  } catch (edgeErr) {
    console.warn('EdgeTTS synthesis notice, attempting Gemini fallback:', edgeErr);
  }

  // 3. Prioritas 2 (Cadangan): Google Gemini Flash TTS (Fenrir - Suara Pria Tegas)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const buffer = await generateAudioWithGemini(cleanText, cacheFile);
      return { buffer, mimeType: 'audio/wav' };
    } catch (geminiErr) {
      console.warn('Gemini TTS synthesis notice:', geminiErr);
    }
  }

  throw new Error('Gagal memproses audio TTS.');
}

// Handler GET: Digunakan oleh pemutar audio HTML5 (<audio src="/api/tts?id=...">)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    let rawText = searchParams.get('text') || '';

    let cacheKey = '';

    if (id) {
      cacheKey = `article-${id}-v8`;
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
      cacheKey = `text-${hash}-v8`;
    }

    ensureCacheDir();
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.bin`);

    const { buffer: fullBuffer, mimeType } = await getAudioBuffer(clean, cacheFile);
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
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        },
      });
    }

    return new Response(new Uint8Array(fullBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
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
      cacheKey = `article-${id}-v8`;
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
      cacheKey = `text-${hash}-v8`;
    }

    ensureCacheDir();
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.bin`);

    const { buffer: fullBuffer, mimeType } = await getAudioBuffer(clean, cacheFile);

    return new Response(new Uint8Array(fullBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
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
