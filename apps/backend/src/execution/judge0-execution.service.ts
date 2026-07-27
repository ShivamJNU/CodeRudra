import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExecutionRequest, ExecutionResult, ExecutionService } from './execution.service';

@Injectable()
export class Judge0ExecutionService extends ExecutionService {
  private apiHost: string;
  private apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    super();
    this.apiHost = this.configService.get<string>('JUDGE0_API_URL') || 'http://localhost:2358';
    this.apiKey = this.configService.get<string>('JUDGE0_API_KEY') || '';
  }

  private getLanguageId(language: string): number {
    const lang = language.toLowerCase();
    if (lang === 'cpp' || lang === 'c++') {
      return this.configService.get<number>('JUDGE0_CPP_LANG_ID') || 105; // Default C++ (GCC 13)
    }
    if (lang === 'java') {
      return this.configService.get<number>('JUDGE0_JAVA_LANG_ID') || 91; // Default Java (OpenJDK 19)
    }
    if (lang === 'python') {
      return this.configService.get<number>('JUDGE0_PYTHON_LANG_ID') || 92; // Default Python (3.11.2)
    }
    return 71; // Fallback to Python 3
  }

  private encodeB64(str: string): string {
    return Buffer.from(str || '').toString('base64');
  }

  private decodeB64(str: string): string {
    return Buffer.from(str || '', 'base64').toString('utf-8');
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const languageId = this.getLanguageId(request.language);
    const url = `${this.apiHost}/submissions?wait=true&fields=status_id,status,stdout,stderr,compile_output,time,memory`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-RapidAPI-Key'] = this.apiKey;
    }

    const payload = {
      source_code: this.encodeB64(request.sourceCode),
      language_id: languageId,
      stdin: this.encodeB64(request.input || ''),
      expected_output: request.expectedOutput ? this.encodeB64(request.expectedOutput) : undefined,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers }),
      );
      const data = response.data;

      const statusId = data.status_id;
      let status: ExecutionResult['status'] = 'ACCEPTED';
      let error = '';

      // Judge0 status ids:
      // 3: Accepted
      // 4: Wrong Answer
      // 5: Time Limit Exceeded
      // 6: Compilation Error
      // 7-12: Runtime Errors (e.g. 11 for Segmentation Fault, 8 for Division by Zero)
      // 13: Memory Limit Exceeded
      if (statusId === 3) {
        status = 'ACCEPTED';
      } else if (statusId === 4) {
        status = 'WRONG_ANSWER';
      } else if (statusId === 5) {
        status = 'TIME_LIMIT_EXCEEDED';
      } else if (statusId === 6) {
        status = 'COMPILATION_ERROR';
        error = this.decodeB64(data.compile_output);
      } else if (statusId === 13) {
        status = 'MEMORY_LIMIT_EXCEEDED';
      } else {
        status = 'RUNTIME_ERROR';
        error = this.decodeB64(data.stderr || data.compile_output);
      }

      return {
        status,
        output: data.stdout ? this.decodeB64(data.stdout) : '',
        runtime: data.time ? parseFloat(data.time) : 0,
        memory: data.memory ? parseFloat(data.memory) : 0, // KB
        error: error || undefined,
      };
    } catch (err: any) {
      throw new Error(`Judge0 API execution failed: ${err.message}`);
    }
  }
}
