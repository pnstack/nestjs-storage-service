import { Module } from '@nestjs/common';

import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  providers: [StorageService],
  controllers: [StorageController],
})
export class StorageModule {}
