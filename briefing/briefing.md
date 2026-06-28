# Documento de Diretrizes: Mother's Team APP

1. BRIEFING DO PROJETO
📌 Visão Geral
O Mothers Team é um ecossistema de apoio e cuidado voltado para mães que estão iniciando ou já passaram pela gestação. O aplicativo nasce para sanar a sobrecarga e a exaustão materna, equilibrando o pragmatismo da gestão da rotina com o acolhimento afetivo e técnico. O lema central que guia a experiência é: "Fortalecer uma mãe é fortalecer gerações inteiras".

🎯 Objetivos Principais

Foco Primário (MVP): Aliviar a carga mental da mãe através de um gerenciador de rotina inteligente, calendário centralizado, rede de apoio comunitária, um assistente de IA focado em saúde materno-infantil e um hub centralizado de acompanhamento do bebê.


Foco Secundário (Fase 2): Facilitar o acesso a produtos especializados através de uma aba de shopping com layout de conveniência/farmácia (produtos Baby Team).


Estratégia de Lançamento: Protótipo funcional construído em ambiente Web, utilizando uma abordagem de design Mobile-First (responsivo, simulando a experiência de um aplicativo de celular no navegador).

2. ESPECIFICAÇÃO DO PRODUTO (PRODUCT SPEC)
🎨 2.1. Identidade Visual & UI Guidelines
O design deve priorizar interfaces limpas, elementos suaves e tipografia de fácil leitura para não cansar usuárias que operam em privação de sono.

Paleta de Cores:


Primária (Acolhimento): Tons de lavanda ou verde sálvia suave (calma e saúde mental).


Secundária (Cuidado/Confiança): Rosa antigo ou azul bebê quente.


Neutros: Fundos em off-white (brancos quebrados) e cinzas muito claros.


Textos: Grafite escuro (evitar o preto puro para reduzir a fadiga visual).

Componentes de Interface:

Uso obrigatório de cantos arredondados proeminentes (border-radius generoso) para transmitir suavidade.

Organização de conteúdo baseada em Cards visuais para escaneamento rápido de dados.

Ícones minimalistas, claros e afetivos.

🗺️ 2.2. Arquitetura e Navegação (Bottom Tab Bar de 5 Posições)
A navegação principal será feita por uma barra inferior contendo 4 abas padrão e um botão central flutuante proeminente:

[ 1. Home ]   [ 2. MãeIA ]   👉 [ 3. AVATAR DO BABY (Flutuante) ] 👈   [ 4. Comunidade ]   [ 5. Shopping ]

Home / Rotina: Visão diária da mãe, cronograma e calendário geral.


MãeIA: Interface de chat com inteligência artificial para dúvidas rápidas.


Avatar do Baby (Central): Botão circular flutuante que evolui visualmente com a gestação/idade do bebê. Clicar nele abre a Tela de Rotina do Baby.


Comunidade: Feed do fórum e grupos de apoio.


Shopping: Catálogo estático da Baby Team (Fase 2).

3. ESPECIFICAÇÃO COMPLETA DAS TELAS (MVP)
🧩 Tela 1: Dashboard de Rotina & Calendário da Mãe
Elementos de Interface:


Header: Saudação contextualizada à fase da mãe (ex: "Olá, Mariana! Faltam 4 semanas para o parto" ou "Mariana, o Léo já está com 3 semanas!").


Seletor Dinâmico (Mini Calendário): Barra horizontal deslizante (scroll-x) mostrando os dias da semana atual para navegação e filtros rápidos de rotina.


Botão de Expansão: Ícone que abre o calendário em tela cheia (visão mensal) para checar agendamentos futuros.


Timeline da Mãe: Lista vertical cronológica de tarefas focadas no autocuidado e compromissos gerais da mãe (ex: 08:00 - Tomar Vitamina, 14:00 - Consulta Obstetra).


Botão Flutuante (+): Abre um menu rápido para cadastrar novos Lembretes ou Eventos.

👶 Tela Central: Rotina do Baby (Acessada pelo Botão Flutuante)
O Botão Evolutivo (Na Tab Bar):

Um botão circular perfeito que fica posicionado exatamente no meio da barra. Ele possui um leve deslocamento vertical negativo (translate-y para cima), flutuando sobre a barra com uma sombra suave.


