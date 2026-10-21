export type KanaScript = 'hiragana' | 'katakana';
export type KanaGroup = 'seion' | 'dakuon' | 'yoon';

export interface KanaItem {
  id: string;
  char: string;
  romaji: string[]; // Supported variations e.g. ['shi', 'si']
  script: KanaScript;
  group: KanaGroup;
  row?: string;
}

export interface VocabItem {
  id: string;
  word: string;     // e.g. 食べる
  reading: string;  // e.g. たべる
  meaning: string;  // e.g. 吃
  example?: string;  // e.g. 朝ご飯を食べる (吃早餐)
  level?: string;    // e.g. N5
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface MistakeItem {
  id: string;
  targetId: string;
  type: 'kana' | 'vocab';
  prompt: string;        // The question shown (e.g. あ or 食べる meaning)
  expected: string[];    // Expected answer(s)
  display: string;       // Secondary visual helper (e.g. "Hiragana: あ" or "食べる")
  failCount: number;
  lastFailedAt: string;
}

export interface UserStats {
  streak: number;
  lastActiveDate: string;
  totalKanaAnswered: number;
  totalKanaCorrect: number;
  totalVocabAnswered: number;
  totalVocabCorrect: number;
  bestAccuracy: number;
}

export type ActiveTab = 'kana' | 'vocab' | 'mistakes' | 'grammar' | 'profile';

export interface MascotMood {
  state: 'idle' | 'jumping' | 'thinking' | 'celebrating' | 'cheering';
  message?: string;
}
