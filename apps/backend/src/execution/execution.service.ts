import { Injectable } from '@nestjs/common';

export interface ExecutionResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';
  output?: string;
  runtime?: number; // in seconds
  memory?: number;  // in KB
  error?: string;   // Compilation or runtime error details
}

export interface ExecutionRequest {
  sourceCode: string;
  language: string; // cpp, java, python
  input?: string;
  expectedOutput?: string;
}

@Injectable()
export abstract class ExecutionService {
  abstract execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
