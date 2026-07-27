import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SavedCodesService } from './saved-codes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('codes')
@UseGuards(JwtAuthGuard)
export class SavedCodesController {
  constructor(private savedCodesService: SavedCodesService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.savedCodesService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.savedCodesService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    return this.savedCodesService.create(req.user.id, body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.savedCodesService.update(id, req.user.id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.savedCodesService.remove(id, req.user.id);
  }
}
