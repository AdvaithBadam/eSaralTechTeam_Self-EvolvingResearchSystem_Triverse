import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * EvolutionPanel — Reads live evolution stats from the backend
 * and renders the dynamic progress bar and status badge.
 * 
 * Props (optional): pass evolutionLevel and preferences down from Dashboard
 * if you want to avoid a second fetch; or use standalone with its own fetch.
 */
export default function EvolutionPanel({ evolutionLevel = 1, preferences = [] }) {
  const getStyle = (level) => {
    if (level <= 30) return { color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-400', text: 'Initial Learning' };
    if (level <= 70) return { color: 'text-violet-400', gradient: 'from-purple-500 to-indigo-500', text: 'Pattern Recognized' };
    if (level < 100) return { color: 'text-amber-400', gradient: 'from-amber-400 to-yellow-500', text: 'Adaptive Intelligence' };
    return { color: 'text-amber-300', gradient: 'from-yellow-300 to-amber-500', text: 'Fully Autonomous' };
  };

  const style = getStyle(evolutionLevel);

  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-medium text-slate-400">System Evolution</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.05] ${style.color}`}>
          {style.text}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className={`text-2xl font-bold font-mono ${style.color}`}>{evolutionLevel}</span>
        <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
      </div>
      <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden relative">
        {evolutionLevel >= 100 && (
          <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />
        )}
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${style.gradient}`}
          style={{ width: `${evolutionLevel}%` }}
        />
      </div>
    </div>
  );
}