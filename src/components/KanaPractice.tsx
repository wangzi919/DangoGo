import React, { useState, useEffect, useRef } from 'react';
import { KanaItem, KanaScript, KanaGroup, MistakeItem } from '../types';
import { HIRAGANA_DATA, KATAKANA_DATA, isKanaAnswerCorrect } from '../data/kanaData';
import { playJapaneseSpeech, playSuccessSound, playErrorSound } from '../lib/speech';
import { Mascot } from './Mascot';
import mascotConfuseImg from '../assets/images/mascot_confuse.png';
import { Volume2, RotateCcw, CheckCircle2, XCircle, ArrowRight, Sparkles, Filter } from 'lucide-react';

interface KanaPracticeProps {
  onRecordMistake: (mistake: Omit<MistakeItem, 'id' | 'failCount' | 'lastFailedAt'>) => void;
  onUpdateStats: (isCorrect: boolean) => void;
  onSelectCharForVirtualKeyboard?: (char: string) => void;
}

export const KanaPractice: React.FC<KanaPracticeProps> = ({
  onRecordMistake,
  onUpdateStats
}) => {
  // Scope Settings
  const [selectedScript, setSelectedScript] = useState<'hiragana' | 'katakana' | 'both'>('hiragana');
  const [includeSeion, setIncludeSeion] = useState<boolean>(true);
  const [includeDakuon, setIncludeDakuon] = useState<boolean>(false);
  const [includeYoon, setIncludeYoon] = useState<boolean>(false);

  // Practice Session State
  const [queue, setQueue] = useState<KanaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);

  // Session Statistics
  const [sessionCorrectCount, setSessionCorrectCount] = useState<number>(0);
  const [sessionTotalCount, setSessionTotalCount] = useState<number>(0);

  // Mascot Feedback
  const [mascotState, setMascotState] = useState<'idle' | 'jumping' | 'thinking' | 'celebrating'>('idle');
  const [mascotMessage, setMascotMessage] = useState<string>('輸入對應的羅馬拼音，按下 Enter 送出！');

  const inputRef = useRef<HTMLInputElement>(null);

  const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  };

  // Build pool and initialize session
  const startNewSession = (shouldAutoFocus: boolean = true) => {
    let pool: KanaItem[] = [];

    const getItemsFromScript = (data: KanaItem[]) => {
      return data.filter(item => {
        if (item.group === 'seion' && includeSeion) return true;
        if (item.group === 'dakuon' && includeDakuon) return true;
        if (item.group === 'yoon' && includeYoon) return true;
        return false;
      });
    };

    if (selectedScript === 'hiragana' || selectedScript === 'both') {
      pool = pool.concat(getItemsFromScript(HIRAGANA_DATA));
    }
    if (selectedScript === 'katakana' || selectedScript === 'both') {
      pool = pool.concat(getItemsFromScript(KATAKANA_DATA));
    }

    // Fallback if user unchecked all
    if (pool.length === 0) {
      pool = HIRAGANA_DATA.filter(i => i.group === 'seion');
      setIncludeSeion(true);
    }

    // Strict non-repeating shuffle (Fisher-Yates)
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setQueue(shuffled);
    setCurrentIndex(0);
    setUserInput('');
    setIsAnswered(false);
    setIsCorrect(null);
    setSessionCompleted(false);
    setSessionCorrectCount(0);
    setSessionTotalCount(shuffled.length);
    setMascotState('idle');
    setMascotMessage('三色糰子準備就緒！');

    setTimeout(() => {
      // 觸控裝置切換範圍不主動彈出鍵盤，電腦端則維持自動聚焦
      if (shouldAutoFocus && !isTouchDevice()) {
        inputRef.current?.focus();
      }
      if (shuffled[0] && autoPlayAudio) {
        playJapaneseSpeech(shuffled[0].char);
      }
    }, 150);
  };

  // Re-start session when scope filters change (不強制彈出鍵盤)
  useEffect(() => {
    startNewSession(false);
  }, [selectedScript, includeSeion, includeDakuon, includeYoon]);

  const currentKana = queue[currentIndex];

  const handleSpeech = () => {
    if (currentKana) {
      playJapaneseSpeech(currentKana.char);
    }
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentKana || isAnswered || !userInput.trim()) return;

    const correct = isKanaAnswerCorrect(userInput, currentKana.romaji);
    setIsAnswered(true);
    setIsCorrect(correct);
    onUpdateStats(correct);

    if (correct) {
      playSuccessSound();
      setSessionCorrectCount(prev => prev + 1);
      setMascotState('jumping');
      setMascotMessage(`答對了！「${currentKana.char}」就是 [${currentKana.romaji.join(' / ')}]！🍡🎉`);
    } else {
      playErrorSound();
      setMascotState('thinking');
      setMascotMessage(`唔… 糰子被戳扁扁！「${currentKana.char}」的讀音是 [${currentKana.romaji.join(' / ')}] 💭`);

      // Add to mistakes record
      onRecordMistake({
        targetId: currentKana.id,
        type: 'kana',
        prompt: currentKana.char,
        expected: currentKana.romaji,
        display: `${currentKana.script === 'hiragana' ? '平假名' : '片假名'}：${currentKana.char}`
      });
    }

    // Play pronunciation after answering
    playJapaneseSpeech(currentKana.char);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= queue.length) {
      // Completed round
      setSessionCompleted(true);
      setMascotState('celebrating');
      setMascotMessage(`本輪五十音打字特訓完成！正確率 ${( (sessionCorrectCount / queue.length) * 100).toFixed(0)}%！✨`);
      return;
    }

    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    setUserInput('');
    setIsAnswered(false);
    setIsCorrect(null);
    setMascotState('idle');
    setMascotMessage('下一題！看準假名，直接敲鍵盤！');

    setTimeout(() => {
      // 觸控裝置不主動強制彈出鍵盤，電腦端則維持自動聚焦繼續答題
      if (!isTouchDevice()) {
        inputRef.current?.focus();
      }
      if (queue[nextIdx] && autoPlayAudio) {
        playJapaneseSpeech(queue[nextIdx].char);
      }
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      
      {/* Scope Settings Panel */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE3]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8C6D53]" />
            <h2 className="text-base font-bold text-[#2D2A26]">特訓範圍</h2>
            <span className="text-xs text-[#78716C] bg-[#F5EFE6] px-2 py-0.5 rounded-sm">
              共 {queue.length} 音（不重複抽題）
            </span>
          </div>

          {/* Script Segmented Control */}
          <div className="flex items-center bg-[#FAF4EB] p-1 rounded-lg border border-[#E8E2D9]">
            <button
              onClick={() => setSelectedScript('hiragana')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                selectedScript === 'hiragana'
                  ? 'bg-white text-[#2D2A26] shadow-2xs'
                  : 'text-[#625D56] hover:text-[#2D2A26]'
              }`}
            >
              平假名
            </button>
            <button
              onClick={() => setSelectedScript('katakana')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                selectedScript === 'katakana'
                  ? 'bg-white text-[#2D2A26] shadow-2xs'
                  : 'text-[#625D56] hover:text-[#2D2A26]'
              }`}
            >
              片假名
            </button>
            <button
              onClick={() => setSelectedScript('both')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                selectedScript === 'both'
                  ? 'bg-white text-[#2D2A26] shadow-2xs'
                  : 'text-[#625D56] hover:text-[#2D2A26]'
              }`}
            >
              平/片混合
            </button>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="pt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#4A453E]">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSeion}
              onChange={(e) => setIncludeSeion(e.target.checked)}
              className="w-4 h-4 rounded text-[#8C6D53] focus:ring-0 cursor-pointer accent-[#8C6D53]"
            />
            <span className="font-medium">清音 (46音)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDakuon}
              onChange={(e) => setIncludeDakuon(e.target.checked)}
              className="w-4 h-4 rounded text-[#8C6D53] focus:ring-0 cursor-pointer accent-[#8C6D53]"
            />
            <span className="font-medium">濁音 / 半濁音 (25音)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeYoon}
              onChange={(e) => setIncludeYoon(e.target.checked)}
              className="w-4 h-4 rounded text-[#8C6D53] focus:ring-0 cursor-pointer accent-[#8C6D53]"
            />
            <span className="font-medium">拗音 (33音)</span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#78716C] select-none">
              <input
                type="checkbox"
                checked={autoPlayAudio}
                onChange={(e) => setAutoPlayAudio(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#8C6D53]"
              />
              <span>自動語音朗讀</span>
            </label>

            <button
              onClick={() => startNewSession(false)}
              className="flex items-center gap-1 text-xs text-[#8C6D53] hover:text-[#5E4733] font-medium ml-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新洗牌</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      {!sessionCompleted && currentKana ? (
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col items-center relative overflow-hidden">
          
          {/* Progress Bar & Header Metadata */}
          <div className="w-full flex items-center justify-between text-xs text-[#78716C] mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#2D2A26]">第 {currentIndex + 1} 題</span>
              <span>/ 共 {queue.length} 題</span>
              <span>·</span>
              <span>{currentKana.script === 'hiragana' ? '平假名' : '片假名'}</span>
              <span>·</span>
              <span>
                {currentKana.group === 'seion' ? '清音' : currentKana.group === 'dakuon' ? '濁音/半濁音' : '拗音'}
              </span>
            </div>

            <div className="font-mono tabular-nums text-xs font-semibold text-[#8C6D53]">
              正確率: {currentIndex > 0 ? ((sessionCorrectCount / currentIndex) * 100).toFixed(0) : 100}%
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full h-1.5 bg-[#FAF4EB] rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-[#8C6D53] transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
            />
          </div>

          {/* Mascot in Reaction */}
          <div className="mb-4">
            <Mascot
              state={mascotState}
              size="md"
              message={mascotMessage}
              showBubble={true}
              customImage={mascotConfuseImg}
              disableConfetti={true}
            />
          </div>

          {/* Big Kana Card */}
          <div className="relative flex flex-col items-center justify-center my-4 group">
            <div
              onClick={handleSpeech}
              title="點擊聽標準發音 (ja-JP)"
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-[#FAF7F2] border-2 border-[#E8E2D9] flex items-center justify-center cursor-pointer shadow-xs hover:border-[#8C6D53] transition-all group-hover:scale-102"
            >
              <span className="text-6xl sm:text-7xl font-bold font-serif text-[#2D2A26] select-none">
                {currentKana.char}
              </span>

              <button
                type="button"
                className="absolute bottom-3 right-3 p-2 bg-white rounded-full border border-[#D5CBBF] shadow-2xs hover:bg-[#FAF4EB] text-[#8C6D53]"
                title="發音"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hardcore Typing Input Form (No multiple choice!) */}
          <form onSubmit={handleVerify} className="w-full max-w-sm flex flex-col items-center gap-3 mt-3">
            <div className="relative w-full">
              <input
                ref={inputRef}
                type="text"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                disabled={isAnswered}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="請輸入羅馬拼音..."
                className={`w-full px-4 py-3.5 text-center text-xl font-bold tracking-wider rounded-xl border-2 transition-all outline-hidden ${
                  isAnswered
                    ? isCorrect
                      ? 'bg-[#F0FDF4] border-[#22C55E] text-[#15803D]'
                      : 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'
                    : 'bg-white border-[#D5CBBF] text-[#2D2A26] focus:border-[#8C6D53] focus:ring-4 focus:ring-[#8C6D53]/10'
                }`}
              />

              {isAnswered && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                  ) : (
                    <XCircle className="w-6 h-6 text-[#DC2626]" />
                  )}
                </div>
              )}
            </div>

            {/* Answer Feedback / Tolerance notes */}
            {isAnswered && (
              <div className="w-full text-center py-2 px-3 rounded-lg text-xs sm:text-sm animate-fade-in font-medium">
                {isCorrect ? (
                  <span className="text-[#15803D]">
                    太棒了！容許拼法：{currentKana.romaji.join(', ')}
                  </span>
                ) : (
                  <span className="text-[#B91C1C]">
                    正確答案是：<strong className="underline text-base">{currentKana.romaji[0]}</strong>
                    {currentKana.romaji.length > 1 && ` (亦可拼作: ${currentKana.romaji.slice(1).join(', ')})`}
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full flex items-center gap-2 mt-1">
              {!isAnswered ? (
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="w-full py-3 bg-[#2D2A26] text-white font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <span>驗證答案 (Enter)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  autoFocus
                  className="w-full py-3 bg-[#8C6D53] text-white font-bold rounded-xl shadow-xs hover:bg-[#735842] transition-all flex items-center justify-center gap-2"
                >
                  <span>下一題 (Enter / 空白鍵)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Quick Help Tip */}
          <div className="mt-6 text-[11px] text-[#A8A29E] flex items-center gap-1.5">
            <span>💡 支援多種羅馬字拼法（如 si/shi, tu/tsu, fu/hu）· Enter 鍵快速送出</span>
          </div>
        </div>
      ) : (
        /* Round Completed Summary Screen */
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-8 sm:p-12 shadow-xs flex flex-col items-center text-center">
          <Mascot
            state="celebrating"
            size="lg"
            message="太強了！整串糰子大滿貫！你完成了一整輪五十音打字背誦！"
            showBubble={true}
            customImage={mascotConfuseImg}
            disableConfetti={true}
          />

          <h3 className="text-2xl font-black text-[#2D2A26] mt-6">
            五十音本輪特訓結算
          </h3>
          <p className="text-sm text-[#78716C] mt-1">
            Dango 糰子小隊為你的堅持鼓掌！不看選項盲打才是真正學會！
          </p>

          <div className="grid grid-cols-3 gap-4 my-8 w-full max-w-md">
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9]">
              <div className="text-xs text-[#78716C]">總題數</div>
              <div className="text-2xl font-black text-[#2D2A26] tabular-nums mt-1">
                {sessionTotalCount}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9]">
              <div className="text-xs text-[#78716C]">答對題數</div>
              <div className="text-2xl font-black text-[#15803D] tabular-nums mt-1">
                {sessionCorrectCount}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9]">
              <div className="text-xs text-[#78716C]">正確率</div>
              <div className="text-2xl font-black text-[#8C6D53] tabular-nums mt-1">
                {sessionTotalCount > 0 ? ((sessionCorrectCount / sessionTotalCount) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
            <button
              onClick={() => startNewSession()}
              className="w-full py-3 bg-[#2D2A26] text-white font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A] transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>再來一輪特訓</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
