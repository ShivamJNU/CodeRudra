import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Post('execute')
  async execute(@Body() body: any, @Req() req: any) {
    return this.submissionsService.execute(req.user.id, body);
  }

  @Post('submit')
  async submit(@Body() body: any, @Req() req: any) {
    return this.submissionsService.submit(req.user.id, body);
  }
}
