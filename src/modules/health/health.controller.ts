import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  async liveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'ok' },
            s3: { type: 'string', example: 'ok' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async readiness(): Promise<{
    status: string;
    checks: { database: string; s3: string };
  }> {
    return await this.healthService.checkReadiness();
  }
}
