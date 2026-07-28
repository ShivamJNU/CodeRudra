import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExecutionRequest, ExecutionResult, ExecutionService } from './execution.service';

@Injectable()
export class PistonExecutionService extends ExecutionService {
  constructor(private httpService: HttpService) {
    super();
  }

  private getLanguageVersion(language: string): { lang: string; version: string } {
    const lang = language.toLowerCase();
    if (lang === 'cpp' || lang === 'c++') {
      return { lang: 'c++', version: '*' };
    }
    if (lang === 'java') {
      return { lang: 'java', version: '*' };
    }
    if (lang === 'python') {
      return { lang: 'python3', version: '*' };
    }
    return { lang: 'python3', version: '*' };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const { lang, version } = this.getLanguageVersion(request.language);
    const url = 'https://emkc.org/api/v2/piston/execute';

    const payload = {
      language: lang,
      version: version,
      files: [
        {
          content: request.sourceCode,
        },
      ],
      stdin: request.input || '',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const data = response.data;
      const run = data.run;

      let status: ExecutionResult['status'] = 'ACCEPTED';
      let error = '';

      if (run.code !== 0) {
        if (run.stderr && (run.stderr.toLowerCase().includes('error') || run.stderr.toLowerCase().includes('failed'))) {
          status = 'RUNTIME_ERROR';
          error = run.stderr;
        } else {
          status = 'RUNTIME_ERROR';
          error = run.stderr || `Exit Code: ${run.code}`;
        }
      }

      // Check compile errors (Piston separates compile outputs if language requires compilation)
      if (data.compile && data.compile.code !== 0) {
        status = 'COMPILATION_ERROR';
        error = data.compile.stderr || data.compile.output || 'Compilation failed';
      }

      return {
        status,
        output: run.stdout || '',
        runtime: 0.05,
        memory: 1024,
        error: error || undefined,
      };
    } catch (err: any) {
      throw new Error(`Piston API execution failed: ${err.message}`);
    }
  }
}
