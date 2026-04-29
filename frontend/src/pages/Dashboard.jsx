import { useState, useEffect } from 'react';
import {
  Clock,
  BarChart3,
  Sparkles,
  Brain,
  TrendingUp,
  ChevronRight,
  Globe,
  FileText,
  BookOpen,
  Activity,
  Layers,
  ToggleLeft,
  ToggleRight,
  Bell,
} from 'lucide-react';

// Components owned by Teammate L
import SearchBar from '../components/SearchBar';
import ResultsPanel from '../components/ResultsPanel';

// ─── Mock Data (will be replaced by API calls to Teammate S's backend) ───

const mockHistory = [
  { id: 1, query: 'Transformer architecture advances 2026', time: '2 min ago', results: 12 },
  { id: 2, query: 'RLHF vs DPO training methods', time: '1 hour ago', results: 8 },
  { id: 3, query: 'ChromaDB vector optimization', time: '3 hours ago', results: 15 },
  { id: 4, query: 'Multi-agent orchestration patterns', time: 'Yesterday', results: 6 },
];

const mockResults = [
  {
    id: 1,
    title: 'Attention Is All You Need — Revisited for 2026',
    source: 'arxiv.org',
    sourceType: 'Academic',
    summary:
      'A comprehensive re-evaluation of the original Transformer paper in light of recent architectural innovations including sparse attention, mixture-of-experts, and state-space models.',
    credibility: 94,
    votes: 12,
  },
  {
    id: 2,
    title: 'Building Production-Ready Multi-Agent Systems',
    source: 'engineering.google',
    sourceType: 'Tech Blog',
    summary:
      'Practical patterns for orchestrating multiple AI agents in production environments, covering fault tolerance, context sharing, and preference-based routing.',
    credibility: 88,
    votes: 8,
  },
  {
    id: 3,
    title: 'Vector Database Benchmarks: ChromaDB vs Pinecone vs Weaviate',
    source: 'github.com/benchmarks',
    sourceType: 'GitHub',
    summary:
      'Comprehensive benchmarking suite comparing vector databases on insertion speed, query latency, recall accuracy, and memory usage across different dataset sizes.',
    credibility: 79,
    votes: 5,
  },
];

// ─── Dashboard Page — Owned by Teammate A (You) ───

