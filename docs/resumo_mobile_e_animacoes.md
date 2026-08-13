# Resumo Mobile: Arquitetura, Animações e Transições - Mother's Team

Este documento consolida a arquitetura atual da interface mobile do aplicativo **Mother's Team**, detalha onde e como as animações estão implementadas atualmente com [Framer Motion](https://www.framer.com/motion/) e serve como base de discussão para futuras melhorias de UX/UI, transições de tela e micro-interações de alto nível.

---

## 📱 1. Arquitetura da Interface Mobile

O Mother's Team é estruturado como um aplicativo híbrido usando **Capacitor** com **React + TypeScript + Tailwind CSS**. Ele é projetado para rodar em celulares (Android/iOS) e também possui uma simulação visual no Desktop.

### Casca do Aplicativo (Shell)
O ponto de entrada e o gerenciamento de visualizações estão centralizados em dois arquivos principais:

*   **[App.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/App.tsx):**
    *   Gerencia o estado de sessão (`isLoggedIn`), onboarding e abas ativas.
    *   Decide entre renderizar o `WebLayout` (telas maiores) ou o `MobileShell` (telas mobile).
    *   Controla a exibição de overlays globais (Configurações, Chat, Perfil, Detalhe de Comunidade/Post, Notificações).
*   **[MobileShell.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/layout/MobileShell.tsx):**
    *   Simula o frame de um smartphone (`sm:w-[390px] sm:h-[844px]`) no Desktop com efeito de sombra e cantos arredondados.
    *   Possui a estrutura clássica de app: `AppHeader` + `main` (com rolagem independente) + `BottomTabBar` + `SideDrawer` (menu lateral).

---

## 🎬 2. Mapeamento de Animações Existentes

Atualmente, o projeto utiliza a biblioteca **Framer Motion** para enriquecer a experiência do usuário em fluxos específicos:

### A. Fluxo de Recepção / Boas-vindas (Onboarding)
O fluxo de entrada do aplicativo foca bastante na ambientação e na personificação da assistente de IA, a **Sara**:
*   **[SaraSays.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/reception/SaraSays.tsx) & [SaraAparece.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/reception/beats/SaraAparece.tsx):** Fade-ins e transições suaves de texto.
*   **[OrbeVisual.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/reception/OrbeVisual.tsx):** Animações orgânicas simulando a pulsação ou "respiração" da orbe da assistente de IA.
*   **[BemVinda.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/reception/beats/BemVinda.tsx), [PreparandoTudo.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/reception/beats/PreparandoTudo.tsx) & [Presente.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/reception/beats/Presente.tsx):** Efeitos de revelação por etapas durante a configuração inicial do app.

### B. Navegação Lateral (SideDrawer)
*   **[SideDrawer.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/layout/SideDrawer.tsx):** 
    *   Usa `<AnimatePresence>` para transição suave de entrada e saída.
    *   O overlay escuro faz um fade-in gradual (`opacity: 0` para `1`).
    *   O menu lateral desliza suavemente a partir do lado esquerdo usando uma animação baseada em física de mola (`type: 'spring', stiffness: 300, damping: 30`).

### C. Telas e Interações Principais
*   **Mãe IA ([MaeIAScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/maeIA/MaeIAScreen.tsx)):**
    *   Pulsar da bolinha de status de fala e escuta (`motion.div` com loop infinito alterando escala e opacidade).
    *   Feedback de clique suave no botão de envio (`whileTap={{ scale: 0.97 }}`).
*   **Componentes de Dashboard e Perfil:**
    *   Uso pontual de transições em [HomeScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/home/HomeScreen.tsx), [WeekCalendar.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/home/WeekCalendar.tsx) e [BabyTimeline.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/baby/BabyTimeline.tsx) para dar leveza no surgimento ou expansão de itens.
*   **Modais e Bottom Sheets:**
    *   [SavedVersesScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/home/SavedVersesScreen.tsx) e [ShareMomentoSheet.tsx](file:///c:/Users/User/OneDrive/Desktop/SANTTI/Portif%C3%B3lio/mothers-team/src/components/home/ShareMomentoSheet.tsx) usam animações de slide-up e fade para simular o comportamento de folhas nativas (Bottom Sheets).

---

## 💬 3. Tópicos de Discussão para Refinamento Visual

Abaixo estão os pontos que podemos priorizar para elevar a experiência mobile do aplicativo a um padrão premium:

| Área | Estado Atual | Proposta de Melhoria / Discussão |
| :--- | :--- | :--- |
| **Transição entre Abas** | Mudança instantânea de tela sem transição visual em `App.tsx` | Implementar transição de fade-through ou slide horizontal suave usando `<AnimatePresence mode="wait">` ao trocar de aba no `BottomTabBar`. |
| **Sobreposição de Telas (Subtelas)** | Telas como `SettingsScreen`, `NotificationsScreen` e `ProfileScreen` aparecem instantaneamente ou com fades simples sobre o layout principal. | Implementar uma transição de **push lateral** (estilo nativo do iOS/Android) onde a tela anterior desliza levemente para o fundo e a nova tela desliza da direita para a esquerda. |
| **Gestos de Fechamento (Swipe-to-Dismiss)** | Fechamento de modais e chats depende unicamente de clicar no botão "Voltar" (`onBack`). | Adicionar suporte a gestos de arrastar para baixo ou arrastar da borda esquerda para fechar a tela (usando `drag="y"` ou `drag="x"` do Framer Motion). |
| **Orbe de Voz da Mãe IA** | Uma bolinha pequena pisca na barra inferior quando o áudio está ativo. | Criar uma orbe interativa no centro da tela (ou mais proeminente) com ondas senoidais flutuantes que reagem dinamicamente à voz da mãe ou às respostas da IA (efeito Siri/Alexa). |
| **Micro-interações de Botão (Haptics & Feedback)** | Botões e ícones reagem de forma estática ao toque. | Adicionar animações de bounce e rotação sutil ao selecionar itens da `BottomTabBar` (ex: o ícone do coração pulsar uma vez ao ser clicado). |
| **Estados de Carregamento** | Telas em carregamento exibem loaders circulares simples ou estáticos. | Criar **Skeleton Screen Loaders** dinâmicos que pulsam suavemente com gradientes em tons pastéis de pêssego/ouro. |

---

## 🛠️ Próximos Passos Sugeridos

1.  **Definir as Prioridades:** Qual dessas melhorias trará o maior impacto perceptível na experiência de uso imediata?
2.  **Transição de Abas:** Posso criar um componente wrapper de página animada `<PageTransition>` para envelopar as abas no `MobileShell`.
3.  **Refinar Overlays de Detalhe:** Ajustar o `PostDetailScreen` ou `ProfileScreen` para abrir deslizando da base (bottom sheet de alta fidelidade) ou da lateral (push screen).

*Como gostaria de conduzir nossa discussão a partir desse resumo? Podemos focar em criar uma das transições de tela ou enriquecer a orbe da Mãe IA.*
