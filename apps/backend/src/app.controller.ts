import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions/submissions.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'OK', timestamp: new Date() };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return req.user;
  }

  @Post('execute-public')
  async executePublic(@Body() body: any) {
    return this.submissionsService.executePublic(body);
  }
}
