import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  X,
  Lock,
  Mail,
  CheckCircle,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { Mascot } from './Mascot';
import { getSupabaseClient } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
  onRefreshData: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
  onRefreshData
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setLoading(true);

    const client = getSupabaseClient();
    if (!client) {
      setStatusMsg({
        type: 'error',
        text: '尚未設定 Supabase 連線資訊！請於專案的 .env.local 設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY。'
      });
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password: password.trim()
        });
        if (error) throw error;
        if (data.user) {
          if (data.session) {
            onUserChange(data.user);
            setStatusMsg({ type: 'success', text: '註冊成功！已自動登入並建立個人雲端記錄！' });
            onRefreshData();
            setTimeout(() => onClose(), 1200);
          } else {
            setStatusMsg({
              type: 'success',
              text: '註冊成功！若有啟用信箱驗證，請至信箱收取驗證信後登入；或於 Supabase 後台關閉「Confirm email」即可直接登入。'
            });
          }
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        if (error) throw error;
        if (data.user) {
          onUserChange(data.user);
          setStatusMsg({ type: 'success', text: '登入成功！正同步雲端單字與錯題本...' });
          onRefreshData();
          setTimeout(() => onClose(), 1200);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMsg({ type: 'error', text: error.message || '認證失敗，請檢查帳號密碼。' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    onUserChange(null);
    setStatusMsg({ type: 'success', text: '已順利登出。' });
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2A26]/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#E8E2D9] max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78716C] hover:text-[#2D2A26] rounded-full hover:bg-[#FAF4EB] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mascot Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <Mascot
            state="idle"
            size="sm"
            message={user ? `歡迎回來，${user.email?.split('@')[0]}！` : '登入後可同步單字庫與學習進度！'}
            showBubble={true}
          />
          <h2 className="text-xl font-black text-[#2D2A26] mt-3">
            {user ? '會員中心 & 雲端同步' : 'DangoGo 會員登入'}
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            雲端同步單字庫、錯題本與練習統計
          </p>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* If user is already logged in */}
        {user ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] text-xs">
              <div className="flex items-center justify-between text-[#78716C] mb-1">
                <span>目前登入帳號</span>
                <span className="font-semibold text-[#16A34A] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 雲端已連線
                </span>
              </div>
              <div className="text-sm font-bold text-[#2D2A26] truncate">
                {user.email}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl border border-[#D5CBBF] bg-white text-[#DC2626] hover:bg-[#FEE2E2] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>登出帳號</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Mode Segmented Controls (Only Login & Signup) */}
            <div className="flex items-center bg-[#FAF4EB] p-1 rounded-xl border border-[#E8E2D9] mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  mode === 'login' ? 'bg-white text-[#2D2A26] shadow-2xs' : 'text-[#78716C]'
                }`}
              >
                登入
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  mode === 'signup' ? 'bg-white text-[#2D2A26] shadow-2xs' : 'text-[#78716C]'
                }`}
              >
                免費註冊
              </button>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleAuth} className="flex flex-col gap-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#4A453E] mb-1">
                  電子郵件 (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5CBBF] focus:border-[#8C6D53] outline-hidden text-[#2D2A26]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A453E] mb-1">
                  密碼 (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位字元..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5CBBF] focus:border-[#8C6D53] outline-hidden text-[#2D2A26]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#2D2A26] text-white font-bold rounded-xl shadow-xs hover:bg-[#1E1C1A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>處理中...</span>
                ) : mode === 'login' ? (
                  <span>立即登入</span>
                ) : (
                  <span>註冊帳號並同步</span>
                )}
              </button>

              <div className="text-[11px] text-center text-[#78716C] mt-2">
                <span>登入後所有單字、錯題本與學習歷程將直接即時同步至雲端資料庫。</span>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
