import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiUser } from '../../lib/types';
import { RegisterScreen } from './RegisterScreen';
import { MtScreen } from '../mt/MtScreen';
import { MtCard } from '../mt/MtCard';
import { MtInput } from '../mt/MtInput';
import { MtPillButton } from '../mt/MtPillButton';
import { Wordmark } from '../brand/Wordmark';
import { Mark } from '../brand/Mark';
import tagline from '../../assets/brand/tagline-mt-rose.svg';

export function LoginScreen() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () =>
      apiFetch<{ accessToken: string; refreshToken: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      }),
    onSuccess: ({ accessToken, refreshToken, user }) => {
      setAuth(accessToken, user, refreshToken);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate();
  }

  const errorMsg =
    isError && error instanceof ApiError && error.status === 401
      ? 'E-mail ou senha incorretos. Tente novamente.'
      : isError
      ? 'Erro de conexão. Tente novamente.'
      : '';

  if (showRegister) {
    return <RegisterScreen onBack={() => setShowRegister(false)} />;
  }

  return (
    <MtScreen variant="gradient">
      <div className="min-h-screen w-full flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-[380px]">
          <MtCard.Feature className="flex flex-col items-center gap-4 py-5">
            {/* Brand block — a marca é o herói.
                Os SVGs agora têm viewBox trimado (sem whitespace nativo), então
                gap-0 realmente cola os 3 elementos. Controles pra ajustar:
                - <Mark size={80}> → tamanho do M-logo em px (80 = 80x80)
                - <Wordmark size="xl"> → 'sm' | 'md' | 'lg' | 'xl' (h-8 / h-16 / h-24 / h-32)
                - <img w-72> → largura da tagline (w-40, w-52, w-64, w-72, w-80)
                - gap-0 → espaço entre Mark, Wordmark e Tagline (gap-1 = 4px de folga, gap-2 = 8px)
                - mt-N na tag → ajuste fino positivo/negativo por elemento */}
            <div className="flex flex-col items-center gap-0">
              <Mark variant="gradient" size={80} aria-label="Mother's Team" />
              <Wordmark variant="rose" size="xl" className="w-auto" />
              <img
                src={tagline}
                alt="quem é MÃE sabe."
                className="w-72 h-auto"
              />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
              <MtInput
                id="email"
                label="E-mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />

              <MtInput
                id="password"
                label="Senha"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {errorMsg && (
                <p role="alert" className="text-xs text-mt-rose-deep text-center -mt-1">
                  {errorMsg}
                </p>
              )}

              <MtPillButton
                type="submit"
                variant="primary"
                disabled={!email || !password || isPending}
                className="w-full mt-1"
              >
                {isPending ? 'Entrando…' : 'Entrar'}
              </MtPillButton>
            </form>

            {/* Divisor discreto entre auth próprio e social */}
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-mt-linen" />
              <span className="text-[11px] text-mt-muted uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-mt-linen" />
            </div>

            {/* Social auth */}
            <div className="w-full flex flex-col gap-2">
              <MtPillButton
                variant="google"
                onClick={() => setShowComingSoon(true)}
                className="w-full flex items-center justify-center gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </MtPillButton>

              <MtPillButton
                variant="apple"
                onClick={() => setShowComingSoon(true)}
                className="w-full flex items-center justify-center gap-3"
              >
                <svg width="17" height="20" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true">
                  <path d="M13.636 10.595c-.022-2.59 2.117-3.844 2.215-3.909-1.207-1.764-3.083-2.006-3.75-2.031-1.594-.163-3.117.946-3.925.946-.808 0-2.055-.924-3.38-.9-1.737.025-3.341 1.013-4.233 2.566-1.806 3.132-.463 7.771 1.297 10.312.862 1.24 1.89 2.637 3.237 2.585 1.301-.052 1.793-.838 3.367-.838 1.574 0 2.02.838 3.394.812 1.397-.025 2.284-1.265 3.138-2.511.99-1.44 1.396-2.833 1.42-2.905-.031-.013-2.727-1.046-2.78-4.127zM11.178 3.044C11.888 2.18 12.37.997 12.237 0c-1.027.042-2.27.684-3.007 1.548-.659.759-1.237 1.974-1.081 3.138 1.147.088 2.32-.583 3.029-1.642z"/>
                </svg>
                Continuar com Apple
              </MtPillButton>

              {showComingSoon && (
                <p className="text-xs text-mt-rose-dark text-center font-medium">
                  Login social disponível em breve
                </p>
              )}
            </div>

            {/* Criar conta — link discreto, não compete com CTA */}
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="text-sm text-mt-rose font-semibold hover:underline underline-offset-4 pt-1"
            >
              Criar conta
            </button>
          </MtCard.Feature>

          {/* Mark pequeno como assinatura no rodapé */}
          <div className="flex justify-center mt-4">
            <Mark variant="mono" size={20} className="opacity-40" aria-label="Mother's Team" />
          </div>
        </div>
      </div>
    </MtScreen>
  );
}
