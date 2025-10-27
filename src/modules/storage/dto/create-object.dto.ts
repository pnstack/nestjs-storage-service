import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsPositive,
  Max,
  IsObject,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateObjectDto {
  @ApiProperty({
    description: 'Namespace name',
    example: 'org-acme',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9][a-z0-9-]*$/, { message: 'Invalid namespace format' })
  namespace: string;

  @ApiProperty({
    description: 'Object name',
    example: 'invoice-2025-001.pdf',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiProperty({
    description: 'Content type (MIME type)',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  contentType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  @IsPositive()
  @IsNumber()
  @Max(104857600) // 100 MB
  sizeBytes: number;

  @ApiPropertyOptional({
    description: 'SHA-256 checksum (optional)',
    example: 'abc123def456...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksum?: string;

  @ApiPropertyOptional({
    description: 'Custom metadata (max 10 keys)',
    example: { department: 'finance', year: '2025' },
  })
  @IsOptional()
  @IsObject()
  customMetadata?: Record<string, string>;
}
