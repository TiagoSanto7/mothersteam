# Mothers Team — Plano Fase 2: Discussão com o Cliente

**Projeto:** Mothers Team App
**Fase:** 2 — Login, Personalização e Ações
**Data:** 2026-06-30
**Status:** Para validação com o cliente

---

## O Que Vamos Construir

Esta fase adiciona as funcionalidades que transformam o MVP em um produto com identidade e fluxo completo. São 5 entregas:

| # | Funcionalidade | Descrição curta |
|---|---|---|
| 1 | Tela de Login | Porta de entrada do app com e-mail e senha |
| 2 | Onboarding Personalizado | 5 perguntas que criam o perfil da mãe |
| 3 | Perfil da Mãe | Avatar no header → tela com dados da conta |
| 4 | Adicionar Itens à Rotina | O botão + realmente funciona agora |
| 5 | Publicar na Comunidade | O botão "Desabafar" cria posts no feed |

---

## Perguntas para Alinhar com o Cliente

### Sobre o Login

**Q1.** As credenciais atuais (`navegador@mothersteam` / `admin@mothersteam`) são apenas para a fase de homologação. Para o lançamento, o cliente deseja:
- A) Manter login estático (e-mail/senha fixos) — simples, sem banco de dados
- B) Login com cadastro real (e-mail + senha criados pelo usuário) — exige backend
- C) Login social (Google, Facebook) — exige integração OAuth

**Q2.** O app deve ter uma tela de **cadastro de nova conta**, ou por enquanto só o login com credenciais pré-definidas?

---

### Sobre o Onboarding (5 Perguntas)

**Q3.** As 5 perguntas abaixo foram mapeadas para criar o "perfil" da mãe. O cliente aprova esse conteúdo ou quer ajustar alguma pergunta/opção?

> 1. Em qual fase da maternidade você está? (Gestante 1°/2° trim. / Gestante 3° trim. / Pós-parto 0-3m / Pós-parto 4-12m / Bebê >1 ano)
> 2. Como você tem se sentido emocionalmente? (Confiante / Cansada mas ok / Ansiosa / Sobrecarregada)
> 3. Com que frequência você conta com ajuda? (Sempre / Às vezes / Praticamente sozinha)
> 4. Qual seu principal objetivo de saúde no app? (Desenvolvimento do bebê / Saúde física / Sono / Rotina prática)
> 5. O que mais tem gerado preocupação? (Autocuidado / Choro/cólica/sono do bebê / Amamentação / Corpo/hormônios)

**Q4.** Os "perfis gerados" pelas combinações de respostas (ex: "Gestante Ansiosa", "Mãe Exausta sem Apoio") devem ter um nome/rótulo oficial? O cliente quer definir esses nomes ou deixamos sugestões?

**Q5.** Os insights exibidos na Home (baseados no perfil) — o cliente quer ter controle editorial sobre esses textos, ou deixamos sugestões padrão por enquanto?

---

### Sobre o Perfil da Mãe

**Q6.** A foto de perfil será:
- A) Apenas um placeholder com a inicial do nome (ex: círculo com "M") — simples e rápido
- B) Upload de foto pelo usuário — exige armazenamento de imagem
- C) Integração com foto do Google/Facebook — exige login social

**Q7.** O badge de plano exibido no perfil ("Gratuito" / "Premium") — o cliente quer trabalhar com planos pagos no futuro? Isso muda como estruturamos esse campo agora.

**Q8.** Além de nome, e-mail e plano, o cliente quer exibir mais alguma informação na tela de perfil? (ex: data de nascimento prevista, semana de gestação, nome do bebê)

---

### Sobre Adicionar Itens à Rotina

**Q9.** As categorias de itens de rotina hoje são: **Tarefa / Consulta / Medicação**. O cliente quer adicionar mais categorias? (ex: Exercício, Alimentação, Hidratação)

**Q10.** O cliente quer que seja possível **editar ou excluir** um item de rotina existente, ou por enquanto apenas adicionar?

---

### Sobre Publicar na Comunidade

**Q11.** Quando a mãe publica um post pelo "Desabafar", o nome exibido no feed será:
- A) O nome cadastrado no perfil (ex: "Mariana S.")
- B) Anônimo por padrão (para posts de desabafo)
- C) A mãe escolhe: nome ou anônimo antes de publicar

**Q12.** Os posts publicados no app durante a homologação são visíveis para todos os usuários de teste ou cada usuário vê apenas seus próprios posts?

**Q13.** O cliente quer algum filtro de moderação/validação antes de um post aparecer no feed?

---

### Sobre o Fluxo Geral

**Q14.** O cliente aprova o fluxo: **Login → Onboarding (apenas 1ª vez) → App**?

**Q15.** Em caso de esquecimento de senha, o que deve acontecer? (Ex: mostrar mensagem de contato com suporte, ou ignorar por agora)

---

## Próximos Passos Técnicos (Após Validação)

Assim que o cliente responder as perguntas acima, o time de desenvolvimento seguirá esta ordem:

1. Ajustar `.env` e configurar acesso às credenciais
2. Implementar `LoginScreen` com validação
3. Atualizar o estado global (Zustand store) com novos campos
4. Implementar `OnboardingScreen` com lógica de score
5. Adicionar `InsightCard` na HomeScreen
6. Implementar `ProfileScreen` com avatar e logout
7. Implementar `AddRoutineModal` (botão +)
8. Implementar `CreatePostScreen` (botão Desabafar)
9. Testes de integração e revisão visual

**Tempo estimado:** 2-3 dias de desenvolvimento

---

## Decisões Já Tomadas (Sem Necessidade de Validação)

- A tecnologia de persistência será **localStorage** (Zustand persist) — sem banco de dados externo nesta fase
- O design seguirá a identidade visual já aprovada (lavanda, off-white, cantos arredondados)
- Botão "Resetar Onboarding" disponível no Perfil apenas durante homologação (será removido no lançamento)
- Não haverá backend real nesta fase — tudo funciona localmente no navegador
