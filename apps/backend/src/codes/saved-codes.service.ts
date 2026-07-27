import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedCodesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.savedCode.findMany({
      where: { userId },
      include: {
        problem: {
          select: { title: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const savedCode = await this.prisma.savedCode.findFirst({
      where: { id, userId },
      include: {
        problem: {
          select: { title: true },
        },
      },
    });

    if (!savedCode) {
      throw new NotFoundException(`Saved code entry not found`);
    }

    return savedCode;
  }

  async create(
    userId: string,
    data: {
      problemId?: string;
      title: string;
      language: string;
      sourceCode: string;
    },
  ) {
    return this.prisma.savedCode.create({
      data: {
        userId,
        problemId: data.problemId || null,
        title: data.title,
        language: data.language,
        sourceCode: data.sourceCode,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      sourceCode?: string;
      language?: string;
    },
  ) {
    // Validate ownership
    await this.findOne(id, userId);

    return this.prisma.savedCode.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    // Validate ownership
    await this.findOne(id, userId);

    return this.prisma.savedCode.delete({
      where: { id },
    });
  }
}
