import { useState, type FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = login(email.trim(), password);
    if (!ok) setError(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-offwhite sm:bg-[#E8E4DF]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-offwhite flex flex-col items-center justify-center px-8 gap-8 sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-lavender-400 flex items-center justify-center text-2xl">
            🤱
          </div>
          <h1 className="text-xl font-bold text-graphite">Mothers Team</h1>
          <p className="text-xs text-graphite-muted text-center">
            Seu espaço de cuidado e acolhimento na maternidade
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(false); }}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-gray-300 focus:outline-none focus:border-lavender-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-gray-300 focus:outline-none focus:border-lavender-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-blush-500 text-center">
              E-mail ou senha incorretos. Tente novamente.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            disabled={!email || !password}
          >
            Entrar
          </button>
        </form>

        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-graphite-muted">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => setShowComingSoon(true)}
            className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-sm font-medium text-graphite flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          <button
            type="button"
            onClick={() => setShowComingSoon(true)}
            className="w-full py-3 rounded-2xl bg-graphite text-white text-sm font-medium flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <svg width="17" height="20" viewBox="0 0 17 20" fill="currentColor">
              <path d="M13.636 10.595c-.022-2.59 2.117-3.844 2.215-3.909-1.207-1.764-3.083-2.006-3.75-2.031-1.594-.163-3.117.946-3.925.946-.808 0-2.055-.924-3.38-.9-1.737.025-3.341 1.013-4.233 2.566-1.806 3.132-.463 7.771 1.297 10.312.862 1.24 1.89 2.637 3.237 2.585 1.301-.052 1.793-.838 3.367-.838 1.574 0 2.02.838 3.394.812 1.397-.025 2.284-1.265 3.138-2.511.99-1.44 1.396-2.833 1.42-2.905-.031-.013-2.727-1.046-2.78-4.127zM11.178 3.044C11.888 2.18 12.37.997 12.237 0c-1.027.042-2.27.684-3.007 1.548-.659.759-1.237 1.974-1.081 3.138 1.147.088 2.32-.583 3.029-1.642z"/>
            </svg>
            Continuar com Apple
          </button>

          {showComingSoon && (
            <p className="text-xs text-lavender-600 text-center font-medium">
              🚀 Login social disponível em breve
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
