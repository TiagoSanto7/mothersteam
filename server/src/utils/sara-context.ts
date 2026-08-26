// server/src/utils/sara-context.ts

const MOOD_LABELS: Record<string, string> = {
  A: 'Confiante e animada',
  B: 'Cansada mas lidando',
  C: 'Ansiosa, com medos',
  D: 'Sobrecarregada, exausta',
}

const SUPPORT_LABELS: Record<string, string> = {
  A: 'Tem ajuda sempre que precisa',
  B: 'Tem ajuda em momentos específicos',
  C: 'Cuida de quase tudo sozinha',
}

const GOAL_LABELS: Record<string, string> = {
  A: 'Entender o desenvolvimento do bebê',
  B: 'Cuidar da saúde física',
  C: 'Melhorar o sono',
  D: 'Organizar a rotina',
}

const CONCERN_LABELS: Record<string, string> = {
  A: 'Autocuidado e identidade',
  B: 'Choro, cólicas e sono do bebê',
  C: 'Amamentação e alimentação',
  D: 'Corpo, hormônios e autoestima',
}

interface UserContext {
  name: string
  babyName: string | null
  babyAgeInDays: number | null
  pregnancyStage: string
  archetypeKey: string | null
  mood: string | null
  supportNetwork: string | null
  goal: string | null
  concern: string | null
}

export function buildSaraContextBlock(user: UserContext): string {
  const babyInfo = user.babyName
    ? `${user.babyName}, ${user.babyAgeInDays ?? '?'} dias`
    : `não informado`

  return [
    `Contexto da mãe nesta sessão:`,
    `Nome: ${user.name} | Bebê: ${babyInfo}`,
    `Fase: ${user.pregnancyStage} | Arquétipo: ${user.archetypeKey ?? 'não definido'}`,
    `Humor hoje: ${user.mood ? (MOOD_LABELS[user.mood] ?? user.mood) : 'não informado'}`,
    `Rede de apoio: ${user.supportNetwork ? (SUPPORT_LABELS[user.supportNetwork] ?? user.supportNetwork) : 'não informado'}`,
    `Objetivo: ${user.goal ? (GOAL_LABELS[user.goal] ?? user.goal) : 'não informado'}`,
    `Preocupação principal: ${user.concern ? (CONCERN_LABELS[user.concern] ?? user.concern) : 'não informado'}`,
  ].join('\n')
}

const SARA_PERSONA = `Você é Sara, assistente de saúde materno-infantil do Mother's Team.
Seu tom é caloroso, direto e em português brasileiro informal — mas sem gírias forçadas.
Você acolhe o que a mãe sente antes de dar a resposta prática.
Respostas curtas por padrão (3-5 frases). Se pedirem mais detalhe, expanda.
Escreva em texto corrido, como uma conversa — nunca use listas com marcadores.`

const SARA_RULES = `Você nunca diagnostica nem prescreve medicamentos.
Em dúvidas médicas específicas, oriente a consultar pediatra ou obstetra.
Em sinais de crise (depressão pós-parto, pensamentos negativos, automutilação): acolha com cuidado e indique o CVV (188) ou um profissional de saúde mental — sem dramatizar.
Não faça promessas de resultado como "isso vai curar" ou "certamente vai funcionar".`

export function buildSaraSystemPrompt(user: UserContext): string {
  return [SARA_PERSONA, SARA_RULES, buildSaraContextBlock(user)].join('\n\n')
}
