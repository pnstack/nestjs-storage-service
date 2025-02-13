import {
  Controller,
  Get,
  Param,
  Post,
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
  @ApiOperation({ summary: 'Upload a file directly to MinIO' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const extension = '.' + file.originalname.split('.').pop();
    const fileKey = `${Date.now()}-${file.originalname}`;
    
    const url = await this.storageService.putObject(
      fileKey,
      file.buffer,
      file.mimetype
    );

    return {
      fileKey,
      url,
      contentType: file.mimetype,
    };
  }

  @Get('download/:name')
  @ApiOperation({ summary: 'Download a file from MinIO' })
  async downloadFile(
    @Param('name') name: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const stream = await this.storageService.getFile(name);
    const contentType = await this.storageService.getFileContentType(name);
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${name}"`,
    });

    return new StreamableFile(stream);
  }

  @Get('upload-url')
  @ApiOperation({ summary: 'Get a pre-signed URL for file upload' })
  async getUploadUrl(@Query('extension') extension: string) {
    const response = await this.storageService.getUploadUrl(extension);
    return response;
  }

  @Get('list')
  @ApiOperation({ summary: 'List all files in storage' })
  async listFiles() {
    return await this.storageService.listFiles();
  }

  @Get('file')
  @ApiOperation({ summary: 'Get a pre-signed URL to view/download a file' })
  async getFile(@Query('name') name: string) {
    return await this.storageService.getViewUrl(name);
  }
}
