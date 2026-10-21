import React, { useState } from 'react';
import { Keyboard, X, Delete, CornerDownLeft, ArrowLeftRight } from 'lucide-react';

interface VirtualKeyboardProps {
  isOpen: boolean;
  onToggle: () => void;
  onInsertChar: (char: string) => void;
  onDeleteChar: () => void;
  onSubmit: () => void;
  onTransformDakuten?: () => void;
  onTransformHandakuten?: () => void;
  onTransformSmall?: () => void;
  showFloatingToggle?: boolean;
}

const DAKUTEN_MAP: Record<string, string> = {
  'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
  'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
  'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
  'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
  'カ': 'ガ', 'キ': 'ギ', 'ク': 'グ', 'ケ': 'ゲ', 'コ': 'ゴ',
  'サ': 'ザ', 'シ': 'ジ', 'ス': 'ズ', 'セ': 'ゼ', 'ソ': 'ゾ',
  'タ': 'ダ', 'チ': 'ヂ', 'ツ': 'ヅ', 'テ': 'デ', 'ト': 'ド',
  'ハ': 'バ', 'ヒ': 'ビ', 'フ': 'ブ', 'ヘ': 'ベ', 'ホ': 'ボ'
};

const HANDAKUTEN_MAP: Record<string, string> = {
  'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
  'ハ': 'パ', 'ヒ': 'ピ', 'フ': 'プ', 'ヘ': 'ペ', 'ホ': 'ポ'
};

const SMALL_MAP: Record<string, string> = {
  'あ': 'ぁ', 'い': 'ぃ', 'う': 'ぅ', 'え': 'ぇ', 'お': 'ぉ',
  'つ': 'っ', 'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ', 'わ': 'ゎ',
  'ア': 'ァ', 'イ': 'ィ', 'ウ': 'ゥ', 'エ': 'ェ', 'オ': 'ォ',
  'ツ': 'ッ', 'ヤ': 'ャ', 'ユ': 'ュ', 'ヨ': 'ョ', 'ワ': 'ヮ'
};

