import React, { useState, useEffect, useRef } from 'react';
import {
  TextbookVocabItem,
  SentenceClozeItem,
  TranslationExerciseItem,
  MistakeItem,
  PracticeMode
} from '../types';
import { playJapaneseSpeech, playSuccessSound, playErrorSound } from '../lib/speech';
import { KanaPractice } from './KanaPractice';
import { VirtualKeyboard, transformLastChar } from './VirtualKeyboard';
import {
  Layers,
  BookOpen,
  PenTool,
  Languages,
  Filter,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Keyboard,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface PracticeHubProps {
  textbookVocab: TextbookVocabItem[];
  clozeExercises: SentenceClozeItem[];
  translationExercises: TranslationExerciseItem[];
  onRecordMistake: (mistake: Omit<MistakeItem, 'id' | 'failCount' | 'lastFailedAt'>) => void;
  onUpdateStats: (isCorrect: boolean) => void;
}

export const PracticeHub: React.FC<PracticeHubProps> = ({
  textbookVocab,
  clozeExercises,
  translationExercises,
  onRecordMistake,
  onUpdateStats
}) => {
  const [activeMode, setActiveMode] = useState<PracticeMode>('kana');
  const [selectedLesson, setSelectedLesson] = useState<number | 'all'>('all');

  // Available lessons list
  const allLessons = Array.from(
    new Set([
      ...textbookVocab.map(v => v.lesson),
      ...clozeExercises.map(c => c.lesson),
      ...translationExercises.map(t => t.lesson)
    ])
  ).sort((a, b) => a - b);

  // Common Quiz State for Vocab, Cloze, Translation
  const [quizQueue, setQuizQueue] = useState<any[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizInput, setQuizInput] = useState('');
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState<boolean | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Touch device detection to prevent mobile keyboard popups
  const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  };

  // Start or restart a practice mode session
  const startModeSession = (mode: PracticeMode, lesson: number | 'all') => {
    setActiveMode(mode);
    setIsKeyboardOpen(false);

    if (mode === 'kana') {
      // Kana has its own internal session management
      return;
    }

    let pool: any[] = [];
    if (mode === 'vocab') {
      pool = textbookVocab.filter(v => (lesson === 'all' ? true : v.lesson === lesson));
    } else if (mode === 'cloze') {
      pool = clozeExercises.filter(c => (lesson === 'all' ? true : c.lesson === lesson));
    } else if (mode === 'translation') {
      pool = translationExercises.filter(t => (lesson === 'all' ? true : t.lesson === lesson));
    }

    // Shuffle pool
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setQuizQueue(shuffled);
    setQuizIndex(0);
    setQuizInput('');
    setQuizAnswered(false);
    setQuizIsCorrect(null);
    setQuizCorrectCount(0);
    setQuizCompleted(false);

    setTimeout(() => {
      if (!isTouchDevice()) {
        inputRef.current?.focus();
      }
    }, 100);
  };

  // Initialize on first mount or mode change
  useEffect(() => {
    startModeSession(activeMode, selectedLesson);
  }, [activeMode, selectedLesson, textbookVocab.length, clozeExercises.length, translationExercises.length]);

  const currentItem = quizQueue[quizIndex];

  // Submit and verify answer
  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentItem || quizAnswered || !quizInput.trim()) return;

    const cleanInput = quizInput.trim().toLowerCase();
    let isCorrect = false;

    if (activeMode === 'vocab') {
      const vocab = currentItem as TextbookVocabItem;
      isCorrect = cleanInput === vocab.reading.trim().toLowerCase();
      if (!isCorrect) {
        onRecordMistake({
          targetId: vocab.id,
          type: 'vocab',
          prompt: `${vocab.meaning} (${vocab.word})`,
          expected: [vocab.reading],
          display: `第 ${vocab.lesson} 課單字：${vocab.word} [${vocab.reading}] - ${vocab.meaning}`,
          lesson: vocab.lesson
        });
      }
      playJapaneseSpeech(vocab.reading || vocab.word);
    } else if (activeMode === 'cloze') {
      const cloze = currentItem as SentenceClozeItem;
      const expectedList = cloze.correctAnswers.map(a => a.toLowerCase().trim());
      isCorrect = expectedList.includes(cleanInput);
      if (!isCorrect) {
        onRecordMistake({
          targetId: cloze.id,
          type: 'cloze',
          prompt: cloze.sentenceWithBlank,
          expected: cloze.correctAnswers,
          display: `第 ${cloze.lesson} 課句型：${cloze.sentenceWithBlank} (${cloze.meaning})`,
          lesson: cloze.lesson
        });
      }
      // Speak full completed sentence
      const completedSentence = cloze.sentenceWithBlank.replace('＿＿', cloze.correctAnswers[0]);
      playJapaneseSpeech(completedSentence);
    } else if (activeMode === 'translation') {
      const trans = currentItem as TranslationExerciseItem;
      const expectedList = trans.expectedAnswers.map(a => a.toLowerCase().trim());
      isCorrect = expectedList.includes(cleanInput);
      if (!isCorrect) {
        onRecordMistake({
          targetId: trans.id,
          type: 'translation',
          prompt: trans.prompt,
          expected: trans.expectedAnswers,
          display: `第 ${trans.lesson} 課翻譯：${trans.prompt}`,
          lesson: trans.lesson
        });
      }
      playJapaneseSpeech(trans.expectedAnswers[0]);
    }

    setQuizAnswered(true);
    setQuizIsCorrect(isCorrect);
    onUpdateStats(isCorrect);

    if (isCorrect) {
      playSuccessSound();
      setQuizCorrectCount(prev => prev + 1);
    } else {
      playErrorSound();
    }
  };

  const handleNext = () => {
    if (quizIndex + 1 >= quizQueue.length) {
      setQuizCompleted(true);
      return;
    }
    const next = quizIndex + 1;
    setQuizIndex(next);
    setQuizInput('');
    setQuizAnswered(false);
    setQuizIsCorrect(null);

    setTimeout(() => {
      if (!isTouchDevice()) {
        inputRef.current?.focus();
      }
    }, 50);
  };

  // Form submit handles either verification or moving to next question
  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quizAnswered) {
      handleNext();
    } else {
      handleVerify();
    }
  };

  // Focus Next button or auto-refocus input when answered
  useEffect(() => {
    if (quizAnswered && activeMode !== 'kana') {
      nextButtonRef.current?.focus();
    }
  }, [quizAnswered, activeMode]);

  // Global keydown listener for Enter to advance to next question
  useEffect(() => {
    if (activeMode === 'kana') return;
    if (!quizAnswered || quizCompleted || quizQueue.length === 0) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't advance if user is actively in IME composition
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeMode, quizAnswered, quizCompleted, quizQueue.length, quizIndex]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Practice Header & Mode Switcher */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE3]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#8C6D53]" />
              <h1 className="text-lg font-black text-[#2D2A26]">日語特訓中心</h1>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              依照課本進度進行單字拼讀、句型填空、翻譯與五十音硬派盲打。
            </p>
          </div>

          {/* Lesson Selector */}
          {activeMode !== 'kana' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#78716C] whitespace-nowrap">課次：</span>
              <select
                value={selectedLesson}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setSelectedLesson(val);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#D5CBBF] bg-[#FAF4EB] text-[#2D2A26] outline-hidden"
              >
                <option value="all">全部課次</option>
                {allLessons.map(l => (
                  <option key={l} value={l}>
                    第 {l} 課
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 4 Mode Tabs (五十音打字放在第一個) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <button
            onClick={() => setActiveMode('kana')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${activeMode === 'kana'
                ? 'bg-[#2D2A26] text-white border-[#2D2A26] shadow-xs'
                : 'bg-white text-[#625D56] border-[#D5CBBF] hover:bg-[#FAF4EB]'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>五十音打字</span>
          </button>

          <button
            onClick={() => setActiveMode('vocab')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${activeMode === 'vocab'
                ? 'bg-[#2D2A26] text-white border-[#2D2A26] shadow-xs'
                : 'bg-white text-[#625D56] border-[#D5CBBF] hover:bg-[#FAF4EB]'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>單字拼讀</span>
          </button>

          <button
            onClick={() => setActiveMode('cloze')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${activeMode === 'cloze'
                ? 'bg-[#2D2A26] text-white border-[#2D2A26] shadow-xs'
                : 'bg-white text-[#625D56] border-[#D5CBBF] hover:bg-[#FAF4EB]'
              }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>句型填空</span>
          </button>

          <button
            onClick={() => setActiveMode('translation')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${activeMode === 'translation'
                ? 'bg-[#2D2A26] text-white border-[#2D2A26] shadow-xs'
                : 'bg-white text-[#625D56] border-[#D5CBBF] hover:bg-[#FAF4EB]'
              }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>中日翻譯</span>
          </button>
        </div>
      </div>

      {/* Mode 4: Kana Mastery */}
      {activeMode === 'kana' && (
        <KanaPractice
          onRecordMistake={onRecordMistake}
          onUpdateStats={onUpdateStats}
        />
      )}

      {/* Modes 1, 2, 3: Vocab, Cloze, Translation */}
      {activeMode !== 'kana' && (
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col">

          {/* Header Progress Strip */}
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-3 pb-2 border-b border-[#F0EBE3]">
            <span className="font-bold text-[#2D2A26]">
              {activeMode === 'vocab' && '單字讀音拼讀'}
              {activeMode === 'cloze' && '課本句型填空'}
              {activeMode === 'translation' && '中日雙向翻譯'}
              {currentItem && `（第 ${quizIndex + 1} / ${quizQueue.length} 題 · 第 ${currentItem.lesson} 課）`}
            </span>
            <button
              onClick={() => startModeSession(activeMode, selectedLesson)}
              className="flex items-center gap-1 text-xs text-[#8C6D53] hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新洗牌</span>
            </button>
          </div>

          {quizQueue.length === 0 ? (
            <div className="w-full flex flex-col items-center text-center py-12">
              <BookOpen className="w-10 h-10 text-[#D5CBBF] mb-3" />
              <h3 className="text-base font-bold text-[#2D2A26] mb-1">
                {activeMode === 'vocab' && '目前尚無課本單字'}
                {activeMode === 'cloze' && '目前尚無課本句型填空題'}
                {activeMode === 'translation' && '目前尚無課本翻譯題'}
              </h3>
              <p className="text-xs text-[#78716C] max-w-sm mb-5 leading-relaxed">
                您可以直接進行「五十音打字」特訓，或是隨時在「單字庫」建立個人專屬單字！
              </p>
              <button
                onClick={() => setActiveMode('kana')}
                className="px-4 py-2 bg-[#2D2A26] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A]"
              >
                開始五十音打字
              </button>
            </div>
          ) : !quizCompleted && currentItem ? (
            <div className="w-full flex flex-col items-center">

              {/* Question Display Area */}
              <div className="my-3 text-center w-full max-w-lg">

                {/* 1. VOCAB QUIZ */}
                {activeMode === 'vocab' && (
                  <div>
                    <div className="text-xs font-bold text-[#8C6D53] uppercase tracking-wider mb-1">
                      中文釋義
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#2D2A26]">
                      {(currentItem as TextbookVocabItem).meaning}
                    </div>
                    <div className="text-sm font-medium text-[#78716C] mt-2 flex items-center justify-center gap-1.5">
                      <span>漢字：{(currentItem as TextbookVocabItem).word}</span>
                      <button
                        type="button"
                        onClick={() => playJapaneseSpeech((currentItem as TextbookVocabItem).word)}
                        className="p-1 rounded-full text-[#8C6D53] hover:bg-[#FAF4EB]"
                        title="朗讀"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    {(currentItem as TextbookVocabItem).exampleSentence && (
                      <div className="text-xs text-[#A8A29E] mt-2 italic">
                        例句：{(currentItem as TextbookVocabItem).exampleSentence}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CLOZE QUIZ */}
                {activeMode === 'cloze' && (
                  <div>
                    {(currentItem as SentenceClozeItem).title && (
                      <span className="text-xs font-bold text-[#8C6D53] bg-[#FAF4EB] border border-[#E8E2D9] px-2.5 py-0.5 rounded-full inline-block mb-2">
                        {(currentItem as SentenceClozeItem).title}
                      </span>
                    )}
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#2D2A26] leading-relaxed tracking-wide font-serif">
                      {(currentItem as SentenceClozeItem).sentenceWithBlank}
                    </div>
                    <div className="text-sm font-medium text-[#78716C] mt-2">
                      中文：{(currentItem as SentenceClozeItem).meaning}
                    </div>
                    {(currentItem as SentenceClozeItem).hint && (
                      <div className="text-xs text-[#D97706] mt-1.5 font-medium">
                        {(currentItem as SentenceClozeItem).hint}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. TRANSLATION QUIZ */}
                {activeMode === 'translation' && (
                  <div>
                    <div className="text-xs font-bold text-[#8C6D53] uppercase tracking-wider mb-1">
                      請翻譯為日文
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#2D2A26]">
                      {(currentItem as TranslationExerciseItem).prompt}
                    </div>
                    {(currentItem as TranslationExerciseItem).vocabHints?.length > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                        <span className="text-xs text-[#78716C]">詞彙提示：</span>
                        {(currentItem as TranslationExerciseItem).vocabHints.map((hint, i) => (
                          <span
                            key={i}
                            className="text-xs bg-[#FAF4EB] text-[#8C6D53] border border-[#D5CBBF] px-2 py-0.5 rounded-md font-medium"
                          >
                            {hint}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Input Form with Virtual Keyboard Integration */}
              <form onSubmit={handleFormSubmit} className="w-full max-w-md flex flex-col gap-2.5 mt-2">

                {/* Virtual Keyboard Toggle for mobile / IME-less users */}
                <div className="w-full flex items-center justify-between text-xs px-0.5">
                  <button
                    type="button"
                    onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all border ${isKeyboardOpen
                        ? 'bg-[#2D2A26] text-white border-[#2D2A26]'
                        : 'bg-[#FAF4EB] text-[#8C6D53] border-[#D5CBBF] hover:bg-[#F2EAE0]'
                      }`}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>{isKeyboardOpen ? '收起虛擬鍵盤' : '使用日文虛擬鍵盤'}</span>
                  </button>
                  {isKeyboardOpen && (
                    <span className="text-[11px] font-semibold text-[#16A34A]">
                      已防手機鍵盤遮擋
                    </span>
                  )}
                </div>

                <div className="relative w-full">
                  <input
                    ref={inputRef}
                    type="text"
                    autoFocus={!isTouchDevice()}
                    inputMode={isKeyboardOpen ? 'none' : 'text'}
                    readOnly={quizAnswered}
                    value={quizInput}
                    onChange={(e) => setQuizInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || (e as any).isComposing || e.keyCode === 229) return;
                      if (e.key === 'Enter') {
                        if (quizAnswered) {
                          e.preventDefault();
                          handleNext();
                        }
                      }
                    }}
                    placeholder={
                      isKeyboardOpen
                        ? '點擊下方虛擬鍵盤輸入...'
                        : activeMode === 'vocab'
                          ? '輸入假名讀音 (如：たべる)...'
                          : activeMode === 'cloze'
                            ? '輸入挖空處答案 (如：は)...'
                            : '輸入日文翻譯句子...'
                    }
                    className={`w-full px-4 py-3 text-center text-lg font-bold rounded-xl border-2 transition-all outline-hidden ${quizAnswered
                        ? quizIsCorrect
                          ? 'bg-[#F0FDF4] border-[#22C55E] text-[#15803D]'
                          : 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'
                        : 'bg-white border-[#D5CBBF] text-[#2D2A26] focus:border-[#8C6D53]'
                      }`}
                  />

                  {quizAnswered && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {quizIsCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#DC2626]" />
                      )}
                    </div>
                  )}
                </div>

                {/* Verification result & explanations */}
                {quizAnswered && (
                  <div
                    className={`p-3 rounded-xl text-center text-xs sm:text-sm font-bold border ${quizIsCorrect
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                      }`}
                  >
                    {quizIsCorrect ? (
                      <div>
                        <span className="text-sm">✓ 回答正確！</span>
                        {activeMode === 'cloze' && (currentItem as SentenceClozeItem).explanation && (
                          <div className="text-xs font-normal text-[#166534] mt-1">
                            {(currentItem as SentenceClozeItem).explanation}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm">✕ 回答錯誤！</div>
                        <div className="mt-1 text-sm font-black underline font-mono">
                          正確答案：
                          {activeMode === 'vocab' && (currentItem as TextbookVocabItem).reading}
                          {activeMode === 'cloze' && (currentItem as SentenceClozeItem).correctAnswers.join(' / ')}
                          {activeMode === 'translation' && (currentItem as TranslationExerciseItem).expectedAnswers[0]}
                        </div>
                        {activeMode === 'cloze' && (currentItem as SentenceClozeItem).explanation && (
                          <div className="text-xs font-normal text-[#991B1B] mt-1.5">
                            文法解析：{(currentItem as SentenceClozeItem).explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-1">
                  {!quizAnswered ? (
                    <button
                      type="submit"
                      disabled={!quizInput.trim()}
                      className="w-full py-2.5 bg-[#2D2A26] text-white font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A] disabled:opacity-40 transition-all text-sm cursor-pointer"
                    >
                      確認送出 (Enter)
                    </button>
                  ) : (
                    <button
                      ref={nextButtonRef}
                      type="button"
                      onClick={handleNext}
                      autoFocus
                      className="w-full py-2.5 bg-[#8C6D53] text-white font-bold rounded-xl shadow-xs hover:bg-[#735842] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <span>下一題 (Enter)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>

            </div>
          ) : (
            /* Session Completed Screen */
            <div className="w-full flex flex-col items-center text-center py-6">
              <h3 className="text-xl font-black text-[#2D2A26] mb-2">本輪特訓完成！</h3>
              <p className="text-xs text-[#78716C] mb-6">
                堅持盲打練習，語感與記憶力直線飆升！
              </p>

              <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
                <div className="p-3 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                  <div className="text-xs text-[#15803D]">答對題數</div>
                  <div className="text-2xl font-black text-[#15803D] tabular-nums mt-0.5">
                    {quizCorrectCount}
                  </div>
                </div>
                <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
                  <div className="text-xs text-[#B91C1C]">答錯題數</div>
                  <div className="text-2xl font-black text-[#B91C1C] tabular-nums mt-0.5">
                    {quizQueue.length - quizCorrectCount}
                  </div>
                </div>
              </div>

              <button
                onClick={() => startModeSession(activeMode, selectedLesson)}
                className="px-6 py-2.5 bg-[#2D2A26] text-white font-bold rounded-xl text-sm shadow-xs hover:bg-[#1E1C1A] cursor-pointer"
              >
                再練一輪
              </button>
            </div>
          )}

        </div>
      )}

      {/* In-quiz Virtual Keyboard Drawer */}
      {activeMode !== 'kana' && (
        <VirtualKeyboard
          isOpen={isKeyboardOpen}
          onToggle={() => setIsKeyboardOpen(!isKeyboardOpen)}
          onInsertChar={(char) => setQuizInput((prev) => prev + char)}
          onDeleteChar={() => setQuizInput((prev) => prev.slice(0, -1))}
          onSubmit={handleFormSubmit}
          onTransformDakuten={() => setQuizInput((prev) => transformLastChar(prev, 'dakuten'))}
          onTransformHandakuten={() => setQuizInput((prev) => transformLastChar(prev, 'handakuten'))}
          onTransformSmall={() => setQuizInput((prev) => transformLastChar(prev, 'small'))}
          showFloatingToggle={false}
        />
      )}

    </div>
  );
};
