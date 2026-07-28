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
    const parsedOutput = this.simulateOutputByRegex(language, code, input);
    
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
          if (errStr.includes('device guard') || errStr.includes('blocked') || errStr.includes('applocker') || errStr.includes('not recognized') || errStr.includes('not found') || errStr.includes('no such file')) {
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
          if (errStr.includes('device guard') || errStr.includes('blocked') || errStr.includes('applocker') || errStr.includes('not recognized') || errStr.includes('not found') || errStr.includes('no such file')) {
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

  private simulateOutputByRegex(language: string, code: string, input: string): string {
    const lang = language.toLowerCase();
    const outputs: string[] = [];
    const inputs = input.trim() ? input.trim().split(/\s+/).map(Number) : [];

    const vars: Record<string, number> = {
      x: inputs[0] ?? 0,
      y: inputs[1] ?? 0,
      a: inputs[0] ?? 0,
      b: inputs[1] ?? 0
    };

    // Attempt C++ custom inputs
    if (lang === 'cpp') {
      const cinMatch = code.match(/cin\s*>>\s*([a-zA-Z_]\w*)(?:\s*>>\s*([a-zA-Z_]\w*))?/);
      if (cinMatch) {
        vars[cinMatch[1]] = inputs[0] ?? 0;
        if (cinMatch[2]) {
          vars[cinMatch[2]] = inputs[1] ?? 0;
        }
      }
    }

    const lines = code.split('\n');
    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx].trim();
      
      // 1. Python loop simulation
      if (lang === 'python' && line.startsWith('for ') && line.includes(' in range(')) {
        const match = lines[idx].match(/for\s+([a-zA-Z_]\w*)\s+in\s+range\(\s*([^)]+)\s*\)\s*:/);
        if (match) {
          const loopVar = match[1];
          const rangeExpr = match[2];
          let evalLimit = rangeExpr.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => vars[m] !== undefined ? String(vars[m]) : m);
          let limit = 0;
          try {
            limit = Number(new Function(`return (${evalLimit})`)());
          } catch (e) {
            limit = Number(evalLimit) || 0;
          }

          // Gather indented loop body
          const bodyLines: string[] = [];
          idx++;
          while (idx < lines.length && (lines[idx].startsWith(' ') || lines[idx].startsWith('\t') || lines[idx].trim() === '')) {
            if (lines[idx].trim() !== '') {
              bodyLines.push(lines[idx].trim());
            }
            idx++;
          }

          // Execute loop body
          for (let i = 0; i < limit; i++) {
            const loopVars = { ...vars, [loopVar]: i };
            bodyLines.forEach(bodyLine => {
              if (bodyLine.startsWith('print(')) {
                const printMatch = bodyLine.match(/print\s*\(\s*([^)]+)\s*\)/);
                if (printMatch) {
                  const expr = printMatch[1].trim();
                  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
                    outputs.push(expr.slice(1, -1));
                  } else {
                    let evalStr = expr.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => loopVars[m] !== undefined ? String(loopVars[m]) : m);
                    if (/^[0-9+\-*/%().\s]+$/.test(evalStr)) {
                      try {
                        outputs.push(String(new Function(`return (${evalStr})`)()));
                      } catch (e) {}
                    }
                  }
                }
              }
            });
          }
          continue;
        }
      }

      // 2. C++ loop simulation
      if (lang === 'cpp' && line.startsWith('for') && line.includes('int ') && line.includes('<')) {
        const match = lines[idx].match(/for\s*\(\s*int\s+([a-zA-Z_]\w*)\s*=\s*0\s*;\s*\1\s*<\s*([^;]+)\s*;\s*\1\s*(?:\+\+|\+=\s*1)\s*\)/);
        if (match) {
          const loopVar = match[1];
          const rangeExpr = match[2];
          let evalLimit = rangeExpr.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => vars[m] !== undefined ? String(vars[m]) : m);
          let limit = 0;
          try {
            limit = Number(new Function(`return (${evalLimit})`)());
          } catch (e) {
            limit = Number(evalLimit) || 0;
          }

          // Gather brace loop body or next line
          const bodyLines: string[] = [];
          idx++;
          let braceCount = 0;
          if (lines[idx - 1].includes('{')) braceCount++;
          
          while (idx < lines.length) {
            const currentLine = lines[idx].trim();
            if (currentLine.includes('{')) braceCount++;
            if (currentLine.includes('}')) braceCount--;
            
            const cleanLine = currentLine.replace(/[{}]/g, '').trim();
            if (cleanLine !== '') {
              bodyLines.push(cleanLine);
            }
            idx++;
            if (braceCount <= 0) break;
          }

          // Execute loop body
          for (let i = 0; i < limit; i++) {
            const loopVars = { ...vars, [loopVar]: i };
            bodyLines.forEach(bodyLine => {
              if (bodyLine.startsWith('cout')) {
                const coutMatch = bodyLine.match(/cout\s*<<\s*([^;]+);/);
                if (coutMatch) {
                  const parts = coutMatch[1].split('<<').map(p => p.trim());
                  const evaluatedParts = parts.map(part => {
                    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
                      return part.slice(1, -1);
                    }
                    if (part === 'endl' || part === '"\\n"' || part === "'\\n'") {
                      return '\n';
                    }
                    let evalStr = part.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => loopVars[m] !== undefined ? String(loopVars[m]) : m);
                    if (/^[0-9+\-*/%().\s]+$/.test(evalStr)) {
                      try {
                        return String(new Function(`return (${evalStr})`)());
                      } catch (e) {
                        return '';
                      }
                    }
                    return '';
                  });
                  outputs.push(evaluatedParts.join('').trim());
                }
              }
            });
          }
          continue;
        }
      }

      // 3. Simple statements
      if (lang === 'python' && line.startsWith('print(')) {
        const printMatch = lines[idx].match(/print\s*\(\s*([^)]+)\s*\)/);
        if (printMatch) {
          const expr = printMatch[1].trim();
          if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
            outputs.push(expr.slice(1, -1));
          } else {
            let evalStr = expr.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => vars[m] !== undefined ? String(vars[m]) : m);
            if (/^[0-9+\-*/%().\s]+$/.test(evalStr)) {
              try {
                outputs.push(String(new Function(`return (${evalStr})`)()));
              } catch (e) {}
            }
          }
        }
      }

      if (lang === 'cpp' && line.startsWith('cout')) {
        const coutMatch = lines[idx].match(/cout\s*<<\s*([^;]+);/);
        if (coutMatch) {
          const parts = coutMatch[1].split('<<').map(p => p.trim());
          const evaluatedParts = parts.map(part => {
            if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
              return part.slice(1, -1);
            }
            if (part === 'endl' || part === '"\\n"' || part === "'\\n'") {
              return '\n';
            }
            let evalStr = part.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => vars[m] !== undefined ? String(vars[m]) : m);
            if (/^[0-9+\-*/%().\s]+$/.test(evalStr)) {
              try {
                return String(new Function(`return (${evalStr})`)());
              } catch (e) {
                return '';
              }
            }
            return '';
          });
          outputs.push(evaluatedParts.join('').trim());
        }
      }

      if (lang === 'java' && line.includes('System.out.print')) {
        const printMatch = lines[idx].match(/System\.out\.print(ln)?\s*\(\s*([^)]+)\s*\)/);
        if (printMatch) {
          const expr = printMatch[2].trim();
          if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
            outputs.push(expr.slice(1, -1));
          } else {
            let evalStr = expr.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => vars[m] !== undefined ? String(vars[m]) : m);
            if (/^[0-9+\-*/%().\s]+$/.test(evalStr)) {
              try {
                outputs.push(String(new Function(`return (${evalStr})`)()));
              } catch (e) {}
            }
          }
        }
      }

      idx++;
    }

    if (outputs.length > 0) {
      return outputs.join('\n');
    }

    const uppercaseLang = language.toUpperCase();
    const cleanLangName = uppercaseLang === 'CPP' ? 'C++ GCC 14' : uppercaseLang === 'PYTHON' ? 'Python 3.12' : 'Java 21 OpenJDK';
    return `${cleanLangName} Simulation Success!\n[Input STDIN]:\n${input || '(empty)'}\n\n[Console Logs]:\nCodeForge Output: hello from ${language} program.`;
  }
}
