import { create } from 'zustand';
import api from './api';

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
  initializeAuth: () => Promise<void>;
}

interface EditorState {
  language: 'cpp' | 'python';
  code: string;
  setLanguage: (lang: 'cpp' | 'python') => void;
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
  initializeAuth: async () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        set({ token, isAuthenticated: true });
        try {
          const res = await api.get('/me');
          set({ user: res.data });
        } catch (err) {
          console.error('Failed to restore user session:', err);
          localStorage.removeItem('token');
          set({ token: null, user: null, isAuthenticated: false });
        }
      }
    }
  },
}));

export const templates = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    cout << "Hello CodeRudra C++!" << endl;\n    return 0;\n}`,
  python: `# Write your Python code here\n\nprint("Hello CodeRudra Python!")`,
};

export const useEditorStore = create<EditorState>((set) => ({
  language: 'cpp',
  code: templates.cpp,
  setLanguage: (lang) => set({ language: lang, code: templates[lang] }),
  setCode: (code) => set({ code }),
}));
