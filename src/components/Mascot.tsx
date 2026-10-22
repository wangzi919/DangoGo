import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import mascotImg from '../assets/images/mascot.png';

export interface MascotProps {
  state?: 'idle' | 'jumping' | 'thinking' | 'celebrating' | 'cheering';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  showBubble?: boolean;
  className?: string;
  customImage?: string;
  disableConfetti?: boolean;
}

export const Mascot: React.FC<MascotProps> = ({
  state = 'idle',
  size = 'md',
  message,
  showBubble = true,
  className = '',
  customImage,
  disableConfetti = false
}) => {
  // Fire confetti on celebrating / jumping only if not disabled
  useEffect(() => {
    if (!disableConfetti && (state === 'celebrating' || state === 'jumping')) {
      try {
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.7 },
          colors: ['#F472B6', '#FBCFE8', '#86EFAC', '#4ADE80', '#FDE047', '#FDA4AF']
        });
      } catch {
        // Safe fallback
      }
    }
  }, [state, disableConfetti]);

  const sizeClasses = {
    sm: 'w-12 h-14',
    md: 'w-24 h-28',
    lg: 'w-36 h-40',
    xl: 'w-48 h-56'
  }[size];

  const defaultMessages = {
    idle: 'ぷにっ♪ 今天也跟 Dango 糰子一起衝刺日語！',
    jumping: '正解！糰子開心地彈跳了起來！🍡🎉',
    thinking: 'むむ…？ 糰子歪頭思考中，再試一次吧！💭',
    celebrating: '特訓大成功！三色糰子為你慶祝！🍡✨',
    cheering: '軟Q又堅持！越嚼越有日語實力！💪'
  };

  const currentMessage = message || defaultMessages[state];
  const activeImage = customImage || mascotImg;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Speech Bubble */}
      {showBubble && (
        <div
          className={`mb-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl shadow-xs border transition-colors max-w-[270px] text-center ${
            state === 'jumping' || state === 'celebrating'
              ? 'bg-[#FFF0F5] text-[#9D174D] border-[#FBCFE8]'
              : state === 'thinking'
              ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
              : 'bg-white text-[#4A453E] border-[#E8E2D9]'
          }`}
        >
          {currentMessage}
          <div
            className={`w-2 h-2 rotate-45 mx-auto -mb-2 border-r border-b ${
              state === 'jumping' || state === 'celebrating'
                ? 'bg-[#FFF0F5] border-[#FBCFE8]'
                : state === 'thinking'
                ? 'bg-[#FEF3C7] border-[#FDE68A]'
                : 'bg-white border-[#E8E2D9]'
            }`}
          />
        </div>
      )}

      {/* Mascot Image */}
      <div className="relative">
        <div
          className={`relative rounded-2xl p-1 transition-transform flex items-center justify-center filter drop-shadow-xs ${sizeClasses}`}
        >
          <img
            src={activeImage}
            alt="DangoGo Mascot"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />

          {/* Thinking overlay badge only if image doesn't already have one built-in */}
          {state === 'thinking' && !customImage && (
            <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md animate-pulse">
              ?
            </div>
          )}
        </div>

        {/* Soft shadow under dango skewer */}
        <div className="w-20 h-2 bg-[#2D2A26]/10 rounded-full mx-auto mt-1 blur-xs" />
      </div>
    </div>
  );
};
