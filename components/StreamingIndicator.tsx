'use client';

export default function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
      <div className="h-7 w-7 rounded-full bg-indigo-500/70 flex items-center justify-center text-[10px] font-semibold">
        KS
      </div>
      <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 shadow-sm">
        <span className="text-[11px]">Thinking</span>
        <span className="flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.05s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
        </span>
      </div>
    </div>
  );
}
