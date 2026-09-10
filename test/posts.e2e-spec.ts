import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

describe('Posts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authorId: number;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const author = await prisma.user.create({
      data: { email: 'author@prisma.io', name: 'Author' },
    });
    authorId = author.id;
  });

  describe('POST /posts', () => {
    it('creates a post linked to its author', async () => {
      const res = await request(app.getHttpServer())
        .post('/posts')
        .send({ title: 'Hello', content: 'World', authorId })
        .expect(201);

      expect(res.body).toMatchObject({ title: 'Hello', authorId });
      expect(res.body.author.email).toBe('author@prisma.io');

      const persisted = await prisma.post.findUnique({
        where: { id: res.body.id },
      });
      expect(persisted?.title).toBe('Hello');
    });

    it('defaults published to false', async () => {
      const res = await request(app.getHttpServer())
        .post('/posts')
        .send({ title: 'Hello', authorId })
        .expect(201);

      expect(res.body.published).toBe(false);
    });

    it('returns 404 when the author does not exist', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({ title: 'Hello', authorId: 9999 })
        .expect(404);
    });

    it('returns 400 when the title is missing', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({ authorId })
        .expect(400);
    });
  });

  describe('GET /posts', () => {
    it('lists posts with their author', async () => {
      await prisma.post.create({ data: { title: 'P1', authorId } });

      const res = await request(app.getHttpServer()).get('/posts').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].author.id).toBe(authorId);
    });
  });

  describe('GET /posts/:id', () => {
    it('returns a post with its author', async () => {
      const post = await prisma.post.create({
        data: { title: 'P1', authorId },
      });

      const res = await request(app.getHttpServer())
        .get(`/posts/${post.id}`)
        .expect(200);

      expect(res.body.author.id).toBe(authorId);
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer()).get('/posts/9999').expect(404);
    });
  });

  describe('PATCH /posts/:id', () => {
    it('updates a post', async () => {
      const post = await prisma.post.create({
        data: { title: 'P1', authorId },
      });

      const res = await request(app.getHttpServer())
        .patch(`/posts/${post.id}`)
        .send({ published: true })
        .expect(200);

      expect(res.body.published).toBe(true);
    });

    it('returns 404 when assigning a non-existent author', async () => {
      const post = await prisma.post.create({
        data: { title: 'P1', authorId },
      });

      await request(app.getHttpServer())
        .patch(`/posts/${post.id}`)
        .send({ authorId: 9999 })
        .expect(404);
    });

    it('returns 404 for an unknown post', async () => {
      await request(app.getHttpServer())
        .patch('/posts/9999')
        .send({ published: true })
        .expect(404);
    });
  });

  describe('DELETE /posts/:id', () => {
    it('deletes a post', async () => {
      const post = await prisma.post.create({
        data: { title: 'P1', authorId },
      });

      await request(app.getHttpServer())
        .delete(`/posts/${post.id}`)
        .expect(200);

      expect(
        await prisma.post.findUnique({ where: { id: post.id } }),
      ).toBeNull();
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer()).delete('/posts/9999').expect(404);
    });
  });

  describe('relations', () => {
    it('cascades the delete from a user to their posts', async () => {
      const post = await prisma.post.create({
        data: { title: 'P1', authorId },
      });

      await request(app.getHttpServer())
        .delete(`/users/${authorId}`)
        .expect(200);

      await request(app.getHttpServer()).get(`/posts/${post.id}`).expect(404);
      expect(
        await prisma.post.findUnique({ where: { id: post.id } }),
      ).toBeNull();
    });
  });
});
