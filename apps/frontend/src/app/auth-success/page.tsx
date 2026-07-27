'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

function AuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      setToken(token);
      
      // Fetch user profile info
      api.get('/me')
        .then((res) => {
          setUser(res.data);
          router.push('/dashboard');
        })
        .catch((err) => {
          console.error('Failed to fetch user profiles:', err);
          // In case /me fails, logout and go home
          localStorage.removeItem('token');
          router.push('/');
        });
    } else {
      router.push('/');
    }
  }, [searchParams, setToken, setUser, router]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
        <p className="text-lg font-medium text-zinc-400">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-lg font-medium text-zinc-400">Loading auth details...</p>
        </div>
      </div>
    }>
      <AuthSuccessContent />
    </Suspense>
  );
}
