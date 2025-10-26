import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { MultipartUploadService } from '../services/multipart-upload.service';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { InitiateUploadResponseDto } from '../dto/initiate-upload-response.dto';
import { UploadPartResponseDto } from '../dto/upload-part-response.dto';
import { CompleteUploadResponseDto } from '../dto/complete-upload-response.dto';

@ApiTags('Uploads')
@Controller('api/v1/uploads')
export class MultipartUploadController {
  constructor(private readonly uploadService: MultipartUploadService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate multipart upload' })
  @ApiResponse({
    status: 201,
    description: 'Upload session initiated',
    type: InitiateUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Quota exceeded' })
  async initiate(
    @Body() dto: InitiateUploadDto,
    @Req() req: Request,
  ): Promise<InitiateUploadResponseDto> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const session = await this.uploadService.initiateUpload(dto, requestId);

    return {
      sessionId: session.id,
      uploadId: session.uploadId,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  @Put(':sessionId/parts/:partNumber')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a part' })
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
  @ApiParam({ name: 'sessionId', type: 'string' })
  @ApiParam({ name: 'partNumber', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Part uploaded successfully',
    type: UploadPartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async uploadPart(
    @Param('sessionId') sessionId: string,
    @Param('partNumber', ParseIntPipe) partNumber: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadPartResponseDto> {
    const result = await this.uploadService.uploadPart(
      sessionId,
      partNumber,
      file.buffer,
    );

    return result;
  }

  @Post(':sessionId/complete')
  @ApiOperation({ summary: 'Complete multipart upload' })
  @ApiParam({ name: 'sessionId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Upload completed successfully',
    type: CompleteUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Upload incomplete or invalid' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async complete(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ): Promise<CompleteUploadResponseDto> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const result = await this.uploadService.completeUpload(sessionId, requestId);

    return result;
  }
}