function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [resultVotes, setResultVotes] = useState({});
  const [evolutionLevel, setEvolutionLevel] = useState(() => {
    return parseInt(localStorage.getItem('evolutionLevel')) || 1;
  });
  const [preferences, setPreferences] = useState([]);
  const [totalQueries, setTotalQueries] = useState(() => {
    return parseInt(localStorage.getItem('totalQueries')) || 142;
  });
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);

  // Monitor search duration
  useEffect(() => {
    let timer;
    if (isSearching && !isDemoMode) {
      timer = setTimeout(() => {
        setShowDemoPrompt(true);
      }, 20000);
    } else {
      setShowDemoPrompt(false);
    }
    return () => clearTimeout(timer);
  }, [isSearching, isDemoMode]);

  // Fetch initial evolution stats from backend
  const fetchEvolutionStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/evolution-stats');
      if (res.ok) {
        const data = await res.json();
        setEvolutionLevel(data.evolution_level);
        if (data.total_queries) setTotalQueries(data.total_queries);
        
        if (data.preference_vector) {
          const pv = data.preference_vector;
          setPreferences([
            { label: 'Academic Papers', value: pv.academic_papers, color: '#8b5cf6' },
            { label: 'Tech Blogs', value: pv.tech_blogs, color: '#6366f1' },
            { label: 'Stack Overflow', value: pv.stack_overflow, color: '#a78bfa' },
            { label: 'GitHub Repos', value: pv.github_repos, color: '#7c3aed' },
            { label: 'Documentation', value: pv.documentation, color: '#c084fc' },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch evolution stats:', err);
    }
  };

  useEffect(() => {
    fetchEvolutionStats();
  }, []);

  // Persist stats to localStorage
  useEffect(() => {
    localStorage.setItem('evolutionLevel', evolutionLevel);
  }, [evolutionLevel]);

  useEffect(() => {
    localStorage.setItem('totalQueries', totalQueries);
  }, [totalQueries]);

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    if (!isDemoMode) {
      setToastMsg('System: Pre-indexed Mode Active');
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);

    try {
      let data;
      if (isDemoMode) {
        // Fetch from local static JSON for demo
        const response = await fetch('/seed_results.json');
        if (!response.ok) throw new Error('Failed to load demo data');
        
        const allResults = await response.json();
        
        // Make the demo feel "alive" by shuffling and picking 3 results
        const shuffled = [...allResults].sort(() => 0.5 - Math.random());
        data = { results: shuffled.slice(0, 3) };
        
        // Wait a bit to simulate network latency
        await new Promise(r => setTimeout(r, 600));
      } else {
        // Live FastAPI fetch
        const response = await fetch('http://localhost:8000/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        data = await response.json();
      }

      // Map backend snake_case fields to frontend camelCase
      const mappedResults = (data.results || []).map((r) => ({
        id: r.id,
        title: r.title,
        source: r.source,
        sourceType: r.source_type || r.sourceType || 'Web',
        // If summary is an array (like in seed_results.json), join it into a string
        summary: Array.isArray(r.summary) ? r.summary.join(' ') : r.summary,
        // If credibility is a decimal (e.g., 0.95), convert it to an integer percentage (95)
        credibility: typeof r.credibility === 'number' && r.credibility <= 1 
          ? Math.round(r.credibility * 100) 
          : Math.round(r.credibility || 0),
        votes: r.votes || 0,
      }));

      setResults(mappedResults);
    } catch (err) {
      console.error('Search failed:', err);
      // Let the user know the system is overloaded instead of failing silently
      if (err.message.includes('429') || err.message.includes('500') || err.message.includes('system load')) {
        setToastMsg('System: Heavy Load—Optimizing Agent Resources');
        setTimeout(() => setToastMsg(''), 5000);
      }
      setResults([]);
    } finally {
      setIsSearching(false);
      setShowDemoPrompt(false);
    }
  };

  const handleVote = async (resultId, direction, category) => {
    // Update UI immediately (optimistic)
    setResultVotes((prev) => ({
      ...prev,
      [resultId]: prev[resultId] === direction ? null : direction,
    }));

    // Send feedback to backend
    const vote = direction === 'up' ? 1 : -1;
    try {
      const response = await fetch('http://localhost:8000/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId, vote, category }),
      });
      
      if (response.ok) {
        // Refresh all stats (Evolution Level, Total Queries, Preference Vector) from the backend
        await fetchEvolutionStats();
      }
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  const getEvolutionStyle = (level) => {
    if (level <= 30) return { color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-400', text: 'Initial Learning' };
    if (level <= 70) return { color: 'text-violet-400', gradient: 'from-purple-500 to-indigo-500', text: 'Pattern Recognized' };
    if (level < 100) return { color: 'text-amber-400', gradient: 'from-amber-400 to-yellow-500 animate-pulse', text: 'Adaptive Intelligence' };
    return { color: 'text-amber-300', gradient: 'from-yellow-300 to-amber-500 animate-pulse', text: 'Fully Autonomous' };
  };

  const evoStyle = getEvolutionStyle(evolutionLevel);

  return (
    <div className={`flex h-screen bg-[#0a0b10] text-slate-300 overflow-hidden transition-all duration-1000 ${evolutionLevel >= 100 ? 'shadow-[inset_0_0_150px_rgba(251,191,36,0.15)]' : ''}`}>
      {/* ───────── Sidebar — Owned by Teammate A ───────── */}
      <aside className="w-72 shrink-0 border-r border-white/[0.06] bg-[#0d0e14] flex flex-col">
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight leading-none">
                InsightStream
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Self-Evolving Research AI</p>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Search History
          </button>
          <button
            onClick={() => setActiveTab('evolution')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'evolution'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Evolution Stats
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeTab === 'history' ? (
            <>
              {mockHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSearchQuery(item.query)}
                  className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-violet-500/20 transition-all group cursor-pointer"
                >
                  <p className="text-sm text-slate-300 group-hover:text-white truncate transition-colors">
                    {item.query}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-slate-600">{item.time}</span>
                    <span className="text-[11px] text-slate-600">
                      {item.results} results
                    </span>
                  </div>
                </button>
              ))}
              <div className="pt-2">
                <p className="text-[11px] text-slate-600 text-center">End of recent history</p>
              </div>
            </>
          ) : (
            <>
              {/* Evolution Stats Panel */}
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-medium text-slate-400">Preference Vector</span>
                  </div>
                  {preferences.map((pref) => (
                    <div key={pref.label} className="mb-3 last:mb-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px] text-slate-400">{pref.label}</span>
                        <span className="text-[11px] text-violet-400 font-mono">
                          {pref.value}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${pref.value}%`,
                            background: `linear-gradient(90deg, ${pref.color}, ${pref.color}88)`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Evolution Progress */}
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">System Evolution</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.05] ${evoStyle.color}`}>
                      {evoStyle.text}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className={`text-2xl font-bold font-mono ${evoStyle.color}`}>{evolutionLevel}</span>
                    <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden relative">
                    {evolutionLevel >= 100 && (
                      <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />
                    )}
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${evoStyle.gradient}`}
                      style={{ width: `${evolutionLevel}%` }}
                    />
                  </div>
                </div>

                {/* Evolution Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-lg font-semibold text-white font-mono">{totalQueries}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Total Queries</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-lg font-semibold text-emerald-400 font-mono">+18%</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Accuracy Δ</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-lg font-semibold text-white font-mono">5</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Active Agents</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-semibold text-white">
              A
            </div>
            <div>
              <p className="text-sm text-slate-300 font-medium">Teammate A</p>
              <p className="text-[11px] text-slate-600">System Lead</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ───────── Main Content — Orchestrated by Teammate A ───────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="shrink-0 px-8 py-4 border-b border-white/[0.06] bg-[#0d0e14]/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">
                System <span className="text-emerald-400 font-medium">Online</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-slate-400">
                <span className="text-white font-medium">5</span> Agents Ready
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-400">
                <span className="text-white font-medium">2.4k</span> Sources Indexed
              </span>
            </div>

            {/* Demo Mode Toggle */}
            <div className="flex items-center gap-2 ml-2 pl-6 border-l border-white/[0.06]">
              <button 
                onClick={toggleDemoMode}
                className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white transition-colors"
              >
                {isDemoMode ? (
                  <ToggleRight className="w-5 h-5 text-violet-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                <span className="text-xs font-medium">System Demo Mode</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[11px] text-violet-300 font-medium">v0.1.0 — Hackathon Build</span>
          </div>
        </header>

        {/* Search & Results Area */}
        <div className="flex-1 overflow-y-auto relative">
          
          {/* Toast Notification */}
          {toastMsg && (
            <div className="absolute top-4 right-8 z-50 px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
              <Bell className="w-3.5 h-3.5" />
              {toastMsg}
            </div>
          )}

          <div className="max-w-3xl mx-auto px-8 py-12">
            {/* Hero / Search Section */}
            {!hasSearched && (
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-violet-300">Powered by Multi-Agent AI</span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
                  What would you like to research?
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  InsightStream deploys autonomous agents to search, synthesize, and rank results
                  — evolving with every interaction.
                </p>
              </div>
            )}

            {/* Search Bar — Component owned by Teammate L */}
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleSearch}
              isSearching={isSearching}
            />

            {/* Agent Pipeline Status (visible during search) */}
            {isSearching && (
              <div className="mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-xs text-slate-500 mb-3 font-medium">Agent Pipeline Active</p>
                <div className="flex items-center gap-3">
                  {[
                    { name: 'Searcher', icon: Globe, delay: 0 },
                    { name: 'Synthesizer', icon: BookOpen, delay: 600 },
                    { name: 'Ranker', icon: BarChart3, delay: 1200 },
                  ].map((agent, i) => (
                    <div key={agent.name} className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20"
                        style={{
                          animation: `pulse 1.5s ease-in-out ${agent.delay}ms infinite`,
                        }}
                      >
                        <agent.icon className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs text-violet-300">{agent.name}</span>
                      </div>
                      {i < 2 && <ChevronRight className="w-4 h-4 text-slate-600" />}
                    </div>
                  ))}
                </div>
                
                {/* Fallback button if search is taking too long */}
                {showDemoPrompt && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between animate-in fade-in">
                    <p className="text-xs text-amber-400/80">API is under heavy load. Switch to Demo Mode for instant pre-indexed results.</p>
                    <button
                      onClick={() => {
                        setIsSearching(false);
                        toggleDemoMode();
                      }}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Switch to Demo Mode
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Results Panel — Component owned by Teammate L */}
            <ResultsPanel
              results={results}
              resultVotes={resultVotes}
              onVote={handleVote}
            />

            {/* Empty State (No Results) */}
            {hasSearched && !isSearching && results.length === 0 && (
              <div className="text-center p-12 bg-white/[0.02] border border-white/[0.06] rounded-xl mt-4">
                <p className="text-slate-400">No results found for your query. Try a different search term.</p>
              </div>
            )}

            {/* Empty state feature cards */}
            {!hasSearched && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { icon: FileText, label: 'Research Papers', desc: 'Indexed from arXiv, IEEE, ACM' },
                  { icon: Globe, label: 'Web Sources', desc: 'Blogs, docs, forums' },
                  { icon: Brain, label: 'AI Synthesis', desc: 'Multi-agent summarization' },
                ].map((feature) => (
                  <div
                    key={feature.label}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center"
                  >
                    <feature.icon className="w-6 h-6 text-violet-400/60 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-300">{feature.label}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{feature.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
