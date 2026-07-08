import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabId, PregnancyPhase, RoutineEntry, BabyEntry, OnboardingAnswers, MotherProfile, CommunityPost, Community, AppNotification, PostComment, Chat } from '../types';
import { computeProfile } from '../utils/onboardingScoring';

const today = new Date().toISOString().split('T')[0];

const SEED_ROUTINE: RoutineEntry[] = [
  { id: '1', time: '08:00', date: today, title: 'Tomar Vitamina', category: 'medication', done: false },
  { id: '2', time: '14:00', date: today, title: 'Consulta Obstetra', category: 'appointment', done: false },
  { id: '3', time: '19:00', date: today, title: 'Caminhada leve 20min', category: 'task', done: false },
];

const SEED_BABY: BabyEntry[] = [
  { id: '1', time: '09:15', type: 'sleep', detail: 'Dormiu por 45 min' },
  { id: '2', time: '10:30', type: 'feed', detail: 'Mamou 15 min (esq.)' },
  { id: '3', time: '12:00', type: 'diaper', detail: 'Fralda trocada — xixi' },
];

const SEED_POSTS: CommunityPost[] = [
  {
    id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
    content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
    likes: 24, replies: 8, time: '2h', communityId: 'gestacao-primeiro-tri',
  },
  {
    id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
    content: 'Posição correta para amamentar: costas apoiadas, bebê de frente para o peito, barriga com barriga.',
    likes: 67, replies: 12, time: '4h', communityId: 'amamentacao-apoio',
  },
  {
    id: '3', category: 'saúde mental', author: 'Juliana M.',
    content: 'Alguém mais sentiu que a solidão do puerpério é diferente de tudo? Precisava desabafar.',
    likes: 89, replies: 31, time: '5h', communityId: 'saude-mental',
  },
  {
    id: '4', category: 'pós-parto', author: 'Renata P.', badge: 'experiente',
    content: 'Cinta pós-cesárea: comecei a usar no hospital e fez diferença na recuperação.',
    likes: 45, replies: 9, time: '8h', communityId: 'pos-parto-real',
  },
  {
    id: '5', category: 'amamentação', author: 'Priscila T.',
    content: 'Meu bebê estava com dificuldade de pegar o bico. A fonoaudióloga resolveu em 2 sessões!',
    likes: 33, replies: 14, time: '10h', communityId: 'amamentacao-apoio',
  },
];

const SEED_COMMUNITIES: Community[] = [
  {
    id: 'gestacao-primeiro-tri',
    name: 'Gestantes — 1° Trimestre',
    description: 'Compartilhe as descobertas e dúvidas dos primeiros meses.',
    category: 'gestação',
    memberCount: 1840,
    colorKey: 'terracotta',
  },
  {
    id: 'reta-final',
    name: 'Reta Final',
    description: 'Para quem está nas últimas semanas e se preparando para o grande dia.',
    category: 'gestação',
    memberCount: 923,
    colorKey: 'gold',
  },
  {
    id: 'amamentacao-apoio',
    name: 'Amamentação com Apoio',
    description: 'Dúvidas, desafios e conquistas da amamentação, sem julgamentos.',
    category: 'amamentação',
    memberCount: 3210,
    colorKey: 'warm',
  },
  {
    id: 'pos-parto-real',
    name: 'Pós-parto Real',
    description: 'O quarto trimestre sem filtros: corpo, mente e recomeço.',
    category: 'pós-parto',
    memberCount: 2670,
    colorKey: 'linen',
  },
  {
    id: 'saude-mental',
    name: 'Saúde Mental na Maternidade',
    description: 'Espaço seguro para falar sobre ansiedade, depressão pós-parto e bem-estar.',
    category: 'saúde mental',
    memberCount: 4120,
    colorKey: 'cream',
  },
  {
    id: 'maes-solo',
    name: 'Mães Solo',
    description: 'Força, troca e comunidade para quem caminha pela maternidade sozinha.',
    category: 'pós-parto',
    memberCount: 1560,
    colorKey: 'terracotta',
  },
];

const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: '1', type: 'like',    text: 'Ana curtiu sua publicação na comunidade', read: false, time: '5min' },
  { id: '2', type: 'follow',  text: 'Você tem 2 novas seguidoras esta semana', read: false, time: '1h' },
  { id: '3', type: 'comment', text: 'Maria comentou no seu desabafo: "Você não está sozinha 💜"', read: false, time: '3h' },
];

