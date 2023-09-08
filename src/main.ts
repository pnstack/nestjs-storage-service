import { AppModule } from '@/app.module';
import type { NestConfig } from '@/common/configs/config.interface';
import { setupSwagger } from '@/common/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.setGlobalPrefix('/api');
  app.enableCors();
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));

  await setupSwagger(app);

  // Listen port
  const configService = app.get(ConfigService);
  const nestConfig = configService.get<NestConfig>('nest');
  const port = process.env.PORT || nestConfig.port || 3000;
  await app
    .listen(port)
    .then(() => {
      console.log(`http://localhost:${port}`);
    })
    .catch((err) => {
      console.log(err);
    });
}

bootstrap();
