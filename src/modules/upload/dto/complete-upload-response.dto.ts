import { ApiProperty } from '@nestjs/swagger';

export class CompleteUploadResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  objectId: string;

  @ApiProperty({ example: 'org-acme/550e8400-e29b-41d4-a716-446655440000' })
  s3Key: string;
}
