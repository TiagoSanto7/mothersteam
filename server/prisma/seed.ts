import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('senha123', 12)

  const mariana = await prisma.user.upsert({
    where: { email: 'mariana@mothersteam.com' },
    update: {},
    create: {
      email: 'mariana@mothersteam.com',
      passwordHash,
      name: 'Mariana',
      babyName: 'Léo',
      pregnancyStage: 'pregnant',
      pregnancyWeek: 28,
      onboardingDone: true,
    },
  })

  const fernanda = await prisma.user.upsert({
    where: { email: 'fernanda@mothersteam.com' },
    update: {},
    create: {
      email: 'fernanda@mothersteam.com',
      passwordHash,
      name: 'Fernanda S.',
      pregnancyStage: 'postpartum',
      babyAgeInDays: 120,
      onboardingDone: true,
    },
  })

  const gestacaoCommunity = await prisma.community.upsert({
    where: { id: 'gestacao-primeiro-tri' },
    update: {},
    create: {
      id: 'gestacao-primeiro-tri',
      name: 'Gestantes — 1° Trimestre',
      description: 'Compartilhe as descobertas e dúvidas dos primeiros meses.',
      category: 'gestação',
      colorKey: 'terracotta',
      creatorId: fernanda.id,
      members: { create: [{ userId: fernanda.id, role: 'owner' }, { userId: mariana.id, role: 'member' }] },
    },
  })

  await prisma.post.create({
    data: {
      content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
      category: 'gestação',
      authorId: fernanda.id,
      communityId: gestacaoCommunity.id,
    },
  })

  console.log('Seed complete — mariana@mothersteam.com / fernanda@mothersteam.com — password: senha123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
