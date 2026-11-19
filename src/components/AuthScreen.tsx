import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BotanicalAccent, CelestialAccent, WashiLabel } from './ScrapbookAccents';
import { ArrowRight, CheckCircle2, Lock, Mail, RefreshCw, User as UserIcon } from 'lucide-react';

type AuthTab = 'signin' | 'signup' | 'reset';

export function AuthScreen() {
  const {
    user,
    authError,
    authNotice,
    clearAuthMessages,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    resendVerification,
    reloadUser,
    logout,
    enterLocalWorkspace,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const switchTab = (next: AuthTab) => {
    clearAuthMessages();
    setTab(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
      } else if (tab === 'signup') {
        await signUpWithEmail(name, email, password);
      } else {
        await resetPassword(email);
      }
    } catch {
      // Handled by AuthContext
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // Handled by AuthContext
    } finally {
      setBusy(false);
    }
  };

  // Unverified email holding screen
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--cs-bg)' }}>
        <div className="cs-card max-w-md w-full rounded-3xl p-8 space-y-5">
          <div className="flex items-center justify-between">
            <WashiLabel>Verify your email</WashiLabel>
            <CelestialAccent />
          </div>
          <h1 className="font-display text-2xl font-semibold">One quick step before cloud sync</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
            We sent a verification link to <strong style={{ color: 'var(--cs-text)' }}>{user.email}</strong>.
            Clearspace enforces verified accounts in Firestore security rules so your private workspace stays protected.
          </p>
          {authError && (
            <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
              {authError}
            </div>
          )}
          {authNotice && (
            <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {authNotice}
            </div>
          )}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  await reloadUser();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="cs-btn-primary w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              I verified my email — continue
            </button>
            <button
              type="button"
              onClick={resendVerification}
              disabled={busy}
              className="cs-surface-muted w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Resend verification email
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full py-2 text-xs font-medium underline cursor-pointer"
              style={{ color: 'var(--cs-text-muted)' }}
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: 'var(--cs-bg)' }}>
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left editorial scrapbook welcome */}
        <div className="lg:col-span-6 cs-card rounded-3xl p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <WashiLabel>Clearspace 3.0</WashiLabel>
              <BotanicalAccent className="w-7 h-7" />
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                Your calm personal space for days, energy, and steady growth.
              </h1>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
                Plan hour-by-hour in My Day, check in with your energy, track studies and finances, doodle on your
                calendar, and reflect gently at the end of every day.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t space-y-4" style={{ borderColor: 'var(--cs-border)' }}>
            <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              <div className="cs-surface-muted rounded-xl p-3">
                <div className="font-semibold mb-1" style={{ color: 'var(--cs-text)' }}>My Day Timeline</div>
                Hour-by-hour blocks, templates &amp; gentle rescheduling
              </div>
              <div className="cs-surface-muted rounded-xl p-3">
                <div className="font-semibold mb-1" style={{ color: 'var(--cs-text)' }}>Pulse &amp; Day Echo</div>
                Energy-aware guidance &amp; plan vs reality reflection
              </div>
              <div className="cs-surface-muted rounded-xl p-3">
                <div className="font-semibold mb-1" style={{ color: 'var(--cs-text)' }}>Cloud Synced</div>
                Private Firestore workspace across your devices
              </div>
              <div className="cs-surface-muted rounded-xl p-3">
                <div className="font-semibold mb-1" style={{ color: 'var(--cs-text)' }}>Data Migration</div>
                Bring existing local Clearspace data seamlessly
              </div>
            </div>
          </div>
        </div>

        {/* Right sign-in / sign-up card */}
        <div className="lg:col-span-6 cs-card rounded-3xl p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold">
              {tab === 'signin' && 'Welcome back'}
              {tab === 'signup' && 'Create your space'}
              {tab === 'reset' && 'Reset password'}
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-xl cs-surface-muted text-xs font-medium">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                  tab === 'signin' ? 'cs-btn-primary' : ''
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                  tab === 'signup' ? 'cs-btn-primary' : ''
                }`}
              >
                Sign up
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-xl cs-surface-muted font-medium text-sm flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.02 21.17 7.19 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.02 14.03c-.25-.74-.39-1.53-.39-2.34s.14-1.6.39-2.34V6.21H1.01C.37 7.5 0 8.95 0 11.69c0 2.74.37 4.19 1.01 5.48l4.01-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.79 0 3.4.62 4.67 1.83l3.5-3.5C18.07 1.19 15.3 0 12 0 7.19 0 3.02 2.83 1.01 6.21l4.01 3.14C6 6.94 8.75 4.75 12 4.75Z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--cs-text-muted)' }}>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--cs-border)' }} />
            <span>or use email</span>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--cs-border)' }} />
          </div>

          {authError && (
            <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
              {authError}
            </div>
          )}
          {authNotice && (
            <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {authNotice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="auth-name" className="block text-xs font-medium">
                  Your name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ananya"
                    className="cs-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-medium">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="cs-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            {tab !== 'reset' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-medium">
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchTab('reset')}
                      className="text-xs underline cursor-pointer"
                      style={{ color: 'var(--cs-text-muted)' }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="cs-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="cs-btn-primary w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              {busy ? 'Please wait...' : tab === 'signin' ? 'Sign in to Clearspace' : tab === 'signup' ? 'Create account' : 'Send reset link'}
              <ArrowRight className="w-4 h-4" />
            </button>

            {tab === 'reset' && (
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="w-full text-xs underline cursor-pointer"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                Back to sign in
              </button>
            )}
          </form>

          <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--cs-border)' }}>
            <span className="text-xs" style={{ color: 'var(--cs-text-muted)' }}>
              Want to preview offline first?
            </span>
            <button
              type="button"
              onClick={enterLocalWorkspace}
              className="text-xs font-semibold underline cursor-pointer whitespace-nowrap"
              style={{ color: 'var(--cs-accent)' }}
            >
              Open Local Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
