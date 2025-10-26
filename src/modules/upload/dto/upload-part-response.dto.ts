import { ApiProperty } from '@nestjs/swagger';

export class UploadPartResponseDto {
  @ApiProperty({ example: 1 })
  partNumber: number;

  @ApiProperty({ example: '"abc123def456..."' })
  ETag: string;
}
