import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { VocabItem, MistakeItem, UserStats } from '../types';

const STORAGE_KEYS = {
  LOCAL_VOCAB: 'nihongoat_local_vocab',
  LOCAL_MISTAKES: 'nihongoat_local_mistakes',
  LOCAL_STATS: 'nihongoat_local_stats',
  GUEST_USER: 'nihongoat_guest_user'
};

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

let supabaseInstance: SupabaseClient | null = null;

function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/auth\/v1\/?$/, '')
    .replace(/\/+$/, '');
}

export function isSupabaseConfigured(): boolean {
  const url = cleanSupabaseUrl(supabaseUrl);
  return Boolean(url && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const url = cleanSupabaseUrl(supabaseUrl);
  const key = supabaseAnonKey.trim();

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key);
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

export const SUPABASE_SQL_SETUP_TEMPLATE = `-- DangoGo (糰子日語) Supabase Database Schema
-- 1. Vocabulary Table
create table if not exists public.vocabularies (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  word text not null,
  reading text not null,
  meaning text not null,
  example text,
  level text default 'N5',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Mistakes Table
create table if not exists public.mistakes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  target_id text not null,
  type text not null,
  prompt text not null,
  expected jsonb not null,
  display text not null,
  fail_count integer default 1,
  last_failed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. User Learning Stats Table
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade not null,
  streak integer default 0,
  last_active_date text,
  total_kana_answered integer default 0,
  total_kana_correct integer default 0,
  total_vocab_answered integer default 0,
  total_vocab_correct integer default 0,
  best_accuracy numeric default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.vocabularies enable row level security;
alter table public.mistakes enable row level security;
alter table public.user_stats enable row level security;

-- 5. Policies
drop policy if exists "Users can manage their own vocabulary" on public.vocabularies;
create policy "Users can manage their own vocabulary" on public.vocabularies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own mistakes" on public.mistakes;
create policy "Users can manage their own mistakes" on public.mistakes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own stats" on public.user_stats;
create policy "Users can manage their own stats" on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
`;

// --- Cloud / Local Data Sync Helpers ---

export async function fetchUserVocab(user: User | null, defaultList: VocabItem[]): Promise<VocabItem[]> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      const { data, error } = await client
        .from('vocabularies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        if (data.length > 0) {
          return data.map(item => ({
            id: item.id,
            word: item.word,
            reading: item.reading,
            meaning: item.meaning,
            example: item.example,
            level: item.level,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            userId: item.user_id
          }));
        } else if (defaultList.length > 0) {
          // If this is a new cloud user with no vocabulary yet, seed the default vocabulary directly to Supabase
          await saveUserVocab(defaultList, user);
          return defaultList;
        }
      }
    } catch (err) {
      console.warn('Error fetching vocab from Supabase, fallback to local', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_VOCAB);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn(err);
  }
  return defaultList;
}

export async function saveUserVocab(vocabList: VocabItem[], user: User | null): Promise<void> {
  // Always update local cache
  localStorage.setItem(STORAGE_KEYS.LOCAL_VOCAB, JSON.stringify(vocabList));

  const client = getSupabaseClient();
  if (client && user) {
    try {
      // Upsert into Supabase
      const payload = vocabList.map(v => ({
        id: v.id,
        user_id: user.id,
        word: v.word,
        reading: v.reading,
        meaning: v.meaning,
        example: v.example || '',
        level: v.level || 'N5',
        updated_at: new Date().toISOString()
      }));
      await client.from('vocabularies').upsert(payload);
    } catch (err) {
      console.warn('Failed to upsert to Supabase', err);
    }
  }
}

export async function deleteUserVocab(vocabId: string, user: User | null): Promise<void> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      await client.from('vocabularies').delete().eq('id', vocabId).eq('user_id', user.id);
    } catch (err) {
      console.warn('Failed to delete from Supabase', err);
    }
  }
}

export async function fetchUserMistakes(user: User | null): Promise<MistakeItem[]> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      const { data, error } = await client
        .from('mistakes')
        .select('*')
        .eq('user_id', user.id)
        .order('last_failed_at', { ascending: false });

      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          targetId: item.target_id,
          type: item.type,
          prompt: item.prompt,
          expected: item.expected,
          display: item.display,
          failCount: item.fail_count,
          lastFailedAt: item.last_failed_at
        }));
      }
    } catch (err) {
      console.warn('Error fetching mistakes from Supabase', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_MISTAKES);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn(err);
  }
  return [];
}

export async function saveUserMistakes(mistakes: MistakeItem[], user: User | null): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.LOCAL_MISTAKES, JSON.stringify(mistakes));

  const client = getSupabaseClient();
  if (client && user) {
    try {
      const payload = mistakes.map(m => ({
        id: m.id,
        user_id: user.id,
        target_id: m.targetId,
        type: m.type,
        prompt: m.prompt,
        expected: m.expected,
        display: m.display,
        fail_count: m.failCount,
        last_failed_at: m.lastFailedAt
      }));
      await client.from('mistakes').upsert(payload);
    } catch (err) {
      console.warn('Failed to upsert mistakes', err);
    }
  }
}

export async function deleteUserMistake(mistakeId: string, user: User | null): Promise<void> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      await client.from('mistakes').delete().eq('id', mistakeId).eq('user_id', user.id);
    } catch (err) {
      console.warn('Failed to delete mistake', err);
    }
  }
}

export async function fetchUserStats(user: User | null): Promise<UserStats> {
  const defaultStats: UserStats = {
    streak: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalKanaAnswered: 0,
    totalKanaCorrect: 0,
    totalVocabAnswered: 0,
    totalVocabCorrect: 0,
    bestAccuracy: 0
  };

  const client = getSupabaseClient();
  if (client && user) {
    try {
      const { data, error } = await client
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        return {
          streak: data.streak || 1,
          lastActiveDate: data.last_active_date || defaultStats.lastActiveDate,
          totalKanaAnswered: data.total_kana_answered || 0,
          totalKanaCorrect: data.total_kana_correct || 0,
          totalVocabAnswered: data.total_vocab_answered || 0,
          totalVocabCorrect: data.total_vocab_correct || 0,
          bestAccuracy: Number(data.best_accuracy || 0)
        };
      }
    } catch (err) {
      console.warn('Error fetching stats from Supabase', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_STATS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn(err);
  }
  return defaultStats;
}

export async function saveUserStats(stats: UserStats, user: User | null): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.LOCAL_STATS, JSON.stringify(stats));

  const client = getSupabaseClient();
  if (client && user) {
    try {
      await client.from('user_stats').upsert({
        user_id: user.id,
        streak: stats.streak,
        last_active_date: stats.lastActiveDate,
        total_kana_answered: stats.totalKanaAnswered,
        total_kana_correct: stats.totalKanaCorrect,
        total_vocab_answered: stats.totalVocabAnswered,
        total_vocab_correct: stats.totalVocabCorrect,
        best_accuracy: stats.bestAccuracy,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to upsert stats', err);
    }
  }
}
