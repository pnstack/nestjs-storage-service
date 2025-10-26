import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSignedUrlDto {
  @ApiPropertyOptional({
    description: 'URL expiration time in seconds (1 min to 7 days)',
    example: 3600,
    default: 3600,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(604800) // 7 days
  expiresIn?: number = 3600;
}
