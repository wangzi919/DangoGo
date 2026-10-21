import React, { useState } from 'react';
import { Volume2, Sparkles, BookOpen, ChevronRight, Check } from 'lucide-react';
import { playJapaneseSpeech } from '../lib/speech';
import { Mascot } from './Mascot';

interface VerbItem {
  dict: string;
  reading: string;
  meaning: string;
  type: '五段動詞' | '一段動詞' | 'カ変' | 'サ変';
  masu: { word: string; reading: string };
  te: { word: string; reading: string };
  nai: { word: string; reading: string };
  ta: { word: string; reading: string };
  kanou: { word: string; reading: string };
}

const SAMPLE_VERBS: VerbItem[] = [
  {
    dict: '食べる',
    reading: 'たべる',
    meaning: '吃',
    type: '一段動詞',
    masu: { word: '食べます', reading: 'たべます' },
    te: { word: '食べて', reading: 'たべて' },
    nai: { word: '食べない', reading: 'たべない' },
    ta: { word: '食べた', reading: 'たべた' },
    kanou: { word: '食べられる', reading: 'たべられる' }
  },
  {
    dict: '行く',
    reading: 'いく',
    meaning: '去',
    type: '五段動詞',
    masu: { word: '行きます', reading: 'いきます' },
    te: { word: '行って', reading: 'いって' },
    nai: { word: '行かない', reading: 'いかない' },
    ta: { word: '行った', reading: 'いった' },
    kanou: { word: '行ける', reading: 'いける' }
  },
  {
    dict: '飲む',
    reading: 'のむ',
    meaning: '喝',
    type: '五段動詞',
    masu: { word: '飲みます', reading: 'のみます' },
    te: { word: '飲んで', reading: 'のんで' },
    nai: { word: '飲まない', reading: 'のまない' },
    ta: { word: '飲んだ', reading: 'のんだ' },
    kanou: { word: '飲める', reading: 'のめる' }
  },
  {
    dict: 'する',
    reading: 'する',
    meaning: '做 / 進行',
    type: 'サ変',
    masu: { word: 'します', reading: 'します' },
    te: { word: 'して', reading: 'して' },
    nai: { word: 'しない', reading: 'しない' },
    ta: { word: 'した', reading: 'した' },
    kanou: { word: 'できる', reading: 'できる' }
  },
  {
    dict: '来る',
    reading: 'くる',
    meaning: '來',
    type: 'カ変',
    masu: { word: '来ます', reading: 'きます' },
    te: { word: '来て', reading: 'きて' },
    nai: { word: '来ない', reading: 'こない' },
    ta: { word: '来た', reading: 'きた' },
    kanou: { word: '来られる', reading: 'こられる' }
  }
];

export const GrammarPreview: React.FC = () => {
  const [selectedVerb, setSelectedVerb] = useState<VerbItem>(SAMPLE_VERBS[0]);
  const [activeForm, setActiveForm] = useState<'masu' | 'te' | 'nai' | 'ta' | 'kanou'>('te');

  const forms = [
    { key: 'masu', label: 'ます形 (禮貌肯定)' },
    { key: 'te', label: 'て形 (接續/請求)' },
    { key: 'nai', label: 'ない形 (否定)' },
    { key: 'ta', label: 'た形 (過去式)' },
    { key: 'kanou', label: '可能形 (能夠/可以)' }
  ] as const;

  const currentConjugation = selectedVerb[activeForm];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#FAF4EB] to-[#FFF0F5] border border-[#E8E2D9] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-[#8C6D53] bg-white border border-[#D5CBBF] px-2 py-0.5 rounded-full">
              預留擴充模組 ·搶先預覽
            </span>
            <Sparkles className="w-4 h-4 text-[#D97706]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#2D2A26] tracking-tight">
            文法與日文動詞變化特訓
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1 max-w-lg leading-relaxed">
            掌握動詞變化，是突破日語會話與閱讀的關鍵。DangoGo 已為您預留此功能，目前提供動詞變化規則互動速查！
          </p>
        </div>

        <Mascot
          state="idle"
          size="md"
          message="動詞變化好神奇！五段、一段、變格動詞一網打盡！"
          showBubble={false}
        />
      </div>

      {/* Interactive Conjugation Sandbox */}
      <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#8C6D53]" />
            <h2 className="text-base font-bold text-[#2D2A26]">動詞活用速查模擬器</h2>
          </div>
          <span className="text-xs text-[#78716C]">
            點選動詞與形態，即時聆聽發音
          </span>
        </div>

        {/* Verb Selector Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SAMPLE_VERBS.map(verb => (
            <button
              key={verb.dict}
              onClick={() => setSelectedVerb(verb)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                selectedVerb.dict === verb.dict
                  ? 'bg-[#2D2A26] text-white border-[#2D2A26] shadow-xs'
                  : 'bg-white text-[#4A453E] border-[#D5CBBF] hover:bg-[#FAF4EB]'
              }`}
            >
              <span>{verb.dict}</span>
              <span className="text-[11px] opacity-80">({verb.meaning})</span>
            </button>
          ))}
        </div>

        {/* Form Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E8E2D9]">
          {forms.map(form => (
            <button
              key={form.key}
              onClick={() => setActiveForm(form.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeForm === form.key
                  ? 'bg-white text-[#2D2A26] shadow-xs font-bold'
                  : 'text-[#625D56] hover:text-[#2D2A26]'
              }`}
            >
              {form.label}
            </button>
          ))}
        </div>

        {/* Big Conjugation Result Stage */}
        <div className="bg-[#FAF7F2] border border-[#E8E2D9] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative group">
          <span className="text-xs font-bold text-[#8C6D53] tracking-wider mb-1">
            {selectedVerb.type} · {forms.find(f => f.key === activeForm)?.label}
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#2D2A26] font-serif my-1">
            {currentConjugation.word}
          </div>
          <div className="text-sm text-[#78716C] font-medium">
            【{currentConjugation.reading}】
          </div>

          <button
            onClick={() => playJapaneseSpeech(currentConjugation.word)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-[#D5CBBF] text-[#8C6D53] font-semibold text-xs shadow-2xs hover:bg-[#FAF4EB]"
          >
            <Volume2 className="w-4 h-4" />
            <span>聆聽發音 (ja-JP)</span>
          </button>
        </div>

        {/* Verb Rules Reference Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white border border-[#E8E2D9]">
            <h4 className="text-xs font-bold text-[#2D2A26] mb-1">1. 五段動詞 (Group 1)</h4>
            <p className="text-[11px] text-[#78716C] leading-relaxed">
              語尾在「う段」變化。例如 書く (kaku) ➔ 書きます (kakimasu) ➔ 書いて (kaite)。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#E8E2D9]">
            <h4 className="text-xs font-bold text-[#2D2A26] mb-1">2. 一段動詞 (Group 2)</h4>
            <p className="text-[11px] text-[#78716C] leading-relaxed">
              語尾為「る」，且前一個假名在「い段」或「え段」。去掉「る」直接接續 ます/て/ない。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#E8E2D9]">
            <h4 className="text-xs font-bold text-[#2D2A26] mb-1">3. 不規則動詞 (Group 3)</h4>
            <p className="text-[11px] text-[#78716C] leading-relaxed">
              僅有兩字：する (サ変) 與 来る (カ変)。必須單獨記憶特殊變形音便。
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
