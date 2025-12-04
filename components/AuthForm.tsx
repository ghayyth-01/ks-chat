'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function AuthForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }

      router.push('/chat');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm">Email</label>
        <input
          type="email"
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm">Password</label>
        <input
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Sign Up'}
      </button>

      <p className="text-sm text-gray-400 text-center">
        {mode === 'login' ? (
          <>
            No account?{' '}
            <span
              className="cursor-pointer text-indigo-400"
              onClick={() => setMode('register')}
            >
              Create one
            </span>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <span
              className="cursor-pointer text-indigo-400"
              onClick={() => setMode('login')}
            >
              Login
            </span>
          </>
        )}
      </p>
    </form>
  );
}
