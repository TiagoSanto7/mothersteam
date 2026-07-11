import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiUser } from '../../lib/types';

interface RegisterScreenProps {
  onBack: () => void;
}

export function RegisterScreen({ onBack }: RegisterScreenProps) {
  const setAuth = useAppStore((s) => s.setAuth);
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [pregnancyStage, setPregnancyStage] = useState<'pregnant' | 'postpartum'>('pregnant');
  const [pregnancyWeek, setPregnancyWeek] = useState('');
  const [babyAgeInDays, setBabyAgeInDays] = useState('');
  const [babyName, setBabyName] = useState('');

  const step1Valid = name.trim().length > 0 && email.includes('@') && password.length >= 8;
  const step2Valid =
    pregnancyStage === 'pregnant'
      ? pregnancyWeek !== '' && Number(pregnancyWeek) >= 1 && Number(pregnancyWeek) <= 42
      : babyAgeInDays !== '' && Number(babyAgeInDays) >= 0;

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () =>
      apiFetch<{ accessToken: string; user: ApiUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          pregnancyStage,
          pregnancyWeek: pregnancyStage === 'pregnant' ? Number(pregnancyWeek) : undefined,
          babyAgeInDays: pregnancyStage === 'postpartum' ? Number(babyAgeInDays) : undefined,
          babyName: babyName.trim() || undefined,
        }),
      }),
    onSuccess: ({ accessToken, user }) => {
      setAuth(accessToken, user);
    },
  });

  const errorMsg =
    isError && error instanceof ApiError && error.status === 409
      ? 'Este e-mail já está cadastrado.'
      : isError
      ? 'Erro de conexão. Tente novamente.'
      : '';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!step2Valid) return;
    mutate();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sara-cream sm:bg-[#EDE6DC]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream flex flex-col px-8 gap-6 sm:rounded-[44px] sm:shadow-2xl overflow-y-auto pt-12 pb-8">

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={step === 2 ? () => setStep(1) : onBack}
            aria-label="Voltar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
          >
            <ChevronLeft size={20} className="text-graphite" />
          </button>
          <h1 className="text-base font-semibold text-graphite">
            {step === 1 ? 'Criar conta' : 'Dados gestacionais'}
          </h1>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 h-1 rounded-full bg-sara-gold" />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-sara-gold' : 'bg-gray-200'}`} />
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-name">Nome</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-email">E-mail</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-password">Senha</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-graphite-muted"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium text-graphite-muted mb-2">Fase gestacional</p>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(['pregnant', 'postpartum'] as const).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setPregnancyStage(stage)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      pregnancyStage === stage ? 'bg-white text-graphite shadow-sm' : 'text-graphite-muted'
                    }`}
                  >
                    {stage === 'pregnant' ? 'Grávida' : 'Pós-parto'}
                  </button>
                ))}
              </div>
            </div>

            {pregnancyStage === 'pregnant' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-week">Semana da gravidez</label>
                <input
                  id="reg-week"
                  type="number"
                  min={1}
                  max={42}
                  value={pregnancyWeek}
                  onChange={(e) => setPregnancyWeek(e.target.value)}
                  placeholder="ex: 28"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-days">Dias de vida do bebê</label>
                <input
                  id="reg-days"
                  type="number"
                  min={0}
                  value={babyAgeInDays}
                  onChange={(e) => setBabyAgeInDays(e.target.value)}
                  placeholder="ex: 45"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-baby-name">
                Nome do bebê <span className="font-normal text-graphite-muted/60">(opcional)</span>
              </label>
              <input
                id="reg-baby-name"
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="pode preencher depois"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
              />
            </div>

            {errorMsg && (
              <p role="alert" className="text-xs text-sara-terracotta text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={!step2Valid || isPending}
              className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {isPending ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
