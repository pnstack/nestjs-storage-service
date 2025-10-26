import type { Config } from './config.interface';
import 'dotenv/config';

const config: Config = {
  nest: {
    port: parseInt(process.env.PORT, 10) || 3000,
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: 'Modern Storage Service API',
    description: 'Secure object storage service with namespace isolation, signed URLs, and resumable uploads',
    version: '1.0',
    path: process.env.SWAGGER_API_ROOT || 'api',
  },
  security: {
    expiresIn: '7d',
    refreshIn: '7d',
    bcryptSaltOrRound: 10,
  },
  graphql: {
    schemaDestination: './src/schema.graphql',
    debug: true,
    playgroundEnabled: true,
    sortSchema: true,
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'uploads',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE
      ? process.env.S3_FORCE_PATH_STYLE === 'true'
      : true,
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'storage',
    password: process.env.DATABASE_PASSWORD || 'storage123',
    database: process.env.DATABASE_NAME || 'storage',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' || true,
    logging: process.env.DATABASE_LOGGING === 'true' || false,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  bull: {
    redis: {
      host: process.env.BULL_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.BULL_REDIS_PORT, 10) || parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.BULL_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    },
  },
};

console.log('Config:', config);

export default (): Config => config;
