'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore, useEditorStore, templates } from '@/lib/store';
import api from '@/lib/api';
import Editor from '@monaco-editor/react';
import Latex from '@/components/Latex';
import { 
  ArrowLeft, Terminal, Cpu, Play, CheckCircle2, 
  Save, AlertTriangle, FileUp, Sparkles, Code2, 
  HelpCircle, History, Settings, RotateCcw 
} from 'lucide-react';

export default function ProblemWorkspace() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user, initializeAuth, isAuthenticated } = useAuthStore();
  const { language, code, setLanguage, setCode } = useEditorStore();

  // Workspace states
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'submissions'>('details');
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Resizable panels states
  const [leftWidth, setLeftWidth] = useState(40); // in percentage
  const [consoleHeight, setConsoleHeight] = useState(250); // in pixels
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const startResizeWidth = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingWidth(true);
  };

  const startResizeHeight = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingHeight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingWidth) {
        const percentage = (e.clientX / window.innerWidth) * 100;
        if (percentage >= 20 && percentage <= 80) {
          setLeftWidth(percentage);
        }
      }

      if (isResizingHeight) {
        const height = window.innerHeight - e.clientY;
        if (height >= 100 && height <= window.innerHeight - 200) {
          setConsoleHeight(height);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingWidth(false);
      setIsResizingHeight(false);
    };

    if (isResizingWidth || isResizingHeight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingWidth, isResizingHeight]);

  // Execution states
  const [customInput, setCustomInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [consoleTab, setConsoleTab] = useState<'input' | 'output'>('output');
  const [lastAction, setLastAction] = useState<'run' | 'submit' | null>(null);

  // Save code modal states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // File Upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved language from localStorage on mount or problem ID change
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const savedLang = localStorage.getItem(`coderudra-lang-${id}`);
      if (savedLang) {
        setLanguage(savedLang as any);
      }
    }
  }, [id, setLanguage]);

  // Load saved code from localStorage on mount, language change, or problem ID change
  useEffect(() => {
    if (typeof window !== 'undefined' && id && language) {
      const savedCode = localStorage.getItem(`coderudra-code-${id}-${language}`);
      if (savedCode) {
        setCode(savedCode);
      }
    }
  }, [id, language, setCode]);

  const handleCodeChange = (newValue: string | undefined) => {
    const val = newValue || '';
    setCode(val);
    if (typeof window !== 'undefined' && id && language) {
      localStorage.setItem(`coderudra-code-${id}-${language}`, val);
    }
  };

  const handleLanguageChange = (newLang: any) => {
    setLanguage(newLang);
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`coderudra-lang-${id}`, newLang);
    }
  };

  const handleResetCode = () => {
    const confirmReset = window.confirm("Are you sure you want to reset your code to the default template? Your current edits will be lost.");
    if (!confirmReset) return;

    const defaultTemplate = (templates as any)[language] || '';
    setCode(defaultTemplate);
    if (typeof window !== 'undefined' && id && language) {
      localStorage.setItem(`coderudra-code-${id}-${language}`, defaultTemplate);
    }
  };

  useEffect(() => {
    initializeAuth();
    if (!useAuthStore.getState().isAuthenticated) {
      router.push('/');
      return;
    }
    fetchWorkspaceData();
  }, [router, initializeAuth, id]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      const [probRes, subsRes] = await Promise.all([
        api.get(`/problems/${id}`),
        api.get('/history'),
      ]);
      setProblem(probRes.data);
      
      // Filter submissions for this problem only
      const problemSubs = subsRes.data.filter((s: any) => s.problemId === id);
      setSubmissions(problemSubs);
      setSaveTitle(probRes.data.title + ' Solution');
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Max file size is 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomInput(event.target.result as string);
        setConsoleTab('input');
      }
    };
    reader.readAsText(file);
  };

  const handleRunCode = async () => {
    setExecuting(true);
    setConsoleTab('output');
    setLastAction('run');
    setRunResult({ status: 'RUNNING', message: 'Compiling & Running...' });

    try {
      const res = await api.post('/execute', {
        sourceCode: code,
        language,
        input: customInput,
      });

      setRunResult(res.data);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to communicate with compiler backend. Ensure NestJS port is 5000.';
      setRunResult({
        status: 'RUNTIME_ERROR',
        error: errMsg,
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    setSubmitting(true);
    setConsoleTab('output');
    setLastAction('submit');
    setRunResult({ status: 'RUNNING', message: 'Running test cases against solution...' });

    try {
      const res = await api.post('/submit', {
        problemId: id,
        sourceCode: code,
        language,
      });

      setRunResult(res.data);
      // Reload submissions list
      const subsRes = await api.get('/history');
      setSubmissions(subsRes.data.filter((s: any) => s.problemId === id));
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Evaluation failed. Make sure compiler engine is running.';
      setRunResult({
        status: 'RUNTIME_ERROR',
        error: errMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCode = async () => {
    if (!saveTitle.trim()) return;
    setSaving(true);
    try {
      await api.post('/codes', {
        problemId: id,
        title: saveTitle,
        language,
        sourceCode: code,
      });
      setShowSaveModal(false);
      alert('Code saved successfully! You can access it on your Dashboard.');
    } catch (err) {
      console.error('Failed to save code:', err);
      alert('Failed to save code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !problem) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50 font-sans">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <header className="w-full border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg border border-zinc-900 hover:border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-bold text-lg text-zinc-200">{problem.title}</h2>
            <p className="text-xs text-zinc-500 capitalize">Arena Playground &bull; Limits: {problem.timeLimit}s / {problem.memoryLimit}MB</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/playground')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 hover:from-violet-600/45 hover:to-indigo-600/45 border border-violet-500/30 text-zinc-200 hover:text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            title="Go to independent compiler playground"
          >
            <Terminal className="h-4 w-4 text-violet-400" />
            <span>Playground</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Solution</span>
          </button>
          
          <img 
            src={user?.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name}`} 
            alt={user?.name} 
            className="h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900 hidden sm:inline"
          />
        </div>
      </header>

      {/* Save Code Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm flex flex-col gap-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-200">Save Your Code</h3>
            <p className="text-xs text-zinc-500">Provide a name so you can search and manage this solution from your dashboard later.</p>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Solution Title</label>
              <input 
                type="text" 
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="e.g. My Optimal Two Sum Solution"
                className="bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCode}
                disabled={saving || !saveTitle.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Panels */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 ${isResizingWidth || isResizingHeight ? 'select-none' : ''}`}>
        
        {/* Left Side: Challenge Details */}
        <div 
          style={isClient && typeof window !== 'undefined' && window.innerWidth >= 768 ? { width: `${leftWidth}%` } : undefined}
          className="w-full md:w-auto border-r border-zinc-900 flex flex-col bg-zinc-950/60 overflow-hidden shrink-0"
        >
          {/* Tab selector */}
          <div className="flex border-b border-zinc-900 bg-zinc-950 shrink-0">
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors duration-150 ${
                activeTab === 'details' 
                  ? 'border-violet-500 text-violet-400' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Challenge
            </button>
            <button 
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors duration-150 ${
                activeTab === 'submissions' 
                  ? 'border-violet-500 text-violet-400' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              My Submissions
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-6 text-left leading-relaxed">
            {activeTab === 'details' ? (
              <div className="flex flex-col gap-6">
                <div>
                  <span className={`inline-block font-semibold px-2 py-0.5 text-xs rounded-full border ${
                    problem.difficulty === 'EASY' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : problem.difficulty === 'MEDIUM' 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {problem.difficulty}
                  </span>
                </div>

                <div className="prose prose-invert max-w-none text-zinc-300 text-sm">
                  <Latex text={problem.description} />
                </div>

                {problem.constraints && (
                  <div>
                    <h4 className="font-bold text-sm text-zinc-200 uppercase tracking-wider border-b border-zinc-900 pb-2 mb-2">Constraints</h4>
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900/60 rounded-xl text-xs text-zinc-400 leading-normal">
                      <Latex text={problem.constraints} />
                    </div>
                  </div>
                )}

                {problem.inputFormat && (
                  <div>
                    <h4 className="font-bold text-sm text-zinc-200 uppercase tracking-wider border-b border-zinc-900 pb-2 mb-2">Input Format</h4>
                    <Latex text={problem.inputFormat} className="text-zinc-400 text-xs" />
                  </div>
                )}

                {problem.outputFormat && (
                  <div>
                    <h4 className="font-bold text-sm text-zinc-200 uppercase tracking-wider border-b border-zinc-900 pb-2 mb-2">Output Format</h4>
                    <Latex text={problem.outputFormat} className="text-zinc-400 text-xs" />
                  </div>
                )}

                {/* Sample Testcases */}
                {problem.testCases && problem.testCases.filter((tc: any) => tc.isSample).length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm text-zinc-200 uppercase tracking-wider border-b border-zinc-900 pb-2 mb-3">Sample Examples</h4>
                    <div className="flex flex-col gap-4">
                      {problem.testCases.filter((tc: any) => tc.isSample).map((tc: any, index: number) => (
                        <div key={tc.id || index} className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Sample Input {index + 1}</span>
                            <pre className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre">
                              {tc.input}
                            </pre>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Expected Output {index + 1}</span>
                            <pre className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre">
                              {tc.output}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-sm">
                    <History className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                    <span>No submissions yet for this challenge. Write some code and click Submit!</span>
                  </div>
                ) : (
                  submissions.map((sub) => (
                    <div 
                      key={sub.id}
                      className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col gap-1">
                        <span className={`font-bold uppercase tracking-wider ${
                          sub.status === 'ACCEPTED' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {sub.language === 'python' && (sub.status === 'COMPILATION_ERROR' || sub.status === 'RUNTIME_ERROR') ? 'ERROR' : sub.status}
                        </span>
                        <span className="text-zinc-500 font-mono">
                          Runtime: {sub.runtime}s &bull; Memory: {sub.memory ? Math.round(sub.memory) : 0} KB
                        </span>
                      </div>
                      <span className="text-zinc-600 font-medium">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vertical Resizer Handle */}
        {isClient && typeof window !== 'undefined' && window.innerWidth >= 768 && (
          <div 
            onMouseDown={startResizeWidth}
            className="w-3 hover:bg-zinc-900/40 cursor-col-resize h-full select-none relative z-30 flex items-center justify-center shrink-0 group transition-colors duration-150"
          >
            <div className={`w-[2px] h-full transition-colors duration-150 ${isResizingWidth ? 'bg-violet-500 w-[3px]' : 'bg-zinc-900 group-hover:bg-violet-600'}`} />
            <div className="absolute w-1.5 h-6 bg-zinc-850 border border-zinc-800 rounded-full flex flex-col gap-0.5 items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="w-[2px] h-[2px] bg-zinc-500 rounded-full" />
              <div className="w-[2px] h-[2px] bg-zinc-500 rounded-full" />
              <div className="w-[2px] h-[2px] bg-zinc-500 rounded-full" />
            </div>
          </div>
        )}

        {/* Right Side: Monaco Editor & Output Console */}
        <div 
          style={isClient && typeof window !== 'undefined' && window.innerWidth >= 768 ? { width: `${100 - leftWidth}%` } : undefined}
          className="flex-1 flex flex-col bg-zinc-950 overflow-hidden h-full"
        >
          
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
          <div className={`flex-1 min-h-[100px] bg-zinc-950 ${isResizingWidth || isResizingHeight ? 'pointer-events-none' : ''}`}>
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

          {/* Horizontal Resizer Handle */}
          <div 
            onMouseDown={startResizeHeight}
            className="h-3 hover:bg-zinc-900/40 cursor-row-resize w-full select-none relative z-30 flex items-center justify-center shrink-0 group transition-colors duration-150 border-t border-zinc-900"
          >
            <div className={`h-[2px] w-full transition-colors duration-150 ${isResizingHeight ? 'bg-violet-500 h-[3px]' : 'bg-zinc-900 group-hover:bg-violet-600'}`} />
            <div className="absolute w-6 h-1.5 bg-zinc-850 border border-zinc-800 rounded-full flex gap-0.5 items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="w-[2px] h-[2px] bg-zinc-500 rounded-full" />
              <div className="w-[2px] h-[2px] bg-zinc-500 rounded-full" />
              <div className="w-[2px] h-[2px] bg-zinc-500 rounded-full" />
            </div>
          </div>

          {/* Resizable Bottom Panel: Action Row + Console */}
          <div 
            style={{ height: `${consoleHeight}px` }}
            className="shrink-0 bg-zinc-950 flex flex-col min-h-0 text-left overflow-hidden border-t border-zinc-900"
          >
            {/* Action Row */}
            <div className="px-6 py-3 border-b border-zinc-900 bg-zinc-950/90 flex items-center justify-between shrink-0">
              {/* Left Upload input text */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer transition-all"
                >
                  <FileUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Upload Input.txt</span>
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Right Execution triggers */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunCode}
                  disabled={executing || submitting}
                  className="px-4 py-2 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  {executing ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  <span>Run Code</span>
                </button>

                <button
                  onClick={handleSubmitCode}
                  disabled={executing || submitting}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-black rounded-lg cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-violet-600/10"
                >
                  {submitting ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Submit</span>
                </button>
              </div>
            </div>

            {/* Console / Output Drawer Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Console Tabs */}
              <div className="flex border-b border-zinc-900 bg-zinc-950 shrink-0">
                <button
                  onClick={() => setConsoleTab('input')}
                  className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-colors duration-150 ${
                    consoleTab === 'input' 
                      ? 'border-violet-500 text-violet-400' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Custom Input
                </button>
                <button
                  onClick={() => setConsoleTab('output')}
                  className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-colors duration-150 ${
                    consoleTab === 'output' 
                      ? 'border-violet-500 text-violet-400' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Result / Console
                </button>
              </div>

              {/* Console Screen */}
              <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
                {consoleTab === 'input' ? (
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder={"Enter inputs here (separate multiple inputs with space or press Enter)\n\nExample:\n4\n5"}
                    className="w-full h-full bg-transparent border-0 resize-none text-zinc-300 focus:outline-none focus:ring-0 leading-normal"
                  />
                ) : (
                  <div className="h-full flex flex-col">
                    {!runResult ? (
                      <div className="text-zinc-600 italic">No execution run yet. Write some code and press 'Run Code' or 'Submit'.</div>
                    ) : runResult.status === 'RUNNING' ? (
                      <div className="flex items-center gap-2 text-zinc-400 animate-pulse">
                        <Terminal className="h-4 w-4 animate-spin text-violet-500" />
                        <span>{runResult.message}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Status header */}
                        <div className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-900 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-black uppercase tracking-wider text-[11px] px-2 py-0.5 rounded border ${
                              runResult.status === 'ACCEPTED' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                              {runResult.status === 'ACCEPTED' 
                                ? (lastAction === 'submit' ? 'All testcases passed' : 'Run Successful') 
                                : (language === 'python' && (runResult.status === 'COMPILATION_ERROR' || runResult.status === 'RUNTIME_ERROR') ? 'ERROR' : runResult.status)}
                            </span>
                            <span className="text-zinc-500">|</span>
                            <span className="text-zinc-400">Runtime: {runResult.runtime ?? 0}s</span>
                            <span className="text-zinc-500">|</span>
                            <span className="text-zinc-400">Memory: {runResult.memory ? Math.round(runResult.memory) : 0} KB</span>
                          </div>
                        </div>

                        {runResult.status === 'ACCEPTED' && lastAction === 'submit' && (
                          <div className="flex items-center gap-2.5 p-3 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-xl select-none animate-in fade-in slide-in-from-top-1 duration-200">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="font-bold text-[11px] tracking-wide">Congrats, all testcases passed!</span>
                          </div>
                        )}

                        {/* Code Execution text stream */}
                        {runResult.error ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Error logs</span>
                            </span>
                            <pre className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-red-400 text-[11px] font-mono leading-normal whitespace-pre-wrap select-text">
                              {runResult.error}
                            </pre>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Stdout Output</span>
                            <pre className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl text-zinc-300 text-[11px] font-mono leading-normal whitespace-pre-wrap select-text">
                              {runResult.output || '(No console logs / output returned)'}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