Lógica Evolutiva: O ícone interno do botão muda de acordo com o tempo de gestação informado no cadastro (Estado Global):


Semanas 1-8: Ícone/ilustração de um pequeno embrião ou semente.


Semanas 9-20: Silhueta de um feto inicial.


Semanas 21-40: Bebê totalmente formado na barriga.


Pós-parto: O rostinho de um bebê de fora da barriga.

Elementos da Tela Interna do Bebê:


Card Comparativo (Inspirado em Pregnancy Apps): Ilustração do tamanho atual do bebê comparado a uma fruta (ex: "Hoje seu bebê tem o tamanho de um mamão" ou "Léo tem 1 mês").

Métricas Rápidas de Saúde (Cards de Registro Rápido):


Amamentação: Cronômetro ou registro de qual seio foi usado por último.


Sono: Registro de duração das sonecas diárias.


Fraldas: Contador diário de trocas (Xixi/Cocô).


Timeline do Bebê: Linha do tempo independente exibindo apenas as atividades do dia do bebê (ex: 09:15 - Dormiu, 10:30 - Mamou por 15 min).

🤖 Tela 2: Assistente de IA (MãeIA)

Elementos de Interface: Interface de chat limpa (estilo WhatsApp). No topo, pílulas de texto (Quick Chips) com perguntas frequentes (ex: "Dicas para cólica" ou "Como lidar com o cansaço no puerpério?").

Comportamento da IA: Respostas empáticas, curtas, baseadas em evidências. Sempre reforçando o binômio: cuidar do bebê sem esquecer da saúde física e mental da mãe.

👥 Tela 3: Comunidade & Fórum

Elementos de Interface: Feed estruturado com abas/tags de categorias (Gestação, Pós-parto, Amamentação, Saúde Mental). Botão em destaque "Pedir Ajuda / Desabafar".


Diferencial de UI: Selos visuais nas respostas feitas por "Mães Experientes" ou "Profissionais de Saúde".

🛒 Tela 4: Loja / Farmácia Baby Team (Fase 2)

Diretriz: Layout idêntico a um e-commerce de farmácia (higiene, cuidados, pós-parto) operando de forma 100% estática, exibindo o aviso: "Em breve: Seus produtos Baby Team a um clique" (sem gateways de pagamento no MVP).

4. PLANO DE IMPLEMENTAÇÃO PASSO A PASSO
Para o agente de IA codificar sem desvios, o desenvolvimento deve seguir rigorosamente esta ordem cronológica:

[PASSO 1: Casca Mobile-First & Tab Bar de 5 itens]
                        │
                        ▼
[PASSO 2: Motor de Estados do Calendário e o Botão Evolutivo]
                        │
                        ▼
[PASSO 3: Tela de Rotina do Baby e Seus Contadores]
                        │
                        ▼
[PASSO 4: Módulos de Conteúdo (MãeIA, Fórum e Vitrine Estática)]
🟩 Passo 1: Casca e Navegação Global: Criar o container responsivo centralizado na tela web (simulando um celular). Construir a Bottom Tab Bar com as 5 posições. Estilizar o botão central redondo e flutuante com a propriedade de elevação necessária.


🟩 Passo 2: Estado Evolutivo e Calendário Home: Criar um estado simulado no topo da tela (currentWeek) para chavear dinamicamente os 4 ícones do botão evolutivo. Desenvolver o mini calendário de rolagem horizontal da Home e a renderização cronológica da Timeline da mãe.


🟩 Passo 3: Tela de Rotina do Baby: Desenvolver a página de destino do botão central. Criar os componentes de cards de registro rápido (Amamentação, Sono, Fraldas) e a timeline exclusiva do bebê.


🟩 Passo 4: Integração de Funcionalidades Auxiliares: Implementar a interface de chat da MãeIA com os balões de texto, o feed do fórum com filtro de tags e o grid estático de produtos da farmácia.

> references: https://apps.apple.com/br/app/pregnancy-tracker-app/id505864483?l=en-GB, https://apps.apple.com/br/app/pregnancy-tracker-by-moms/id1144871267?l=en-GB, https://brasil.babycenter.com/ e https://apps.apple.com/br/app/minha-gravidez-e-meu-beb%C3%AA-hoje/id386022579