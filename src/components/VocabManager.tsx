import React, { useState } from 'react';
import { TextbookVocabItem, VocabItem } from '../types';
import { playJapaneseSpeech } from '../lib/speech';
import {
  Plus,
  Search,
  Volume2,
  Trash2,
  Edit3,
  X,
  BookOpen,
  Download,
  Filter,
  Layers
} from 'lucide-react';

interface VocabManagerProps {
  textbookVocab: TextbookVocabItem[];
  customVocab: VocabItem[];
  onAddVocab: (item: Omit<VocabItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateVocab: (item: VocabItem) => void;
  onDeleteVocab: (id: string) => void;
  onStartPractice?: () => void;
  activeVirtualKeyboardInput?: string;
  onFocusInputForVirtualKeyboard?: (val: string, setter: (val: string) => void) => void;
}

export const VocabManager: React.FC<VocabManagerProps> = ({
  textbookVocab,
  customVocab,
  onAddVocab,
  onUpdateVocab,
  onDeleteVocab,
  onStartPractice
}) => {
  // Source selector: 'textbook' or 'custom'
  const [sourceType, setSourceType] = useState<'textbook' | 'custom'>(
    textbookVocab.length > 0 ? 'textbook' : 'custom'
  );

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | 'all'>('all');

  // Modal State for Add / Edit custom item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabItem | null>(null);
  const [formWord, setFormWord] = useState('');
  const [formReading, setFormReading] = useState('');
  const [formMeaning, setFormMeaning] = useState('');
  const [formExample, setFormExample] = useState('');
  const [formLevel, setFormLevel] = useState('N5');

  // Available lessons from textbook
  const allLessons = Array.from(new Set(textbookVocab.map(v => v.lesson))).sort((a, b) => a - b);

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

  // Export JSON backup
  const handleExportJson = () => {
    const dataToExport = sourceType === 'textbook' ? textbookVocab : customVocab;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `dango_${sourceType}_vocab_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  // Filtered lists
  const filteredTextbookList = textbookVocab.filter(item => {
    const matchesSearch =
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reading.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meaning.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLesson = selectedLesson === 'all' || item.lesson === selectedLesson;
    return matchesSearch && matchesLesson;
  });

  const filteredCustomList = customVocab.filter(item => {
    return (
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reading.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meaning.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      
      {/* Header & Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#8C6D53]" />
            <h1 className="text-xl font-extrabold text-[#2D2A26]">單字庫</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-[#EFE9DF] text-[#8C6D53]">
              {sourceType === 'textbook' ? `${textbookVocab.length} 個課本單字` : `${customVocab.length} 個自訂單字`}
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            收錄學校課本各課官方生詞與個人自訂生詞，支援標準音訊朗讀。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onStartPractice && (
            <button
              onClick={onStartPractice}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#8C6D53] text-white hover:bg-[#735842] shadow-xs transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>前往練習特訓</span>
            </button>
          )}

          {sourceType === 'custom' && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#2D2A26] text-white hover:bg-[#1E1C1A] shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增單字</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            title="匯出備份 JSON"
            className="p-2 text-xs font-medium rounded-xl bg-white border border-[#D5CBBF] text-[#4A453E] hover:bg-[#FAF4EB]"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Source Switcher: 課本單字 vs 個人自訂單字 */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-[#E8E2D9] rounded-2xl p-3 shadow-xs">
        
        {/* Source Segmented Control */}
        <div className="flex items-center bg-[#FAF4EB] p-1 rounded-xl border border-[#E8E2D9]">
          <button
            onClick={() => setSourceType('textbook')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              sourceType === 'textbook'
                ? 'bg-white text-[#2D2A26] shadow-2xs'
                : 'text-[#625D56] hover:text-[#2D2A26]'
            }`}
          >
            課本分課單字 ({textbookVocab.length})
          </button>
          <button
            onClick={() => setSourceType('custom')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              sourceType === 'custom'
                ? 'bg-white text-[#2D2A26] shadow-2xs'
                : 'text-[#625D56] hover:text-[#2D2A26]'
            }`}
          >
            個人自訂生詞 ({customVocab.length})
          </button>
        </div>

        {/* Lesson Filter (when viewing textbook vocab) */}
        {sourceType === 'textbook' && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs text-[#78716C] font-semibold whitespace-nowrap">課次：</span>
            <button
              onClick={() => setSelectedLesson('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-bold transition-colors ${
                selectedLesson === 'all'
                  ? 'bg-[#2D2A26] text-white'
                  : 'bg-[#FAF4EB] text-[#625D56] hover:bg-[#F0EAE1]'
              }`}
            >
              全部
            </button>
            {allLessons.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLesson(l)}
                className={`px-2.5 py-1 text-xs rounded-md font-bold transition-colors ${
                  selectedLesson === l
                    ? 'bg-[#2D2A26] text-white'
                    : 'bg-[#FAF4EB] text-[#625D56] hover:bg-[#F0EAE1]'
                }`}
              >
                第 {l} 課
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-3 flex items-center gap-3 shadow-xs">
        <Search className="w-4 h-4 text-[#A8A29E] shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜尋單字、假名讀音、中文釋義..."
          className="w-full text-xs sm:text-sm bg-transparent outline-hidden text-[#2D2A26]"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-[#A8A29E] hover:text-[#2D2A26]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 1. TEXTBOOK VOCABULARY VIEW */}
      {sourceType === 'textbook' && (
        <>
          {filteredTextbookList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTextbookList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs hover:border-[#8C6D53] hover:shadow-sm transition-all flex flex-col justify-between"
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
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#FAF4EB] text-[#8C6D53] border border-[#E8E2D9]">
                          第 {item.lesson} 課
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm font-semibold text-[#4A453E]">
                      {item.meaning}
                      {item.partOfSpeech && (
                        <span className="ml-1.5 text-xs text-[#78716C] font-normal">
                          · {item.partOfSpeech}
                        </span>
                      )}
                    </div>

                    {item.exampleSentence && (
                      <div className="mt-2.5 text-xs text-[#78716C] bg-[#FAF7F2] p-2.5 rounded-lg border border-[#F0EBE3] leading-relaxed">
                        <div>{item.exampleSentence}</div>
                        {item.exampleMeaning && (
                          <div className="text-[#A8A29E] mt-0.5">{item.exampleMeaning}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-12 text-center flex flex-col items-center">
              <BookOpen className="w-10 h-10 text-[#D5CBBF] mb-2" />
              <p className="text-sm font-bold text-[#2D2A26]">
                {textbookVocab.length === 0 ? '目前課本單字庫尚未有資料' : '找不到符合條件的課本單字'}
              </p>
              <p className="text-xs text-[#78716C] mt-1 mb-3">
                {textbookVocab.length === 0
                  ? '您可以切換至「個人自訂單字」自由建立單字卡！'
                  : '請確認課次篩選或搜尋字串。'}
              </p>
              {textbookVocab.length === 0 && (
                <button
                  onClick={() => setSourceType('custom')}
                  className="px-4 py-2 bg-[#2D2A26] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A]"
                >
                  前往個人自訂單字
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* 2. CUSTOM VOCABULARY VIEW */}
      {sourceType === 'custom' && (
        <>
          {filteredCustomList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCustomList.map((item) => (
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
              <p className="text-sm font-bold text-[#2D2A26]">目前尚無自訂生詞</p>
              <p className="text-xs text-[#78716C] mt-1">點擊右上角「新增單字」建立個人學習單字卡！</p>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Custom Word Modal */}
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
              {editingItem ? '編輯自訂單字' : '新增自訂生詞'}
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
                  placeholder="例如：食べる、本、勉強"
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
                  placeholder="例如：たべる、ほん、べんきょう"
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
                  placeholder="例如：吃、書、學習"
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
