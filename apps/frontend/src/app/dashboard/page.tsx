'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { 
  Trophy, LogOut, Code2, Play, Trash2, 
  Sparkles, CheckCircle2, ChevronRight, RefreshCw, FileCode, Terminal 
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { user, logout, initializeAuth, isAuthenticated } = useAuthStore();
  
  const [problems, setProblems] = useState<any[]>([]);
  const [savedCodes, setSavedCodes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalSubmissions: 0, successRate: 0, languageUsage: {} });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    initializeAuth();
    if (!useAuthStore.getState().isAuthenticated) {
      router.push('/');
    } else {
      fetchDashboardData();
    }
  }, [router, initializeAuth]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [problemsRes, codesRes, statsRes] = await Promise.all([
        api.get('/problems'),
        api.get('/codes'),
        api.get('/history/stats'),
      ]);

      setProblems(problemsRes.data);
      setSavedCodes(codesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProblems = async () => {
    setSeeding(true);
    try {
      await api.post('/problems/seed');
      const problemsRes = await api.get('/problems');
      setProblems(problemsRes.data);
    } catch (err) {
      console.error('Failed to seed problems:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteCode = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved code?')) return;
    try {
      await api.delete(`/codes/${id}`);
      setSavedCodes(savedCodes.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete code:', err);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50 font-sans">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col relative overflow-hidden">
      {/* Decorative Blur Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2 rounded-xl">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                CodeRudra
              </span>
            </div>

            <button
              onClick={() => router.push('/playground')}
              className="text-sm font-semibold text-zinc-200 hover:text-white transition-all duration-150 flex items-center gap-2 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 hover:from-violet-600/45 hover:to-indigo-600/45 border border-violet-500/30 px-4 py-2 rounded-xl cursor-pointer"
            >
              <Terminal className="h-4 w-4 text-violet-400" />
              <span>Compiler Playground</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={user.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`} 
                alt={user.name} 
                className="h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900"
              />
              <span className="text-sm font-medium text-zinc-200 hidden sm:inline">{user.name}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 z-10 flex flex-col gap-8">
        
        {/* Welcome Section */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-zinc-900/60 to-zinc-950 border border-zinc-900 p-6 rounded-2xl">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Welcome back, {user.name.split(' ')[0]}!
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Ready to solve some complex programming algorithms today?</p>
          </div>

          {problems.length === 0 && !loading && (
            <button
              onClick={handleSeedProblems}
              disabled={seeding}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20 active:scale-95 transition-all duration-200"
            >
              {seeding ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Seed Demo Problems</span>
            </button>
          )}
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-900 p-5 rounded-2xl text-left flex items-center gap-4">
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Submissions</p>
              <p className="text-2xl font-black mt-1 text-zinc-200">{stats.totalSubmissions}</p>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-5 rounded-2xl text-left flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Success Rate</p>
              <p className="text-2xl font-black mt-1 text-zinc-200">{stats.successRate}%</p>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-5 rounded-2xl text-left flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Code2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Language Distribution</p>
              <div className="flex gap-4 mt-1">
                {Object.keys(stats.languageUsage).length > 0 ? (
                  Object.entries(stats.languageUsage).map(([lang, count]: any) => (
                    <div key={lang} className="text-sm font-semibold text-zinc-300">
                      <span className="capitalize">{lang}</span>: <span className="text-violet-400">{count}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500 mt-1.5 font-medium">No records yet</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Dual Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Challenges Panel */}
          <section className="lg:col-span-7 flex flex-col gap-5 text-left">
            <h3 className="text-lg font-bold text-zinc-300 flex items-center gap-2">
              Coding Challenges
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">{problems.length}</span>
            </h3>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-zinc-900/30 animate-pulse border border-zinc-900 rounded-2xl" />
                ))}
              </div>
            ) : problems.length === 0 ? (
              <div className="border border-dashed border-zinc-800 p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                <FileCode className="h-10 w-10 text-zinc-600" />
                <p className="text-sm text-zinc-400 font-medium">No challenges loaded. Click "Seed Demo Problems" above!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {problems.map((prob) => (
                  <div 
                    key={prob.id}
                    onClick={() => router.push(`/problems/${prob.id}`)}
                    className="group p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 bg-zinc-900/25 hover:bg-zinc-900/40 flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg"
                  >
                    <div className="flex flex-col gap-2">
                      <h4 className="font-bold text-zinc-200 group-hover:text-violet-400 transition-colors duration-150">
                        {prob.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`font-semibold px-2 py-0.5 rounded-full border ${
                          prob.difficulty === 'EASY' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : prob.difficulty === 'MEDIUM' 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {prob.difficulty}
                        </span>
                        <span className="text-zinc-500 font-mono">Limit: {prob.timeLimit}s</span>
                        <span className="text-zinc-500 font-mono">{prob.memoryLimit} MB</span>
                      </div>
                    </div>
                    
                    <div className="h-8 w-8 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-violet-500 group-hover:bg-violet-600/10 flex items-center justify-center transition-all duration-150">
                      <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-violet-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Saved Code Panel */}
          <section className="lg:col-span-5 flex flex-col gap-5 text-left">
            <h3 className="text-lg font-bold text-zinc-300 flex items-center gap-2">
              My Saved Codes
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">{savedCodes.length}</span>
            </h3>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-zinc-900/30 animate-pulse border border-zinc-900 rounded-2xl" />
                ))}
              </div>
            ) : savedCodes.length === 0 ? (
              <div className="border border-dashed border-zinc-800 p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                <Code2 className="h-10 w-10 text-zinc-600" />
                <p className="text-sm text-zinc-400 font-medium">No saved code blocks found. Solve a challenge to save code!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {savedCodes.map((code) => (
                  <div
                    key={code.id}
                    onClick={() => code.problemId && router.push(`/problems/${code.problemId}`)}
                    className="group p-4 rounded-xl border border-zinc-900 hover:border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/30 flex items-center justify-between transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-zinc-200 group-hover:text-violet-400 transition-colors duration-150">
                        {code.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="font-bold text-zinc-500 uppercase font-mono">{code.language}</span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-zinc-500">Problem: {code.problem?.title || 'General Run'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteCode(code.id, e)}
                        className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-900 hover:bg-red-500/10 hover:border-red-500/20 text-zinc-500 hover:text-red-400 cursor-pointer transition-colors duration-150"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-zinc-900 text-center text-xs text-zinc-600 mt-auto">
        <p>&copy; {new Date().getFullYear()} CodeRudra. All rights reserved.</p>
      </footer>
    </div>
  );
}
