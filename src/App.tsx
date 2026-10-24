import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import {
  ActiveTab,
  TextbookVocabItem,
  SentenceClozeItem,
  TranslationExerciseItem,
  VocabItem,
  MistakeItem,
  UserStats
} from './types';
import {
  DEFAULT_TEXTBOOK_VOCAB,
  DEFAULT_CLOZE_EXERCISES,
  DEFAULT_TRANSLATION_EXERCISES
} from './data/defaultTextbookData';
import {
  getSupabaseClient,
  fetchTextbookVocab,
  fetchClozeExercises,
  fetchTranslationExercises,
  fetchUserCustomVocab,
  saveUserCustomVocab,
  deleteUserCustomVocab,
  fetchUserMistakes,
  saveUserMistakes,
  deleteUserMistake,
  fetchUserStats,
  saveUserStats
} from './lib/supabase';
import { ALL_KANA } from './data/kanaData';
import { hydrateMistakes } from './lib/mistakesHydration';

import { Navbar } from './components/Navbar';
import { PracticeHub } from './components/PracticeHub';
import { VocabManager } from './components/VocabManager';
import { MistakesReview } from './components/MistakesReview';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('practice');
  const [user, setUser] = useState<User | null>(null);

  // Textbook Data (Fetched from Supabase `textbook_vocab`, `sentence_cloze_exercises`, `translation_exercises`, fallback to defaults)
  const [textbookVocab, setTextbookVocab] = useState<TextbookVocabItem[]>(DEFAULT_TEXTBOOK_VOCAB);
  const [clozeExercises, setClozeExercises] = useState<SentenceClozeItem[]>(DEFAULT_CLOZE_EXERCISES);
  const [translationExercises, setTranslationExercises] = useState<TranslationExerciseItem[]>(DEFAULT_TRANSLATION_EXERCISES);

  // User Custom Vocab (Supabase `user_vocabularies`)
  const [customVocab, setCustomVocab] = useState<VocabItem[]>([]);

  // User Mistakes (Supabase `user_mistakes`)
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);

  // User Stats (Supabase `user_stats`)
  const [stats, setStats] = useState<UserStats>({
    streak: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalAnswered: 0,
    totalCorrect: 0
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Initialize Supabase Auth listener
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

  // Refresh and load data when user or auth changes
  const loadData = useCallback(async () => {
    // 1. Fetch textbook datasets
    const [fetchedTbVocab, fetchedCloze, fetchedTrans] = await Promise.all([
      fetchTextbookVocab(DEFAULT_TEXTBOOK_VOCAB),
      fetchClozeExercises(DEFAULT_CLOZE_EXERCISES),
      fetchTranslationExercises(DEFAULT_TRANSLATION_EXERCISES)
    ]);
    setTextbookVocab(fetchedTbVocab);
    setClozeExercises(fetchedCloze);
    setTranslationExercises(fetchedTrans);

    // 2. Fetch user custom vocab
    const loadedCustomVocab = await fetchUserCustomVocab(user);
    setCustomVocab(loadedCustomVocab);

    // 3. Fetch user mistakes and re-hydrate prompt/display/expected from target_id & type
    const loadedMistakes = await fetchUserMistakes(user);
    const hydratedMistakes = hydrateMistakes(loadedMistakes, {
      textbookVocab: fetchedTbVocab,
      clozeExercises: fetchedCloze,
      translationExercises: fetchedTrans,
      customVocab: loadedCustomVocab,
      kanaList: ALL_KANA
    });
    setMistakes(hydratedMistakes);

    // 4. Fetch user stats
    const loadedStats = await fetchUserStats(user);
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

  // Custom Vocab CRUD Handlers
  const handleAddCustomVocab = async (item: Omit<VocabItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: VocabItem = {
      ...item,
      id: 'custom_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newItem, ...customVocab];
    setCustomVocab(updated);
    setMistakes(prev =>
      hydrateMistakes(prev, {
        textbookVocab,
        clozeExercises,
        translationExercises,
        customVocab: updated,
        kanaList: ALL_KANA
      })
    );
    await saveUserCustomVocab(updated, user);
  };

  const handleUpdateCustomVocab = async (updatedItem: VocabItem) => {
    const updated = customVocab.map(v => (v.id === updatedItem.id ? updatedItem : v));
    setCustomVocab(updated);
    setMistakes(prev =>
      hydrateMistakes(prev, {
        textbookVocab,
        clozeExercises,
        translationExercises,
        customVocab: updated,
        kanaList: ALL_KANA
      })
    );
    await saveUserCustomVocab(updated, user);
  };

  const handleDeleteCustomVocab = async (id: string) => {
    const updated = customVocab.filter(v => v.id !== id);
    setCustomVocab(updated);
    await deleteUserCustomVocab(id, user);
    await saveUserCustomVocab(updated, user);
  };

  // Mistake Management
  const handleRecordMistake = async (mistake: Omit<MistakeItem, 'id' | 'failCount' | 'lastFailedAt'>) => {
    // Match by targetId and type, or prompt and type
    const existingIndex = mistakes.findIndex(
      m =>
        ((mistake.targetId && m.targetId && m.targetId === mistake.targetId) ||
          (mistake.prompt && m.prompt && m.prompt === mistake.prompt)) &&
        m.type === mistake.type
    );
    let updated: MistakeItem[];

    if (existingIndex >= 0) {
      updated = [...mistakes];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...mistake,
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
      const nextStats: UserStats = {
        ...prev,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: isCorrect ? prev.totalCorrect + 1 : prev.totalCorrect
      };
      saveUserStats(nextStats, user);
      return nextStats;
    });
  };

  // Logout Handler
  const handleLogout = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
    loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2D2A26] selection:bg-[#FBCFE8] selection:text-[#831843]">
      {/* Top Bar Navigation (4 Main Tabs: 練習, 單字庫, 錯題本, 個人中心) */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        stats={stats}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        mistakesCount={mistakes.length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-16">
        {activeTab === 'practice' && (
          <PracticeHub
            textbookVocab={textbookVocab}
            clozeExercises={clozeExercises}
            translationExercises={translationExercises}
            onRecordMistake={handleRecordMistake}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {activeTab === 'vocab' && (
          <VocabManager
            textbookVocab={textbookVocab}
            customVocab={customVocab}
            onAddVocab={handleAddCustomVocab}
            onUpdateVocab={handleUpdateCustomVocab}
            onDeleteVocab={handleDeleteCustomVocab}
            onStartPractice={() => setActiveTab('practice')}
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

        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            stats={stats}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onNavigateTab={setActiveTab}
          />
        )}
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
            <span>學校課本分課特訓 · 句型填空 · 翻譯 · 雲端同步</span>
          </div>

          <div className="text-[11px] text-[#A8A29E]">
            單字拼讀 · 句型填空 · 中日翻譯 · 五十音盲打 · Supabase PostgreSQL
          </div>
        </div>
      </footer>
    </div>
  );
}
