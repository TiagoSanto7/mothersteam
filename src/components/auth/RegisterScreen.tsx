import { useState, useEffect, type FormEvent } from 'react';
import { Eye, EyeOff, ChevronLeft, Check, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiUser } from '../../lib/types';
import { StepBebes, type StepBebesValue } from './steps/StepBebes';
import { StepOutrosFilhos } from './steps/StepOutrosFilhos';
import { StepHumor, type StepHumorValue } from './steps/StepHumor';
import { StepObjetivo, type StepObjetivoValue } from './steps/StepObjetivo';
import type { OtherChild } from '../../types';

interface RegisterScreenProps {
  onBack: () => void;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
type StepIndex = 1 | 2 | 3 | 4 | 5;

export function RegisterScreen({ onBack }: RegisterScreenProps) {
  const setAuth = useAppStore((s) => s.setAuth);
  const [step, setStep] = useState<StepIndex>(1);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pregnancyStage, setPregnancyStage] = useState<'pregnant' | 'postpartum'>('pregnant');
  const [pregnancyWeek, setPregnancyWeek] = useState('');
  const [babyAgeInDays, setBabyAgeInDays] = useState('');
  const [babyBirthDate, setBabyBirthDate] = useState('');
  const [expectedBirthDate, setExpectedBirthDate] = useState('');
  const [motherBirthDate, setMotherBirthDate] = useState('');

  const [bebesState, setBebesState] = useState<StepBebesValue>({
    hasMultiples: false,
    babies: [{ name: '' }],
  });
  const [outrosFilhos, setOutrosFilhos] = useState<OtherChild[]>([]);
  const [humorState, setHumorState] = useState<StepHumorValue>({ mood: null, supportNetwork: null });
  const [objetivoState, setObjetivoState] = useState<StepObjetivoValue>({ goal: null, concern: null });

  // Debounced username availability check
  useEffect(() => {
    const cleaned = username.toLowerCase().replace(/\s/g, '');
    if (!cleaned) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,30}$/.test(cleaned)) { setUsernameStatus('invalid'); return; }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { available } = await apiFetch<{ available: boolean }>(`/auth/check-username?username=${cleaned}`);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        // Network error — allow proceeding; server validates on submit
        setUsernameStatus('available');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const usernameOk = usernameStatus === 'available' || (username === '' && usernameStatus === 'idle');
  const step1Valid =
    name.trim().length > 0 &&
    email.includes('@') &&
    password.length >= 8 &&
    usernameOk;

