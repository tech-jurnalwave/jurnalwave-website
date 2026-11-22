import { Job } from '@/types';
import { DUMMY_JOBS } from '@/data/dummyJobs';

export function parseStringArray(input?: string | null): string[] {
  if (!input) return [];
  const trimmed = input.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
  }
  return trimmed.split(/\r?\n/).map(s => s.trim().replace(/^[-*•]\s*/, '')).filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatJobFromDb(item: any): Job {
  let logo = item.logo || '';
  let description = item.description || '';
  const logoMatch = description.match(/<!--\s*LOGO:(.*?)\s*-->/);
  if (logoMatch) {
    if (!logo) logo = logoMatch[1].trim();
    description = description.replace(/<!--\s*LOGO:.*?\s*-->\r?\n?/, '');
  }

  return {
    id: item.id,
    title: item.title,
    company: item.company,
    logo: logo || undefined,
    location: item.location,
    region: item.region || 'Kota Sukabumi',
    salaryRange: item.salaryRange || 'Kompetitif',
    type: item.type || 'Full-Time',
    education: item.education || undefined,
    description: description,
    requirements: parseStringArray(item.requirements),
    benefits: parseStringArray(item.benefits),
    applyEmail: item.applyEmail || '',
    applyUrl: item.applyUrl || item.applyEmail || '',
    isActive: item.isActive !== false,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : undefined,
  };
}

let serverJobsCache: { data: Job[]; timestamp: number } | null = null;
const JOBS_CACHE_TTL_MS = 10 * 1000;

export function clearServerJobsCache() {
  serverJobsCache = null;
}

export async function fetchJobs(): Promise<Job[]> {
  const now = Date.now();
  if (serverJobsCache && now - serverJobsCache.timestamp < JOBS_CACHE_TTL_MS) {
    return serverJobsCache.data;
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    const dbJobs = await prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (dbJobs.length > 0) {
      const mapped = dbJobs.map(formatJobFromDb);
      serverJobsCache = { data: mapped, timestamp: now };
      return mapped;
    }
    return [];
  } catch (err) {
    console.warn('Fetch jobs notice (using fallback):', (err as any)?.message || err);
    if (serverJobsCache) return serverJobsCache.data;
    return [];
  }
}

export async function fetchJobById(id: string): Promise<Job | null> {
  if (serverJobsCache && serverJobsCache.data.length > 0) {
    const found = serverJobsCache.data.find(j => j.id === id);
    if (found) return found;
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    const item = await prisma.job.findUnique({
      where: { id },
    });
    if (item) {
      return formatJobFromDb(item);
    }
  } catch (err) {
    console.warn('Fetch job by ID notice:', (err as any)?.message || err);
  }

  const fallback = DUMMY_JOBS.find(j => j.id === id);
  return fallback || null;
}
