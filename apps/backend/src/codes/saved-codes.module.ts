import { Module } from '@nestjs/common';
import { SavedCodesService } from './saved-codes.service';
import { SavedCodesController } from './saved-codes.controller';

@Module({
  providers: [SavedCodesService],
  controllers: [SavedCodesController],
  exports: [SavedCodesService],
})
export class SavedCodesModule {}
