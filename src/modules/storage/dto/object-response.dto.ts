import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ObjectResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'org-acme' })
  namespace: string;

  @ApiProperty({ example: 'invoice-2025-001.pdf' })
  name: string;

  @ApiProperty({ example: 'org-acme/550e8400-e29b-41d4-a716-446655440000' })
  s3Key: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType: string;

  @ApiProperty({ example: 2048576 })
  sizeBytes: number;

  @ApiPropertyOptional({ example: 'abc123def456...' })
  checksum: string | null;

  @ApiPropertyOptional({ example: { department: 'finance' } })
  customMetadata: Record<string, string> | null;

  @ApiProperty({ example: '2025-10-25T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-25T10:30:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Pre-signed upload URL (returned on creation)',
  })
  uploadUrl?: string;
}
