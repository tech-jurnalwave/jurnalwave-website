import { jwtVerify } from 'jose';

export const ADMIN_COOKIE_NAME = 'admin_session_token';

const JWT_SECRET_STRING =
  process.env.ADMIN_JWT_SECRET ||
  'jurnalwave_super_secret_jwt_token_2026_sukabumi_media_ultra_secure_key';

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * Validasi otentikasi admin yang 100% aman dijalankan di Edge Middleware Next.js
 * Bebas dari ketergantungan modul native Node.js (seperti bcrypt)
 */
export async function verifyAdminTokenEdge(token?: string | null): Promise<boolean> {
  if (!token || typeof token !== 'string' || !token.trim()) return false;
  try {
    const { payload } = await jwtVerify(token.trim(), JWT_SECRET);
    return Boolean(payload && (payload.email || payload.name || payload.id));
  } catch {
    return false;
  }
}
