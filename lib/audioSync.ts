import { prisma } from '@/lib/prisma';

export async function getGithubTokenFromDb(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "value" FROM "system_settings" WHERE "key" = 'github_token' LIMIT 1`
    );
    return rows[0]?.value || null;
  } catch (err) {
    return null;
  }
}

/**
 * Memicu robot otomatis pembuatan audio presenter di GitHub Actions
 * Dipanggil otomatis setiap kali artikel baru disimpan/diperbarui di website.
 */
export async function triggerAudioGenerationWorkflow(): Promise<boolean> {
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.ADMIN_GITHUB_TOKEN ||
    (await getGithubTokenFromDb());

  if (!token) {
    console.warn('triggerAudioGenerationWorkflow: Token GitHub tidak ditemukan di ENV maupun Database');
    return false;
  }

  try {
    const res = await fetch(
      'https://api.github.com/repos/tech-jurnalwave/jurnalwave-website/actions/workflows/generate-audio.yml/dispatches',
      {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'JurnalWave',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );

    if (res.status === 204) {
      console.log('SUKSES: GitHub Actions audio generator berhasil dipicu!');
      return true;
    } else {
      const errText = await res.text();
      console.warn(`Gagal memicu GitHub Actions (${res.status}):`, errText);
      return false;
    }
  } catch (err) {
    console.warn('Audio generation dispatch notice:', err);
    return false;
  }
}