const SEED_CHATS: Chat[] = [
  {
    id: '1',
    with: 'Ana Oliveira',
    lastMessage: 'Adorei seu post sobre amamentação! 💜',
    time: '5min',
    unread: 2,
    messages: [
      { id: '1', from: 'Ana Oliveira', content: 'Oi! Vi seu post na comunidade e me identifiquei muito 💜', time: '14:20' },
      { id: '2', from: 'Ana Oliveira', content: 'Adorei seu post sobre amamentação! 💜', time: '14:23' },
    ],
  },
  {
    id: '2',
    with: 'Fernanda S.',
    lastMessage: 'Boa sorte no parto! Você consegue 🌸',
    time: '2h',
    unread: 0,
    messages: [
      { id: '1', from: 'Fernanda S.', content: 'Vi que você está na reta final. Como está sendo?', time: '12:10' },
      { id: '2', from: 'Mariana', content: 'Ansiosa mas animada! Obrigada pelo apoio 🥰', time: '12:15' },
      { id: '3', from: 'Fernanda S.', content: 'Boa sorte no parto! Você consegue 🌸', time: '12:16' },
    ],
  },
  {
    id: '3',
    with: 'Dra. Carla Lima',
    lastMessage: 'Pode me chamar a qualquer momento!',
    time: '1d',
    unread: 0,
    messages: [
      { id: '1', from: 'Mariana', content: 'Dra. Carla, tenho uma dúvida sobre amamentação', time: '10:00' },
      { id: '2', from: 'Dra. Carla Lima', content: 'Claro! Me conte o que está acontecendo 😊', time: '10:05' },
      { id: '3', from: 'Dra. Carla Lima', content: 'Pode me chamar a qualquer momento!', time: '10:06' },
    ],
  },
];

const SEED_POST_COMMENTS: Record<string, PostComment[]> = {
  '1': [
    { id: '1', author: 'Juliana M.', content: 'Gengibre salvou minha vida no primeiro trimestre! 🙏', time: '1h', likes: 5 },
    { id: '2', author: 'Renata P.', content: 'Eu tomei chá de gengibre também, ajuda muito!', time: '30min', likes: 2 },
  ],
  '3': [
    { id: '1', author: 'Ana Oliveira', content: 'Você não está sozinha! Passei exatamente por isso 💜', time: '4h', likes: 12 },
    { id: '2', author: 'Dra. Carla Lima', content: 'O puerpério é muito desafiador. Procure apoio profissional se precisar.', time: '3h', likes: 8 },
    { id: '3', author: 'Fernanda S.', content: 'Estou aqui se precisar conversar ❤️', time: '2h', likes: 6 },
  ],
};

