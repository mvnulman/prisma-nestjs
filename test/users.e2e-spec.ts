import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  describe('POST /users', () => {
    it('creates a user and persists it', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'alice@prisma.io', name: 'Alice' })
        .expect(201);

      expect(res.body).toMatchObject({
        email: 'alice@prisma.io',
        name: 'Alice',
      });
      expect(res.body.id).toEqual(expect.any(Number));

      const persisted = await prisma.user.findUnique({
        where: { id: res.body.id },
      });
      expect(persisted?.email).toBe('alice@prisma.io');
    });

    it('rejects an invalid email with 400', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'not-an-email', name: 'X' })
        .expect(400);
    });

    it('rejects a missing email with 400', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'X' })
        .expect(400);
    });

    it('strips unknown properties (whitelist)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'bob@prisma.io', name: 'Bob', role: 'admin' })
        .expect(201);

      expect(res.body).not.toHaveProperty('role');
    });

    it('returns 409 on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'dup@prisma.io' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'dup@prisma.io' })
        .expect(409);
    });
  });

  describe('GET /users', () => {
    it('returns an empty array when there are no users', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns users with their posts', async () => {
      const user = await prisma.user.create({
        data: { email: 'a@a.com', name: 'A' },
      });
      await prisma.post.create({ data: { title: 'P1', authorId: user.id } });

      const res = await request(app.getHttpServer()).get('/users').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].posts).toHaveLength(1);
    });
  });

  describe('GET /users/:id', () => {
    it('returns a user with their posts', async () => {
      const user = await prisma.user.create({
        data: { email: 'a@a.com', name: 'A' },
      });
      await prisma.post.create({ data: { title: 'P1', authorId: user.id } });

      const res = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200);

      expect(res.body.id).toBe(user.id);
      expect(res.body.posts).toHaveLength(1);
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer()).get('/users/9999').expect(404);
    });

    it('returns 400 for a non-numeric id', async () => {
      await request(app.getHttpServer()).get('/users/abc').expect(400);
    });
  });

  describe('PATCH /users/:id', () => {
    it('updates a user and persists the change', async () => {
      const user = await prisma.user.create({ data: { email: 'a@a.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .send({ name: 'Updated' })
        .expect(200);

      expect(res.body.name).toBe('Updated');
      const persisted = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(persisted?.name).toBe('Updated');
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .patch('/users/9999')
        .send({ name: 'X' })
        .expect(404);
    });

    it('returns 400 for invalid data', async () => {
      const user = await prisma.user.create({ data: { email: 'a@a.com' } });

      await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .send({ email: 'bad' })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('deletes a user', async () => {
      const user = await prisma.user.create({ data: { email: 'a@a.com' } });

      await request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .expect(200);

      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).toBeNull();
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer()).delete('/users/9999').expect(404);
    });
  });
});