  const today = new Date().toISOString().split('T')[0];
  const minExpected = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const maxExpected = new Date(Date.now() + 42 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const dadosGestacionaisValid =
    pregnancyStage === 'pregnant'
      ? expectedBirthDate !== '' || (pregnancyWeek !== '' && Number(pregnancyWeek) >= 1 && Number(pregnancyWeek) <= 42)
      : babyBirthDate !== '' || (babyAgeInDays !== '' && Number(babyAgeInDays) >= 0);
  const bebesValid = !bebesState.hasMultiples || bebesState.babies.length >= 2;
  const step2Valid = dadosGestacionaisValid && bebesValid;

  const step3Valid =
    outrosFilhos.length === 0 ||
    outrosFilhos.every((c) => c.name.trim() && c.birthDate);

  const step4Valid = humorState.mood !== null && humorState.supportNetwork !== null;

  const step5Valid =
    objetivoState.goal !== null && objetivoState.concern !== null && acceptedTerms;

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => {
      const firstBabyName = bebesState.babies[0]?.name?.trim();
      return apiFetch<{ accessToken: string; refreshToken: string; user: ApiUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim() || undefined,
          email: email.trim(),
          password,
          pregnancyStage,
          pregnancyWeek: pregnancyStage === 'pregnant' && !expectedBirthDate ? Number(pregnancyWeek) || undefined : undefined,
          babyAgeInDays: pregnancyStage === 'postpartum' && !babyBirthDate ? Number(babyAgeInDays) || undefined : undefined,
          babyName: firstBabyName || undefined,
          expectedBirthDate: pregnancyStage === 'pregnant' && expectedBirthDate ? expectedBirthDate : undefined,
          babyBirthDate: pregnancyStage === 'postpartum' && babyBirthDate ? babyBirthDate : undefined,
          motherBirthDate: motherBirthDate || undefined,
          acceptedTerms: true,
          hasMultiples: bebesState.hasMultiples,
          babies: bebesState.hasMultiples
            ? bebesState.babies.map((b) => ({ name: b.name?.trim() || undefined }))
            : firstBabyName
              ? [{ name: firstBabyName }]
              : undefined,
          otherChildren: outrosFilhos
            .filter((c) => c.name.trim() && c.birthDate)
            .map((c) => ({ name: c.name.trim(), birthDate: c.birthDate })),
          mood: humorState.mood ?? undefined,
          supportNetwork: humorState.supportNetwork ?? undefined,
          goal: objetivoState.goal ?? undefined,
          concern: objetivoState.concern ?? undefined,
        }),
      });
    },
    onSuccess: ({ accessToken, refreshToken, user }) => {
      setAuth(accessToken, user, refreshToken);
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
    if (!step5Valid) return;
    mutate();
  }

  function getUsernameHelp() {
    if (usernameStatus === 'checking') return { text: 'Verificando…', color: 'text-mt-muted' };
    if (usernameStatus === 'available') return { text: '@' + username + ' disponível', color: 'text-green-600' };
    if (usernameStatus === 'taken') return { text: 'Este @ já está em uso', color: 'text-mt-rose-dark' };
    if (usernameStatus === 'invalid') return { text: 'Use letras minúsculas, números e _  (mín. 3)', color: 'text-mt-rose-dark' };
    return null;
  }

  const usernameHelp = getUsernameHelp();
  const usernameIcon =
    usernameStatus === 'available' ? <Check size={14} className="text-green-600" /> :
    usernameStatus === 'taken' || usernameStatus === 'invalid' ? <X size={14} className="text-mt-rose-dark" /> :
    null;

  const headerTitle =
    step === 1 ? 'Criar conta'
    : step === 2 ? 'Sobre a gestação'
    : step === 3 ? 'Outros filhos'
    : step === 4 ? 'Como você está?'
    : 'Objetivos e termos';

  return (
    <div className="min-h-screen flex items-center justify-center bg-mt-cream sm:bg-[#EDE6DC]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-mt-cream flex flex-col px-8 gap-6 sm:rounded-[44px] sm:shadow-2xl overflow-y-auto pt-12 pb-8">

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? onBack() : setStep((s) => (s - 1) as StepIndex))}
            aria-label="Voltar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mt-linen"
          >
            <ChevronLeft size={20} className="text-mt-charcoal" />
          </button>
          <h1 className="text-base font-semibold text-mt-charcoal">{headerTitle}</h1>
        </div>

        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`flex-1 h-1 rounded-full ${step >= n ? 'bg-mt-rose' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mt-muted" htmlFor="reg-name">Nome</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mt-muted" htmlFor="reg-username">
                Apelido (@)
                <span className="font-normal text-mt-muted/60 ml-1">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mt-muted pointer-events-none">@</span>
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="seunome"
                  maxLength={30}
                  className="w-full pl-8 pr-10 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
                />
                {usernameIcon && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">{usernameIcon}</span>
                )}
              </div>
              {usernameHelp && (
                <p className={`text-[11px] ${usernameHelp.color} px-1`}>{usernameHelp.text}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mt-muted" htmlFor="reg-email">E-mail</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mt-muted" htmlFor="reg-password">Senha</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-mt-muted"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium text-mt-muted mb-2">Fase gestacional</p>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(['pregnant', 'postpartum'] as const).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setPregnancyStage(stage)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      pregnancyStage === stage ? 'bg-white text-mt-charcoal shadow-sm' : 'text-mt-muted'
                    }`}
                  >
                    {stage === 'pregnant' ? 'Grávida' : 'Pós-parto'}
                  </button>
                ))}
              </div>
            </div>

            {pregnancyStage === 'pregnant' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-mt-muted" htmlFor="reg-expected">
                  Data prevista do parto
                </label>
                <input
                  id="reg-expected"
                  type="date"
                  min={minExpected}
                  max={maxExpected}
                  value={expectedBirthDate}
                  onChange={(e) => { setExpectedBirthDate(e.target.value); setPregnancyWeek(''); }}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal focus:outline-none focus:border-mt-rose"
                />
                {!expectedBirthDate && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-xs font-medium text-mt-muted" htmlFor="reg-week">
                      Ou informe a semana da gravidez
                    </label>
                    <input
                      id="reg-week"
                      type="number"
                      min={1}
                      max={42}
                      value={pregnancyWeek}
                      onChange={(e) => setPregnancyWeek(e.target.value)}
                      placeholder="ex: 28"
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-mt-muted" htmlFor="reg-baby-birth">
                  Data de nascimento do bebê
                </label>
                <input
                  id="reg-baby-birth"
                  type="date"
                  max={today}
                  value={babyBirthDate}
                  onChange={(e) => { setBabyBirthDate(e.target.value); setBabyAgeInDays(''); }}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal focus:outline-none focus:border-mt-rose"
                />
                {!babyBirthDate && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-xs font-medium text-mt-muted" htmlFor="reg-days">
                      Ou informe os dias de vida do bebê
                    </label>
                    <input
                      id="reg-days"
                      type="number"
                      min={0}
                      value={babyAgeInDays}
                      onChange={(e) => setBabyAgeInDays(e.target.value)}
                      placeholder="ex: 45"
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mt-muted" htmlFor="reg-mother-birth">
                Sua data de nascimento <span className="font-normal text-mt-muted/60">(opcional)</span>
              </label>
              <input
                id="reg-mother-birth"
                type="date"
                max={today}
                value={motherBirthDate}
                onChange={(e) => setMotherBirthDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal focus:outline-none focus:border-mt-rose"
              />
            </div>

            <StepBebes value={bebesState} onChange={setBebesState} />

            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <StepOutrosFilhos value={outrosFilhos} onChange={setOutrosFilhos} />
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={!step3Valid}
              className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              Continuar →
            </button>
            {outrosFilhos.length === 0 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-mt-muted text-xs underline"
              >
                Pular esta etapa
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <StepHumor value={humorState} onChange={setHumorState} />
            <button
              type="button"
              onClick={() => setStep(5)}
              disabled={!step4Valid}
              className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 5 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <StepObjetivo value={objetivoState} onChange={setObjetivoState} />

            <label className="flex items-start gap-2 cursor-pointer">
              <div className="mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${acceptedTerms ? 'bg-mt-rose border-mt-rose' : 'border-gray-300 bg-white'}`}>
                  {acceptedTerms && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </div>
              <p className="text-xs text-mt-muted leading-relaxed">
                Li e aceito os{' '}
                <a href="/termos.html" target="_blank" className="text-mt-rose underline underline-offset-2">Termos de Uso</a>
                {' '}e a{' '}
                <a href="/privacidade.html" target="_blank" className="text-mt-rose underline underline-offset-2">Política de Privacidade</a>
                {' '}(LGPD)
              </p>
            </label>

            {errorMsg && (
              <p role="alert" className="text-xs text-mt-rose-dark text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={!step5Valid || isPending}
              className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {isPending ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
