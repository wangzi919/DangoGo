import React, { useState } from 'react';
import { MistakeItem, UserStats } from '../types';
import { playJapaneseSpeech, playSuccessSound, playErrorSound } from '../lib/speech';
import { Mascot } from './Mascot';
import mascotReadImg from '../assets/images/mascot_read.png';
import {
  AlertCircle,
  Play,
  Trash2,
  Volume2,
  CheckCircle2,
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  X,
  Target
} from 'lucide-react';

interface MistakesReviewProps {
  mistakes: MistakeItem[];
  onRemoveMistake: (id: string) => void;
  onClearAllMistakes: () => void;
  onUpdateStats: (isCorrect: boolean) => void;
  stats: UserStats;
}

export const MistakesReview: React.FC<MistakesReviewProps> = ({
  mistakes,
  onRemoveMistake,
  onClearAllMistakes,
  onUpdateStats,
  stats
}) => {
  const [filterType, setFilterType] = useState<'all' | 'vocab' | 'cloze' | 'translation' | 'kana'>('all');

  // Drill Mode State
  const [isDrillActive, setIsDrillActive] = useState<boolean>(false);
  const [drillQueue, setDrillQueue] = useState<MistakeItem[]>([]);
  const [drillIndex, setDrillIndex] = useState<number>(0);
  const [drillInput, setDrillInput] = useState<string>('');
  const [drillAnswered, setDrillAnswered] = useState<boolean>(false);
  const [drillIsCorrect, setDrillIsCorrect] = useState<boolean | null>(null);
  const [drillCompleted, setDrillCompleted] = useState<boolean>(false);
  const [mascotState, setMascotState] = useState<'idle' | 'jumping' | 'thinking' | 'celebrating'>('idle');
  const [mascotMsg, setMascotMsg] = useState('糰子特訓時間！消滅這個盲點吧！');

  const filteredMistakes = mistakes.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const startDrill = () => {
    if (filteredMistakes.length === 0) return;
    const shuffled = [...filteredMistakes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setDrillQueue(shuffled);
    setDrillIndex(0);
    setDrillInput('');
    setDrillAnswered(false);
    setDrillIsCorrect(null);
    setDrillCompleted(false);
    setMascotState('idle');
    setMascotMsg('專心致志，輸入正確讀音或答案！');
    setIsDrillActive(true);
  };

  const currentItem = drillQueue[drillIndex];

  const handleVerifyDrill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentItem || drillAnswered || !drillInput.trim()) return;

    const cleanInput = drillInput.trim().toLowerCase();
    const correct = currentItem.expected.map(e => e.toLowerCase()).includes(cleanInput);

    setDrillAnswered(true);
    setDrillIsCorrect(correct);
    onUpdateStats(correct);

    if (correct) {
      playSuccessSound();
      setMascotState('jumping');
      setMascotMsg(`太厲害了！你成功攻克了「${currentItem.prompt}」！`);
      // Auto-remove mistake on mastery
      onRemoveMistake(currentItem.id);
    } else {
      playErrorSound();
      setMascotState('thinking');
      setMascotMsg(`糰子抖了抖，正確解答是「${currentItem.expected.join(' / ')}」，記住它！`);
    }

    playJapaneseSpeech(currentItem.prompt);
  };

  const handleNextDrill = () => {
    if (drillIndex + 1 >= drillQueue.length) {
      setDrillCompleted(true);
      setMascotState('celebrating');
      setMascotMsg('所有的錯題都特訓完成了！三色糰子為你驕傲！');
      return;
    }
    const next = drillIndex + 1;
    setDrillIndex(next);
    setDrillInput('');
    setDrillAnswered(false);
    setDrillIsCorrect(null);
    setMascotState('idle');
    setMascotMsg('下一個錯題挑戰！加油！');
  };

  // Determine user title level
  const total = stats.totalAnswered;
  const accuracy = total > 0 ? Math.round((stats.totalCorrect / total) * 100) : 100;
  const userGoatTitle =
    total < 15
      ? '軟萌生麵糰'
      : total < 50
        ? '可口白糰子'
        : total < 150
          ? '花見三色糰'
          : '極品糰子宗師';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Analytics & Streak Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>連勝天數 (Streak)</span>
            <Flame className="w-4 h-4 text-[#EA580C] fill-[#EA580C]" />
          </div>
          <div className="text-2xl font-black text-[#2D2A26] tabular-nums mt-1">
            {stats.streak} <span className="text-xs font-normal text-[#78716C]">天</span>
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>累積正確率</span>
            <Award className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-black text-[#8C6D53] tabular-nums mt-1">
            {accuracy}%
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>累計作答題數</span>
            <Target className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-black text-[#2D2A26] tabular-nums mt-1">
            {stats.totalAnswered} <span className="text-xs font-normal text-[#78716C]">題</span>
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>糰子修煉等級</span>
            <BookOpen className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-sm font-bold text-[#2D2A26] mt-2 truncate">
            {userGoatTitle}
          </div>
        </div>
      </div>

      {/* Mistakes Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#DC2626]" />
            <h1 className="text-xl font-extrabold text-[#2D2A26]">錯題本</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-[#FEE2E2] text-[#DC2626]">
              {mistakes.length} 項錯題待消滅
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            自動記錄在單字拼讀、句型填空、中日翻譯與五十音特訓中失誤的題目，集中精力精準攻克。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={startDrill}
            disabled={filteredMistakes.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#2D2A26] text-white hover:bg-[#1E1C1A] shadow-xs disabled:opacity-40 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>開始錯題特訓</span>
          </button>

          {mistakes.length > 0 && (
            <button
              onClick={() => {
                if (confirm('確定清空所有錯題紀錄嗎？')) {
                  onClearAllMistakes();
                }
              }}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#D5CBBF] bg-white text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空錯題</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E8E2D9] w-fit shadow-xs flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'all' ? 'bg-[#2D2A26] text-white' : 'text-[#625D56] hover:bg-[#FAF4EB]'
            }`}
        >
          全部 ({mistakes.length})
        </button>
        <button
          onClick={() => setFilterType('vocab')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'vocab' ? 'bg-[#2D2A26] text-white' : 'text-[#625D56] hover:bg-[#FAF4EB]'
            }`}
        >
          單字 ({mistakes.filter(m => m.type === 'vocab').length})
        </button>
        <button
          onClick={() => setFilterType('cloze')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'cloze' ? 'bg-[#2D2A26] text-white' : 'text-[#625D56] hover:bg-[#FAF4EB]'
            }`}
        >
          句型填空 ({mistakes.filter(m => m.type === 'cloze').length})
        </button>
        <button
          onClick={() => setFilterType('translation')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'translation' ? 'bg-[#2D2A26] text-white' : 'text-[#625D56] hover:bg-[#FAF4EB]'
            }`}
        >
          翻譯 ({mistakes.filter(m => m.type === 'translation').length})
        </button>
        <button
          onClick={() => setFilterType('kana')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'kana' ? 'bg-[#2D2A26] text-white' : 'text-[#625D56] hover:bg-[#FAF4EB]'
            }`}
        >
          五十音 ({mistakes.filter(m => m.type === 'kana').length})
        </button>
      </div>

      {/* Mistakes List */}
      {filteredMistakes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredMistakes.map(item => (
            <div
              key={item.id}
              className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs hover:border-[#DC2626]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-serif text-[#2D2A26]">
                      {item.prompt}
                    </span>
                    <button
                      onClick={() => playJapaneseSpeech(item.prompt)}
                      className="p-1 rounded-full text-[#8C6D53] hover:bg-[#FAF4EB]"
                      title="發音"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                    出錯 {item.failCount} 次
                  </span>
                </div>

                <div className="mt-2 text-xs text-[#78716C]">
                  {item.display}
                </div>

                <div className="mt-2 text-xs font-semibold text-[#8C6D53]">
                  正確答案：<span className="font-mono text-sm">{item.expected.join(' / ')}</span>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-[#F5EFE6] flex items-center justify-between">
                <span className="text-[10px] text-[#A8A29E]">
                  最近練習：{new Date(item.lastFailedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => onRemoveMistake(item.id)}
                  className="text-xs text-[#16A34A] hover:underline flex items-center gap-1 font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>已熟記並移除</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-12 text-center flex flex-col items-center">
          <Mascot
            state="celebrating"
            size="md"
            message="複習完畢，目前沒有任何錯題。"
            showBubble={true}
            customImage={mascotReadImg}
          />
          <h3 className="text-lg font-bold text-[#2D2A26] mt-4">
            太棒了！錯題本空空如也！
          </h3>
          <p className="text-xs text-[#78716C] mt-1 max-w-sm">
            平時特訓答錯的假名或單字會自動歸納在這裡，助你查缺補漏。
          </p>
        </div>
      )}

      {/* Drill Modal */}
      {isDrillActive && (
        <div className="fixed inset-0 z-50 bg-[#2D2A26]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D9] max-w-md w-full p-6 sm:p-8 shadow-2xl relative flex flex-col items-center">
            <button
              onClick={() => setIsDrillActive(false)}
              className="absolute top-4 right-4 p-2 text-[#78716C] hover:text-[#2D2A26] rounded-full hover:bg-[#FAF4EB]"
            >
              <X className="w-5 h-5" />
            </button>

            {!drillCompleted && currentItem ? (
              <div className="w-full flex flex-col items-center">
                <div className="text-xs text-[#78716C] mb-2 font-semibold">
                  糰子錯題攻克：第 {drillIndex + 1} / {drillQueue.length} 題
                </div>

                <div className="w-full h-1.5 bg-[#FAF4EB] rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-[#DC2626] transition-all duration-300"
                    style={{ width: `${((drillIndex + 1) / drillQueue.length) * 100}%` }}
                  />
                </div>

                <Mascot
                  state={mascotState}
                  size="md"
                  message={mascotMsg}
                  showBubble={true}
                  customImage={mascotReadImg}
                />

                <div className="my-5 text-center">
                  <div className="text-4xl font-extrabold text-[#2D2A26] font-serif mb-1">
                    {currentItem.prompt}
                  </div>
                  <div className="text-xs text-[#78716C]">
                    {currentItem.display}
                  </div>
                </div>

                <form onSubmit={handleVerifyDrill} className="w-full max-w-sm flex flex-col gap-3">
                  <input
                    type="text"
                    autoFocus
                    disabled={drillAnswered}
                    value={drillInput}
                    onChange={(e) => setDrillInput(e.target.value)}
                    placeholder="請輸入正確拼音或讀音..."
                    className={`w-full px-4 py-3 text-center text-lg font-bold rounded-xl border-2 outline-hidden ${drillAnswered
                      ? drillIsCorrect
                        ? 'bg-[#F0FDF4] border-[#22C55E] text-[#15803D]'
                        : 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'
                      : 'bg-white border-[#D5CBBF] text-[#2D2A26] focus:border-[#8C6D53]'
                      }`}
                  />

                  {drillAnswered && (
                    <div className="text-center text-xs font-semibold">
                      {drillIsCorrect ? (
                        <span className="text-[#15803D]">攻克成功！已從錯題本移除！</span>
                      ) : (
                        <span className="text-[#B91C1C]">
                          正確解答：<strong>{currentItem.expected.join(' / ')}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2">
                    {!drillAnswered ? (
                      <button
                        type="submit"
                        disabled={!drillInput.trim()}
                        className="w-full py-2.5 bg-[#2D2A26] text-white font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A] disabled:opacity-40"
                      >
                        確認 (Enter)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextDrill}
                        autoFocus
                        className="w-full py-2.5 bg-[#8C6D53] text-white font-bold rounded-xl shadow-xs hover:bg-[#735842] flex items-center justify-center gap-2"
                      >
                        <span>下一題</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center text-center">
                <Mascot
                  state="celebrating"
                  size="md"
                  message="所有錯題特訓完成！太棒了！"
                  showBubble={true}
                  customImage={mascotReadImg}
                />
                <h4 className="text-xl font-black text-[#2D2A26] mt-4">特訓圓滿結束</h4>
                <p className="text-xs text-[#78716C] mt-1 mb-6">
                  答對的錯題已為您移出錯題本！繼續保持！
                </p>
                <button
                  onClick={() => setIsDrillActive(false)}
                  className="w-full py-2.5 bg-[#2D2A26] text-white font-bold rounded-xl text-sm"
                >
                  完成
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
