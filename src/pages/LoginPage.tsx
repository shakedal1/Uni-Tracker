import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Optionally notify user to check email here based on supabase config
      }
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות עם Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-md bg-bg-card rounded-xl shadow-md border border-border-light p-8">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="fill-accent-primary w-3 h-3 bg-accent-primary rounded-full"></div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Uni Tracker</h1>
        </div>

        <h2 className="text-xl font-bold text-text-primary text-center mb-6">
          {isLogin ? 'התחבר לחשבון שלך' : 'צור חשבון חדש'}
        </h2>

        {error && (
          <div className="bg-danger-light text-danger p-3 rounded-md text-sm mb-4 border border-danger/20">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-bg-tertiary border border-border text-text-primary font-semibold py-2.5 rounded-md shadow-sm hover:bg-bg-card-hover transition-colors disabled:opacity-70 mb-4 cursor-pointer"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-text-tertiary border-t-text-primary rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
          )}
          {googleLoading ? 'מתחבר...' : 'התחבר עם Google'}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border-light"></div>
          <span className="text-xs text-text-tertiary font-medium font-sans">או עם אימייל</span>
          <div className="flex-1 h-px bg-border-light"></div>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-secondary" htmlFor="email">אימייל</label>
            <input
              id="email"
              type="email"
              dir="ltr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="px-4 py-2.5 rounded-md border border-border bg-bg-primary focus:outline-none focus:border-accent-primary transition-colors text-text-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-secondary" htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="px-4 py-2.5 rounded-md border border-border bg-bg-primary focus:outline-none focus:border-accent-primary transition-colors text-text-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-accent-primary text-text-on-accent font-semibold py-3 rounded-md shadow-sm hover:bg-accent-primary-hover transition-colors disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              isLogin ? 'התחבר' : 'הרשם'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm text-text-tertiary hover:text-accent-primary transition-colors font-medium"
          >
            {isLogin ? 'אין לך חשבון? הרשם כאן' : 'יש לך חשבון? התחבר כאן'}
          </button>
        </div>
      </div>
    </div>
  );
}
