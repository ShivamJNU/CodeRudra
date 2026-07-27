import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private historyService: HistoryService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.historyService.findAll(req.user.id);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    return this.historyService.getStatistics(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.historyService.findOne(id, req.user.id);
  }
}
