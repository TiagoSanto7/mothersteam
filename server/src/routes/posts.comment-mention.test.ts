import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import postsRoutes from './posts'

const prisma = new PrismaClient()

async function makeApp(viewerId: string) {
  const app = Fastify()
  app.decorate('prisma', prisma)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (req: any) => { req.userId = viewerId })
  await app.register(postsRoutes)
  return app
}

async function setupFixture() {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2)}`
  const postAuthor = await prisma.user.create({
    data: { email: `postauthor${suffix}@t.com`, passwordHash: 'x', name: 'Autora', pregnancyStage: 'pregnant' },
  })
  const commenter = await prisma.user.create({
    data: { email: `commenter${suffix}@t.com`, passwordHash: 'x', name: 'Comentarista', username: `comentarista${suffix}`, pregnancyStage: 'pregnant' },
  })
  const mentioned = await prisma.user.create({
    data: { email: `mentioned${suffix}@t.com`, passwordHash: 'x', name: 'Mencionada', username: `mencionada${suffix}`, pregnancyStage: 'pregnant' },
  })
  const post = await prisma.post.create({
    data: { content: 'post original', category: 'gestação', authorId: postAuthor.id },
  })
  return { postAuthor, commenter, mentioned, post, suffix }
}

async function cleanup(ids: string[]) {
  await prisma.notification.deleteMany({ where: { actorId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { recipientId: { in: ids } } })
  await prisma.comment.deleteMany({ where: { authorId: { in: ids } } })
  await prisma.post.deleteMany({ where: { authorId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

describe('POST /:id/comments — @menções', () => {
  it('cria notificação de mention para usuário mencionado no comentário', async () => {
    const { postAuthor, commenter, mentioned, post, suffix } = await setupFixture()
    const app = await makeApp(commenter.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: `Olha isso @mencionada${suffix}!` },
    })

    expect(res.statusCode).toBe(201)

    // aguarda fire-and-forget
    await new Promise((r) => setTimeout(r, 200))

    const notif = await prisma.notification.findFirst({
      where: { recipientId: mentioned.id, type: 'mention', actorId: commenter.id },
    })
    expect(notif).not.toBeNull()
    expect(notif?.text).toContain('Comentarista')
    expect(notif?.targetType).toBe('post')
    expect(notif?.targetId).toBe(post.id)

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })

  it('não cria mention para o próprio autor do comentário', async () => {
    const { postAuthor, commenter, mentioned, post, suffix } = await setupFixture()
    const app = await makeApp(commenter.id)

    await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: `@comentarista${suffix} falando comigo mesmo` },
    })

    await new Promise((r) => setTimeout(r, 200))

    const selfNotif = await prisma.notification.findFirst({
      where: { recipientId: commenter.id, type: 'mention' },
    })
    expect(selfNotif).toBeNull()

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })

  it('não cria mention para o dono do post quando ele é mencionado no comentário', async () => {
    const { postAuthor, commenter, mentioned, post } = await setupFixture()
    // Dá username ao postAuthor para que o @handle seja resolvido
    const postAuthorWithUsername = await prisma.user.update({
      where: { id: postAuthor.id },
      data: { username: `postauthor_${postAuthor.id.slice(-6)}` },
    })
    const app = await makeApp(commenter.id)

    await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: `@${postAuthorWithUsername.username} veja isso` },
    })

    await new Promise((r) => setTimeout(r, 200))

    // dono do post NÃO recebe mention (já recebe comment)
    const mentionNotif = await prisma.notification.findFirst({
      where: { recipientId: postAuthor.id, type: 'mention', actorId: commenter.id },
    })
    expect(mentionNotif).toBeNull()

    // mas recebe comment
    const commentNotif = await prisma.notification.findFirst({
      where: { recipientId: postAuthor.id, type: 'comment', actorId: commenter.id },
    })
    expect(commentNotif).not.toBeNull()

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })

  it('@username inexistente — sem notificação de mention, request bem-sucedido', async () => {
    const { postAuthor, commenter, mentioned, post } = await setupFixture()
    const app = await makeApp(commenter.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: '@usuarioquenaexiste123xyz testando' },
    })

    expect(res.statusCode).toBe(201)

    await new Promise((r) => setTimeout(r, 200))

    const mentionNotifs = await prisma.notification.count({
      where: { actorId: commenter.id, type: 'mention' },
    })
    expect(mentionNotifs).toBe(0)

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })
})
