import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}
