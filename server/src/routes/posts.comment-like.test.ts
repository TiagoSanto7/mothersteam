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
  const author = await prisma.user.create({
    data: { email: `a${Date.now()}${Math.random()}@t.com`, passwordHash: 'x', name: 'Autora', pregnancyStage: 'pregnant' },
  })
  const viewer = await prisma.user.create({
    data: { email: `v${Date.now()}${Math.random()}@t.com`, passwordHash: 'x', name: 'Viewer', pregnancyStage: 'pregnant' },
  })
  const post = await prisma.post.create({
    data: { content: 'post', category: 'gestação', authorId: author.id },
  })
  const comment = await prisma.comment.create({
    data: { content: 'primeiro comentário', authorId: author.id, postId: post.id },
  })
  return { author, viewer, post, comment }
}

async function cleanup(ids: { authorId: string; viewerId: string; postId: string }) {
  await prisma.commentLike.deleteMany({ where: { userId: ids.viewerId } })
  await prisma.notification.deleteMany({ where: { recipientId: ids.authorId } })
  await prisma.comment.deleteMany({ where: { postId: ids.postId } })
  await prisma.post.delete({ where: { id: ids.postId } })
  await prisma.user.deleteMany({ where: { id: { in: [ids.authorId, ids.viewerId] } } })
}

describe('POST /posts/:id/comments/:commentId/like', () => {
  it('cria um like, incrementa o contador e notifica o autor', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${post.id}/comments/${comment.id}/like`,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ id: comment.id, likes: 1, likedByCurrentUser: true })

    const notif = await prisma.notification.findFirst({
      where: { recipientId: author.id, targetType: 'comment', targetId: comment.id },
    })
    expect(notif).not.toBeNull()
    expect(notif?.text).toBe('Viewer curtiu seu comentário.')

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('é idempotente — chamar duas vezes mantém contador em 1 e não duplica notificação', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })
    const res2 = await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })

    expect(res2.json()).toMatchObject({ likes: 1, likedByCurrentUser: true })

    const notifs = await prisma.notification.count({
      where: { recipientId: author.id, targetType: 'comment', targetId: comment.id },
    })
    expect(notifs).toBe(1)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('não notifica quando o autor curte o próprio comentário', async () => {
    const { author, post, comment } = await setupFixture()
    const app = await makeApp(author.id)

    await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })
    const notifs = await prisma.notification.count({
      where: { recipientId: author.id, targetType: 'comment', targetId: comment.id },
    })
    expect(notifs).toBe(0)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: author.id, postId: post.id })
  })

  it('retorna 404 quando o comentId não pertence ao postId', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const otherPost = await prisma.post.create({
      data: { content: 'other', category: 'gestação', authorId: author.id },
    })
    const app = await makeApp(viewer.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${otherPost.id}/comments/${comment.id}/like`,
    })
    expect(res.statusCode).toBe(404)

    await app.close()
    await prisma.post.delete({ where: { id: otherPost.id } })
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })
})

describe('DELETE /posts/:id/comments/:commentId/like', () => {
  it('remove like existente e decrementa contador', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })
    const res = await app.inject({ method: 'DELETE', url: `/${post.id}/comments/${comment.id}/like` })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: comment.id, likes: 0, likedByCurrentUser: false })

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('é idempotente — DELETE sem like prévio retorna 200 sem alterar contador', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    const res = await app.inject({ method: 'DELETE', url: `/${post.id}/comments/${comment.id}/like` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ likes: 0, likedByCurrentUser: false })

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })
})

describe('GET /posts/:id/comments — likedByCurrentUser', () => {
  it('retorna likedByCurrentUser=true quando o viewer curtiu o comentário', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    await prisma.commentLike.create({ data: { userId: viewer.id, commentId: comment.id } })
    const app = await makeApp(viewer.id)

    const res = await app.inject({ method: 'GET', url: `/${post.id}/comments` })
    const body = res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].likedByCurrentUser).toBe(true)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('retorna likedByCurrentUser=false quando o viewer não curtiu', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    const res = await app.inject({ method: 'GET', url: `/${post.id}/comments` })
    const body = res.json()
    expect(body.items[0].likedByCurrentUser).toBe(false)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })
})
