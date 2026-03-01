'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { MODULE_ITEMS, ModuleIcon } from '@/components/module-icons';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      const { user } = useAuthStore.getState();
      router.push(user?.globalRole ? '/admin' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Branded Hero */}
        <div className="bg-gradient-to-b from-primary-800 to-primary-900 rounded-t-xl px-6 pt-8 pb-6 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">CASDEX Platform</h1>
          <p className="text-sm text-primary-200 mt-1">
            Security Integration Project Lifecycle Management
          </p>
          <div className="w-12 h-px bg-primary-500 mx-auto mt-4 mb-5" />
          <div className="flex items-start justify-center gap-4">
            {MODULE_ITEMS.map((item) => (
              <div
                key={item.key}
                className={`flex flex-col items-center gap-1.5 ${
                  item.enabled ? 'text-primary-200' : 'text-primary-400 opacity-40'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <ModuleIcon moduleKey={item.key} size={20} />
                </div>
                <span className="text-[10px] leading-tight font-medium max-w-[64px] text-center">
                  {item.iconLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="card rounded-t-none border-t-0 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Username
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center">
              <Link
                href="/reset-password"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          CASDEX &copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
