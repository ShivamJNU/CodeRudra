import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExecutionRequest, ExecutionResult, ExecutionService } from './execution.service';

@Injectable()
export class OnlineCompilerExecutionService extends ExecutionService {
  private apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    super();
    this.apiKey = this.configService.get<string>('JUDGE0_API_KEY') || '';
  }

  private getCompilerId(language: string): string {
    const lang = language.toLowerCase();
    if (lang === 'cpp' || lang === 'c++') {
      return 'g++-15';
    }
    if (lang === 'java') {
      return 'openjdk-25';
    }
    if (lang === 'python') {
      return 'python-3.14';
    }
    return 'python-3.14';
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const compiler = this.getCompilerId(request.language);
    const url = 'https://api.onlinecompiler.io/api/run-code-sync/';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.apiKey,
    };

    const payload = {
      compiler,
      code: request.sourceCode,
      input: request.input || '',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers }),
      );
      const data = response.data;

      let status: ExecutionResult['status'] = 'ACCEPTED';
      let error = '';

      if (
        data.status === 'timeout' || 
        (data.error && data.error.toLowerCase().includes('timeout')) || 
        data.exit_code === 124
      ) {
        status = 'TIME_LIMIT_EXCEEDED';
        error = data.error || 'Time Limit Exceeded';
      } else if (data.exit_code !== 0) {
        if (data.error && data.error.toLowerCase().includes('error')) {
          status = 'RUNTIME_ERROR';
          error = data.error;
        } else {
          status = 'RUNTIME_ERROR';
          error = data.error || `Exit Code: ${data.exit_code}`;
        }
      }

      // Check if compilation failed
      if (data.status === 'error' || (data.error && data.error.toLowerCase().includes('compile'))) {
        status = 'COMPILATION_ERROR';
        error = data.error;
      }

      return {
        status,
        output: data.output || '',
        runtime: data.time ? parseFloat(data.time) : 0.05,
        memory: data.memory ? parseFloat(data.memory) : 1024,
        error: error || undefined,
      };
    } catch (err: any) {
      throw new Error(`OnlineCompiler.io API execution failed: ${err.message}`);
    }
  }
}