export function transformLastChar(text: string, type: 'dakuten' | 'handakuten' | 'small'): string {
  if (!text) return text;
  const lastChar = text.slice(-1);
  const prefix = text.slice(0, -1);

  if (type === 'dakuten' && DAKUTEN_MAP[lastChar]) {
    return prefix + DAKUTEN_MAP[lastChar];
  }
  if (type === 'handakuten' && HANDAKUTEN_MAP[lastChar]) {
    return prefix + HANDAKUTEN_MAP[lastChar];
  }
  if (type === 'small' && SMALL_MAP[lastChar]) {
    return prefix + SMALL_MAP[lastChar];
  }
  return text;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  isOpen,
  onToggle,
  onInsertChar,
  onDeleteChar,
  onSubmit,
  onTransformDakuten,
  onTransformHandakuten,
  onTransformSmall,
  showFloatingToggle = false
}) => {
  const [scriptMode, setScriptMode] = useState<'hiragana' | 'katakana'>('hiragana');

  // Gojuon rows [a, i, u, e, o]
  const hiraganaGrid = [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の'],
    ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も'],
    ['や', '', 'ゆ', '', 'よ'],
    ['ら', 'り', 'る', 'れ', 'ろ'],
    ['わ', '', 'を', '', 'ん']
  ];

  const katakanaGrid = [
    ['ア', 'イ', 'ウ', 'エ', 'オ'],
    ['カ', 'キ', 'ク', 'ケ', 'コ'],
    ['サ', 'シ', 'ス', 'セ', 'ソ'],
    ['タ', 'チ', 'ツ', 'テ', 'ト'],
    ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
    ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
    ['マ', 'ミ', 'ム', 'メ', 'モ'],
    ['ヤ', '', 'ユ', '', 'ヨ'],
    ['ラ', 'リ', 'ル', 'レ', 'ロ'],
    ['ワ', '', 'ヲ', '', 'ン']
  ];

  const currentGrid = scriptMode === 'hiragana' ? hiraganaGrid : katakanaGrid;

  return (
    <>
      {/* Floating Toggle Button (Only when explicitly enabled) */}
      {showFloatingToggle && (
        <button
          onClick={onToggle}
          className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg border transition-all duration-200 text-sm font-semibold select-none ${isOpen
            ? 'bg-[#2D2A26] text-white border-[#1F2937]'
            : 'bg-white text-[#2D2A26] border-[#D5CBBF] hover:bg-[#FAF4EB]'
            }`}
          title="開啟/收合日文虛擬鍵盤"
        >
          <Keyboard className="w-4 h-4 text-[#8C6D53]" />
          <span>{isOpen ? '收起鍵盤' : '日文虛擬鍵盤'}</span>
        </button>
      )}

      {/* Docked Keyboard Drawer */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-60 bg-[#F5EFE6] border-t-2 border-[#D5CBBF] shadow-2xl px-3 py-3 max-h-[44vh] overflow-y-auto">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">

            {/* Top Keyboard Bar: Script Switcher & Modifiers */}
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#E2D8CC]">
              {/* Script Mode Toggle */}
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-[#D5CBBF] shadow-xs">
                <button
                  type="button"
                  onClick={() => setScriptMode('hiragana')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${scriptMode === 'hiragana'
                    ? 'bg-[#8C6D53] text-white'
                    : 'text-[#625D56] hover:text-[#2D2A26]'
                    }`}
                >
                  平假名
                </button>
                <button
                  type="button"
                  onClick={() => setScriptMode('katakana')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${scriptMode === 'katakana'
                    ? 'bg-[#8C6D53] text-white'
                    : 'text-[#625D56] hover:text-[#2D2A26]'
                    }`}
                >
                  片假名
                </button>
              </div>

              {/* Special Modifier Keys: 濁音 ゛, 半濁音 ゜, 小字 (促音/拗音) */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={onTransformDakuten}
                  className="px-2.5 py-1 text-sm font-bold rounded-md bg-white border border-[#D5CBBF] hover:bg-[#FAF4EB] text-[#2D2A26] shadow-xs active:scale-95"
                  title="濁音點 (゛) 如: か ➔ が"
                >
                  濁音 ゛
                </button>
                <button
                  type="button"
                  onClick={onTransformHandakuten}
                  className="px-2.5 py-1 text-sm font-bold rounded-md bg-white border border-[#D5CBBF] hover:bg-[#FAF4EB] text-[#2D2A26] shadow-xs active:scale-95"
                  title="半濁音圈 (゜) 如: は ➔ ぱ"
                >
                  半濁 ゜
                </button>
                <button
                  type="button"
                  onClick={onTransformSmall}
                  className="px-2.5 py-1 text-sm font-bold rounded-md bg-white border border-[#D5CBBF] hover:bg-[#FAF4EB] text-[#2D2A26] shadow-xs active:scale-95"
                  title="小字轉換 (小) 如: つ ➔ っ / や ➔ ゃ"
                >
                  小字
                </button>
                <button
                  type="button"
                  onClick={onDeleteChar}
                  className="p-1.5 rounded-md bg-white border border-[#D5CBBF] hover:bg-[#FEE2E2] text-[#991B1B] shadow-xs active:scale-95"
                  title="刪除"
                >
                  <Delete className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  className="px-3 py-1 text-xs font-bold rounded-md bg-[#2D2A26] text-white shadow-xs hover:bg-[#1E1C1A] active:scale-95 flex items-center gap-1"
                  title="送出答案"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>送出</span>
                </button>
                <button
                  type="button"
                  onClick={onToggle}
                  className="p-1.5 text-[#625D56] hover:text-[#2D2A26] rounded-md"
                  title="關閉"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Kana Grid (Horizontal layout matching Japanese standard 50-sound table) */}
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5 text-center">
              {currentGrid.map((row, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1 sm:gap-1.5">
                  {row.map((char, rowIdx) => {
                    if (!char) {
                      return <div key={rowIdx} className="h-8 sm:h-9" />;
                    }
                    return (
                      <button
                        key={rowIdx}
                        type="button"
                        onClick={() => onInsertChar(char)}
                        className="h-8 sm:h-9 rounded-md bg-white border border-[#D5CBBF] font-medium text-sm sm:text-base text-[#2D2A26] shadow-2xs hover:bg-[#FDF9F3] hover:border-[#8C6D53] active:bg-[#EFE9DF] active:scale-95 transition-all"
                      >
                        {char}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
};
