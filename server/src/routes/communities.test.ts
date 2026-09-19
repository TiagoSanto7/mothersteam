import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import communitiesRoutes from './communities'

async function buildApp(mocks: {
  communityCreate?: ReturnType<typeof vi.fn>
  communityUpdate?: ReturnType<typeof vi.fn>
  memberFindUnique?: ReturnType<typeof vi.fn>
}) {
  const app = Fastify()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('prisma', {
    community: {
      create: mocks.communityCreate ?? vi.fn().mockResolvedValue({ id: 'community-1' }),
      update: mocks.communityUpdate ?? vi.fn().mockResolvedValue({ id: 'community-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    communityMember: {
      findUnique: mocks.memberFindUnique ?? vi.fn().mockResolvedValue({ role: 'owner' }),
    },
  } as any)
  app.decorateRequest('userId', '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('authenticate', async (request: any) => { request.userId = 'user-1' })
  await app.register(communitiesRoutes)
  return app
}

const basePayload = {
  name: 'Gestantes de 2027',
  description: 'Um lugar seguro',
  category: 'gestação',
  colorKey: 'gold',
}

describe('POST /communities — imageUrl/avatarUrl', () => {
  // uploads.ts devolve path relativo ("/uploads/x.jpg"), não URL absoluta.
  // O schema já exigiu URL absoluta (.url()) aqui por engano — toda criação de
  // comunidade com foto (capa ou perfil) falhava com 400. Ver TIA-22.
  it('aceita path relativo de upload (imageUrl e avatarUrl) e cria a comunidade', async () => {
    const communityCreate = vi.fn().mockResolvedValue({ id: 'community-1', imageUrl: '/uploads/capa.jpg', avatarUrl: '/uploads/avatar.jpg' })
    const app = await buildApp({ communityCreate })

    const response = await app.inject({
      method: 'POST',
      url: '/',
      payload: { ...basePayload, imageUrl: '/uploads/capa.jpg', avatarUrl: '/uploads/avatar.jpg' },
    })

    expect(response.statusCode).toBe(201)
    expect(communityCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ imageUrl: '/uploads/capa.jpg', avatarUrl: '/uploads/avatar.jpg' }) })
    )
    await app.close()
  })

  it('continua aceitando comunidade sem nenhuma foto', async () => {
    const app = await buildApp({})

    const response = await app.inject({ method: 'POST', url: '/', payload: basePayload })

    expect(response.statusCode).toBe(201)
    await app.close()
  })

  it('rejeita payload inválido (nome vazio) com 400', async () => {
    const app = await buildApp({})

    const response = await app.inject({ method: 'POST', url: '/', payload: { ...basePayload, name: '' } })

    expect(response.statusCode).toBe(400)
    await app.close()
  })
})

describe('PATCH /communities/:id — imageUrl/avatarUrl', () => {
  it('aceita path relativo ao trocar a foto de perfil depois de criada (CommunityDetailScreen)', async () => {
    const communityUpdate = vi.fn().mockResolvedValue({ id: 'community-1', avatarUrl: '/uploads/novo-avatar.jpg' })
    const app = await buildApp({ communityUpdate, memberFindUnique: vi.fn().mockResolvedValue({ role: 'owner' }) })

    const response = await app.inject({
      method: 'PATCH',
      url: '/community-1',
      payload: { avatarUrl: '/uploads/novo-avatar.jpg' },
    })

    expect(response.statusCode).toBe(200)
    expect(communityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { avatarUrl: '/uploads/novo-avatar.jpg' } })
    )
    await app.close()
  })

  it('retorna 403 quando quem edita não é owner/admin', async () => {
    const app = await buildApp({ memberFindUnique: vi.fn().mockResolvedValue({ role: 'member' }) })

    const response = await app.inject({ method: 'PATCH', url: '/community-1', payload: { avatarUrl: '/uploads/x.jpg' } })

    expect(response.statusCode).toBe(403)
    await app.close()
  })
})
