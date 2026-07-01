import { useState, type FormEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

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
      </div>
    </div>
  );
}
