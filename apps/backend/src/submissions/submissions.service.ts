import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionService } from '../execution/execution.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private executionService: ExecutionService,
  ) {}

  async execute(userId: string, data: { sourceCode: string; language: string; input?: string }) {
    // Run code once against custom input
    const result = await this.executionService.execute({
      sourceCode: data.sourceCode,
      language: data.language,
      input: data.input,
    });

    // Save as an ad-hoc submission (optional, but requested in PRD to see in history)
    // "Each execution can be saved... User can view history"
    // Let's save this custom execution to the database so it appears in history!
    return this.prisma.submission.create({
      data: {
        userId,
        problemId: null,
        language: data.language,
        sourceCode: data.sourceCode,
        input: data.input || null,
        output: result.output || null,
        runtime: result.runtime || 0,
        memory: result.memory || 0,
        status: result.status,
        error: result.error || null,
      },
    });
  }

  async submit(userId: string, data: { problemId: string; sourceCode: string; language: string }) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: data.problemId },
      include: { testCases: true },
    });

    if (!problem) {
      throw new NotFoundException(`Problem with ID ${data.problemId} not found`);
    }

    // 1. Create a pending submission record
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        problemId: data.problemId,
        language: data.language,
        sourceCode: data.sourceCode,
        status: 'PENDING',
      },
    });

    // 2. Perform judging
    // In production this could offload to BullMQ. Here, we evaluate it directly
    // to keep it running smoothly on Supabase + Mock/Local setup.
    // We execute it in the background asynchronously so the HTTP request completes fast
    // OR we can run it synchronously if we want to return results immediately.
    // Let's run it synchronously to provide an instant response if the user requests,
    // or run it in a non-blocking way and let the frontend poll.
    // Actually, running it and returning the final results directly is extremely responsive and nice!
    // Let's do the evaluation and then return the updated submission.
    
    const testCases = problem.testCases;
    if (testCases.length === 0) {
      // No test cases: auto-accept
      return this.prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: 'ACCEPTED',
          runtime: 0,
          memory: 0,
        },
      });
    }

    let finalStatus: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' = 'ACCEPTED';
    let maxRuntime = 0;
    let maxMemory = 0;
    let firstErrorMsg = '';
    let sampleOutput = '';

    for (const tc of testCases) {
      const runResult = await this.executionService.execute({
        sourceCode: data.sourceCode,
        language: data.language,
        input: tc.input,
        expectedOutput: tc.output,
      });

      // Track resource usage
      if (runResult.runtime && runResult.runtime > maxRuntime) maxRuntime = runResult.runtime;
      if (runResult.memory && runResult.memory > maxMemory) maxMemory = runResult.memory;

      // Check time limit
      if (maxRuntime > problem.timeLimit) {
        finalStatus = 'TIME_LIMIT_EXCEEDED';
        firstErrorMsg = `Time Limit Exceeded (Limit: ${problem.timeLimit}s)`;
        break;
      }

      // Check memory limit (memory limit is in MB, runResult.memory is in KB)
      const memoryInMB = maxMemory / 1024;
      if (memoryInMB > problem.memoryLimit) {
        finalStatus = 'MEMORY_LIMIT_EXCEEDED';
        firstErrorMsg = `Memory Limit Exceeded (Limit: ${problem.memoryLimit}MB)`;
        break;
      }

      if (runResult.status !== 'ACCEPTED') {
        finalStatus = runResult.status;
        firstErrorMsg = runResult.error || `Failed testcase. Status: ${runResult.status}`;
        sampleOutput = runResult.output || '';
        break;
      }

      // Verify output correctness (standard whitespace-agnostic comparison)
      const cleanActual = (runResult.output || '').trim().replace(/\r\n/g, '\n');
      const cleanExpected = (tc.output || '').trim().replace(/\r\n/g, '\n');

      if (cleanActual !== cleanExpected) {
        finalStatus = 'WRONG_ANSWER';
        firstErrorMsg = `Output mismatch.\nExpected:\n${cleanExpected}\n\nGot:\n${cleanActual}`;
        sampleOutput = runResult.output || '';
        break;
      }

      if (!sampleOutput) {
        sampleOutput = runResult.output || '';
      }
    }

    // Update submission record with execution metrics
    return this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        runtime: maxRuntime,
        memory: maxMemory,
        output: sampleOutput || null,
        error: firstErrorMsg || null,
      },
    });
  }
}
