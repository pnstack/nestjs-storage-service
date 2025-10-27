import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class HealthService {
  private s3Client: S3Client;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('HealthService');
    const storageConfig = this.configService.get('storage');
    this.s3Client = new S3Client({
      region: storageConfig.region,
      endpoint: storageConfig.endpoint,
      credentials: {
        accessKeyId: storageConfig.accessKey,
        secretAccessKey: storageConfig.secretKey,
      },
      forcePathStyle: storageConfig.forcePathStyle,
    });
  }

  async checkReadiness(): Promise<{
    status: string;
    checks: { database: string; s3: string };
  }> {
    const checks = {
      database: 'unknown',
      s3: 'unknown',
    };

    // Check database
    try {
      await this.connection.query('SELECT 1');
      checks.database = 'ok';
    } catch (error) {
      this.logger.error('Database health check failed', error.stack);
      checks.database = 'error';
    }

    // Check S3
    try {
      await this.s3Client.send(new ListBucketsCommand({}));
      checks.s3 = 'ok';
    } catch (error) {
      this.logger.error('S3 health check failed', error.stack);
      checks.s3 = 'error';
    }

    const status = checks.database === 'ok' && checks.s3 === 'ok' ? 'ok' : 'error';

    return { status, checks };
  }
}
