import { ApiProperty } from '@nestjs/swagger';

export class InitiateUploadResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  sessionId: string;

  @ApiProperty({ example: 'S3UploadId12345' })
  uploadId: string;

  @ApiProperty({ example: '2025-11-01T10:30:00Z' })
  expiresAt: string;
}
