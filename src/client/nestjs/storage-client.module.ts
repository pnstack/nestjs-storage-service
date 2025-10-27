import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StorageClientService } from './storage-client.service';
import { StorageClientModuleOptions } from './storage-client.interfaces';
import { STORAGE_CLIENT_CONFIG } from './storage-client.constants';

/**
 * Storage Client Module for NestJS applications
 * 
 * Provides a client to interact with the storage service from other NestJS microservices.
 * 
 * @example
 * ```typescript
 * // Synchronous registration
 * @Module({
 *   imports: [
 *     StorageClientModule.register({
 *       baseUrl: 'http://localhost:4000',
 *       timeout: 30000,
 *       headers: {
 *         'X-API-Key': 'your-api-key',
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 * 
 * @example
 * ```typescript
 * // Async registration with ConfigService
 * @Module({
 *   imports: [
 *     StorageClientModule.registerAsync({
 *       imports: [ConfigModule],
 *       inject: [ConfigService],
 *       useFactory: (config: ConfigService) => ({
 *         baseUrl: config.get('STORAGE_SERVICE_URL'),
 *         timeout: config.get('STORAGE_SERVICE_TIMEOUT'),
 *       }),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class StorageClientModule {
  /**
   * Register the module synchronously with options
   */
  static register(options: StorageClientModuleOptions): DynamicModule {
    return {
      module: StorageClientModule,
      imports: [
        HttpModule.register({
          timeout: options.timeout || 30000,
        }),
      ],
      providers: [
        {
          provide: STORAGE_CLIENT_CONFIG,
          useValue: options,
        },
        StorageClientService,
      ],
      exports: [StorageClientService],
    };
  }

  /**
   * Register the module asynchronously
   */
  static registerAsync(options: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<StorageClientModuleOptions> | StorageClientModuleOptions;
  }): DynamicModule {
    return {
      module: StorageClientModule,
      imports: [
        ...(options.imports || []),
        HttpModule.register({
          timeout: 30000,
        }),
      ],
      providers: [
        {
          provide: STORAGE_CLIENT_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        StorageClientService,
      ],
      exports: [StorageClientService],
    };
  }
}
