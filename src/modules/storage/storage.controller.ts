import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  Response,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';

import { StorageService } from './storage.service';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get()
  @ApiOperation({ summary: 'List all files in storage' })
  async listFiles() {
    return await this.storageService.listFiles();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a pre-signed URL to view a file' })
  async viewFile(@Param('key') key: string) {
    return {
      url: await this.storageService.getViewUrl(key),
    };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file directly' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const extension = '.' + file.originalname.split('.').pop();
    const fileKey = `${Date.now()}-${file.originalname}`;

    const url = await this.storageService.putObject(fileKey, file.buffer, file.mimetype);

    return {
      fileKey,
      url,
      contentType: file.mimetype,
    };
  }

  @Get('upload/presigned')
  @ApiOperation({ summary: 'Get a pre-signed URL for file upload' })
  async getUploadUrl(@Query('extension') extension: string) {
    const response = await this.storageService.getUploadUrl(extension);
    return response;
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file from storage' })
  async deleteFile(@Param('key') key: string) {
    await this.storageService.deleteFile(key);
    return { message: 'File deleted successfully' };
  }
}
