import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('problems')
export class ProblemsController {
  constructor(private problemsService: ProblemsService) {}

  @Get()
  async findAll() {
    return this.problemsService.findAll();
  }

  @Post('seed')
  async seed() {
    await this.problemsService.seedDemoProblems();
    return { success: true, message: 'Demo problems seeded successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.problemsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: any) {
    return this.problemsService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.problemsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.problemsService.remove(id);
  }
}
