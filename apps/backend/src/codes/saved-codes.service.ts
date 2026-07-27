import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedCodesService {
  private inMemoryCodes: any[] = [];
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    if (!this.prisma.isConnected) {
      return this.inMemoryCodes;
    }

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
    if (!this.prisma.isConnected) {
      const code = this.inMemoryCodes.find((c) => c.id === id);
      if (!code) throw new NotFoundException(`Saved code entry not found`);
      return code;
    }

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
    if (!this.prisma.isConnected) {
      const newCode = {
        id: 'mock-code-' + Math.random(),
        userId,
        problemId: data.problemId || null,
        title: data.title,
        language: data.language,
        sourceCode: data.sourceCode,
        createdAt: new Date(),
        updatedAt: new Date(),
        problem: data.problemId ? { title: data.problemId === 'two-sum' ? 'Two Sum' : 'Fibonacci Number' } : null,
      };
      this.inMemoryCodes.push(newCode);
      return newCode;
    }

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
    if (!this.prisma.isConnected) {
      const codeIdx = this.inMemoryCodes.findIndex((c) => c.id === id);
      if (codeIdx === -1) throw new NotFoundException(`Saved code entry not found`);
      this.inMemoryCodes[codeIdx] = {
        ...this.inMemoryCodes[codeIdx],
        ...data,
        updatedAt: new Date(),
      };
      return this.inMemoryCodes[codeIdx];
    }

    // Validate ownership
    await this.findOne(id, userId);

    return this.prisma.savedCode.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    if (!this.prisma.isConnected) {
      const codeIdx = this.inMemoryCodes.findIndex((c) => c.id === id);
      if (codeIdx === -1) throw new NotFoundException(`Saved code entry not found`);
      const removed = this.inMemoryCodes[codeIdx];
      this.inMemoryCodes.splice(codeIdx, 1);
      return removed;
    }

    // Validate ownership
    await this.findOne(id, userId);

    return this.prisma.savedCode.delete({
      where: { id },
    });
  }
}
