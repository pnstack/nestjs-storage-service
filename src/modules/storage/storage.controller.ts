import { StorageService } from './storage.service';
import { disk, storageClass } from '../upload/utils/storage';
import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('upload-url')
  async getUploadUrl(@Query('extension') extension: string) {
    const response = await this.storageService.getUploadUrl(extension);
    return response;
  }

  @Get('list')
  async listFiles() {
    return await this.storageService.listFiles();
  }

  @Get('file')
  async getFile(@Query('name') name: string) {
    return await this.storageService.getViewUrl(name);
  }

 


}
