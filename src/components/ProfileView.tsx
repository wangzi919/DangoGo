import React from 'react';
import { User } from '@supabase/supabase-js';
import { UserStats } from '../types';
import { Mascot } from './Mascot';
import {
  User as UserIcon,
  Flame,
  Award,
  CheckCircle,
  LogOut,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ProfileViewProps {
  user: User | null;
  stats: UserStats;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: any) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  stats,
  onOpenAuth,
  onLogout,
  onNavigateTab
}) => {
  const total = stats.totalAnswered;
  const correct = stats.totalCorrect;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;

  const dangoTitle =
    total < 15
      ? '軟萌生麵糰'
      : total < 50
        ? '可口白糰子'
        : total < 150
          ? '花見三色糰'
          : '極品糰子宗師';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Profile Header Card */}
      <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <Mascot state="idle" size="md" showBubble={false} />
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF4EB] text-[#8C6D53] border border-[#E8E2D9]">
                {dangoTitle}
              </span>
              {user && (
                <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 已登入
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-[#2D2A26]">
              {user ? user.email?.split('@')[0] : '訪客同學'}
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              {user ? user.email : '登入個人帳號隨時記錄學習進度與錯題本'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-[#D5CBBF] text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>登出</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#2D2A26] text-white hover:bg-[#1E1C1A] shadow-xs transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              <span>登入 / 註冊</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>連續學習天數</span>
            <Flame className="w-4 h-4 text-[#EA580C] fill-[#EA580C]" />
          </div>
          <div className="text-2xl font-black text-[#2D2A26] tabular-nums mt-1">
            {stats.streak} <span className="text-xs font-normal text-[#78716C]">天</span>
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>累計答題次數</span>
            <Layers className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-black text-[#2D2A26] tabular-nums mt-1">
            {stats.totalAnswered} <span className="text-xs font-normal text-[#78716C]">題</span>
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>答對題數</span>
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-2xl font-black text-[#15803D] tabular-nums mt-1">
            {stats.totalCorrect} <span className="text-xs font-normal text-[#78716C]">題</span>
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78716C] text-xs">
            <span>總平均正確率</span>
            <Award className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-black text-[#8C6D53] tabular-nums mt-1">
            {accuracy}%
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div
          onClick={() => onNavigateTab('practice')}
          className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs hover:border-[#8C6D53] cursor-pointer transition-all flex items-center justify-between group"
        >
          <div>
            <h3 className="font-bold text-[#2D2A26] text-base group-hover:text-[#8C6D53]">
              開始課本特訓
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5">
              前往「練習」挑選單字拼讀、句型填空或翻譯
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#8C6D53] group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={() => onNavigateTab('mistakes')}
          className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs hover:border-[#DC2626] cursor-pointer transition-all flex items-center justify-between group"
        >
          <div>
            <h3 className="font-bold text-[#2D2A26] text-base group-hover:text-[#DC2626]">
              消滅錯題本
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5">
              回顧在單字、句型與翻譯中答錯的弱點
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#DC2626] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

    </div>
  );
};
