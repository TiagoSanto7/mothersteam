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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () =>
      apiFetch<{ accessToken: string; refreshToken: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
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
    <MtScreen variant="gradient" className="flex items-center justify-center px-6 py-6">
      <div className="w-full flex justify-center">
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
              <Mark variant="gradient" size={48} aria-label="Mother's Team" />
              <Wordmark variant="rose" size="md" className="!h-[52px] w-auto mt-[10px]" />
              <img
                src={tagline}
                alt="quem é MÃE sabe."
                className="w-[115px] h-auto mt-1"
              />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
              <MtInput
                id="identifier"
                label="E-mail ou usuário"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="seu@email.com ou seunome"
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
                disabled={!identifier || !password || isPending}
                className="w-full mt-1"
              >
                {isPending ? 'Entrando…' : 'Entrar'}
              </MtPillButton>
            </form>

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
