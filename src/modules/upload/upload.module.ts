import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadSession } from './entities/upload-session.entity';
import { StorageObject } from '../storage/entities/object.entity';
import { MultipartUploadService } from './services/multipart-upload.service';
import { MultipartUploadController } from './controllers/multipart-upload.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadSession, StorageObject]),
    StorageModule,
  ],
  controllers: [UploadController, MultipartUploadController],
  providers: [UploadService, MultipartUploadService],
  exports: [UploadService, MultipartUploadService],
})
export class UploadModule {}
