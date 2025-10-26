import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NamespaceResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'org-acme' })
  name: string;

  @ApiPropertyOptional({ example: 'Acme Corporation' })
  displayName: string | null;

  @ApiPropertyOptional({ example: 107374182400 })
  quotaBytes: number | null;

  @ApiProperty({ example: 52428800 })
  usedBytes: number;

  @ApiProperty({ example: 42 })
  objectCount: number;

  @ApiPropertyOptional({ example: { tier: 'premium' } })
  metadata: Record<string, any> | null;

  @ApiProperty({ example: '2025-10-25T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-25T10:30:00Z' })
  updatedAt: Date;
}
