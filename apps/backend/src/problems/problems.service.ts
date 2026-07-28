import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProblemsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    if (!this.prisma.isConnected) {
      return [
        {
          id: 'two-sum',
          title: 'Two Sum',
          difficulty: 'EASY',
          timeLimit: 2.0,
          memoryLimit: 256.0,
          createdAt: new Date(),
        },
        {
          id: 'fibonacci',
          title: 'Fibonacci Number',
          difficulty: 'EASY',
          timeLimit: 1.0,
          memoryLimit: 128.0,
          createdAt: new Date(),
        },
      ];
    }

    return this.prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
        timeLimit: true,
        memoryLimit: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    if (!this.prisma.isConnected) {
      if (id === 'two-sum') {
        return {
          id: 'two-sum',
          title: 'Two Sum',
          description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
          difficulty: 'EASY',
          constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
          inputFormat: 'First line contains length N and target T.\nSecond line contains N integers.',
          outputFormat: 'Print two space-separated indices.',
          timeLimit: 2.0,
          memoryLimit: 256.0,
          testCases: [
            { id: 'ts-tc1', problemId: 'two-sum', input: '4 9\n2 7 11 15', output: '0 1', isSample: true },
            { id: 'ts-tc2', problemId: 'two-sum', input: '3 6\n3 2 4', output: '1 2', isSample: true }
          ]
        };
      }
      
      return {
        id: 'fibonacci',
        title: 'Fibonacci Number',
        description: 'The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. F(0) = 0, F(1) = 1. Given n, calculate F(n).',
        difficulty: 'EASY',
        constraints: '0 <= n <= 30',
        inputFormat: 'A single integer n.',
        outputFormat: 'Print F(n).',
        timeLimit: 1.0,
        memoryLimit: 128.0,
        testCases: [
          { id: 'fib-tc1', problemId: 'fibonacci', input: '2', output: '1', isSample: true },
          { id: 'fib-tc2', problemId: 'fibonacci', input: '3', output: '2', isSample: true }
        ]
      };
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          where: { isSample: true },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Problem with ID ${id} not found`);
    }

    return problem;
  }

  async create(data: {
    title: string;
    description: string;
    difficulty: string;
    constraints?: string;
    inputFormat?: string;
    outputFormat?: string;
    timeLimit?: number;
    memoryLimit?: number;
    testCases?: Array<{ input: string; output: string; isSample?: boolean }>;
  }) {
    const { testCases, ...problemData } = data;

    if (!this.prisma.isConnected) {
      return {
        id: 'mock-problem-' + Math.random(),
        ...problemData,
        testCases: testCases ? testCases.map((tc, idx) => ({ id: 'tc-' + idx, ...tc })) : [],
        createdAt: new Date(),
      } as any;
    }

    return this.prisma.problem.create({
      data: {
        ...problemData,
        testCases: testCases
          ? {
              create: testCases.map((tc) => ({
                input: tc.input,
                output: tc.output,
                isSample: tc.isSample ?? false,
              })),
            }
          : undefined,
      },
      include: {
        testCases: true,
      },
    });
  }

  async update(id: string, data: any) {
    const { testCases, ...problemData } = data;

    // Check if problem exists
    await this.findOne(id);

    return this.prisma.$transaction(async (tx: any) => {
      // Update problem metadata
      const updatedProblem = await tx.problem.update({
        where: { id },
        data: problemData,
      });

      // If test cases are specified, clear existing ones and recreate
      if (testCases) {
        await tx.testCase.deleteMany({
          where: { problemId: id },
        });

        await tx.testCase.createMany({
          data: testCases.map((tc: any) => ({
            problemId: id,
            input: tc.input,
            output: tc.output,
            isSample: tc.isSample ?? false,
          })),
        });
      }

      return tx.problem.findUnique({
        where: { id },
        include: { testCases: true },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.problem.delete({
      where: { id },
    });
  }

  async seedDemoProblems() {
    const count = await this.prisma.problem.count();
    if (count > 0) return;

    // Seed simple 2 problems
    await this.create({
      title: 'Two Sum',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
      difficulty: 'EASY',
      constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
      inputFormat: 'First line contains length N and target T.\nSecond line contains N integers.',
      outputFormat: 'Print two space-separated indices.',
      timeLimit: 2.0,
      memoryLimit: 256.0,
      testCases: [
        { input: '4 9\n2 7 11 15', output: '0 1', isSample: true },
        { input: '3 6\n3 2 4', output: '1 2', isSample: true },
        { input: '2 6\n3 3', output: '0 1', isSample: false },
      ],
    });

    await this.create({
      title: 'Fibonacci Number',
      description: 'The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. F(0) = 0, F(1) = 1. Given n, calculate F(n).',
      difficulty: 'EASY',
      constraints: '0 <= n <= 30',
      inputFormat: 'A single integer n.',
      outputFormat: 'Print F(n).',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '2', output: '1', isSample: true },
        { input: '3', output: '2', isSample: true },
        { input: '4', output: '3', isSample: false },
        { input: '9', output: '34', isSample: false },
      ],
    });
  }
}
