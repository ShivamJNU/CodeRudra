'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { Code2, Github, Terminal, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { initializeAuth, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (!token) {
          setCheckingAuth(false);
          return;
        }
      }

      await initializeAuth();
      if (useAuthStore.getState().isAuthenticated) {
        router.push('/dashboard');
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router, initializeAuth]);

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth route
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleDevBypassLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/google', { token: 'dev-token' });
      const { accessToken, user } = res.data;
      
      useAuthStore.getState().setToken(accessToken);
      useAuthStore.getState().setUser(user);
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Dev Login Bypass failed. Ensure backend NestJS is running.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col relative overflow-hidden">
      {/* Decorative Gradient Background */}
      <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/5 blur-[130px] pointer-events-none" />

      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-50" />

      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Code2 className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            CodeRudra
          </span>
        </div>

        <a 
          href="https://github.com/ShivamJNU/CodeRudra.git" 
          target="_blank" 
          rel="noreferrer" 
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors duration-200"
        >
          <Github className="h-5 w-5" />
          <span>GitHub</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-12 z-10 flex-1 justify-center">
        {/* Left Hand: Typography */}
        <div className="flex-1 flex flex-col items-start text-left gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold tracking-wide">
            <Sparkles className="h-3 w-3 animate-pulse" />
            <span>DSA & Competitive Programming Practice Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Master DSA & <br />
            Problem <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">Solving</span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-lg leading-relaxed">
            An interactive problem-solving platform designed to practice and attempt challenges in Data Structures, Algorithms, and Competitive Programming. We also provide a standalone compiler playground as a helpful add-on to run any custom code.
          </p>

          {error && (
            <div className="p-3 text-sm rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 w-full max-w-md mt-2">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-4">
            <button
              onClick={() => router.push('/playground')}
              className="flex-grow flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl active:scale-95 transition-all duration-200 shadow-lg shadow-violet-600/10 cursor-pointer"
            >
              <Terminal className="h-5 w-5 text-violet-200" />
              <span>Playground (C++ & Python)</span>
            </button>

            <button
              onClick={handleGoogleLogin}
              className="flex-grow flex items-center justify-center gap-3 bg-white text-zinc-950 font-bold px-6 py-3.5 rounded-xl hover:bg-zinc-200 active:scale-95 transition-all duration-200 shadow-lg cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google Sign In</span>
            </button>
          </div>
        </div>

        {/* Right Hand: Code Editor Mockup Card */}
        <div className="flex-1 w-full max-w-md relative group select-none">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-indigo-600/30 opacity-40 blur-xl group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />
          
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md overflow-hidden shadow-2xl">
            {/* Window bar */}
            <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-950/90 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-xs text-zinc-500 font-mono">fibonacci.cpp</span>
              <div className="w-12" />
            </div>

            {/* Code lines mockup */}
            <div className="p-5 font-mono text-sm leading-relaxed text-left select-none text-zinc-400">
              <p><span className="text-violet-400">#include</span> <span className="text-emerald-400">&lt;iostream&gt;</span></p>
              <p><span className="text-violet-400">int</span> <span className="text-indigo-400">fib</span>(<span className="text-violet-400">int</span> n) &#123;</p>
              <p className="pl-4"><span className="text-violet-400">if</span> (n &lt;= <span className="text-emerald-400">1</span>) <span className="text-violet-400">return</span> n;</p>
              <p className="pl-4"><span className="text-violet-400">return</span> <span className="text-indigo-400">fib</span>(n-<span className="text-emerald-400">1</span>) + <span className="text-indigo-400">fib</span>(n-<span className="text-emerald-400">2</span>);</p>
              <p>&#125;</p>
              <p><span className="text-violet-400">int</span> <span className="text-indigo-400">main</span>() &#123;</p>
              <p className="pl-4">std::cout &lt;&lt; <span className="text-indigo-400">fib</span>(<span className="text-emerald-400">10</span>);</p>
              <p className="pl-4"><span className="text-violet-400">return</span> <span className="text-emerald-400">0</span>;</p>
              <p>&#125;</p>
            </div>

            {/* Simulated output console */}
            <div className="mx-4 mb-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-left">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-1.5">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Console Output</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">ACCEPTED</span>
              </div>
              <p className="text-xs font-mono text-zinc-300 font-bold">55</p>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono mt-1">
                <span>Time: 0.04s</span>
                <span>Memory: 4320 KB</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600 z-10">
        <p>&copy; {new Date().getFullYear()} CodeRudra. Crafted for the ultimate coding challenge.</p>
        
        {/* Relatively hidden developer bypass login */}
        <button
          onClick={handleDevBypassLogin}
          disabled={loading}
          className="text-[10px] text-zinc-900 hover:text-zinc-700 transition-colors duration-150 cursor-pointer disabled:opacity-30"
          title="Developer Login Bypass"
        >
          {loading ? 'Logging in...' : 'Dev Admin'}
        </button>
      </footer>
    </div>
  );
}
