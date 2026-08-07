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
    // Clear existing problems and related submissions to ensure a fresh, updated seed
    await this.prisma.testCase.deleteMany({});
    await this.prisma.submission.deleteMany({});
    await this.prisma.problem.deleteMany({});

    // Seed simple 2 problems with 5 sample testcases each
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
        { input: '2 6\n3 3', output: '0 1', isSample: true },
        { input: '5 10\n1 2 3 4 6', output: '3 4', isSample: true },
        { input: '6 15\n1 3 5 7 8 12', output: '1 5', isSample: true },
        { input: '5 20\n10 15 2 8 12', output: '3 4', isSample: false },
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
        { input: '0', output: '0', isSample: true },
        { input: '1', output: '1', isSample: true },
        { input: '2', output: '1', isSample: true },
        { input: '3', output: '2', isSample: true },
        { input: '4', output: '3', isSample: true },
        { input: '5', output: '5', isSample: false },
        { input: '9', output: '34', isSample: false },
      ],
    });

    await this.create({
      title: 'Palindrome Number',
      description: 'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.',
      difficulty: 'EASY',
      constraints: '-2^31 <= x <= 2^31 - 1',
      inputFormat: 'A single integer x.',
      outputFormat: 'Print true if palindrome, false otherwise.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '121', output: 'true', isSample: true },
        { input: '-121', output: 'false', isSample: true },
        { input: '10', output: 'false', isSample: true },
        { input: '1221', output: 'true', isSample: true },
        { input: '0', output: 'true', isSample: true },
        { input: '12321', output: 'true', isSample: false },
      ],
    });

    await this.create({
      title: 'Reverse String',
      description: 'Given a string `s`, return the reversed string.',
      difficulty: 'EASY',
      constraints: '1 <= s.length <= 10^3',
      inputFormat: 'A single string s.',
      outputFormat: 'Print the reversed string.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: 'hello', output: 'olleh', isSample: true },
        { input: 'Hannah', output: 'hannaH', isSample: true },
        { input: 'a', output: 'a', isSample: true },
        { input: 'CodeRudra', output: 'arduRedoC', isSample: true },
        { input: 'racecar', output: 'racecar', isSample: true },
        { input: 'workspace', output: 'ecapskrow', isSample: false },
      ],
    });

    await this.create({
      title: 'Fizz Buzz',
      description: 'Given an integer `n`, print the string representation of numbers from 1 to `n` separated by spaces. But for multiples of three print "Fizz" instead of the number and for the multiples of five print "Buzz". For numbers which are multiples of both three and five print "FizzBuzz".',
      difficulty: 'EASY',
      constraints: '1 <= n <= 100',
      inputFormat: 'A single integer n.',
      outputFormat: 'Print space-separated strings.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '3', output: '1 2 Fizz', isSample: true },
        { input: '5', output: '1 2 Fizz 4 Buzz', isSample: true },
        { input: '15', output: '1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz', isSample: true },
        { input: '1', output: '1', isSample: true },
        { input: '6', output: '1 2 Fizz 4 Buzz Fizz', isSample: true },
        { input: '10', output: '1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz', isSample: false },
      ],
    });

    await this.create({
      title: 'Is Even',
      description: 'Given an integer `n`, print "even" if the number is even, and "odd" if the number is odd.',
      difficulty: 'EASY',
      constraints: '-10^9 <= n <= 10^9',
      inputFormat: 'A single integer n.',
      outputFormat: 'Print even or odd.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '2', output: 'even', isSample: true },
        { input: '3', output: 'odd', isSample: true },
        { input: '0', output: 'even', isSample: true },
        { input: '-5', output: 'odd', isSample: true },
        { input: '1024', output: 'even', isSample: true },
        { input: '99', output: 'odd', isSample: false },
      ],
    });

    await this.create({
      title: 'Find Max',
      description: 'Given an array of integers, find the maximum element.',
      difficulty: 'EASY',
      constraints: '1 <= N <= 10^4\n-10^9 <= elements <= 10^9',
      inputFormat: 'First line contains length N.\nSecond line contains N space-separated integers.',
      outputFormat: 'Print the maximum integer value.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '5\n1 5 3 9 2', output: '9', isSample: true },
        { input: '3\n-1 -5 -3', output: '-1', isSample: true },
        { input: '1\n100', output: '100', isSample: true },
        { input: '4\n10 20 20 5', output: '20', isSample: true },
        { input: '6\n0 0 0 0 0 0', output: '0', isSample: true },
        { input: '2\n-100 50', output: '50', isSample: false },
      ],
    });

    await this.create({
      title: 'Leap Year',
      description: 'Given a year `y`, return `true` if it is a leap year, and `false` otherwise.',
      difficulty: 'EASY',
      constraints: '1 <= y <= 10^5',
      inputFormat: 'A single integer y.',
      outputFormat: 'Print true or false.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '2000', output: 'true', isSample: true },
        { input: '1900', output: 'false', isSample: true },
        { input: '2024', output: 'true', isSample: true },
        { input: '2023', output: 'false', isSample: true },
        { input: '1600', output: 'true', isSample: true },
        { input: '2100', output: 'false', isSample: false },
      ],
    });

    await this.create({
      title: 'Valid Parentheses Simple',
      description: 'Given a string `s` containing just the characters "(", ")", "[", "]", "{" and "}", determine if the input string is valid.',
      difficulty: 'EASY',
      constraints: '1 <= s.length <= 10^4',
      inputFormat: 'A single string s.',
      outputFormat: 'Print true if valid, false otherwise.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '()', output: 'true', isSample: true },
        { input: '()[]{}', output: 'true', isSample: true },
        { input: '(]', output: 'false', isSample: true },
        { input: '([])', output: 'true', isSample: true },
        { input: '{[}', output: 'false', isSample: true },
        { input: '({[]})', output: 'true', isSample: false },
      ],
    });

    await this.create({
      title: 'Factorial',
      description: 'Given an integer `n`, calculate its factorial (n!).',
      difficulty: 'EASY',
      constraints: '0 <= n <= 12',
      inputFormat: 'A single integer n.',
      outputFormat: 'Print the factorial value.',
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: [
        { input: '0', output: '1', isSample: true },
        { input: '1', output: '1', isSample: true },
        { input: '5', output: '120', isSample: true },
        { input: '10', output: '3628800', isSample: true },
        { input: '4', output: '24', isSample: true },
        { input: '6', output: '720', isSample: false },
      ],
    });
  }
}
