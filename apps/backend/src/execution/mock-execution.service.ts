import { Injectable } from '@nestjs/common';
import { ExecutionRequest, ExecutionResult, ExecutionService } from './execution.service';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class MockExecutionService extends ExecutionService {
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const code = request.sourceCode || '';
    const input = request.input || '';
    const language = request.language || 'cpp';

    // Artificial delay to simulate compiler run
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Checks for explicit trigger instructions
    if (code.includes('trigger:compile_error') || code.includes('trigger:compiler_error')) {
      return {
        status: 'COMPILATION_ERROR',
        error: `In file included from main.cpp:1:\nmain.cpp: In function 'int main()':\nmain.cpp:5:10: error: expected ';' before 'return'\n    5 |   cout << "Error"\n      |          ^\n      |          ;`,
      };
    }

    if (code.includes('trigger:timeout') || code.includes('trigger:tle') || code.includes('trigger:infinite_loop')) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        runtime: 2.05,
        memory: 12044,
        error: 'Time Limit Exceeded: Process terminated after 2.0 seconds.',
      };
    }

    if (code.includes('trigger:mle') || code.includes('trigger:memory_limit')) {
      return {
        status: 'MEMORY_LIMIT_EXCEEDED',
        runtime: 0.12,
        memory: 262145,
        error: 'Memory Limit Exceeded: Process allocated more than 256 MB.',
      };
    }

    if (code.includes('trigger:runtime_error') || code.includes('trigger:re') || code.includes('trigger:exception')) {
      return {
        status: 'RUNTIME_ERROR',
        runtime: 0.04,
        memory: 8120,
        error: 'Runtime Error: Division by zero (SIGFPE) at line 8.',
      };
    }

    if (code.includes('trigger:wrong_answer') || code.includes('trigger:wa')) {
      return {
        status: 'WRONG_ANSWER',
        output: 'Your Output: hello world\nExpected Output: Hello World!',
        runtime: 0.02,
        memory: 4096,
      };
    }

    // Try executing code using local system compilers/interpreters if available
    try {
      const result = await this.executeLocally(language, code, input);
      if (result) return result;
    } catch (err) {
      console.warn('Local execution failed, falling back to regex simulator:', err);
    }

    // Fallback: Smart regex simulator
    const parsedOutput = this.simulateOutputByRegex(language, code);
    
    return {
      status: 'ACCEPTED',
      runtime: 0.01,
      memory: 1024,
      output: parsedOutput,
    };
  }

  private async executeLocally(language: string, code: string, input: string): Promise<ExecutionResult | null> {
    const tempDir = path.join(process.cwd(), 'temp_exec');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const runId = Math.random().toString(36).substring(7);
    const lang = language.toLowerCase();

    if (lang === 'python') {
      const filePath = path.join(tempDir, `script_${runId}.py`);
      fs.writeFileSync(filePath, code);

      try {
        const startTime = Date.now();
        // Try 'python' command
        const { stdout, stderr } = await this.runCommand(`python "${filePath}"`, input, 2000);
        const duration = (Date.now() - startTime) / 1000;
        
        this.cleanupFiles([filePath]);

        if (stderr && stderr.trim().length > 0) {
          return {
            status: 'RUNTIME_ERROR',
            runtime: duration,
            memory: 4096,
            error: stderr,
          };
        }
        return {
          status: 'ACCEPTED',
          runtime: duration,
          memory: 4096,
          output: stdout,
        };
      } catch (err: any) {
        this.cleanupFiles([filePath]);
        throw err; // bubble up to fallback
      }
    }

    if (lang === 'cpp') {
      const cppPath = path.join(tempDir, `main_${runId}.cpp`);
      const exePath = path.join(tempDir, `main_${runId}.exe`);
      fs.writeFileSync(cppPath, code);

      try {
        // Compile C++ code using g++
        await this.runCommandSimple(`g++ "${cppPath}" -o "${exePath}"`, 5000);
        
        if (!fs.existsSync(exePath)) {
          throw new Error('Compilation failed: Output binary not generated.');
        }

        const runStartTime = Date.now();
        const { stdout, stderr } = await this.runCommand(`"${exePath}"`, input, 2000);
        const duration = (Date.now() - runStartTime) / 1000;

        this.cleanupFiles([cppPath, exePath]);

        if (stderr && stderr.trim().length > 0) {
          return {
            status: 'RUNTIME_ERROR',
            runtime: duration,
            memory: 2048,
            error: stderr,
          };
        }

        return {
          status: 'ACCEPTED',
          runtime: duration,
          memory: 2048,
          output: stdout,
        };
      } catch (err: any) {
        this.cleanupFiles([cppPath, exePath]);
        throw err; // bubble up to fallback
      }
    }

    if (lang === 'java') {
      const javaDir = path.join(tempDir, `java_${runId}`);
      fs.mkdirSync(javaDir, { recursive: true });
      const javaPath = path.join(javaDir, 'Main.java');
      fs.writeFileSync(javaPath, code);

      try {
        // Compile Java code using javac
        await this.runCommandSimple(`javac "${javaPath}"`, 5000);
        
        const startTime = Date.now();
        // Run Java main class
        const { stdout, stderr } = await this.runCommand(`java -cp "${javaDir}" Main`, input, 2000);
        const duration = (Date.now() - startTime) / 1000;

        this.cleanupDir(javaDir);

        if (stderr && stderr.trim().length > 0) {
          return {
            status: 'RUNTIME_ERROR',
            runtime: duration,
            memory: 8192,
            error: stderr,
          };
        }

        return {
          status: 'ACCEPTED',
          runtime: duration,
          memory: 8192,
          output: stdout,
        };
      } catch (err: any) {
        this.cleanupDir(javaDir);
        throw err; // bubble up to fallback
      }
    }

    return null;
  }

  private runCommand(command: string, input: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
        if (error && error.killed) {
          reject(new Error('Time Limit Exceeded'));
          return;
        }
        if (error) {
          const errStr = stderr.toLowerCase();
          if (errStr.includes('not recognized') || errStr.includes('not found') || errStr.includes('no such file')) {
            reject(new Error('Command not found'));
            return;
          }
        }
        if (error && !stderr) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });

      if (input && child.stdin) {
        try {
          child.stdin.write(input);
          child.stdin.end();
        } catch (e) {
          console.warn('Failed to write to stdin:', e);
        }
      }
    });
  }

  private runCommandSimple(command: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
        if (error) {
          const errStr = stderr.toLowerCase();
          if (errStr.includes('not recognized') || errStr.includes('not found') || errStr.includes('no such file')) {
            reject(new Error('Command not found'));
            return;
          }
          reject(new Error(stderr || error.message));
          return;
        }
        resolve();
      });
    });
  }

  private cleanupFiles(filePaths: string[]) {
    filePaths.forEach((fp) => {
      try {
        if (fs.existsSync(fp)) {
          fs.unlinkSync(fp);
        }
      } catch (e) {
        console.warn('Failed to delete temp file:', fp, e);
      }
    });
  }

  private cleanupDir(dirPath: string) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('Failed to delete temp dir:', dirPath, e);
    }
  }

  private simulateOutputByRegex(language: string, code: string): string {
    const lang = language.toLowerCase();
    const outputs: string[] = [];

    if (lang === 'python') {
      // Matches print("...") or print('...') or print(f"...")
      const regex = /print\s*\(\s*f?["']([\s\S]*?)["']\s*\)/g;
      let match;
      while ((match = regex.exec(code)) !== null) {
        outputs.push(match[1]);
      }
    } else if (lang === 'cpp') {
      // Matches cout << "..." or cout << '...'
      const regex = /cout\s*<<\s*["']([\s\S]*?)["']/g;
      let match;
      while ((match = regex.exec(code)) !== null) {
        outputs.push(match[1]);
      }
    } else if (lang === 'java') {
      // Matches System.out.print(...) or System.out.println(...)
      const regex = /System\.out\.print(ln)?\s*\(\s*["']([\s\S]*?)["']\s*\)/g;
      let match;
      while ((match = regex.exec(code)) !== null) {
        outputs.push(match[2]);
      }
    }

    if (outputs.length > 0) {
      return outputs.join('\n');
    }

    return `C++ GCC 14 Simulation Success!\n[Input STDIN]:\n(empty)\n\n[Console Logs]:\nCodeForge Output: hello from C++ program.`;
  }
}
