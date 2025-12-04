'use client';

import { motion } from 'framer-motion';

type MessageBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
};

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar assistant à gauche */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="h-9 w-9 rounded-full bg-indigo-500/80 flex items-center justify-center text-xs font-semibold shadow-lg shadow-indigo-500/40">
            KS
          </div>
        </div>
      )}

      {/* Bulle */}
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md border backdrop-blur-sm transition-transform duration-150 ${
          isUser
            ? 'bg-indigo-500 text-white border-indigo-400/60 rounded-br-sm'
            : 'bg-slate-900/80 text-slate-50 border-slate-700/80 rounded-bl-sm'
        }`}
      >
        {content}
      </div>

      {/* Avatar user à droite */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="h-9 w-9 rounded-full bg-emerald-500/80 flex items-center justify-center text-xs font-semibold shadow-lg shadow-emerald-500/40">
            YOU
          </div>
        </div>
      )}
    </motion.div>
  );
}
