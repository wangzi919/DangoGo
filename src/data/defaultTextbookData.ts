import { TextbookVocabItem, SentenceClozeItem, TranslationExerciseItem } from '../types';

// 課本資料預設為空，由使用者自行從 Supabase 資料庫或自訂生詞庫填入
export const DEFAULT_TEXTBOOK_VOCAB: TextbookVocabItem[] = [];

export const DEFAULT_CLOZE_EXERCISES: SentenceClozeItem[] = [];

export const DEFAULT_TRANSLATION_EXERCISES: TranslationExerciseItem[] = [];
