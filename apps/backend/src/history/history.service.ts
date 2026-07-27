import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    if (!this.prisma.isConnected) {
      return [];
    }

    return this.prisma.submission.findMany({
      where: { userId },
      include: {
        problem: {
          select: { title: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    if (!this.prisma.isConnected) {
      throw new NotFoundException(`Submission entry not found`);
    }

    const submission = await this.prisma.submission.findFirst({
      where: { id, userId },
      include: {
        problem: {
          select: { title: true },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission entry not found`);
    }

    return submission;
  }

  async getStatistics(userId: string) {
    if (!this.prisma.isConnected) {
      return {
        totalSubmissions: 0,
        successRate: 0,
        languageUsage: {},
      };
    }

    const submissions = await this.prisma.submission.findMany({
      where: { userId },
      select: {
        language: true,
        status: true,
      },
    });

    const totalSubmissions = submissions.length;
    const successfulSubmissions = submissions.filter((s) => s.status === 'ACCEPTED').length;
    const successRate = totalSubmissions > 0 ? Math.round((successfulSubmissions / totalSubmissions) * 100) : 0;

    const languageUsage: Record<string, number> = {};
    submissions.forEach((s) => {
      languageUsage[s.language] = (languageUsage[s.language] || 0) + 1;
    });

    return {
      totalSubmissions,
      successRate,
      languageUsage,
    };
  }
}
