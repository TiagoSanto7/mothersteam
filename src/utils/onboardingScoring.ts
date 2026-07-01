import type { OnboardingAnswers, MotherProfile } from '../types';

interface ProfileDefinition {
  key: string;
  label: string;
  insights: string[];
}

const PROFILES: Record<string, ProfileDefinition> = {
  exausta_sem_apoio: {
    key: 'exausta_sem_apoio',
    label: 'Exausta e Sem Apoio',
    insights: [
      'Micro-pausas de 5 minutos valem ouro — programe 3 pausas no seu dia agora',
      'Meditações guiadas de 3 minutos ajudam a resetar mesmo sem silêncio',
      'Simplifique a rotina: o que pode ser suspenso hoje sem consequências reais?',
    ],
  },
  sobrecarregada_amparada: {
    key: 'sobrecarregada_amparada',
    label: 'Sobrecarregada mas Amparada',
    insights: [
      'Delegue com clareza: liste tarefas específicas e distribua para sua rede de apoio',
      'Comunicar o cansaço é coragem — não hesite em pedir mais ajuda da sua rede',
      'Rituais de 10 minutos para si mesma fazem diferença real no seu humor',
    ],
  },
  gestante_ansiosa_inicio: {
    key: 'gestante_ansiosa_inicio',
    label: 'Gestante Ansiosa — Início da Jornada',
    insights: [
      'Checklist do 1° e 2° trimestre: o que realmente importa agora',
      'O que esperar de cada consulta pré-natal — sem surpresas no caminho',
      'Exercícios de respiração diafragmática reduzem a ansiedade em minutos',
    ],
  },
  gestante_ansiosa_reta_final: {
    key: 'gestante_ansiosa_reta_final',
    label: 'Gestante Ansiosa — Reta Final',
    insights: [
      'Monte sua mala da maternidade com a lista validada por mamães experientes',
      'Sinais reais de trabalho de parto vs. falsas contrações — saiba a diferença',
      'Os primeiros dias com o bebê: o que ninguém conta, mas você precisa saber',
    ],
  },
  preparando_grande_dia: {
    key: 'preparando_grande_dia',
    label: 'Preparando para o Grande Dia',
    insights: [
      'Exercícios seguros no 3° trimestre para preparar o corpo para o parto',
      'Como criar um plano de apoio para o pós-parto já agora',
      'Conexão com seu bebê nas últimas semanas: técnicas de vínculo pré-natal',
    ],
  },
  gestante_tranquila: {
    key: 'gestante_tranquila',
    label: 'Gestante Tranquila com Foco',
    insights: [
      'Nutrição e suplementação essencial na gestação por trimestre',
      'Exercícios seguros para gestantes: o que fazer em cada fase',
      'Prepare sua mente: o que muda na identidade ao se tornar mãe',
    ],
  },
  recuperacao_fisica: {
    key: 'recuperacao_fisica',
    label: 'Em Recuperação Física Pós-Parto',
    insights: [
      'Exercícios para diástase abdominal: sequência validada por fisioterapeutas',
      'Fortalecimento do assoalho pélvico: por onde começar com segurança',
      'Quando é seguro retornar aos exercícios após o parto?',
    ],
  },
  guerreira_sono: {
    key: 'guerreira_sono',
    label: 'Guerreira do Sono',
    insights: [
      'Janelas de sono do bebê por faixa etária: guia prático e realista',
      'Como criar uma rotina de sono que realmente funciona para vocês dois',
      'Lidar com a privação de sono: táticas que funcionam para mães',
    ],
  },
  desafio_amamentacao: {
    key: 'desafio_amamentacao',
    label: 'Enfrentando o Desafio da Amamentação',
    insights: [
      'Pega correta: os 3 ajustes que mudam tudo na amamentação',
      'Crises de amamentação: o que são, quando passam e como atravessar',
      'Consultora de amamentação: quando e como buscar suporte especializado',
    ],
  },
  mae_busca_si_mesma: {
    key: 'mae_busca_si_mesma',
    label: 'Mãe em Busca de Si Mesma',
    insights: [
      'Identidade materna: você ainda é você, além de mãe',
      'Autocuidado real: micro-momentos de reconexão que cabem na rotina',
      'Corpo pós-maternidade: ressignificação e cuidado sem culpa',
    ],
  },
  mae_solo: {
    key: 'mae_solo',
    label: 'Mãe Solo Resiliente',
    insights: [
      'Rotina funcional para mães solo: o que priorizar e o que soltar',
      'Construindo rede de apoio do zero: grupos, comunidades e serviços',
      'Autocuidado com tempo escasso: o que funciona de verdade',
    ],
  },
  mae_experiente: {
    key: 'mae_experiente',
    label: 'Mãe Experiente em Nova Fase',
    insights: [
      'Marcos de desenvolvimento após 1 ano: o que esperar agora',
      'Introdução alimentar avançada e nutrição do bebê maior',
      'Retomada de projetos pessoais e profissionais: como equilibrar',
    ],
  },
  mae_em_jornada: {
    key: 'mae_em_jornada',
    label: 'Mãe em Jornada',
    insights: [
      'Organize sua rotina diária com a timeline personalizada do app',
      'Autocuidado integrado à maternidade: pequenos passos, grande diferença',
      'A comunidade Mothers Team está aqui para você — não está sozinha',
    ],
  },
};

export function computeProfile(answers: OnboardingAnswers): MotherProfile {
  const { q1, q2, q3, q4, q5 } = answers;

  let key: string;

  if (q2 === 'D' && q3 === 'C') {
    key = 'exausta_sem_apoio';
  } else if (q2 === 'D' && q3 !== 'C') {
    key = 'sobrecarregada_amparada';
  } else if (q5 === 'C') {
    key = 'desafio_amamentacao';
  } else if (q4 === 'C' || q5 === 'B') {
    key = 'guerreira_sono';
  } else if (q1 === 'B' && (q2 === 'C' || q2 === 'D')) {
    key = 'gestante_ansiosa_reta_final';
  } else if (q1 === 'A' && (q2 === 'C' || q2 === 'D')) {
    key = 'gestante_ansiosa_inicio';
  } else if (q1 === 'C' && q4 === 'B') {
    key = 'recuperacao_fisica';
  } else if (q1 === 'B') {
    key = 'preparando_grande_dia';
  } else if (q1 === 'A') {
    key = 'gestante_tranquila';
  } else if (q1 === 'E') {
    key = 'mae_experiente';
  } else if (q3 === 'C' && (q1 === 'C' || q1 === 'D')) {
    key = 'mae_solo';
  } else if (q5 === 'A' || q5 === 'D') {
    key = 'mae_busca_si_mesma';
  } else {
    key = 'mae_em_jornada';
  }

  const def = PROFILES[key];
  return { answers, profileKey: def.key, profileLabel: def.label, insights: def.insights };
}
