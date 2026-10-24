import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  TextbookVocabItem,
  SentenceClozeItem,
  TranslationExerciseItem,
  VocabItem,
  MistakeItem,
  UserStats
} from '../types';

const STORAGE_KEYS = {
  CONFIG: 'nihongoat_supabase_config',
  LOCAL_TEXTBOOK_VOCAB: 'dango_local_tb_vocab',
  LOCAL_CLOZE: 'dango_local_cloze',
  LOCAL_TRANSLATION: 'dango_local_translation',
  LOCAL_CUSTOM_VOCAB: 'dango_local_custom_vocab',
  LOCAL_MISTAKES: 'dango_local_mistakes',
  LOCAL_STATS: 'dango_local_stats'
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let supabaseInstance: SupabaseClient | null = null;

export function getStoredConfig(): SupabaseConfig {
  if (typeof window === 'undefined') return { url: '', anonKey: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse Supabase config', err);
  }
  return { url: '', anonKey: '' };
}

export function saveStoredConfig(config: SupabaseConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  supabaseInstance = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';
  const config = getStoredConfig();
  const url = envUrl || config.url;
  const anonKey = envKey || config.anonKey;

  if (url && anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

// =================================================================
// 1. 課本單字 (textbook_vocab)
// =================================================================
export async function fetchTextbookVocab(defaultList: TextbookVocabItem[]): Promise<TextbookVocabItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('textbook_vocab')
        .select('*')
        .order('lesson', { ascending: true })
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          lesson: item.lesson,
          lessonTitle: item.lesson_title || `第 ${item.lesson} 課`,
          word: item.word,
          reading: item.reading,
          meaning: item.meaning,
          partOfSpeech: item.part_of_speech || '名詞',
          exampleSentence: item.example_sentence,
          exampleMeaning: item.example_meaning,
          orderIndex: item.order_index || 0
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch textbook vocab from Supabase, fallback to default', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_TEXTBOOK_VOCAB);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn(e);
  }
  return defaultList;
}

// =================================================================
// 2. 句型填空 (sentence_cloze_exercises)
// =================================================================
export async function fetchClozeExercises(defaultList: SentenceClozeItem[]): Promise<SentenceClozeItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('sentence_cloze_exercises')
        .select('*')
        .order('lesson', { ascending: true })
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          lesson: item.lesson,
          title: item.title,
          sentenceWithBlank: item.sentence_with_blank,
          correctAnswers: Array.isArray(item.correct_answers) ? item.correct_answers : [item.correct_answers],
          meaning: item.meaning,
          explanation: item.explanation,
          hint: item.hint,
          orderIndex: item.order_index || 0
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch cloze from Supabase', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_CLOZE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return defaultList;
}

// =================================================================
// 3. 翻譯練習 (translation_exercises)
// =================================================================
export async function fetchTranslationExercises(defaultList: TranslationExerciseItem[]): Promise<TranslationExerciseItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('translation_exercises')
        .select('*')
        .order('lesson', { ascending: true })
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          lesson: item.lesson,
          direction: item.direction || 'zh_to_ja',
          prompt: item.prompt,
          expectedAnswers: Array.isArray(item.expected_answers) ? item.expected_answers : [item.expected_answers],
          vocabHints: Array.isArray(item.vocab_hints) ? item.vocab_hints : [],
          explanation: item.explanation,
          orderIndex: item.order_index || 0
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch translation from Supabase', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_TRANSLATION);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return defaultList;
}

// =================================================================
// 4. 使用者個人自訂生詞 (user_vocabularies)
// =================================================================
export async function fetchUserCustomVocab(user: User | null): Promise<VocabItem[]> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      const { data, error } = await client
        .from('user_vocabularies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          word: item.word,
          reading: item.reading,
          meaning: item.meaning,
          example: item.example,
          level: item.level || 'N5',
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          userId: item.user_id
        }));
      }
    } catch (err) {
      console.warn('Error fetching custom vocab from Supabase', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_CUSTOM_VOCAB);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn(err);
  }
  return [];
}

export async function saveUserCustomVocab(vocabList: VocabItem[], user: User | null): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.LOCAL_CUSTOM_VOCAB, JSON.stringify(vocabList));
  const client = getSupabaseClient();
  if (client && user) {
    try {
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
      await client.from('user_vocabularies').upsert(payload);
    } catch (err) {
      console.warn('Failed to upsert custom vocab', err);
    }
  }
}

export async function deleteUserCustomVocab(vocabId: string, user: User | null): Promise<void> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      await client.from('user_vocabularies').delete().eq('id', vocabId).eq('user_id', user.id);
    } catch (err) {
      console.warn('Failed to delete custom vocab', err);
    }
  }
}

