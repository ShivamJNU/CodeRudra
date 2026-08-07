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

  private parseResponse(data: any): ExecutionResult {
    let status: ExecutionResult['status'] = 'ACCEPTED';
    let error = '';

    const exitCode = data.exit_code;
    const signal = data.signal;

    const isTimeout = 
      exitCode === 124 || 
      data.status === 'timeout' || 
      (data.error && data.error.toLowerCase().includes('timeout')) ||
      (exitCode === -1 && data.error && data.error.includes('Internal error: code execution failed'));

    if (isTimeout) {
      status = 'TIME_LIMIT_EXCEEDED';
      error = data.error || 'Time Limit Exceeded';
    } else if (exitCode === 137 || signal === 9 || signal === '9') {
      // exit code 137 can be either out of memory (OOM) or timeout (both are resource limits)
      const isOOM = (data.error && (data.error.toLowerCase().includes('memory') || data.error.toLowerCase().includes('oom'))) ||
                    (data.output && (data.output.toLowerCase().includes('memory') || data.output.toLowerCase().includes('oom')));
      if (isOOM) {
        status = 'MEMORY_LIMIT_EXCEEDED';
      } else {
        status = 'TIME_LIMIT_EXCEEDED';
      }
      error = 'Resource Limit Exceeded';
    } else if (exitCode === 139 || signal === 11 || signal === '11') {
      status = 'RUNTIME_ERROR';
      error = data.error || 'Segmentation fault (SIGSEGV)';
    } else if (exitCode !== 0 && exitCode !== undefined && exitCode !== null) {
      if (data.error && data.error.toLowerCase().includes('error')) {
        status = 'RUNTIME_ERROR';
        error = data.error;
      } else {
        status = 'RUNTIME_ERROR';
        error = data.error || `Exit Code: ${exitCode}`;
      }
    }

    // Check if compilation failed (only if not already marked as TLE/OOM)
    if (
      status !== 'TIME_LIMIT_EXCEEDED' && 
      status !== 'MEMORY_LIMIT_EXCEEDED' && 
      (data.status === 'error' || (data.error && data.error.toLowerCase().includes('compile')))
    ) {
      status = 'COMPILATION_ERROR';
      error = data.error;
    }

    let outputStr = data.output || '';
    if (outputStr.length > 950) {
      outputStr = outputStr.slice(0, 950) + '\n\n... [Output is truncated as character limit reached in output]';
    }

    return {
      status,
      output: outputStr,
      runtime: data.time ? parseFloat(data.time) : 0.05,
      memory: data.memory ? parseFloat(data.memory) : 1024,
      error: error || undefined,
    };
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
        this.httpService.post(url, payload, { 
          headers,
          timeout: 35000 // 35 seconds client-side timeout limit
        }),
      );
      console.log('OnlineCompiler.io API Response Success Payload:', JSON.stringify(response.data, null, 2));
      return this.parseResponse(response.data);
    } catch (err: any) {
      console.error('OnlineCompiler.io API Response Error:', err.response?.data || err.message);
      // 1. Handle Axios Client Connection Timeouts
      if (err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'))) {
        return {
          status: 'TIME_LIMIT_EXCEEDED',
          error: 'Execution Timed Out (Connection limit exceeded)',
          output: '',
          runtime: 30,
          memory: 512 * 1024,
        };
      }

      if (err.response) {
        // 2. Handle API capacity cap
        if (err.response.status === 429) {
          return {
            status: 'RUNTIME_ERROR',
            error: 'Compiler capacity reached. Please wait a few seconds and try again.',
            output: '',
            runtime: 0.05,
            memory: 1024,
          };
        }

        // 3. Handle Gateway Timeouts (504) or Server crashes (500/502) due to massive stdout overflow
        if (err.response.status >= 500) {
          return {
            status: 'TIME_LIMIT_EXCEEDED',
            error: 'Execution Timed Out / Output Buffer Overflow',
            output: '',
            runtime: 30,
            memory: 512 * 1024,
          };
        }

        if (err.response.data) {
          try {
            // 4. Handle HTML error pages returned instead of JSON
            if (typeof err.response.data === 'string' && err.response.data.trim().startsWith('<')) {
              return {
                status: 'TIME_LIMIT_EXCEEDED',
                error: 'Execution Timed Out (Gateway Timeout)',
                output: '',
                runtime: 30,
                memory: 512 * 1024,
              };
            }
            return this.parseResponse(err.response.data);
          } catch (innerErr) {
            // fall through to generic error throwing
          }
        }
      }
      throw new Error(`OnlineCompiler.io API execution failed: ${err.message}`);
    }
  }
}
