import { IsNotEmpty, IsString, MaxLength, Matches, IsPositive, Max, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateUploadDto {
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
    example: 'large-video.mp4',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiProperty({
    description: 'Content type (MIME type)',
    example: 'video/mp4',
  })
  @IsNotEmpty()
  @IsString()
  contentType: string;

  @ApiProperty({
    description: 'Expected file size in bytes',
    example: 52428800,
  })
  @IsPositive()
  @IsNumber()
  @Max(104857600) // 100 MB
  expectedSizeBytes: number;
}
