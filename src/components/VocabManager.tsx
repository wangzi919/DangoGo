import React, { useState } from 'react';
import { VocabItem, MistakeItem } from '../types';
import { playJapaneseSpeech, playSuccessSound, playErrorSound } from '../lib/speech';
import { Mascot } from './Mascot';
import {
  Plus,
  Search,
  Volume2,
  Trash2,
  Edit3,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  X,
  BookOpen,
  ArrowRight,
  Download,
  Keyboard
} from 'lucide-react';
import { VirtualKeyboard, transformLastChar } from './VirtualKeyboard';

interface VocabManagerProps {
  vocabList: VocabItem[];
  onAddVocab: (item: Omit<VocabItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateVocab: (item: VocabItem) => void;
  onDeleteVocab: (id: string) => void;
  onRecordMistake: (mistake: Omit<MistakeItem, 'id' | 'failCount' | 'lastFailedAt'>) => void;
  onUpdateStats: (isCorrect: boolean) => void;
  onResetDefaultVocab: () => void;
}

export const VocabManager: React.FC<VocabManagerProps> = ({
  vocabList,
  onAddVocab,
  onUpdateVocab,
  onDeleteVocab,
  onRecordMistake,
  onUpdateStats,
  onResetDefaultVocab
}) => {
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabItem | null>(null);
  const [formWord, setFormWord] = useState('');
  const [formReading, setFormReading] = useState('');
  const [formMeaning, setFormMeaning] = useState('');
  const [formExample, setFormExample] = useState('');
  const [formLevel, setFormLevel] = useState('N5');

  // Quiz Mode State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizQueue, setQuizQueue] = useState<VocabItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizInput, setQuizInput] = useState('');
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState<boolean | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [mascotState, setMascotState] = useState<'idle' | 'jumping' | 'thinking' | 'celebrating'>('idle');
  const [mascotMsg, setMascotMsg] = useState('看中文釋義，輸入對應的「假名讀音」！');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  };

