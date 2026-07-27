import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExecutionService } from './execution.service';
import { Judge0ExecutionService } from './judge0-execution.service';
import { MockExecutionService } from './mock-execution.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    {
      provide: ExecutionService,
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        const url = configService.get<string>('JUDGE0_API_URL');
        if (url && url.startsWith('http') && url !== 'mock') {
          return new Judge0ExecutionService(configService, httpService);
        }
        return new MockExecutionService();
      },
      inject: [ConfigService, HttpService],
    },
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}
