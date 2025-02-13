import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import config from '@/common/configs/config';
import { LoggerModule } from './common/logger/logger.module';

import { StorageModule } from './modules/storage/storage.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    LoggerModule,

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    StorageModule,
    UploadModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
