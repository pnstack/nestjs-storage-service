import { IsNotEmpty, IsString, Matches, MaxLength, IsOptional, IsNumber, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNamespaceDto {
  @ApiProperty({
    description: 'Namespace name (lowercase alphanumeric + hyphens)',
    example: 'org-acme',
    pattern: '^[a-z0-9][a-z0-9-]{2,254}$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{2,254}$/, {
    message: 'Namespace must be lowercase alphanumeric with hyphens, 3-255 chars',
  })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Human-readable display name',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Storage quota in bytes (null = unlimited)',
    example: 107374182400,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quotaBytes?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { tier: 'premium', owner: 'admin@acme.com' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
