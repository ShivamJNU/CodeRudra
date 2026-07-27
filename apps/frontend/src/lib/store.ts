import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  initializeAuth: () => void;
}

interface EditorState {
  language: 'cpp' | 'java' | 'python';
  code: string;
  setLanguage: (lang: 'cpp' | 'java' | 'python') => void;
  setCode: (code: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem('token');
      set({ token: null, isAuthenticated: false, user: null });
    }
  },
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
  },
  initializeAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        set({ token, isAuthenticated: true });
      }
    }
  },
}));

const templates = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    // Hint: To test compilation errors, add the word 'compile_error'\n    // Hint: To test TLE, add 'timeout'\n    // Hint: To test MLE, add 'mle'\n    // Hint: To test Runtime Error, add 'runtime_error'\n    // Hint: To test Wrong Answer, add 'wrong_answer'\n    cout << "Hello CodeForge C++!" << endl;\n    return 0;\n}`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your Java code here\n        // Hint: To test compiler errors, write 'compile_error'\n        System.out.println("Hello CodeForge Java!");\n    }\n}`,
  python: `# Write your Python code here\n# Hint: To test compiler errors, write 'compile_error'\n\nprint("Hello CodeForge Python!")`,
};

export const useEditorStore = create<EditorState>((set) => ({
  language: 'cpp',
  code: templates.cpp,
  setLanguage: (lang) => set({ language: lang, code: templates[lang] }),
  setCode: (code) => set({ code }),
}));
