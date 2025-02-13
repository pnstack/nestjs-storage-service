import type { Config } from './config.interface';
import 'dotenv/config';
const config: Config = {
  nest: {
    port: 3000,
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: 'API',
    description: 'API description',
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
};

console.log('Config:', config);

export default (): Config => config;
