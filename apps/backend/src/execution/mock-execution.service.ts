import { Injectable } from '@nestjs/common';
import { ExecutionRequest, ExecutionResult, ExecutionService } from './execution.service';

@Injectable()
export class MockExecutionService extends ExecutionService {
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const code = request.sourceCode || '';
    const input = request.input || '';

    // Artificial delay to simulate compiler run
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (code.includes('compile_error') || code.includes('compiler_error')) {
      return {
        status: 'COMPILATION_ERROR',
        error: `In file included from main.cpp:1:\nmain.cpp: In function 'int main()':\nmain.cpp:5:10: error: expected ';' before 'return'\n    5 |   cout << "Error"\n      |          ^\n      |          ;`,
      };
    }

    if (code.includes('timeout') || code.includes('tle') || code.includes('infinite_loop')) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        runtime: 2.05,
        memory: 12044, // KB
        error: 'Time Limit Exceeded: Process terminated after 2.0 seconds.',
      };
    }

    if (code.includes('mle') || code.includes('memory_limit')) {
      return {
        status: 'MEMORY_LIMIT_EXCEEDED',
        runtime: 0.12,
        memory: 262145, // KB (> 256MB)
        error: 'Memory Limit Exceeded: Process allocated more than 256 MB.',
      };
    }

    if (code.includes('runtime_error') || code.includes('re') || code.includes('exception')) {
      return {
        status: 'RUNTIME_ERROR',
        runtime: 0.04,
        memory: 8120,
        error: 'Runtime Error: Division by zero (SIGFPE) at line 8.',
      };
    }

    if (code.includes('wrong_answer') || code.includes('wa')) {
      return {
        status: 'WRONG_ANSWER',
        output: 'Your Output: hello world\nExpected Output: Hello World!',
        runtime: 0.02,
        memory: 4096,
      };
    }

    // Default: ACCEPTED
    let output = '';
    
    // Attempt some basic execution simulation
    if (request.language === 'python') {
      output = `Python 3.12 Simulation Success!\n[Input STDIN]:\n${input || '(empty)'}\n\n[Console Logs]:\nCodeForge Output: hello from python code execution.`;
    } else if (request.language === 'java') {
      output = `Java 21 OpenJDK Simulation Success!\n[Input STDIN]:\n${input || '(empty)'}\n\n[Console Logs]:\nCodeForge Output: hello from java main class.`;
    } else {
      output = `C++ GCC 14 Simulation Success!\n[Input STDIN]:\n${input || '(empty)'}\n\n[Console Logs]:\nCodeForge Output: hello from C++ program.`;
    }

    // If expected output is provided, match against it or mock WA/AC
    if (request.expectedOutput && input) {
      // If we have testcases, let's see. If the code has "// fail_test", we return WRONG_ANSWER
      if (code.includes('fail_test')) {
        return {
          status: 'WRONG_ANSWER',
          output: 'Mock Output mismatch',
          runtime: 0.03,
          memory: 4500,
        };
      }
      output = request.expectedOutput; // match it!
    }

    return {
      status: 'ACCEPTED',
      output,
      runtime: 0.04, // 40ms
      memory: 4320,  // 4.3 MB
    };
  }
}