// =================================================================
// 5. 使用者個人錯題本 (user_mistakes)
// =================================================================
export async function fetchUserMistakes(user: User | null): Promise<MistakeItem[]> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      const { data, error } = await client
        .from('user_mistakes')
        .select('*')
        .eq('user_id', user.id)
        .order('last_failed_at', { ascending: false });

      if (!error && data) {
        let localMistakesMap: Record<string, { prompt?: string; display?: string }> = {};
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_MISTAKES);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((m: any) => {
                if (m.id) localMistakesMap[m.id] = { prompt: m.prompt, display: m.display };
                if (m.targetId && m.type) localMistakesMap[`${m.type}_${m.targetId}`] = { prompt: m.prompt, display: m.display };
              });
            }
          }
        } catch {
          // ignore cache read error
        }

        return data.map(item => {
          const cached = localMistakesMap[item.id] || localMistakesMap[`${item.type}_${item.target_id}`];
          return {
            id: item.id,
            targetId: item.target_id,
            type: item.type,
            prompt: item.prompt || cached?.prompt || '',
            expected: Array.isArray(item.expected)
              ? item.expected
              : typeof item.expected === 'string'
                ? [item.expected]
                : [],
            display: item.display || cached?.display || item.prompt || cached?.prompt || '',
            failCount: item.fail_count || 1,
            lesson: item.lesson || 1,
            lastFailedAt: item.last_failed_at
          };
        });
      }
    } catch (err) {
      console.warn('Error fetching mistakes from Supabase', err);
    }
  }

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
        expected: m.expected,
        fail_count: m.failCount,
        lesson: m.lesson,
        last_failed_at: m.lastFailedAt
      }));
      await client.from('user_mistakes').upsert(payload);
    } catch (err) {
      console.warn('Failed to upsert mistakes', err);
    }
  }
}

export async function deleteUserMistake(mistakeId: string, user: User | null): Promise<void> {
  const client = getSupabaseClient();
  if (client && user) {
    try {
      await client.from('user_mistakes').delete().eq('id', mistakeId).eq('user_id', user.id);
    } catch (err) {
      console.warn('Failed to delete mistake', err);
    }
  }
}

// =================================================================
// 6. 使用者個人學習統計 (user_stats)
// =================================================================
export async function fetchUserStats(user: User | null): Promise<UserStats> {
  const defaultStats: UserStats = {
    streak: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalAnswered: 0,
    totalCorrect: 0
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
          totalAnswered: data.total_answered || 0,
          totalCorrect: data.total_correct || 0
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
        total_answered: stats.totalAnswered,
        total_correct: stats.totalCorrect,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to upsert stats', err);
    }
  }
}

export const SUPABASE_SQL_SETUP_TEMPLATE = `-- =================================================================
-- DangoGo (糰子日語) Supabase 雲端資料庫建表 SQL
-- =================================================================

-- 1. 學校課本分課單字表 (Textbook Vocabulary)
create table if not exists public.textbook_vocab (
  id uuid default gen_random_uuid() primary key,
  lesson integer not null,
  lesson_title text,
  word text not null,
  reading text not null,
  meaning text not null,
  part_of_speech text default '名詞',
  example_sentence text,
  example_meaning text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists textbook_vocab_lesson_idx on public.textbook_vocab (lesson, order_index);

-- 2. 學校課本句型填空題庫表 (Sentence Cloze Exercises)
create table if not exists public.sentence_cloze_exercises (
  id uuid default gen_random_uuid() primary key,
  lesson integer not null,
  title text,
  sentence_with_blank text not null,
  correct_answers jsonb not null,
  meaning text not null,
  explanation text,
  hint text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists sentence_cloze_lesson_idx on public.sentence_cloze_exercises (lesson, order_index);

-- 3. 學校課本翻譯特訓題庫表 (Translation Exercises)
create table if not exists public.translation_exercises (
  id uuid default gen_random_uuid() primary key,
  lesson integer not null,
  direction text default 'zh_to_ja',
  prompt text not null,
  expected_answers jsonb not null,
  vocab_hints jsonb default '[]',
  explanation text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists translation_exercises_lesson_idx on public.translation_exercises (lesson, order_index);

-- 4. 使用者個人自訂生詞表 (Custom Vocabulary)
create table if not exists public.user_vocabularies (
  id text primary key,
  user_id uuid references auth.users not null,
  word text not null,
  reading text not null,
  meaning text not null,
  example text,
  level text default 'N5',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. 使用者個人錯題本 (Mistakes Notebook)
create table if not exists public.user_mistakes (
  id text primary key,
  user_id uuid references auth.users not null,
  target_id text not null,
  type text not null,
  expected jsonb not null,
  fail_count integer default 1,
  lesson integer default 1,
  last_failed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. 使用者個人學習統計 (User Stats)
create table if not exists public.user_stats (
  user_id uuid references auth.users primary key,
  streak integer default 1,
  last_active_date date not null,
  total_answered integer default 0,
  total_correct integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
`;

