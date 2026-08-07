'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, templates } from '@/lib/store';
import api from '@/lib/api';
import Editor from '@monaco-editor/react';
import { 
  ArrowLeft, Terminal, Cpu, Play, CheckCircle2, 
  AlertTriangle, Sparkles, Code2, LogIn, LogOut, RotateCcw 
} from 'lucide-react';

export default function Playground() {
  const router = useRouter();
  const { user, initializeAuth, isAuthenticated, logout } = useAuthStore();

  const [language, setLanguage] = useState<'cpp' | 'python'>('cpp');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [consoleTab, setConsoleTab] = useState<'input' | 'output'>('input');

  // Load saved code from local storage on mount
  useEffect(() => {
    initializeAuth();
    
    // Load local storage preferences
    const savedLang = localStorage.getItem('coderudra-playground-lang') as 'cpp' | 'python';
    const activeLang = savedLang || 'cpp';
    setLanguage(activeLang);

    const savedCode = localStorage.getItem(`coderudra-playground-code-${activeLang}`);
    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(templates[activeLang]);
    }
  }, [initializeAuth]);

  // Handle changing code
  const handleCodeChange = (newValue: string | undefined) => {
    const val = newValue || '';
    setCode(val);
    localStorage.setItem(`coderudra-playground-code-${language}`, val);
  };

  // Handle changing language
  const handleLanguageChange = (newLang: 'cpp' | 'python') => {
    setLanguage(newLang);
    localStorage.setItem('coderudra-playground-lang', newLang);

    const savedCode = localStorage.getItem(`coderudra-playground-code-${newLang}`);
    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(templates[newLang]);
    }
  };

  // Handle resetting code
  const handleResetCode = () => {
    if (!window.confirm("Are you sure you want to reset your code to the default template? Your current edits will be lost.")) {
      return;
    }
    const defaultTemplate = templates[language];
    setCode(defaultTemplate);
    localStorage.setItem(`coderudra-playground-code-${language}`, defaultTemplate);
  };

  // Handle running code against input
  const handleRunCode = async () => {
    setExecuting(true);
    setConsoleTab('output');
    setRunResult({ status: 'RUNNING', message: 'Compiling & Running...' });

    try {
      // If logged in, call authenticated execute route so it gets saved to submission history.
      // If anonymous, call execute-public.
      const endpoint = isAuthenticated ? '/execute' : '/execute-public';
      const res = await api.post(endpoint, {
        sourceCode: code,
        language,
        input: customInput,
      });

      setRunResult(res.data);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to communicate with compiler backend.';
      setRunResult({
        status: 'RUNTIME_ERROR',
        error: errMsg,
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-50 font-sans overflow-hidden">
      {/* Decorative Blur Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      {/* Workspace Header */}
      <header className="px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors duration-150 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Back to {isAuthenticated ? 'Dashboard' : 'Home'}
            </span>
          </button>
          <div className="h-4 w-[1px] bg-zinc-900 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2 rounded-xl">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">
              CodeRudra <span className="text-violet-400 text-xs px-2 py-0.5 ml-2 border border-violet-950 bg-violet-950/20 rounded-full font-mono">PLAYGROUND</span>
            </span>
          </div>
        </div>

        {/* User profile / login link */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <img 
                src={user.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`} 
                alt={user.name} 
                className="h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900"
              />
              <span className="text-xs font-medium text-zinc-300 hidden md:inline">{user.name}</span>
              <button 
                onClick={() => { logout(); router.push('/'); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold tracking-wide transition-all duration-200 shadow-md cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Log In / Sign Up</span>
            </button>
          )}
        </div>
      </header>

      {/* Editor & Console Split Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Left Side: Monaco Editor */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-zinc-900 h-1/2 md:h-full bg-zinc-950 overflow-hidden">
          
          {/* Editor Header Settings */}
          <div className="px-6 py-3 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                <Code2 className="h-3.5 w-3.5 text-violet-400" />
                <span>Language:</span>
                <select 
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as any)}
                  className="bg-transparent text-white focus:outline-none capitalize font-bold cursor-pointer"
                >
                  <option value="cpp" className="bg-zinc-950 text-white">C++ (GCC 14)</option>
                  <option value="python" className="bg-zinc-950 text-white">Python (Python 3.12)</option>
                </select>
              </div>

              <button
                onClick={handleResetCode}
                title="Reset code to default template"
                className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold bg-zinc-900/50 hover:bg-zinc-900 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
                <span>Reset Code</span>
              </button>
            </div>

            <div className="text-xs text-zinc-500 font-mono">
              Main.{language === 'cpp' ? 'cpp' : 'py'}
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[100px] bg-zinc-950">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : 'python'}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            />
          </div>
        </div>

        {/* Right Side: Output Console */}
        <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col bg-zinc-950/40 backdrop-blur-sm h-1/2 md:h-full overflow-hidden">
          
          {/* Console Tab Selector */}
          <div className="px-6 border-b border-zinc-900 flex items-center justify-between shrink-0">
            <div className="flex gap-4">
              <button 
                onClick={() => setConsoleTab('input')}
                className={`py-3 text-xs font-bold uppercase tracking-wider relative cursor-pointer ${consoleTab === 'input' ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <span>Custom Input</span>
                {consoleTab === 'input' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500" />}
              </button>
              <button 
                onClick={() => setConsoleTab('output')}
                className={`py-3 text-xs font-bold uppercase tracking-wider relative cursor-pointer ${consoleTab === 'output' ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <span>Console Output</span>
                {consoleTab === 'output' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500" />}
              </button>
            </div>

            {/* Run Button */}
            <div className="py-2">
              <button 
                onClick={handleRunCode}
                disabled={executing}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md tracking-wider transition-all duration-150 uppercase cursor-pointer ${
                  executing 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-violet-600 hover:bg-violet-700 text-white active:scale-95'
                }`}
              >
                <Play className={`h-3.5 w-3.5 ${executing ? 'animate-pulse' : ''}`} />
                <span>{executing ? 'Running...' : 'Run Code'}</span>
              </button>
            </div>
          </div>

          {/* Console Container Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {consoleTab === 'input' ? (
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Provide Standard Input (stdin)</span>
                <textarea 
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter input parameters here..."
                  className="flex-1 min-h-[150px] w-full p-4 bg-zinc-900/60 border border-zinc-900 rounded-xl text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-800/80 leading-normal resize-none"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4">
                
                {/* Status Bar */}
                {runResult && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold leading-none uppercase ${
                    runResult.status === 'RUNNING'
                      ? 'bg-zinc-900/40 border-zinc-900 text-zinc-400'
                      : runResult.status === 'ACCEPTED' || runResult.status === 'RUN_SUCCESSFUL' || runResult.status === 'SUCCESS' || (!runResult.error && runResult.status !== 'COMPILATION_ERROR' && runResult.status !== 'RUNTIME_ERROR' && runResult.status !== 'TIME_LIMIT_EXCEEDED')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      {runResult.status === 'RUNNING' ? (
                        <div className="h-4 w-4 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
                      ) : runResult.status === 'ACCEPTED' || runResult.status === 'RUN_SUCCESSFUL' || runResult.status === 'SUCCESS' || (!runResult.error && runResult.status !== 'COMPILATION_ERROR' && runResult.status !== 'RUNTIME_ERROR' && runResult.status !== 'TIME_LIMIT_EXCEEDED') ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      )}
                      <span>
                        {runResult.status === 'RUNNING'
                          ? 'Executing Code...'
                          : runResult.status === 'ACCEPTED' || runResult.status === 'RUN_SUCCESSFUL' || runResult.status === 'SUCCESS' || (!runResult.error && runResult.status !== 'COMPILATION_ERROR' && runResult.status !== 'RUNTIME_ERROR' && runResult.status !== 'TIME_LIMIT_EXCEEDED')
                          ? 'Run Successful'
                          : 'Error'}
                      </span>
                    </div>

                    {runResult.runtime !== undefined && runResult.runtime !== null && (
                      <span className="text-[10px] text-zinc-500 font-mono font-normal">
                        Time: {Number(runResult.runtime).toFixed(3)}s
                      </span>
                    )}
                  </div>
                )}

                {/* Stdout Output Console */}
                {runResult && (
                  <div className="flex flex-col gap-2 flex-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Compiler Output (stdout / stderr)</span>
                    
                    {runResult.error || runResult.status === 'COMPILATION_ERROR' || runResult.status === 'RUNTIME_ERROR' || runResult.status === 'TIME_LIMIT_EXCEEDED' ? (
                      <pre className="p-4 bg-red-950/10 border border-red-950/20 text-red-400 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {runResult.error || runResult.output || 'Execution failed or timed out.'}
                      </pre>
                    ) : (
                      <pre className="p-4 bg-zinc-900/60 border border-zinc-900 text-zinc-300 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto flex-1">
                        {runResult.output || 'Code ran successfully with no output.'}
                      </pre>
                    )}
                  </div>
                )}

                {!runResult && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-zinc-600 text-sm">
                    <Terminal className="h-8 w-8 mx-auto text-zinc-800 mb-2" />
                    <span>Run your code to view the output console.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
