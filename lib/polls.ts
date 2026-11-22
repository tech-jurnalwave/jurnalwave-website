import { prisma } from '@/lib/prisma';
import { Poll } from '@/types';

export const DEFAULT_ACTIVE_POLL: Poll | null = null;
export const DEFAULT_FALLBACK_POLL: Poll | null = null;

// Fallback in-memory store agar polling tetap 100% fungsional saat database cloud timeout / offline
let fallbackPollsList: Poll[] = [];

let lastPollsFailureTimestamp = 0;
const POLLS_RETRY_INTERVAL_MS = 15 * 1000;

// Ambil 1 Polling yang Sedang Aktif untuk Homepage & Publik
export async function getActivePoll(): Promise<Poll | null> {
  const now = Date.now();
  // Circuit Breaker: Jika database baru saja timeout < 15 detik lalu, respon seketika (0ms)
  if (now - lastPollsFailureTimestamp < POLLS_RETRY_INTERVAL_MS) {
    const active = fallbackPollsList.find(p => Boolean(p.isActive));
    return active || null;
  }

  try {
    const poll = await prisma.poll.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        options: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!poll) {
      const active = fallbackPollsList.find(p => Boolean(p.isActive));
      return active || null;
    }

    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
    return {
      id: poll.id,
      question: poll.question,
      category: poll.category || 'Umum',
      isActive: poll.isActive,
      createdAt: poll.createdAt.toISOString(),
      totalVotes,
      options: poll.options.map(o => ({
        id: o.id,
        text: o.text,
        votes: o.votes,
      })),
    };
  } catch (error) {
    lastPollsFailureTimestamp = Date.now();
    console.warn('Active poll DB lookup notice (using fallback):', (error as any)?.message || error);
    const active = fallbackPollsList.find(p => Boolean(p.isActive));
    return active || null;
  }
}

// Ambil seluruh daftar polling untuk Dashboard Admin
export async function getAllPolls(): Promise<Poll[]> {
  const now = Date.now();
  if (now - lastPollsFailureTimestamp < POLLS_RETRY_INTERVAL_MS) {
    return fallbackPollsList;
  }

  try {
    const polls = await prisma.poll.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (polls.length > 0) {
      return polls.map(p => ({
        id: p.id,
        question: p.question,
        category: p.category || 'Umum',
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        totalVotes: p.options.reduce((sum, o) => sum + o.votes, 0),
        options: p.options.map(o => ({
          id: o.id,
          text: o.text,
          votes: o.votes,
        })),
      }));
    }
    return [];
  } catch (error) {
    lastPollsFailureTimestamp = Date.now();
    console.warn('All polls DB lookup notice (using fallback):', (error as any)?.message || error);
    return [];
  }
}

// Catat vote ke memori cadangan jika database offline
export function recordVoteInFallback(pollId: string, optionId: string): Poll | null {
  const target = fallbackPollsList.find(p => p.id === pollId);
  if (!target) return null;

  target.options = target.options.map(opt => {
    if (opt.id === optionId) {
      return { ...opt, votes: (opt.votes || 0) + 1 };
    }
    return opt;
  });
  target.totalVotes = target.options.reduce((sum, o) => sum + o.votes, 0);
  return target;
}

// Tambah / Update polling di memori cadangan jika database offline
export function savePollInFallback(pollData: {
  id?: string;
  question: string;
  category?: string;
  isActive?: boolean;
  options: (string | { id?: string; text: string; votes?: number })[];
}): Poll {
  const isActive = Boolean(pollData.isActive ?? true);
  if (isActive) {
    fallbackPollsList = fallbackPollsList.map(p => ({ ...p, isActive: false }));
  }

  if (pollData.id) {
    const existingIndex = fallbackPollsList.findIndex(p => p.id === pollData.id);
    if (existingIndex >= 0) {
      const existing = fallbackPollsList[existingIndex];
      const updatedOptions = pollData.options.map((opt, idx) => {
        const text = typeof opt === 'string' ? opt.trim() : (opt.text || '').trim();
        const matched = existing.options.find(o => o.text.toLowerCase() === text.toLowerCase());
        const votes = typeof opt === 'object' && typeof opt.votes === 'number' ? opt.votes : (matched ? matched.votes : 0);
        return {
          id: typeof opt === 'object' && opt.id ? opt.id : `opt-${Date.now()}-${idx}`,
          text,
          votes,
        };
      });

      const updated: Poll = {
        ...existing,
        question: pollData.question.trim(),
        category: (pollData.category || existing.category || 'Umum').trim(),
        isActive,
        options: updatedOptions,
        totalVotes: updatedOptions.reduce((s, o) => s + o.votes, 0),
      };
      fallbackPollsList[existingIndex] = updated;
      return updated;
    }
  }

  const newPollId = pollData.id || `poll-${Date.now()}`;
  const newOptions = pollData.options.map((opt, idx) => ({
    id: typeof opt === 'object' && opt.id ? opt.id : `opt-${Date.now()}-${idx}`,
    text: typeof opt === 'string' ? opt.trim() : (opt.text || '').trim(),
    votes: typeof opt === 'object' && typeof opt.votes === 'number' ? opt.votes : 0,
  }));

  const created: Poll = {
    id: newPollId,
    question: pollData.question.trim(),
    category: (pollData.category || 'Sport & E-Sport').trim(),
    isActive,
    createdAt: new Date().toISOString(),
    totalVotes: newOptions.reduce((s, o) => s + o.votes, 0),
    options: newOptions,
  };

  fallbackPollsList = [created, ...fallbackPollsList];
  return created;
}

// Toggle status aktif di memori cadangan
export function togglePollActiveInFallback(pollId: string, isActive: boolean): Poll | null {
  if (isActive) {
    fallbackPollsList = fallbackPollsList.map(p => ({ ...p, isActive: false }));
  }
  const target = fallbackPollsList.find(p => p.id === pollId);
  if (target) {
    target.isActive = isActive;
    return target;
  }
  return null;
}

// Hapus polling dari memori cadangan
export function deletePollFromFallback(pollId: string): boolean {
  const prevLen = fallbackPollsList.length;
  fallbackPollsList = fallbackPollsList.filter(p => p.id !== pollId);
  return fallbackPollsList.length < prevLen;
}