interface AppState {
  // Auth
  isLoggedIn: boolean;
  onboardingDone: boolean;
  motherProfile: MotherProfile | null;
  // App
  activeTab: TabId;
  phase: PregnancyPhase;
  motherName: string;
  babyName: string;
  selectedDate: string;
  routineEntries: RoutineEntry[];
  babyEntries: BabyEntry[];
  diaperCount: number;
  lastFeedSide: 'left' | 'right';
  communityPosts: CommunityPost[];
  notifications: AppNotification[];
  chats: Chat[];
  postComments: Record<string, PostComment[]>;
  communities: Community[];
  followedCommunityIds: string[];
  // Actions — Communities
  joinCommunity: (id: string) => void;
  leaveCommunity: (id: string) => void;
  // Actions — Auth
  login: (email: string, password: string) => boolean;
  logout: () => void;
  completeOnboarding: (answers: OnboardingAnswers) => void;
  resetOnboarding: () => void;
  // Actions — App
  setActiveTab: (tab: TabId) => void;
  setSelectedDate: (date: string) => void;
  toggleRoutineDone: (id: string) => void;
  addRoutineEntry: (entry: Omit<RoutineEntry, 'id'>) => void;
  incrementDiaper: () => void;
  toggleFeedSide: () => void;
  setFeedSide: (side: 'left' | 'right') => void;
  addBabyEntry: (entry: BabyEntry) => void;
  addCommunityPost: (post: Omit<CommunityPost, 'id' | 'likes' | 'replies' | 'time'>) => void;
  markAllNotificationsRead: () => void;
  // Actions — Post
  likePost: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  repost: (post: CommunityPost) => void;
  // Actions — Chat
  sendMessage: (chatId: string, content: string) => void;
  shareToChat: (chatId: string, content: string, sharedPost?: { id: string; author: string; excerpt: string; imageUrl?: string }) => void;
  markChatRead: (chatId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth state
      isLoggedIn: false,
      onboardingDone: false,
      motherProfile: null,
      // App state
      activeTab: 'home',
      phase: { stage: 'pregnant', week: 28 },
      motherName: 'Mariana',
      babyName: 'Léo',
      selectedDate: new Date().toISOString().split('T')[0],
      routineEntries: SEED_ROUTINE,
      babyEntries: SEED_BABY,
      diaperCount: 0,
      lastFeedSide: 'left',
      communityPosts: SEED_POSTS,
      notifications: SEED_NOTIFICATIONS,
      chats: SEED_CHATS,
      postComments: SEED_POST_COMMENTS,
      communities: SEED_COMMUNITIES,
      followedCommunityIds: ['amamentacao-apoio'],
      // Auth actions
      login: (email, password) => {
        if (email === 'navegador@mothersteam' && password === 'admin@mothersteam') {
          set({ isLoggedIn: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isLoggedIn: false }),
      completeOnboarding: (answers) => {
        const profile = computeProfile(answers);
        set({ onboardingDone: true, motherProfile: profile });
      },
      resetOnboarding: () => set({ onboardingDone: false, motherProfile: null }),
      // App actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleRoutineDone: (id) =>
        set((s) => ({
          routineEntries: s.routineEntries.map((e) =>
            e.id === id ? { ...e, done: !e.done } : e,
          ),
        })),
      addRoutineEntry: (entry) =>
        set((s) => ({
          routineEntries: [
            ...s.routineEntries,
            { ...entry, id: Date.now().toString() },
          ],
        })),
      incrementDiaper: () =>
        set((s) => ({
          diaperCount: s.diaperCount + 1,
          babyEntries: [
            ...s.babyEntries,
            {
              id: Date.now().toString(),
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              type: 'diaper',
              detail: 'Fralda trocada',
            },
          ],
        })),
      toggleFeedSide: () =>
        set((s) => ({ lastFeedSide: s.lastFeedSide === 'left' ? 'right' : 'left' })),
      setFeedSide: (side) => set({ lastFeedSide: side }),
      addBabyEntry: (entry) =>
        set((s) => ({ babyEntries: [...s.babyEntries, entry] })),
      addCommunityPost: (post) =>
        set((s) => ({
          communityPosts: [
            {
              ...post,
              id: Date.now().toString(),
              likes: 0,
              replies: 0,
              time: 'agora',
            },
            ...s.communityPosts,
          ],
        })),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      // Post actions
      likePost: (postId) =>
        set((s) => ({
          communityPosts: s.communityPosts.map((p) =>
            p.id === postId ? { ...p, likes: p.likes + 1 } : p
          ),
        })),
      addComment: (postId, content) =>
        set((s) => ({
          postComments: {
            ...s.postComments,
            [postId]: [
              ...(s.postComments[postId] ?? []),
              {
                id: Date.now().toString(),
                author: s.motherName,
                content,
                time: 'agora',
                likes: 0,
              },
            ],
          },
          communityPosts: s.communityPosts.map((p) =>
            p.id === postId ? { ...p, replies: p.replies + 1 } : p
          ),
        })),
      repost: (post) =>
        set((s) => ({
          communityPosts: [
            {
              ...post,
              id: Date.now().toString(),
              author: s.motherName,
              time: 'agora',
              likes: 0,
              replies: 0,
              isRepost: true,
              repostFrom: post.author,
            },
            ...s.communityPosts,
          ],
        })),
      // Chat actions
      sendMessage: (chatId, content) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  lastMessage: content,
                  time: 'agora',
                  messages: [
                    ...c.messages,
                    {
                      id: Date.now().toString(),
                      from: s.motherName,
                      content,
                      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    },
                  ],
                }
              : c
          ),
        })),
      shareToChat: (chatId, content, sharedPost) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  lastMessage: content || (sharedPost ? `Post de ${sharedPost.author}` : ''),
                  time: 'agora',
                  messages: [
                    ...c.messages,
                    {
                      id: Date.now().toString(),
                      from: s.motherName,
                      content,
                      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                      ...(sharedPost ? { sharedPost } : {}),
                    },
                  ],
                }
              : c
          ),
        })),
      markChatRead: (chatId) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId ? { ...c, unread: 0 } : c
          ),
        })),
      joinCommunity: (id) =>
        set((s) => ({
          followedCommunityIds: s.followedCommunityIds.includes(id)
            ? s.followedCommunityIds
            : [...s.followedCommunityIds, id],
        })),
      leaveCommunity: (id) =>
        set((s) => ({
          followedCommunityIds: s.followedCommunityIds.filter((cid) => cid !== id),
        })),
    }),
    { name: 'mothers-team-v2' },
  ),
);
