import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { OnboardingAnswers, Q1Answer, Q2Answer, Q3Answer, Q4Answer, Q5Answer } from '../../types';

interface Question<T extends string> {
  id: keyof OnboardingAnswers;
  text: string;
  options: { value: T; label: string }[];
}

const QUESTIONS = [
  {
    id: 'q1' as const,
    text: 'Em qual fase da maternidade você está hoje?',
    options: [
      { value: 'A' as Q1Answer, label: 'Gestante (1° ou 2° trimestre)' },
      { value: 'B' as Q1Answer, label: 'Gestante (3° trimestre — reta final)' },
      { value: 'C' as Q1Answer, label: 'Pós-parto recente (bebê de 0 a 3 meses)' },
      { value: 'D' as Q1Answer, label: 'Pós-parto (bebê de 4 a 12 meses)' },
      { value: 'E' as Q1Answer, label: 'Mãe de bebê com mais de 1 ano' },
    ],
  },
  {
    id: 'q2' as const,
    text: 'Como você tem se sentido emocionalmente na maior parte dos dias?',
    options: [
      { value: 'A' as Q2Answer, label: 'Confiante e animada, curtindo o processo' },
      { value: 'B' as Q2Answer, label: 'Cansada, mas conseguindo lidar com a rotina' },
      { value: 'C' as Q2Answer, label: 'Ansiosa, com muitos medos e inseguranças' },
      { value: 'D' as Q2Answer, label: 'Sobrecarregada, exausta e sem tempo para mim' },
    ],
  },
  {
    id: 'q3' as const,
    text: 'Com qual frequência você pode contar com ajuda para cuidar do bebê ou das tarefas diárias?',
    options: [
      { value: 'A' as Q3Answer, label: 'Sempre tenho ajuda disponível (parceiro(a), família ou rede contratada)' },
      { value: 'B' as Q3Answer, label: 'Tenho ajuda apenas em momentos específicos ou fins de semana' },
      { value: 'C' as Q3Answer, label: 'Não tenho rede de apoio — cuido de tudo praticamente sozinha' },
    ],
  },
  {
    id: 'q4' as const,
    text: 'Qual é o seu principal objetivo de saúde e bem-estar no aplicativo agora?',
    options: [
      { value: 'A' as Q4Answer, label: 'Entender o desenvolvimento do bebê e marcos de crescimento' },
      { value: 'B' as Q4Answer, label: 'Cuidar da minha saúde física (exercícios seguros, dores, assoalho pélvico)' },
      { value: 'C' as Q4Answer, label: 'Melhorar a qualidade do sono (meu e do bebê)' },
      { value: 'D' as Q4Answer, label: 'Organizar a rotina de amamentação, alimentação e cuidados práticos' },
    ],
  },
  {
    id: 'q5' as const,
    text: 'O que mais tem tirado o seu sono ou gerado preocupação ultimamente?',
    options: [
      { value: 'A' as Q5Answer, label: 'Falta de tempo para autocuidado e identidade pós-maternidade' },
      { value: 'B' as Q5Answer, label: 'Choro do bebê, cólicas ou dificuldades com o sono dele' },
      { value: 'C' as Q5Answer, label: 'Desafios com a amamentação ou introdução alimentar' },
      { value: 'D' as Q5Answer, label: 'Mudanças no corpo, flutuações hormonais e autoestima' },
    ],
  },
] satisfies Question<string>[];

type Answers = Partial<OnboardingAnswers>;

export function OnboardingScreen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const question = QUESTIONS[step];
  const selected = answers[question.id as keyof Answers];
  const isLast = step === QUESTIONS.length - 1;

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function handleNext() {
    if (isLast && isComplete(answers)) {
      completeOnboarding(answers as OnboardingAnswers);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sara-cream sm:bg-[#EDE6DC]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream flex flex-col sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">
        <div className="px-6 pt-12 pb-4">
          <div className="flex items-center gap-2 mb-6">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-sara-gold' : 'bg-sara-linen'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-graphite-muted font-medium mb-2">
            Pergunta {step + 1} de {QUESTIONS.length}
          </p>
          <h2 className="text-base font-semibold font-serif text-graphite leading-snug">
            {question.text}
          </h2>
        </div>

        <div className="flex-1 px-6 flex flex-col gap-3 overflow-y-auto pb-4">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => selectOption(opt.value)}
              aria-pressed={selected === opt.value}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-colors ${
                selected === opt.value
                  ? 'border-sara-gold bg-sara-linen text-graphite font-medium'
                  : 'border-sara-linen bg-sara-cream text-graphite-light'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="px-6 pb-10 pt-4 flex gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 rounded-2xl border-2 border-sara-gold/40 text-sara-gold text-sm font-semibold active:scale-95 transition-transform"
            >
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!selected}
            className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
          >
            {isLast ? 'Ver meu perfil 💜' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function isComplete(a: Answers): a is OnboardingAnswers {
  return !!(a.q1 && a.q2 && a.q3 && a.q4 && a.q5);
}
