// 'comunidade' kept for backward-compat with persisted Zustand sessions
export type TabId = 'home' | 'maeIA' | 'baby' | 'rotina' | 'comunidade' | 'shopping';

export type PregnancyPhase =
  | { stage: 'pregnant'; week: number }
  | { stage: 'postpartum'; ageInDays: number };

export type EvolutionStage = 'embryo' | 'fetus-early' | 'fetus-late' | 'newborn';

export interface RoutineEntry {
  id: string;
  time: string;
  date: string;
  title: string;
  category: 'task' | 'appointment' | 'medication';
  done: boolean;
}

export interface BabyEntry {
  id: string;
  time: string;
  type: 'sleep' | 'feed' | 'diaper';
  detail: string;
}

export type Q1Answer = 'A' | 'B' | 'C' | 'D' | 'E';
export type Q2Answer = 'A' | 'B' | 'C' | 'D';
export type Q3Answer = 'A' | 'B' | 'C';
export type Q4Answer = 'A' | 'B' | 'C' | 'D';
export type Q5Answer = 'A' | 'B' | 'C' | 'D';

export interface OnboardingAnswers {
  q1: Q1Answer;
  q2: Q2Answer;
  q3: Q3Answer;
  q4: Q4Answer;
  q5: Q5Answer;
}

export type ArchetypeKey = 'maria' | 'ana' | 'ester' | 'debora' | 'rute';

export interface MotherProfile {
  answers: OnboardingAnswers;
  profileKey: string;
  profileLabel: string;
  insights: string[];
  archetypeKey: ArchetypeKey;
  archetypeLabel: string;
  archetypeAttributes: string;
}

export interface CommunityPost {
  id: string;
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';
  author: string;
  badge?: 'experiente' | 'profissional';
  content: string;
  likes: number;
  replies: number;
  time: string;
  isRepost?: boolean;
  repostFrom?: string;
  communityId?: string;
  imageUrl?: string;
}

export interface PostComment {
  id: string;
  author: string;
  content: string;
  time: string;
  likes: number;
}

export interface AppNotification {
  id: string;
  type: 'like' | 'follow' | 'comment';
  text: string;
  read: boolean;
  time: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  content: string;
  time: string;
}

export interface Chat {
  id: string;
  with: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: ChatMessage[];
}

export type CommunityColorKey = 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream';

export interface Community {
  id: string;
  name: string;
  description: string;
  category: CommunityPost['category'];
  memberCount: number;
  colorKey: CommunityColorKey;
}
