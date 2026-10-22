export type KanaScript = 'hiragana' | 'katakana';
export type KanaGroup = 'seion' | 'dakuon' | 'yoon';

export interface KanaItem {
  id: string;
  char: string;
  romaji: string[];
  script: KanaScript;
  group: KanaGroup;
  row?: string;
}

// 1. 課本官方分課單字
export interface TextbookVocabItem {
  id: string;
  lesson: number;
  lessonTitle?: string;
  word: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentence?: string;
  exampleMeaning?: string;
  orderIndex: number;
}

// 2. 課本句型填空題
export interface SentenceClozeItem {
  id: string;
  lesson: number;
  title?: string;
  sentenceWithBlank: string; // e.g. "わたし＿＿田中です。"
  correctAnswers: string[];   // e.g. ["は"]
  meaning: string;           // e.g. "我是田中。"
  explanation?: string;      // e.g. "「は」提示主題"
  hint?: string;             // e.g. "提示：主題助詞"
  orderIndex: number;
}

// 3. 課本翻譯特訓題
export interface TranslationExerciseItem {
  id: string;
  lesson: number;
  direction: 'zh_to_ja' | 'ja_to_zh';
  prompt: string;             // e.g. "請給我溫水。"
  expectedAnswers: string[];  // e.g. ["温かいお水をください", "あたたかいおみずをください"]
  vocabHints: string[];       // e.g. ["温かい (あたたかい)", "水 (みず)"]
  explanation?: string;
  orderIndex: number;
}

// 4. 使用者個人自訂單字
export interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  example?: string;
  level?: string;
  lesson?: number;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

// 5. 使用者個人錯題紀錄
export interface MistakeItem {
  id: string;
  targetId: string;
  type: 'vocab' | 'cloze' | 'translation' | 'kana';
  prompt: string;
  expected: string[];
  display: string;
  failCount: number;
  lesson: number;
  lastFailedAt: string;
}

// 6. 使用者學習統計
export interface UserStats {
  streak: number;
  lastActiveDate: string;
  totalAnswered: number;
  totalCorrect: number;
}

// 四大主頁籤
export type ActiveTab = 'practice' | 'vocab' | 'mistakes' | 'profile';

// 練習主模組底下的子練習模式
export type PracticeMode = 'vocab' | 'cloze' | 'translation' | 'kana';

export interface MascotMood {
  state: 'idle' | 'jumping' | 'thinking' | 'celebrating' | 'cheering';
  message?: string;
}
