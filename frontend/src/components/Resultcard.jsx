/**
 * ResultCard Component — Owned by Teammate L
 *
 * Props:
 *   result   (object)   — { id, title, source, sourceType, summary, credibility, votes }
 *   vote     (string|null) — current vote state: 'up', 'down', or null
 *   onVote   (function) — callback: onVote(resultId, direction)
 *
 * This is the core RLHF feedback trigger.
 * Upvote/downvote sends a click event to the backend to evolve the preference vector.
 */

import { ThumbsUp, ThumbsDown } from 'lucide-react';

function ResultCard({ result, vote, onVote }) {
  return (
    <div className="group p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/20 hover:bg-white/[0.03] transition-all">
      <div className="flex items-start justify-between gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-[10px] font-medium bg-violet-500/10 text-violet-400 rounded border border-violet-500/20">
              {result.sourceType}
            </span>
            <span className="text-[11px] text-slate-600">{result.source}</span>
            <span className="ml-auto text-[11px] text-emerald-400/80 font-mono">
              {result.credibility}% credibility
            </span>
          </div>

          <h4 className="text-sm font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
            {result.title}
          </h4>

          <p className="text-sm text-slate-500 leading-relaxed">{result.summary}</p>
        </div>

        {/* Vote Controls — RLHF Feedback Mechanism */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            id={`upvote-${result.id}`}
            onClick={() => onVote(result.id, 'up', result.sourceType)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              vote === 'up'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.03] text-slate-600 border border-transparent hover:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono text-slate-500">
            {result.votes + (vote === 'up' ? 1 : 0)}
          </span>

          <button
            id={`downvote-${result.id}`}
            onClick={() => onVote(result.id, 'down', result.sourceType)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              vote === 'down'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/[0.03] text-slate-600 border border-transparent hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultCard;