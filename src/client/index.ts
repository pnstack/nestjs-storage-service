/**
 * Storage Service Client Module
 * 
 * Provides client libraries for both NestJS backend microservices and frontend applications
 * to interact with the storage service.
 * 
 * ## NestJS Backend Client
 * 
 * For NestJS microservices, use the `StorageClientModule`:
 * 
 * ```typescript
 * import { StorageClientModule } from '@pnstack/nestjs-storage-service/client/nestjs';
 * 
 * @Module({
 *   imports: [
 *     StorageClientModule.register({
 *       baseUrl: 'http://localhost:4000',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 * 
 * Then inject the service:
 * 
 * ```typescript
 * import { StorageClientService } from '@pnstack/nestjs-storage-service/client/nestjs';
 * 
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly storageClient: StorageClientService) {}
 * 
 *   async createDocument() {
 *     const object = await this.storageClient.createObject({
 *       namespace: 'documents',
 *       name: 'file.pdf',
 *       contentType: 'application/pdf',
 *       sizeBytes: 1024000,
 *     });
 *     return object;
 *   }
 * }
 * ```
 * 
 * ## Frontend Client (Axios)
 * 
 * For frontend applications, use the `StorageClient` class:
 * 
 * ```typescript
 * import { StorageClient } from '@pnstack/nestjs-storage-service/client/axios';
 * 
 * const client = new StorageClient({
 *   baseUrl: 'http://localhost:4000',
 * });
 * 
 * // Create an object
 * const object = await client.createObject({
 *   namespace: 'documents',
 *   name: 'file.pdf',
 *   contentType: 'application/pdf',
 *   sizeBytes: 1024000,
 * });
 * 
 * // Upload the file
 * await client.uploadFile(object.uploadUrl!, file);
 * ```
 */

// Re-export NestJS client
export * as NestJSClient from './nestjs';

// Re-export Axios client
export * as AxiosClient from './axios';

// Re-export shared types
export * from './shared';
