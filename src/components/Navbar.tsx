import React from 'react';
import { ActiveTab, UserStats } from '../types';
import { User } from '@supabase/supabase-js';
import { Flame, User as UserIcon, BookOpen, Layers, AlertCircle } from 'lucide-react';
import mascotAvatar from '../assets/images/mascot.png';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  user: User | null;
  stats: UserStats;
  onOpenAuth: () => void;
  mistakesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  user,
  stats,
  onOpenAuth,
  mistakesCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E2D9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        
        {/* Zone 1: Brand wordmark & Mascot */}
        <button
          onClick={() => onTabChange('practice')}
          className="flex items-center gap-2.5 text-left group focus:outline-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E2D9] shadow-2xs flex items-center justify-center overflow-hidden p-0.5 group-hover:scale-105 transition-transform">
            <img
              src={mascotAvatar}
              alt="DangoGo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-[#2D2A26] font-display">
                DangoGo
              </span>
            </div>
          </div>
        </button>

        {/* Zone 2: 4 Main Navigation Links (練習, 單字庫, 錯題本, 個人中心) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onTabChange('practice')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'practice'
                ? 'bg-[#2D2A26] text-white shadow-xs'
                : 'text-[#625D56] hover:text-[#2D2A26] hover:bg-[#EFE9DF]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>練習</span>
          </button>

          <button
            onClick={() => onTabChange('vocab')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'vocab'
                ? 'bg-[#2D2A26] text-white shadow-xs'
                : 'text-[#625D56] hover:text-[#2D2A26] hover:bg-[#EFE9DF]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>單字庫</span>
          </button>

          <button
            onClick={() => onTabChange('mistakes')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 relative ${
              activeTab === 'mistakes'
                ? 'bg-[#2D2A26] text-white shadow-xs'
                : 'text-[#625D56] hover:text-[#2D2A26] hover:bg-[#EFE9DF]'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>錯題本</span>
            {mistakesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#E11D48] text-white">
                {mistakesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'profile'
                ? 'bg-[#2D2A26] text-white shadow-xs'
                : 'text-[#625D56] hover:text-[#2D2A26] hover:bg-[#EFE9DF]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>個人中心</span>
          </button>
        </nav>

        {/* Zone 3: Streak Counter & Quick Login/Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            title={`學習連勝: ${stats.streak} 天`}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]"
          >
            <Flame className="w-4 h-4 text-[#EA580C] fill-[#EA580C]" />
            <span className="tabular-nums font-bold">{stats.streak}</span>
            <span className="hidden sm:inline text-[11px]">天連勝</span>
          </div>

          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-[#FAF4EB] border border-[#D5CBBF] text-[#3E3832] hover:bg-[#EFE5D7] transition-colors whitespace-nowrap shrink-0"
          >
            <UserIcon className="w-4 h-4 text-[#8C6D53]" />
            <span className="max-w-[110px] truncate">
              {user ? user.email?.split('@')[0] : '登入 / 同步'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <div className="md:hidden flex items-center justify-around border-t border-[#E8E2D9] py-2 px-2 bg-[#FAF7F2] text-xs">
        <button
          onClick={() => onTabChange('practice')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md ${
            activeTab === 'practice' ? 'bg-[#2D2A26] text-white font-bold' : 'text-[#625D56]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>練習</span>
        </button>
        <button
          onClick={() => onTabChange('vocab')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md ${
            activeTab === 'vocab' ? 'bg-[#2D2A26] text-white font-bold' : 'text-[#625D56]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>單字庫</span>
        </button>
        <button
          onClick={() => onTabChange('mistakes')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md relative ${
            activeTab === 'mistakes' ? 'bg-[#2D2A26] text-white font-bold' : 'text-[#625D56]'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>錯題本</span>
          {mistakesCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
          )}
        </button>
        <button
          onClick={() => onTabChange('profile')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md ${
            activeTab === 'profile' ? 'bg-[#2D2A26] text-white font-bold' : 'text-[#625D56]'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>個人中心</span>
        </button>
      </div>
    </header>
  );
};
