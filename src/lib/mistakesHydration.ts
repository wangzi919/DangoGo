import {
  MistakeItem,
  TextbookVocabItem,
  SentenceClozeItem,
  TranslationExerciseItem,
  VocabItem,
  KanaItem
} from '../types';
import { ALL_KANA } from '../data/kanaData';

export interface HydrationDataSources {
  textbookVocab?: TextbookVocabItem[];
  clozeExercises?: SentenceClozeItem[];
  translationExercises?: TranslationExerciseItem[];
  customVocab?: VocabItem[];
  kanaList?: KanaItem[];
}

/**
 * Re-hydrate a single mistake item loaded from Supabase user_mistakes.
 * Since user_mistakes only stores normalized columns (target_id, type, expected, etc.),
 * this restores full prompt, display, lesson, and expected answers using target_id and type.
 */
export function hydrateSingleMistake(
  item: MistakeItem,
  sources: HydrationDataSources
): MistakeItem {
  const {
    textbookVocab = [],
    clozeExercises = [],
    translationExercises = [],
    customVocab = [],
    kanaList = ALL_KANA
  } = sources;

  const type = item.type;
  const targetId = (item.targetId || '').trim();

  let prompt = (item.prompt || '').trim();
  let display = (item.display || '').trim();
  let expected: string[] = Array.isArray(item.expected)
    ? item.expected.filter(e => typeof e === 'string' && e.trim().length > 0)
    : item.expected
    ? [String(item.expected).trim()]
    : [];
  let lesson = typeof item.lesson === 'number' ? item.lesson : 0;

  // 1. 五十音 (kana)
  if (type === 'kana') {
    // Match by ID ('h_a', 'k_ka') or by character ('あ', 'カ')
    let matchedKana = kanaList.find(
      k => k.id === targetId || k.char === targetId || (prompt && k.char === prompt)
    );

    // Fallback search: if targetId starts with h_ or k_, match script and romaji
    if (!matchedKana && (targetId.startsWith('h_') || targetId.startsWith('k_'))) {
      const script = targetId.startsWith('h_') ? 'hiragana' : 'katakana';
      const romajiKey = targetId.slice(2).toLowerCase();
      matchedKana = kanaList.find(
        k => k.script === script && k.romaji.includes(romajiKey)
      );
    }

    if (matchedKana) {
      prompt = matchedKana.char;
      const scriptLabel = matchedKana.script === 'hiragana' ? '平假名' : '片假名';
      display = `${scriptLabel}：${matchedKana.char} [${matchedKana.romaji.join(' / ')}]`;
      if (expected.length === 0) {
        expected = matchedKana.romaji;
      }
      lesson = 0;
    } else {
      if (!prompt) {
        prompt = targetId.startsWith('h_') || targetId.startsWith('k_') ? targetId.slice(2) : targetId;
      }
      if (!display) {
        display = `五十音：${prompt}`;
      }
    }
  }

  // 2. 單字 (vocab)
  else if (type === 'vocab') {
    // Check textbook vocab first
    const tb = textbookVocab.find(
      v => v.id === targetId || v.word === targetId || (prompt && (v.word === prompt || prompt.includes(v.word)))
    );

    if (tb) {
      prompt = tb.meaning ? `${tb.meaning} (${tb.word})` : tb.word;
      display = `第 ${tb.lesson} 課單字：${tb.word} [${tb.reading}] - ${tb.meaning}`;
      if (expected.length === 0) {
        expected = [tb.reading];
      }
      lesson = tb.lesson || lesson || 1;
    } else {
      // Check user custom vocab
      const cv = customVocab.find(
        v => v.id === targetId || v.word === targetId || (prompt && (v.word === prompt || prompt.includes(v.word)))
      );

      if (cv) {
        prompt = cv.meaning ? `${cv.meaning} (${cv.word})` : cv.word;
        display = `自訂單字：${cv.word} [${cv.reading}] - ${cv.meaning}`;
        if (expected.length === 0) {
          expected = [cv.reading];
        }
        lesson = cv.lesson || lesson || 1;
      } else {
        if (!prompt) {
          prompt = targetId || '單字題目';
        }
        if (!display) {
          display = `單字：${prompt}`;
        }
      }
    }
  }

  // 3. 句型填空 (cloze)
  else if (type === 'cloze') {
    const cloze = clozeExercises.find(
      c => c.id === targetId || c.sentenceWithBlank === targetId || (prompt && c.sentenceWithBlank === prompt)
    );

    if (cloze) {
      prompt = cloze.sentenceWithBlank;
      display = `第 ${cloze.lesson} 課句型：${cloze.sentenceWithBlank} (${cloze.meaning})`;
      if (expected.length === 0) {
        expected = cloze.correctAnswers;
      }
      lesson = cloze.lesson || lesson || 1;
    } else {
      if (!prompt) {
        prompt = targetId || '句型填空題';
      }
      if (!display) {
        display = `句型填空：${prompt}`;
      }
    }
  }

  // 4. 課本翻譯 (translation)
  else if (type === 'translation') {
    const trans = translationExercises.find(
      t => t.id === targetId || t.prompt === targetId || (prompt && t.prompt === prompt)
    );

    if (trans) {
      prompt = trans.prompt;
      display = `第 ${trans.lesson} 課翻譯：${trans.prompt}`;
      if (expected.length === 0) {
        expected = trans.expectedAnswers;
      }
      lesson = trans.lesson || lesson || 1;
    } else {
      if (!prompt) {
        prompt = targetId || '翻譯特訓題';
      }
      if (!display) {
        display = `課本翻譯：${prompt}`;
      }
    }
  }

  // Ultimate fallback to guarantee prompt and display are never empty
  if (!prompt) {
    prompt = targetId || '錯題紀錄';
  }
  if (!display) {
    display = prompt;
  }
  if (expected.length === 0) {
    expected = [prompt];
  }

  return {
    ...item,
    targetId: targetId || item.id,
    type,
    prompt,
    display,
    expected,
    lesson
  };
}

/**
 * Hydrates an array of MistakeItems loaded from Supabase or localStorage.
 */
export function hydrateMistakes(
  mistakes: MistakeItem[],
  sources: HydrationDataSources
): MistakeItem[] {
  if (!Array.isArray(mistakes)) return [];
  return mistakes.map(m => hydrateSingleMistake(m, sources));
}