  // Open modal for new item
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormWord('');
    setFormReading('');
    setFormMeaning('');
    setFormExample('');
    setFormLevel('N5');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item: VocabItem) => {
    setEditingItem(item);
    setFormWord(item.word);
    setFormReading(item.reading);
    setFormMeaning(item.meaning);
    setFormExample(item.example || '');
    setFormLevel(item.level || 'N5');
    setIsModalOpen(true);
  };

  // Submit modal form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWord.trim() || !formReading.trim() || !formMeaning.trim()) return;

    if (editingItem) {
      onUpdateVocab({
        ...editingItem,
        word: formWord.trim(),
        reading: formReading.trim(),
        meaning: formMeaning.trim(),
        example: formExample.trim(),
        level: formLevel,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddVocab({
        word: formWord.trim(),
        reading: formReading.trim(),
        meaning: formMeaning.trim(),
        example: formExample.trim(),
        level: formLevel
      });
    }
    setIsModalOpen(false);
  };

  // Start Vocabulary Quiz
  const startQuiz = () => {
    const pool = vocabList.length > 0 ? [...vocabList] : [];
    if (pool.length === 0) return;

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    setQuizQueue(pool);
    setQuizIndex(0);
    setQuizInput('');
    setQuizAnswered(false);
    setQuizIsCorrect(null);
    setQuizCorrectCount(0);
    setQuizCompleted(false);
    setMascotState('idle');
    setMascotMsg('看中文與漢字，請打出正確的「假名讀音」！');
    setIsQuizActive(true);
  };

  const currentQuizItem = quizQueue[quizIndex];

  const handleVerifyQuiz = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentQuizItem || quizAnswered || !quizInput.trim()) return;

    const cleanInput = quizInput.trim().toLowerCase();
    const cleanExpected = currentQuizItem.reading.trim().toLowerCase();
    const correct = cleanInput === cleanExpected;

    setQuizAnswered(true);
    setQuizIsCorrect(correct);
    onUpdateStats(correct);

    if (correct) {
      playSuccessSound();
      setQuizCorrectCount(prev => prev + 1);
      setMascotState('jumping');
      setMascotMsg(`答對了！「${currentQuizItem.word}」讀作「${currentQuizItem.reading}」！🎉`);
    } else {
      playErrorSound();
      setMascotState('thinking');
      setMascotMsg(`深思中…「${currentQuizItem.word}」的假名讀音是「${currentQuizItem.reading}」💭`);

      onRecordMistake({
        targetId: currentQuizItem.id,
        type: 'vocab',
        prompt: `${currentQuizItem.meaning} (${currentQuizItem.word})`,
        expected: [currentQuizItem.reading],
        display: `單字：${currentQuizItem.word} [${currentQuizItem.reading}] - ${currentQuizItem.meaning}`
      });
    }

    playJapaneseSpeech(currentQuizItem.word);
  };

  const handleNextQuiz = () => {
    if (quizIndex + 1 >= quizQueue.length) {
      setQuizCompleted(true);
      setMascotState('celebrating');
      setMascotMsg(`單字打字測驗完成！正確率 ${((quizCorrectCount / quizQueue.length) * 100).toFixed(0)}%！✨`);
      return;
    }
    const next = quizIndex + 1;
    setQuizIndex(next);
    setQuizInput('');
    setQuizAnswered(false);
    setQuizIsCorrect(null);
    setMascotState('idle');
    setMascotMsg('下一題！軟Q糰子加油！🍡');
  };

  // Export JSON backup
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vocabList, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `nihongoat_vocab_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  // Filtered vocabulary list
  const filteredList = vocabList.filter(item => {
    const matchesSearch =
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reading.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meaning.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || item.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Quiz Modal Overlay */}
      {isQuizActive && (
        <div className="fixed inset-0 z-50 bg-[#2D2A26]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D9] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative flex flex-col items-center">

            {/* Close button */}
            <button
              onClick={() => {
                setIsQuizActive(false);
                setIsKeyboardOpen(false);
              }}
              className="absolute top-4 right-4 p-2 text-[#78716C] hover:text-[#2D2A26] rounded-full hover:bg-[#FAF4EB]"
            >
              <X className="w-5 h-5" />
            </button>

            {!quizCompleted && currentQuizItem ? (
              <div className="w-full flex flex-col items-center">
                {/* Progress */}
                <div className="w-full flex items-center justify-between text-xs text-[#78716C] mb-2">
                  <span>
                    第 {quizIndex + 1} / {quizQueue.length} 題
                  </span>
                  <span className="font-mono font-semibold text-[#8C6D53]">
                    正確率: {quizIndex > 0 ? ((quizCorrectCount / quizIndex) * 100).toFixed(0) : 100}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-[#FAF4EB] rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-[#8C6D53] transition-all duration-300"
                    style={{ width: `${((quizIndex + 1) / quizQueue.length) * 100}%` }}
                  />
                </div>

                {/* Mascot */}
                <Mascot
                  state={mascotState}
                  size="sm"
                  message={mascotMsg}
                  showBubble={true}
                />

                {/* Question Prompt */}
                <div className="my-5 text-center">
                  <div className="text-xs font-bold text-[#8C6D53] uppercase tracking-wider mb-1">
                    中文釋義
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#2D2A26]">
                    {currentQuizItem.meaning}
                  </div>
                  <div className="text-lg font-medium text-[#78716C] mt-1 flex items-center justify-center gap-2">
                    <span>漢字：{currentQuizItem.word}</span>
                    <button
                      type="button"
                      onClick={() => playJapaneseSpeech(currentQuizItem.word)}
                      className="p-1 rounded-full text-[#8C6D53] hover:bg-[#FAF4EB]"
                      title="朗讀"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  {currentQuizItem.example && (
                    <div className="text-xs text-[#A8A29E] mt-2 italic max-w-sm">
                      例句：{currentQuizItem.example}
                    </div>
                  )}
                </div>

                {/* Typing Input */}
                <form onSubmit={handleVerifyQuiz} className="w-full max-w-sm flex flex-col gap-3">
                  {/* Virtual Keyboard Toggle for users without Japanese IME */}
                  <div className="w-full flex items-center justify-between text-xs px-0.5">
                    <button
                      type="button"
                      onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all border ${isKeyboardOpen
                          ? 'bg-[#2D2A26] text-white border-[#2D2A26] shadow-2xs'
                          : 'bg-[#FAF4EB] text-[#8C6D53] border-[#D5CBBF] hover:bg-[#F2EAE0]'
                        }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>{isKeyboardOpen ? '收起鍵盤 (改用手機輸入法)' : '使用日文虛擬鍵盤 (無輸入法專用)'}</span>
                    </button>
                    {isKeyboardOpen && (
                      <span className="text-[11px] font-semibold text-[#16A34A]">
                        已防手機鍵盤遮擋
                      </span>
                    )}
                  </div>

                  <div className="relative w-full">
                    <input
                      type="text"
                      autoFocus={!isTouchDevice()}
                      inputMode={isKeyboardOpen ? 'none' : 'text'}
                      disabled={quizAnswered}
                      value={quizInput}
                      onChange={(e) => setQuizInput(e.target.value)}
                      placeholder={isKeyboardOpen ? '點擊下方鍵盤輸入假名...' : '請輸入假名讀音 (如：たべる)...'}
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

                  {/* Feedback */}
                  {quizAnswered && (
                    <div className="text-center text-xs font-semibold">
                      {quizIsCorrect ? (
                        <span className="text-[#15803D]">回答正確！</span>
                      ) : (
                        <span className="text-[#B91C1C]">
                          正確讀音：<strong className="underline text-sm">{currentQuizItem.reading}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2">
                    {!quizAnswered ? (
                      <button
                        type="submit"
                        disabled={!quizInput.trim()}
                        className="w-full py-2.5 bg-[#2D2A26] text-white font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A] disabled:opacity-40 transition-all"
                      >
                        確認送出 (Enter)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextQuiz}
                        autoFocus
                        className="w-full py-2.5 bg-[#8C6D53] text-white font-bold rounded-xl shadow-xs hover:bg-[#735842] transition-all flex items-center justify-center gap-2"
                      >
                        <span>下一題</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              /* Quiz Summary */
              <div className="w-full flex flex-col items-center text-center">
                <Mascot
                  state="celebrating"
                  size="md"
                  message="太棒了！單字測驗挑戰成功！"
                  showBubble={true}
                />
                <h4 className="text-xl font-black text-[#2D2A26] mt-4">單字測驗結算</h4>
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs my-6">
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E2D9]">
                    <div className="text-xs text-[#78716C]">答對題數</div>
                    <div className="text-xl font-bold text-[#15803D] tabular-nums mt-1">
                      {quizCorrectCount} / {quizQueue.length}
                    </div>
                  </div>
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E2D9]">
                    <div className="text-xs text-[#78716C]">正確率</div>
                    <div className="text-xl font-bold text-[#8C6D53] tabular-nums mt-1">
                      {quizQueue.length > 0 ? ((quizCorrectCount / quizQueue.length) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full max-w-xs">
                  <button
                    onClick={startQuiz}
                    className="flex-1 py-2.5 bg-[#2D2A26] text-white font-bold rounded-xl text-sm"
                  >
                    再測驗一次
                  </button>
                  <button
                    onClick={() => {
                      setIsQuizActive(false);
                      setIsKeyboardOpen(false);
                    }}
                    className="flex-1 py-2.5 bg-[#FAF4EB] text-[#2D2A26] border border-[#D5CBBF] font-bold rounded-xl text-sm"
                  >
                    返回單字庫
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-quiz Virtual Keyboard Drawer */}
      {isQuizActive && !quizCompleted && (
        <VirtualKeyboard
          isOpen={isKeyboardOpen}
          onToggle={() => setIsKeyboardOpen(!isKeyboardOpen)}
          onInsertChar={(char) => setQuizInput((prev) => prev + char)}
          onDeleteChar={() => setQuizInput((prev) => prev.slice(0, -1))}
          onSubmit={handleVerifyQuiz}
          onTransformDakuten={() => setQuizInput((prev) => transformLastChar(prev, 'dakuten'))}
          onTransformHandakuten={() => setQuizInput((prev) => transformLastChar(prev, 'handakuten'))}
          onTransformSmall={() => setQuizInput((prev) => transformLastChar(prev, 'small'))}
        />
      )}

      {/* Header & Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#8C6D53]" />
            <h1 className="text-xl font-extrabold text-[#2D2A26]">自訂單字庫</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-[#EFE9DF] text-[#8C6D53]">
              {vocabList.length} 個單字
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            日文單字、假名讀音、中文釋義與例句庫，雲端自動雙向同步。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={startQuiz}
            disabled={vocabList.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#8C6D53] text-white hover:bg-[#735842] shadow-xs disabled:opacity-40 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>開始單字測驗</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#2D2A26] text-white hover:bg-[#1E1C1A] shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增單字</span>
          </button>

          <button
            onClick={handleExportJson}
            title="匯出備份 JSON"
            className="p-2 text-xs font-medium rounded-xl bg-white border border-[#D5CBBF] text-[#4A453E] hover:bg-[#FAF4EB]"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onResetDefaultVocab}
            title="重設為預設 N5 單字庫"
            className="p-2 text-xs font-medium rounded-xl bg-white border border-[#D5CBBF] text-[#78716C] hover:bg-[#FAF4EB]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Level Filter */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋單字、假名讀音、中文釋義..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-transparent outline-hidden text-[#2D2A26]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E] hover:text-[#2D2A26]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto shrink-0 border-t sm:border-t-0 sm:border-l border-[#F0EBE3] pt-2 sm:pt-0 sm:pl-3">
          <span className="text-xs text-[#78716C] whitespace-nowrap">等級：</span>
          {['all', 'N5', 'N4', 'N3', '日常'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${selectedLevel === lvl
                  ? 'bg-[#2D2A26] text-white font-bold'
                  : 'text-[#625D56] hover:bg-[#FAF4EB]'
                }`}
            >
              {lvl === 'all' ? '全部' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Card Grid */}
      {filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs hover:border-[#8C6D53] hover:shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-[#8C6D53]">
                      【{item.reading}】
                    </span>
                    <h3 className="text-xl font-bold text-[#2D2A26] tracking-tight">
                      {item.word}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => playJapaneseSpeech(item.word)}
                      className="p-1.5 text-[#8C6D53] hover:bg-[#FAF4EB] rounded-lg transition-colors"
                      title="發音"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    {item.level && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-[#FAF4EB] text-[#8C6D53] border border-[#E8E2D9]">
                        {item.level}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-sm font-semibold text-[#4A453E]">
                  {item.meaning}
                </div>

                {item.example && (
                  <div className="mt-2 text-xs text-[#78716C] bg-[#FAF7F2] p-2 rounded-lg border border-[#F0EBE3] leading-relaxed">
                    {item.example}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-2.5 border-t border-[#F5EFE6] flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#625D56] hover:text-[#2D2A26] hover:bg-[#FAF4EB] rounded-md transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>編輯</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`確定刪除「${item.word}」嗎？`)) {
                      onDeleteVocab(item.id);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>刪除</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-12 text-center flex flex-col items-center">
          <BookOpen className="w-10 h-10 text-[#D5CBBF] mb-2" />
          <p className="text-sm font-bold text-[#2D2A26]">找不到符合條件的單字</p>
          <p className="text-xs text-[#78716C] mt-1">試試調整搜尋關鍵字或新增專屬單字！</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#2D2A26]/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E2D9] max-w-md w-full p-6 shadow-xl relative animate-fade-in">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#78716C] hover:text-[#2D2A26] rounded-md hover:bg-[#FAF4EB]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#2D2A26] mb-4">
              {editingItem ? '編輯單字' : '新增自訂單字'}
            </h3>

            <form onSubmit={handleSaveForm} className="flex flex-col gap-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#4A453E] mb-1">
                  日文單字 (漢字/假名) <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formWord}
                  onChange={(e) => setFormWord(e.target.value)}
                  placeholder="例如：食べる、山羊、勉強"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5CBBF] focus:border-[#8C6D53] outline-hidden text-[#2D2A26]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A453E] mb-1">
                  假名讀音 (平假名) <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formReading}
                  onChange={(e) => setFormReading(e.target.value)}
                  placeholder="例如：たべる、やぎ、べんきょう"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5CBBF] focus:border-[#8C6D53] outline-hidden text-[#2D2A26]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A453E] mb-1">
                  中文釋義 <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formMeaning}
                  onChange={(e) => setFormMeaning(e.target.value)}
                  placeholder="例如：吃、山羊、學習"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5CBBF] focus:border-[#8C6D53] outline-hidden text-[#2D2A26]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A453E] mb-1">
                  例句或備註 (選填)
                </label>
                <textarea
                  rows={2}
                  value={formExample}
                  onChange={(e) => setFormExample(e.target.value)}
                  placeholder="例如：朝ご飯を食べる。（吃早餐。）"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5CBBF] focus:border-[#8C6D53] outline-hidden text-[#2D2A26]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A453E] mb-1">
                  難度等級
                </label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D5CBBF] bg-white focus:border-[#8C6D53] outline-hidden text-[#2D2A26]"
                >
                  <option value="N5">N5 初級</option>
                  <option value="N4">N4 進階</option>
                  <option value="N3">N3 中級</option>
                  <option value="日常">日常對話</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-[#F0EBE3]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-[#625D56] hover:bg-[#FAF4EB]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-[#2D2A26] text-white hover:bg-[#1E1C1A] shadow-xs"
                >
                  {editingItem ? '儲存變更' : '新增單字'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
