# IMPLEMENTATION PLAN 

## Objetivo

Implementar aba de perfil que ficará um circulo ao lado da mensagem de boas vindas com a imagem da mãe e ao tocar nela levará ao perfil da mãe com informações sobre ela, conta, plano e etc.

Implementar efetivamente a ação do botão + na pagina home que permita adicionar um novo item a rotina

Adicionar a ação do botão "desabafar" permitindo a publicação de um post na comunidade

Inclusão de tela de login com usuario e senha que se encontram no .env

Inclusão de tela interativa de coleta de dados com as questões abaixo:

1. Momento Atual (Segmentação de Conteúdo)Em qual fase da maternidade você está hoje?A) Gestante (1º ou 2º trimestre)B) Gestante (3º trimestre / Reta final)C) Pós-parto recente (Bebê de 0 a 3 meses)D) Pós-parto (Bebê de 4 a 12 meses)E) Mãe de bebê com mais de 1 ano2. Estado Emocional (Suporte Psicológico)Como você tem se sentido emocionalmente na maior parte dos dias?A) Confiante e animada, curtindo o processo.B) Cansada, mas conseguindo lidar com a rotina.C) Ansiosa, com muitos medos e inseguranças.D) Sobrecarregada, exausta e sem tempo para mim.3. Rede de Apoio (Personalização de Rotina)Com qual frequência você pode contar com ajuda para cuidar do bebê ou das tarefas diárias?A) Sempre tenho ajuda disponível (parceiro(a), família, rede contratada).B) Tenho ajuda apenas em momentos específicos ou finais de semana.C) Não tenho rede de apoio, cuido de tudo praticamente sozinha.4. Foco de Saúde e Bem-estar (Engajamento e Funcionalidades)Qual é o seu principal objetivo de saúde e bem-estar no aplicativo agora?A) Entender o desenvolvimento do bebê e marcos de crescimento.B) Cuidar da minha saúde física (exercícios seguros, dores no corpo, assoalho pélvico).C) Melhorar a qualidade do sono (minha e do bebê).D) Organizar a rotina de amamentação, alimentação e cuidados práticos.5. Principal Dor / Desafio (Retenção e Solução de Problemas)O que mais tem tirado o seu sono ou gerado preocupação ultimamente?A) Falta de tempo para autocuidado e identidade pós-maternidade.B) Choro do bebê, cólicas ou dificuldades com o sono dele.C) Desafios com a amamentação ou introdução alimentar.D) Mudanças no corpo, flutuações hormonais e autoestima.

Como estruturar a Análise Personalizada (Lógica do App)A combinação dessas respostas criará o "Score de Perfil" da mãe. Veja exemplos de como cruzar esses dados:Perfil "Exausta e Sem Apoio" (Respostas 2D + 3C): O app deve priorizar notificações de micro-pausas de 5 minutos, meditações guiadas rápidas e conteúdos sobre como simplificar a rotina para evitar o burnout materno.Perfil "Gestante Ansiosa" (Respostas 1B + 2C): O feed principal deve focar em checklists para a mala da maternidade, planos de parto, exercícios de respiração e desmistificação dos primeiros dias com o bebê.Perfil "Recuperação Física Pós-Parto" (Respostas 1C + 4B): O aplicativo deve sugerir trilhas de exercícios fisioterapêuticos para diástase e fortalecimento pélvico, validados por especialistas. Essas coisas deverão incialmente serem apresentadas em cards de insights na tela de home, talvez logo abaixo da mensagem de boas vindas

