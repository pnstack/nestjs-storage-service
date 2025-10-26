import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ObjectStorageService } from '../services/object-storage.service';
import { CreateObjectDto } from '../dto/create-object.dto';
import { ObjectResponseDto } from '../dto/object-response.dto';
import { GenerateSignedUrlDto } from '../dto/generate-signed-url.dto';
import { randomUUID } from 'crypto';

@ApiTags('Objects')
@Controller('api/v1/objects')
export class ObjectStorageController {
  constructor(private readonly objectStorageService: ObjectStorageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new object' })
  @ApiResponse({
    status: 201,
    description: 'Object created successfully',
    type: ObjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Quota exceeded' })
  async create(
    @Body() createDto: CreateObjectDto,
    @Req() req: Request,
  ): Promise<ObjectResponseDto> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const { object, uploadUrl } = await this.objectStorageService.createObject(
      createDto,
      requestId,
    );

    return {
      ...object,
      uploadUrl,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get object metadata' })
  @ApiResponse({
    status: 200,
    description: 'Object metadata retrieved',
    type: ObjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Object not found' })
  async getById(@Param('id') id: string): Promise<ObjectResponseDto> {
    const object = await this.objectStorageService.getObject(id);
    return object;
  }

  @Post(':id/signed-url')
  @ApiOperation({ summary: 'Generate signed download URL' })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Object not found' })
  async generateSignedUrl(
    @Param('id') id: string,
    @Body() dto: GenerateSignedUrlDto,
    @Req() req: Request,
  ): Promise<{ url: string; expiresAt: string }> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const expiresIn = dto.expiresIn || 3600;
    const url = await this.objectStorageService.generateSignedUrl(id, expiresIn, requestId);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return { url, expiresAt };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an object' })
  @ApiResponse({ status: 204, description: 'Object deleted successfully' })
  @ApiResponse({ status: 404, description: 'Object not found' })
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    await this.objectStorageService.deleteObject(id, requestId);
  }
}
