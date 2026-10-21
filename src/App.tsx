import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { ActiveTab, VocabItem, MistakeItem, UserStats } from './types';
import { DEFAULT_VOCABULARY } from './data/defaultVocab';
import {
  getSupabaseClient,
  fetchUserVocab,
  saveUserVocab,
  deleteUserVocab,
  fetchUserMistakes,
  saveUserMistakes,
  deleteUserMistake,
  fetchUserStats,
  saveUserStats
} from './lib/supabase';

import { Navbar } from './components/Navbar';
import { KanaPractice } from './components/KanaPractice';
import { VocabManager } from './components/VocabManager';
import { MistakesReview } from './components/MistakesReview';
import { GrammarPreview } from './components/GrammarPreview';

import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('kana');
  const [user, setUser] = useState<User | null>(null);
  const [vocabList, setVocabList] = useState<VocabItem[]>(DEFAULT_VOCABULARY);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [stats, setStats] = useState<UserStats>({
    streak: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalKanaAnswered: 0,
    totalKanaCorrect: 0,
    totalVocabAnswered: 0,
    totalVocabCorrect: 0,
    bestAccuracy: 90
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);


  // Initialize Supabase Auth listener & initial load
  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setUser(data.user);
        }
      });

      const { data: authListener } = client.auth.onAuthStateChange((_, session) => {
        setUser(session?.user || null);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Refresh and load data when user changes
  const loadData = useCallback(async () => {
    const loadedVocab = await fetchUserVocab(user, DEFAULT_VOCABULARY);
    setVocabList(loadedVocab);

    const loadedMistakes = await fetchUserMistakes(user);
    setMistakes(loadedMistakes);

    const loadedStats = await fetchUserStats(user);

    // Calculate streak update
    const today = new Date().toISOString().split('T')[0];
    if (loadedStats.lastActiveDate !== today) {
      const last = new Date(loadedStats.lastActiveDate);
      const now = new Date(today);
      const diffTime = Math.abs(now.getTime() - last.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let newStreak = loadedStats.streak;
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
      const updated = { ...loadedStats, streak: newStreak, lastActiveDate: today };
      setStats(updated);
      saveUserStats(updated, user);
    } else {
      setStats(loadedStats);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Vocab CRUD Handlers
  const handleAddVocab = async (item: Omit<VocabItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: VocabItem = {
      ...item,
      id: 'vocab_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newItem, ...vocabList];
    setVocabList(updated);
    await saveUserVocab(updated, user);
  };

  const handleUpdateVocab = async (updatedItem: VocabItem) => {
    const updated = vocabList.map(v => (v.id === updatedItem.id ? updatedItem : v));
    setVocabList(updated);
    await saveUserVocab(updated, user);
  };

  const handleDeleteVocab = async (id: string) => {
    const updated = vocabList.filter(v => v.id !== id);
    setVocabList(updated);
    await deleteUserVocab(id, user);
    await saveUserVocab(updated, user);
  };

  const handleResetDefaultVocab = async () => {
    if (confirm('確定重設為預設的 12 個 N5 基礎單字嗎？')) {
      setVocabList(DEFAULT_VOCABULARY);
      await saveUserVocab(DEFAULT_VOCABULARY, user);
    }
  };

  // Mistake Management
  const handleRecordMistake = async (mistake: Omit<MistakeItem, 'id' | 'failCount' | 'lastFailedAt'>) => {
    const existingIndex = mistakes.findIndex(m => m.prompt === mistake.prompt && m.type === mistake.type);
    let updated: MistakeItem[];

    if (existingIndex >= 0) {
      updated = [...mistakes];
      updated[existingIndex] = {
        ...updated[existingIndex],
        failCount: updated[existingIndex].failCount + 1,
        lastFailedAt: new Date().toISOString()
      };
    } else {
      const newMistake: MistakeItem = {
        ...mistake,
        id: 'mistake_' + Date.now(),
        failCount: 1,
        lastFailedAt: new Date().toISOString()
      };
      updated = [newMistake, ...mistakes];
    }

    setMistakes(updated);
    await saveUserMistakes(updated, user);
  };

  const handleRemoveMistake = async (id: string) => {
    const updated = mistakes.filter(m => m.id !== id);
    setMistakes(updated);
    await deleteUserMistake(id, user);
    await saveUserMistakes(updated, user);
  };

  const handleClearAllMistakes = async () => {
    setMistakes([]);
    await saveUserMistakes([], user);
  };

  // Stats update on answer
  const handleUpdateStats = async (isCorrect: boolean) => {
    setStats(prev => {
      const isKana = activeTab === 'kana';
      const kanaAnswered = isKana ? prev.totalKanaAnswered + 1 : prev.totalKanaAnswered;
      const kanaCorrect = isKana && isCorrect ? prev.totalKanaCorrect + 1 : prev.totalKanaCorrect;
      const vocabAnswered = !isKana ? prev.totalVocabAnswered + 1 : prev.totalVocabAnswered;
      const vocabCorrect = !isKana && isCorrect ? prev.totalVocabCorrect + 1 : prev.totalVocabCorrect;

      const totalA = kanaAnswered + vocabAnswered;
      const totalC = kanaCorrect + vocabCorrect;
      const accuracy = totalA > 0 ? Math.round((totalC / totalA) * 100) : 0;
      const best = Math.max(accuracy, prev.bestAccuracy || 0);

      const nextStats: UserStats = {
        ...prev,
        totalKanaAnswered: kanaAnswered,
        totalKanaCorrect: kanaCorrect,
        totalVocabAnswered: vocabAnswered,
        totalVocabCorrect: vocabCorrect,
        bestAccuracy: best
      };
      saveUserStats(nextStats, user);
      return nextStats;
    });
  };



  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2D2A26] selection:bg-[#FBCFE8] selection:text-[#831843]">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        stats={stats}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        mistakesCount={mistakes.length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-24">
        {activeTab === 'kana' && (
          <KanaPractice
            onRecordMistake={handleRecordMistake}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {activeTab === 'vocab' && (
          <VocabManager
            vocabList={vocabList}
            onAddVocab={handleAddVocab}
            onUpdateVocab={handleUpdateVocab}
            onDeleteVocab={handleDeleteVocab}
            onRecordMistake={handleRecordMistake}
            onUpdateStats={handleUpdateStats}
            onResetDefaultVocab={handleResetDefaultVocab}
          />
        )}

        {activeTab === 'mistakes' && (
          <MistakesReview
            mistakes={mistakes}
            onRemoveMistake={handleRemoveMistake}
            onClearAllMistakes={handleClearAllMistakes}
            onUpdateStats={handleUpdateStats}
            stats={stats}
          />
        )}

        {activeTab === 'grammar' && <GrammarPreview />}
      </main>



      {/* Supabase Auth & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onUserChange={setUser}
        onRefreshData={loadData}
      />

      {/* Quiet Japanese Aesthetic Footer */}
      <footer className="border-t border-[#E8E2D9] bg-[#FAF7F2] py-8 text-xs text-[#78716C]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#2D2A26]">DangoGo 糰子日語</span>
            <span>·</span>
            <span>日語五十音盲打特訓與雲端單字庫</span>
          </div>

          <div className="text-[11px] text-[#A8A29E]">
            五十音盲打 · 拼音容錯 · Web Speech API ja-JP · Supabase Cloud Sync
          </div>
        </div>
      </footer>
    </div>
  );
}
