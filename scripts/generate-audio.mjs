import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { EdgeTTS } from '@andresaya/edge-tts';
import crypto from 'crypto';

const prisma = new PrismaClient();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const VOICE_NAME = 'id-ID-ArdiNeural';
const VOICE_RATE = '+6%';
const VOICE_PITCH = '+0Hz';

function cleanArticleText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_#`~[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^(JURNALWAVE\.COM|JURNAL WAVE)(\s*[-–—]\s*)/i, '')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function checkAudioExists(articleId) {
  try {
    const url = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/jurnalwave-audio/${articleId}.mp3`;
    const res = await fetch(url, { method: 'HEAD' });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function uploadToCloudinary(buffer, articleId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `jurnalwave-audio/${articleId}`;
  const strToSign = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  formData.append('file', blob, `${articleId}.mp3`);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('public_id', publicId);
  formData.append('overwrite', 'true');
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

async function generateAudioForArticle(article) {
  const rawText = `${article.title}. ${article.excerpt}. ${article.content}`;
  const cleaned = cleanArticleText(rawText);

  console.log(`Menghasilkan audio untuk: [${article.id}] "${article.title.slice(0, 40)}..."`);
  const tts = new EdgeTTS();
  await tts.synthesize(cleaned, VOICE_NAME, {
    rate: VOICE_RATE,
    pitch: VOICE_PITCH,
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
  });

  const buffer = tts.toBuffer();
  if (!buffer || buffer.length < 500) {
    throw new Error('Buffer audio kosong dari EdgeTTS');
  }

  console.log(`Audio selesai dibuat (${buffer.length} bytes), mengunggah ke Cloudinary...`);
  const secureUrl = await uploadToCloudinary(buffer, article.id);
  console.log(`SUKSES: ${secureUrl}`);
  return secureUrl;
}

async function main() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('ERROR: Kredensial Cloudinary belum lengkap di .env');
    process.exit(1);
  }

  console.log('--- Sinkronisasi Audio Berita JurnalWave ke Cloudinary ---');
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total artikel ditemukan: ${articles.length}`);

  for (const article of articles) {
    const exists = await checkAudioExists(article.id);
    if (exists) {
      console.log(`[SUDAH ADA] ${article.id} - ${article.title.slice(0, 45)}...`);
    } else {
      console.log(`[BELUM ADA] Menghasilkan audio untuk ${article.id}...`);
      try {
        await generateAudioForArticle(article);
      } catch (err) {
        console.error(`GAGAL memproses ${article.id}:`, err.message);
      }
    }
  }

  console.log('--- Sinkronisasi Selesai ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
