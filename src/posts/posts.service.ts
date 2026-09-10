import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPostDto: CreatePostDto) {
    await this.ensureAuthorExists(createPostDto.authorId);
    return this.prisma.post.create({
      data: createPostDto,
      include: { author: true },
    });
  }

  findAll() {
    return this.prisma.post.findMany({ include: { author: true } });
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { author: true },
    });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    await this.findOne(id);
    if (updatePostDto.authorId !== undefined) {
      await this.ensureAuthorExists(updatePostDto.authorId);
    }
    return this.prisma.post.update({
      where: { id },
      data: updatePostDto,
      include: { author: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.post.delete({ where: { id } });
  }

  private async ensureAuthorExists(authorId: number) {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });
    if (!author) {
      throw new NotFoundException(`Author ${authorId} not found`);
    }
  }
}
