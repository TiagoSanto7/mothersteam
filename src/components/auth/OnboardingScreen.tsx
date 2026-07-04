import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// scene index = step + 1 (step 0 → scene-1, step 4 → scene-5)
const QUESTION_VIDEOS: Record<number, string> = {
  0: '/videos/onboarding-scene-1.mp4',
  1: '/videos/onboarding-scene-2.mp4',
  2: '/videos/onboarding-scene-3.mp4',
  3: '/videos/onboarding-scene-4.mp4',
  4: '/videos/onboarding-scene-5.mp4',
};

type Answers = Partial<OnboardingAnswers>;

export function OnboardingScreen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  // -1 = intro  |  0-4 = Q1–Q5  |  5 = closing
  const [step, setStep] = useState<number>(-1);
  const [answers, setAnswers] = useState<Answers>({});
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [closingReady, setClosingReady] = useState(false);
  const questionVideoRef = useRef<HTMLVideoElement>(null);

  const isIntro = step === -1;
  const isClosing = step === 5;
  const question = (!isIntro && !isClosing) ? QUESTIONS[step] : null;
  const selected = question ? answers[question.id as keyof Answers] : undefined;
  const isLastQuestion = step === QUESTIONS.length - 1;

  function revealOptions() {
    questionVideoRef.current?.pause();
    setOptionsVisible(true);
  }

  function selectOption(value: string) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function handleNext() {
    setOptionsVisible(false);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setOptionsVisible(true); // skip video replay on return
    setStep((s) => s - 1);
  }

  // ── Intro: scene-0 em tela cheia ──────────────────────────
  if (isIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1C1510] sm:bg-[#EDE6DC]">
        <div className="relative w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-[#1C1510] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
          <video
            src="/videos/onboarding-scene-0.mp4"
            autoPlay
            playsInline
            onEnded={() => setStep(0)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <button
            onClick={() => setStep(0)}
            className="absolute bottom-12 right-6 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 text-xs font-medium active:scale-95 transition-transform"
          >
            Pular →
          </button>
        </div>
      </div>
    );
  }

  // ── Closing: scene-6 + painel que sobe ao terminar ────────
  if (isClosing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1C1510] sm:bg-[#EDE6DC]">
        <div className="relative w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-[#1C1510] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
          <video
            src="/videos/onboarding-scene-6.mp4"
            autoPlay
            playsInline
            onEnded={() => setClosingReady(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {!closingReady && (
            <button
              onClick={() => setClosingReady(true)}
              className="absolute bottom-12 right-6 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 text-xs font-medium active:scale-95 transition-transform"
            >
              Pular →
            </button>
          )}

          <AnimatePresence>
            {closingReady && (
              <motion.div
                initial={{ y: 120, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute bottom-0 left-0 right-0 bg-sara-cream rounded-t-3xl px-6 pt-6 pb-12 flex flex-col items-center gap-5"
              >
                <p className="text-base font-serif font-semibold text-graphite text-center leading-snug">
                  ✦ Seu perfil está pronto!
                </p>
                <motion.button
                  onClick={() => completeOnboarding(answers as OnboardingAnswers)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="w-full py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
                >
                  Ver meu perfil ✦
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Perguntas Q1–Q5: vídeo fixo no topo + opções ─────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1510] sm:bg-[#EDE6DC]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] flex flex-col sm:rounded-[44px] sm:shadow-2xl overflow-hidden bg-[#1C1510]">

        {/* Vídeo da Sara — para no último frame ao terminar */}
        <div className="relative flex-shrink-0 h-[42%]">
          <video
            ref={questionVideoRef}
            key={step}
            src={QUESTION_VIDEOS[step]}
            autoPlay={!optionsVisible}
            playsInline
            onEnded={revealOptions}
            className="w-full h-full object-cover"
          />
          {!optionsVisible && (
            <button
              onClick={revealOptions}
              className="absolute bottom-3 right-4 px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full text-white/70 text-[11px] font-medium active:scale-95 transition-transform"
            >
              Pular →
            </button>
          )}
        </div>

        {/* Painel cream com perguntas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-sara-cream rounded-t-3xl">

          {/* Barra de progresso + texto da pergunta */}
          <div className="px-6 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-6">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-sara-gold' : 'bg-sara-linen'}`}
                />
              ))}
            </div>
            <p className="text-xs text-graphite-muted font-medium mb-2">
              Pergunta {step + 1} de {QUESTIONS.length}
            </p>
            <AnimatePresence mode="wait">
              <motion.h2
                key={`q-${step}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-base font-semibold font-serif text-graphite leading-snug"
              >
                {question!.text}
              </motion.h2>
            </AnimatePresence>
          </div>

          {/* Opções — aparecem quando vídeo termina ou skip */}
          <AnimatePresence>
            {optionsVisible && (
              <motion.div
                key={`opts-${step}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="flex-1 px-6 flex flex-col gap-3 overflow-y-auto pb-4"
              >
                {question!.options.map((opt, index) => (
                  <motion.button
                    key={opt.value}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.3 }}
                    onClick={() => selectOption(opt.value)}
                    whileTap={{ scale: 0.97 }}
                    aria-pressed={selected === opt.value}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-colors ${
                      selected === opt.value
                        ? 'border-sara-gold bg-sara-linen text-graphite font-medium'
                        : 'border-sara-linen bg-white/70 text-graphite-light'
                    }`}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navegação */}
          {optionsVisible && (
            <div className="px-6 pb-10 pt-4 flex gap-3 flex-shrink-0">
              {step > 0 && (
                <motion.button
                  onClick={handleBack}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="flex-1 py-3 rounded-2xl border-2 border-sara-gold/40 text-sara-gold text-sm font-semibold"
                >
                  Voltar
                </motion.button>
              )}
              <motion.button
                onClick={handleNext}
                disabled={!selected}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
              >
                {isLastQuestion ? 'Continuar' : 'Continuar'}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

